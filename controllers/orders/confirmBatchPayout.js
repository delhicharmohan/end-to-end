const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require("uuid");
const { getIO } = require("../../socket");
const moment = require("moment-timezone");
const { sendPayoutCallback } = require('../../helpers/utils/callbackHandler');
const SocketEventHandler = require('../../helpers/utils/socketEventHandler');


// Removed duplicate generateReceiptId function - already exists in other files

async function confirmBatchPayout(req, res, next) {
  // this is for confirming the batch transaction and  and forward this to the orders table for the approval as next()
  try {
    logger.info(`[confirmBatchPayout] ▶️ Start`);
    const now = moment().tz(process.env.TIMEZONE);
    const createdAt = now.format("YYYY-MM-DD HH:mm:ss");

    const refID = req.params.refID;
    const batchUuid = req.body.uuid;

    logger.info(`[confirmBatchPayout] Params: refID=${refID}, body.uuid=${batchUuid}`);

    if (batchUuid == null) {
      logger.warn(`[confirmBatchPayout] ❌ Missing batchUuid for refID=${refID}`);
      return res.status(400).json({
        message: "Invalid Request!",
      });
    }
    const pool = await poolPromise;

    const [results] = await pool.query(
      "SELECT * FROM orders WHERE refID = ? and type = ? and payout_type = ?",
      [refID, "payout", "instant"]
    );

    if (results.length === 0) {
      logger.error(`Order '${refID}' attempted to get does not exist.`);
      return res.status(404).json({ message: "Order not found." });
    }

    const payoutOrder = results[0];
    logger.info(`[confirmBatchPayout] ✅ Payout order found id=${payoutOrder.id}, paymentStatus=${payoutOrder.paymentStatus}, payout_type=${payoutOrder.payout_type}`);

    let payoutBatch;
    const [payoutBatches] = await pool.query(
      `
      SELECT *
      FROM instant_payout_batches
      WHERE uuid = ?
      AND order_id = ? AND system_confirmed_at IS NOT NULL 
      AND confirmed_by_customer_at IS NULL
    `,
      [batchUuid, payoutOrder.id]
    );

    if (payoutBatches.length > 0) {
      payoutBatch = payoutBatches[0];
      logger.info(`✅ Found batch ${batchUuid} for confirmation`);
    } else {
      logger.error(`❌ No confirmable batch found for UUID: ${batchUuid}, Order ID: ${payoutOrder.id}. Criteria: system_confirmed_at NOT NULL and confirmed_by_customer_at NULL`);
    }

    if (payoutBatch) {
      let updatedAt = createdAt;
      logger.info(`[confirmBatchPayout] 🔄 Updating batch confirm: uuid=${batchUuid}, confirmed_by_customer_at=${createdAt}`);
      await pool.query(
        `UPDATE instant_payout_batches SET confirmed_by_customer_at = ?, updated_at = ? WHERE uuid = ?`,
        [createdAt,updatedAt, batchUuid]
      );
      payoutBatch.confirmed_by_customer_at = createdAt;
      req.payoutBatch = payoutBatch;
      req.payoutOrder = payoutOrder;
      logger.info(`[confirmBatchPayout] ▶️ Passing to next middleware`);
      next();
    } else {
      logger.warn(`[confirmBatchPayout] ⚠️ Attempt to confirm already processed or invalid batch. uuid=${batchUuid}`);
      return res.status(400).json({
        message: "order has been already processed",
      });
    }
  } catch (error) {
    logger.error(`[confirmBatchPayout] ❌ Exception: ${error?.message}`);
    logger.debug(error?.stack || error);
    return res.status(500).json({
      message: `An error occurred while trying to get orders: ${error}`,
    });
  }
}

