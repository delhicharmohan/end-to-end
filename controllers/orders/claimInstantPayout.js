const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const poolPromise = require("../../db");
const logger = require("../../logger");
const { getIO } = require("../../socket");
const BalanceUpdater = require("../../helpers/utils/balanceUpdater");
const claimToken = require("../../helpers/utils/claimToken");

/**
 * GET /api/v1/orders/instant-payout/:refID/claim?token=...
 * Validates token and idempotently creates a payin for the calling vendor, then redirects to /#/pay/:payinRefID
 */
module.exports = async function claimInstantPayout(req, res) {
  const payoutRefID = req.params.refID;
  const token = req.query.token;

  if (!token || !payoutRefID) {
    return res.status(400).send("Bad Request");
  }

  try {
    const payload = claimToken.verify(token);
    const vendor = payload.vendor;
    const amountFromToken = parseFloat(payload.amount);
    const idempotencyKey = payload.idempotencyKey;

    if (!vendor || !idempotencyKey) {
      return res.status(400).send("Invalid token payload");
    }

    const pool = await poolPromise;

    // Idempotency check
    const [idemRows] = await pool.query(
      `SELECT payin_ref_id FROM instant_payout_idempotency WHERE idempotency_key = ?`,
      [idempotencyKey]
    );
    if (idemRows.length) {
      const existing = idemRows[0].payin_ref_id;
      if (existing) {
        return res.redirect(302, `/#/pay/${existing}`);
      }
      // Record exists without payin_ref_id: proceed to (re)create below
    } else {
      // Create idempotency record placeholder if not exists
      await pool.query(
        `INSERT INTO instant_payout_idempotency (idempotency_key, vendor, payout_ref_id, amount) VALUES (?, ?, ?, ?)`,
        [idempotencyKey, vendor, payoutRefID, amountFromToken]
      );
    }

    // Validate payout is eligible and exact balance match
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
      return res.status(404).send("Payout not available");
    }
    const payoutOrder = payoutRows[0];

    const amountToPayin = parseFloat(payoutOrder.effective_balance);
    if (amountFromToken !== amountToPayin) {
      return res.status(409).send("Amount mismatch");
    }

    // idempotency record is present at this point

    // Resolve clientName for requesting vendor
    const [secrets] = await pool.query("SELECT clientName FROM secrets WHERE vendor = ?", [vendor]);
    if (!secrets.length) {
      logger.error(`Vendor '${vendor}' does not have clientName.`);
      return res.status(400).send("Vendor misconfigured");
    }
    const clientName = secrets[0].clientName;

    // Create payin order
    const now = moment().tz(process.env.TIMEZONE);
    const createdAt = now.format("YYYY-MM-DD HH:mm:ss");
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
      return res.status(500).send("Failed to create payin");
    }

    const [selPayin] = await pool.query("SELECT * FROM orders WHERE merchantOrderId = ?", [merchantOrderId]);
    const payinOrder = selPayin[0];

    // Create batch
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
      await pool.query("DELETE FROM orders WHERE id = ?", [payinOrder.id]);
      return res.status(500).send("Failed to create batch");
    }

    // Safe balance update
    const balanceResult = await BalanceUpdater.updateForBatchCreation(
      payoutOrder.id,
      amountToPayin,
      batchUuid
    );
    if (!balanceResult.success) {
      await pool.query("DELETE FROM instant_payout_batches WHERE uuid = ?", [batchUuid]);
      await pool.query("DELETE FROM orders WHERE id = ?", [payinOrder.id]);
      return res.status(409).send(balanceResult.message || "Insufficient balance");
    }

    // Update splits counter
    await pool.query("UPDATE orders SET current_payout_splits = current_payout_splits + 1 WHERE id = ?", [payoutOrder.id]);

    // Mark idempotency mapping
    await pool.query(
      `UPDATE instant_payout_idempotency SET payin_ref_id = ? WHERE idempotency_key = ?`,
      [payinOrder.refID, idempotencyKey]
    );

    // Notify vendor to refresh lists
    try {
      const io = getIO();
      io.emit(`${vendor}-instant-payout-available-updated`, { refID: payoutOrder.refID });
    } catch (e) { /* ignore */ }

    // Redirect to pay page
    return res.redirect(302, `/#/pay/${payinOrder.refID}`);
  } catch (error) {
    logger.error(`[claimInstantPayout] ${error?.message}`);
    return res.status(400).send("Invalid or expired token");
  }
}
