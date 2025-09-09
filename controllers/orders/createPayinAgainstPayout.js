const { v4: uuidv4 } = require("uuid");
const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");
const BalanceUpdater = require("../../helpers/utils/balanceUpdater");

/**
 * Create a payin for the requesting vendor against a selected instant payout from any vendor.
 * Security: validateHash should run before this handler (uses vendor header and req.clientName)
 * Constraints: exact amount match with payout.instant_balance, UPI must be present, respect 30-min window.
 */
module.exports = async function createPayinAgainstPayout(req, res) {
  const vendor = req.headers.vendor; // requesting vendor
  const payoutRefID = req.params.refID;
  const requestedAmount = req.body?.amount; // optional; if absent we will use full instant_balance
  const idempotencyKey = req.body?.idempotencyKey; // optional but recommended

  if (!vendor) {
    return res.status(400).json({ success: false, message: "Missing vendor header" });
  }

  try {
    const pool = await poolPromise;
    const now = moment().tz(process.env.TIMEZONE);
    const createdAt = now.format("YYYY-MM-DD HH:mm:ss");

    // Load payout order by refID; must be instant and recent, have UPI, and have positive instant_balance
    const [payoutRows] = await pool.query(
      `SELECT *, COALESCE(instant_balance, amount) AS effective_balance
       FROM orders
       WHERE refID = ?
         AND type = 'payout'
         AND (is_instant_payout = 1 OR payout_type = 'instant')
         AND paymentStatus IN ('unassigned','pending')
         AND customerUPIID IS NOT NULL AND customerUPIID <> ''
         AND COALESCE(instant_balance, amount) > 0
         AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)`,
      [payoutRefID]
    );

    if (!payoutRows.length) {
      return res.status(404).json({ success: false, message: "Payout not available" });
    }

    const payoutOrder = payoutRows[0];

    // Determine amount to match (exact-match only)
    const effectiveBalance = parseFloat(payoutOrder.effective_balance);
    const amountToPayin = requestedAmount != null ? parseFloat(requestedAmount) : effectiveBalance;
    if (!(amountToPayin > 0)) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    if (amountToPayin !== effectiveBalance) {
      return res.status(409).json({ success: false, message: "Exact match required with payout balance" });
    }

    // Idempotency: if provided and seen before, return existing result
    if (idempotencyKey) {
      const [idemRows] = await pool.query(
        `SELECT payin_ref_id FROM instant_payout_idempotency WHERE idempotency_key = ?`,
        [idempotencyKey]
      );
      if (idemRows.length) {
        const existingRef = idemRows[0].payin_ref_id;
        if (existingRef) {
          return res.status(200).json({ success: true, message: "Idempotent replay", data: { payinRefID: existingRef, amount: amountToPayin } });
        }
        // no payin_ref_id yet: another request in-flight; respond with 202 and ask to retry later
        return res.status(202).json({ success: false, message: "Request in progress. Retry shortly." });
      }
      // create idempotency record (no payin_ref_id yet)
      await pool.query(
        `INSERT INTO instant_payout_idempotency (idempotency_key, vendor, payout_ref_id, amount) VALUES (?, ?, ?, ?)`
        , [idempotencyKey, vendor, payoutRefID, amountToPayin]
      );
    }

    // Resolve clientName for requesting vendor
    const [secrets] = await pool.query("SELECT clientName FROM secrets WHERE vendor = ?", [vendor]);
    if (!secrets.length) {
      logger.error(`Vendor '${vendor}' does not have clientName.`);
      return res.status(400).json({ success: false, message: `Vendor '${vendor}' does not have clientName.` });
    }
    const clientName = secrets[0].clientName;

    // Create the payin order
    const payinRefID = uuidv4();
    const receiptId = require("../../helpers/utils/generateReceiptId")();
    const merchantOrderId = uuidv4();

    const payinData = {
      refID: payinRefID,
      receiptId,
      clientName,
      type: 'payin',
      customerName: `${vendor}-cross-customer`,
      customerIp: req.ip,
      customerMobile: `${vendor}-cross-mobile`,
      customerUPIID: payoutOrder.customerUPIID,
      merchantOrderId,
      amount: amountToPayin,
      mode: 'upi',
      returnUrl: '',
      paymentStatus: 'pending',
      validatorUsername: '',
      validatorUPIID: '',
      accountNumber: '',
      website: '',
      createdAt,
      updatedAt: createdAt,
      expires_at: moment(createdAt).add(1, 'hour').format("YYYY-MM-DD HH:mm:ss"),
      vendor,
      paymentMethod: 'UPI',
      uniqueIdentifier: '',
      actualAmount: amountToPayin,
      txnFee: 0,
      diffAmount: 0,
      is_end_to_end: 1
    };

    const [insertPayin] = await pool.query("INSERT INTO orders SET ?", payinData);
    if (insertPayin.affectedRows !== 1) {
      logger.error("Failed to insert payin order");
      return res.status(500).json({ success: false, message: "Failed to create payin order" });
    }

    // Read the inserted payin back (by merchantOrderId)
    const [selPayin] = await pool.query("SELECT * FROM orders WHERE merchantOrderId = ?", [merchantOrderId]);
    const payinOrder = selPayin[0];

    // Create batch linking payout and payin
    const batchUuid = uuidv4();
    const batchData = {
      uuid: batchUuid,
      order_id: payoutOrder.id,
      ref_id: payoutOrder.refID,
      amount: amountToPayin,
      pay_in_order_id: payinOrder.id,
      pay_in_ref_id: payinOrder.refID,
      status: 'pending',
      vendor: vendor,
      payment_from: payinOrder.customerUPIID,
      payment_to: payoutOrder.customerUPIID,
      created_at: createdAt,
      updated_at: createdAt,
    };

    const [batchInsert] = await pool.query("INSERT INTO instant_payout_batches SET ?", batchData);
    if (batchInsert.affectedRows !== 1) {
      logger.error("Failed to insert batch for cross-vendor match");
      // Rollback payin
      await pool.query("DELETE FROM orders WHERE id = ?", [payinOrder.id]);
      return res.status(500).json({ success: false, message: "Failed to create batch" });
    }

    // Safe balance update
    const balanceResult = await BalanceUpdater.updateForBatchCreation(
      payoutOrder.id,
      amountToPayin,
      batchUuid
    );

    if (!balanceResult.success) {
      logger.error(`Balance update failed for payout order ${payoutOrder.id}: ${balanceResult.message}`);
      // Rollback: delete batch and payin
      await pool.query("DELETE FROM instant_payout_batches WHERE uuid = ?", [batchUuid]);
      await pool.query("DELETE FROM orders WHERE id = ?", [payinOrder.id]);
      return res.status(409).json({ success: false, message: balanceResult.message });
    }

    // Update splits counter separately like in createOrder
    await pool.query("UPDATE orders SET current_payout_splits = current_payout_splits + 1 WHERE id = ?", [payoutOrder.id]);

    // Update idempotency mapping with created payin
    if (idempotencyKey) {
      await pool.query(
        `UPDATE instant_payout_idempotency SET payin_ref_id = ? WHERE idempotency_key = ?`,
        [payinOrder.refID, idempotencyKey]
      );
    }

    // Emit vendor-scoped sockets to refresh lists
    try {
      const io = getIO();
      io.emit(`${vendor}-instant-payout-available-updated`, { refID: payoutOrder.refID });
    } catch (e) {
      logger.warn(`[createPayinAgainstPayout] socket emit failed: ${e?.message}`);
    }

    return res.status(201).json({
      success: true,
      message: "Payin created against payout",
      data: {
        payinRefID: payinOrder.refID,
        amount: amountToPayin,
        expires_at: payinOrder.expires_at || payinData.expires_at
      }
    });
  } catch (error) {
    logger.error(`[createPayinAgainstPayout] Error: ${error?.message}`);
    return res.status(500).json({ success: false, message: "Failed to create payin against payout" });
  }
};