async function confirmPayInTransaction(req, res, next) {
  const now = moment().tz(process.env.TIMEZONE);
  const createdAt = now.format("YYYY-MM-DD HH:mm:ss");

  // confirming payin transaction
  try {
    logger.info(`[confirmPayInTransaction] ▶️ Start`);
    if (!req.payoutBatch || !req.payoutOrder) {
      logger.warn(`[confirmPayInTransaction] ⚠️ Missing req.payoutBatch or req.payoutOrder`);
    }

    if(
      req.payoutBatch.confirmed_by_admin_at != null && 
      req.payoutOrder.validatorUPIID != null && 
      req.payoutOrder.paymentStatus == 'approved'
    ) {
      logger.info(`[confirmPayInTransaction] ✅ Already approved path: refID=${req.payoutOrder?.refID}`);
      return res.status(200)
      .json({ message: "Payment Confirmed!!" });
    }

    let pool = await poolPromise;
    let payoutBatch = req.payoutBatch;
    let payInOrder;
    logger.info(`[confirmPayInTransaction] Looking up payin by refID=${payoutBatch?.pay_in_ref_id}`);
    const [payInOrders] = await pool.query(
      `
      SELECT * FROM orders 
      WHERE refID = ? 
      AND type = ? 
      AND paymentStatus = ?`,
      [payoutBatch.pay_in_ref_id, "payin", "pending"]
    );

    if (payInOrders.length > 0) {
      payInOrder = payInOrders[0];
      logger.info(`[confirmPayInTransaction] ✅ Payin order found id=${payInOrder.id}, status=${payInOrder.paymentStatus}`);
    }

    let transactionID = payInOrder.customerUtr;
    let refID = payInOrder.refID;
    let vendor = payInOrder.vendor;
    
    // Only approve payin if customer has actually confirmed the batch
    if (payInOrder && req.payoutBatch && req.payoutBatch.confirmed_by_customer_at) {
      logger.info(`✅ Customer confirmed batch, approving payin order ${refID}`);
      let [results] = await pool.query(
        "UPDATE orders SET paymentStatus = ?, transactionID = ?,  updatedAt = ? WHERE refID = ?",
        ["approved", transactionID, now.format("YYYY-MM-DD HH:mm:ss"), refID]
      );
      logger.info(`[confirmPayInTransaction] 🔄 Payin update result affectedRows=${results.affectedRows}`);

      const approvedData = {
        refID: refID,
        paymentStatus: "approved",
      };

      const changedData = {
        refID: refID,
        paymentStatus: "approved",
        transactionID: transactionID,
      };

      req.body.transactionID = transactionID;

      const io = getIO();
      io.emit(`${vendor}-order-approved-${refID}`, approvedData);
      io.emit(`${vendor}-order-update-status-and-trnx`, changedData);
      req.order = payInOrder;
      req.order.paymentStatus = "approved";
      logger.info(
        `Order approved successfully. refID:${refID}, orderId:${req.order.merchantOrderId}`
      );
      res.body = {
        message: "Order approved successfully.",
        order: results,
      };
      req.is_end_to_end_route = true;
      logger.info(`[confirmPayInTransaction] ▶️ Passing to callbackHook`);
      next();
    } else if (payInOrder && !req.payoutBatch.confirmed_by_customer_at) {
      logger.warn(`⚠️ Payin order ${refID} found but customer hasn't confirmed batch yet`);
      next(); // Continue to next middleware without approving payin
    } else {
      logger.warn(`⚠️ No payin order found for batch ${payoutBatch.pay_in_ref_id}`);
      next();
    }
  } catch (error) {
    logger.error(`[confirmPayInTransaction] ❌ Exception: ${error?.message}`);
    logger.debug(error?.stack || error);
    return res.status(500).json({
      message: `An error occurred while trying to get orders: ${error}`,
    });
  }
}

async function confirmPayOutTransaction(req, res, next) {

  const now = moment().tz(process.env.TIMEZONE);
  const createdAt = now.format("YYYY-MM-DD HH:mm:ss");

  try {
    let pool = await poolPromise;
    let payoutBatch = req.payoutBatch;
    let payoutOrder = req.payoutOrder;
    logger.info(`[confirmPayOutTransaction] ▶️ Start refID=${payoutOrder?.refID}, batchUUID=${payoutBatch?.uuid}`);

    let [payoutOrders] = await pool.query(
      `
      SELECT * FROM orders WHERE type = ?  
      AND refID = ? 
      `,
      ["payout", payoutOrder.refID]
    );

    if (payoutOrders.length > 0) {
      payoutOrder = payoutOrders[0];
      logger.info(`[confirmPayOutTransaction] ✅ Fetched payout order id=${payoutOrder.id}, status=${payoutOrder.paymentStatus}`);
    }

    if (payoutOrder) {
      logger.info(`🔄 Processing payout confirmation for order ${payoutOrder.refID}`);
      const totalAmount = parseFloat(payoutOrder.amount || 0);
      const instantPaid = parseFloat(payoutOrder.instant_paid || 0);

      if (payoutOrder.payout_type === "instant") {
        logger.info(`💰 Amount check: Total=${totalAmount}, Paid=${instantPaid}`);

        // If fully paid, approve payout order, send callback and respond with redirect details
        const isFullyPaid = instantPaid >= totalAmount && totalAmount > 0;
        logger.info(`[confirmPayOutTransaction] Computed isFullyPaid=${isFullyPaid} (instantPaid=${instantPaid}, totalAmount=${totalAmount})`);

        if (isFullyPaid) {
          try {
            const utr = payoutBatch && payoutBatch.utr_no ? payoutBatch.utr_no : req.body.transactionID || payoutOrder.transactionID || null;
            logger.info(`[confirmPayOutTransaction] ✅ Fully paid. Using UTR=${utr}`);

            // Ensure ALL related batches are customer-confirmed
            const [pendingConfirmRows] = await pool.query(
              `SELECT COUNT(*) AS pendingConfirms
               FROM instant_payout_batches
               WHERE order_id = ?
                 AND system_confirmed_at IS NOT NULL
                 AND confirmed_by_customer_at IS NULL`,
              [payoutOrder.id]
            );
            const pendingConfirms = pendingConfirmRows?.[0]?.pendingConfirms || 0;
            logger.info(`[confirmPayOutTransaction] 🧮 Pending customer confirmations for order_id=${payoutOrder.id}: ${pendingConfirms}`);

            // Ensure there are no pending payins among system-confirmed batches
            const [pendingPayinsRows] = await pool.query(
              `SELECT COUNT(*) AS pendingPayins
               FROM orders o
               WHERE o.type = 'payin'
                 AND o.paymentStatus <> 'approved'
                 AND o.refID IN (
                   SELECT ipb.pay_in_ref_id
                   FROM instant_payout_batches ipb
                   WHERE ipb.order_id = ? AND ipb.system_confirmed_at IS NOT NULL
                 )`,
              [payoutOrder.id]
            );
            const pendingPayins = pendingPayinsRows?.[0]?.pendingPayins || 0;
            logger.info(`[confirmPayOutTransaction] 🧮 Pending payins for order_id=${payoutOrder.id}: ${pendingPayins}`);

            if (pendingConfirms > 0 || pendingPayins > 0) {
              logger.info(`[confirmPayOutTransaction] ⏸️ Holding approval until all confirmations complete (pendingConfirms=${pendingConfirms}, pendingPayins=${pendingPayins})`);
              return res.json({
                status: true,
                message: "Batch confirmed. Awaiting other confirmations to complete payout.",
                redirect: false,
                pending: { pendingConfirms, pendingPayins }
              });
            }

            // Update payout order status to approved if not already
            // Note: Intentionally NOT persisting transactionID for payout to avoid unique key collisions
            const [updateResult] = await pool.query(
              `UPDATE orders 
               SET paymentStatus = ?, updatedAt = ?
               WHERE refID = ? AND type = 'payout' AND paymentStatus <> 'approved'`,
              ["approved", createdAt, payoutOrder.refID]
            );
            logger.info(`[confirmPayOutTransaction] ℹ️ Skipping DB update of transactionID for payout refID=${payoutOrder.refID}`);

            if (updateResult.affectedRows > 0) {
              logger.info(`✅ Payout order approved for refID ${payoutOrder.refID}`);
            } else {
              logger.info(`ℹ️ Payout order already approved or not updated for refID ${payoutOrder.refID}`);
            }

            // Refresh payout order record
            const [freshOrders] = await pool.query(
              `SELECT * FROM orders WHERE type = 'payout' AND refID = ?`,
              [payoutOrder.refID]
            );
            const freshPayoutOrder = freshOrders.length ? freshOrders[0] : payoutOrder;

            // Send payout callback if client has callbackURL
            try {
              const [secrets] = await pool.query(
                "SELECT callbackURL FROM secrets WHERE clientName = ?",
                [freshPayoutOrder.clientName]
              );
              if (secrets.length && secrets[0].callbackURL) {
                logger.info(`[confirmPayOutTransaction] 🔔 Sending payout callback to ${secrets[0].callbackURL}`);
                await sendPayoutCallback(freshPayoutOrder, secrets[0].callbackURL, utr);
              } else {
                logger.warn(`⚠️ No callbackURL found for client '${freshPayoutOrder.clientName}'`);
              }
            } catch (cbErr) {
              logger.error(`❌ Error sending payout callback for ${freshPayoutOrder.refID}:`, cbErr);
            }

            // Emit socket updates for frontend
            try {
              const io = getIO();
              io.emit("instant-payout-status-update", {
                refID: freshPayoutOrder.refID,
                status: "approved",
                payoutType: freshPayoutOrder.payout_type,
              });
              logger.info(`[confirmPayOutTransaction] 📣 Socket event emitted for refID=${freshPayoutOrder.refID}`);
            } catch (sockErr) {
              logger.warn(`Socket emit failed for ${payoutOrder.refID}: ${sockErr?.message || sockErr}`);
            }

            // Return redirect details for success page
            return res.json({
              status: true,
              message: "Payout confirmed and approved.",
              redirect: true,
              withdrawalDetails: {
                amount: parseFloat(freshPayoutOrder.amount),
                utr: utr,
                completedAt: createdAt,
              },
            });
          } catch (approveErr) {
            logger.error(`❌ Error approving payout for ${payoutOrder.refID}: ${approveErr?.message}`);
            logger.debug(approveErr?.stack || approveErr);
            return res.status(500).json({ message: "Failed to approve payout order" });
          }
        }

        // Not fully paid yet: acknowledge confirmation without redirect
        logger.info(`[confirmPayOutTransaction] ⏳ Not fully paid yet: Paid=${instantPaid}, Total=${totalAmount}. No approval will be attempted.`);
        return res.json({
          status: true,
          message: "Batch confirmed. Awaiting full payment.",
          redirect: false,
        });
      } else {
        logger.warn(`❌ Non-instant payout type: ${payoutOrder.payout_type}`);
        return res.status(400).json({ message: "Payment not yet Done!" });
      }
    } else {
      logger.error(`❌ No payout order found for refID: ${payoutOrder?.refID}`);
      return res.status(400).json({ message: "Payment not yet Done!" });
    }
  } catch (e) {
    logger.error(`❌ Error in confirmPayOutTransaction: ${e?.message}`);
    logger.debug(e?.stack || e);
      return res
          .status(500)
          .json({ message: "An error occurred while processing payment" });
  }
}

module.exports = {
  confirmBatchPayout,
  confirmPayInTransaction,
  confirmPayOutTransaction,
};
