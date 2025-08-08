const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");

async function approvePayOutOrder(req, res, next) {
  const now = moment().tz(process.env.TIMEZONE);
  const createdAt = now.format("YYYY-MM-DD HH:mm:ss");
  const updatedAt = now.format("YYYY-MM-DD HH:mm:ss");

  const pool = await poolPromise;

  const vendor = req.user.vendor;
  // check if required fields (refID, paymentStatus) are present in the request body
  if (!req.params.refID || !req.body.paymentStatus) {
    logger.error("Missing required fields: refID, paymentStatus");
    logger.debug({ provided_fields: [req.params, req.body] });
    return res.status(400).json({
      message: "Missing required fields.",
    });
  }

  const refID = req.params.refID;
  const transactionID = req.body.transactionID;
  const paymentStatus = req.body.paymentStatus;
  const username = req.user.username;
  const role = req.user.role;

  let isInstantPayout;
  let payoutType;
  let instantBalanceAmount;
  let adminInitiatedBatch;
  if (req.body.hasOwnProperty("payout_type")) {
    // this is a instant payout order processed by admin may be partially or fully!!!
    payoutType = req.body.payout_type;
    instantBalanceAmount = req.body.instant_balance;
    isInstantPayout = true;

    let [payoutBatches] = await pool.query(
      `
      SELECT *
      FROM instant_payout_batches
      WHERE
      ref_id = ? 
      AND status = ?
      AND system_confirmed_at IS NULL 
      AND confirmed_by_customer_at IS NULL
      AND payment_from IS NOT NULL
      
    `,
      [refID, "pending"]
    );

    if (payoutBatches.length > 0) {
      adminInitiatedBatch = payoutBatches[0];
    }
  }

  // check if required field  transactionID are present in the request body
  if (paymentStatus == "approved") {
    if (!transactionID) {
      logger.error("Missing required fields: transactionID");
      logger.debug({ provided_fields: [req.params, req.body] });
      return res.status(400).json({
        message: "Missing required fields.",
      });
    }
  }

  try {
    // check if refID exists in the orders table
    const [orders] = await pool.query("SELECT * FROM orders WHERE refID = ?", [
      refID,
    ]);

    if (!orders.length) {
      return res.status(404).json({ message: "Pay Out Order not found." });
    }
    if (orders[0].paymentStatus === "approved") {
      return res
        .status(400)
        .json({ message: "Pay Out Order has already been approved." });
    }
    if (orders[0].paymentStatus === "cancelled") {
      return res
        .status(400)
        .json({ message: "Pay Out Order has been cancelled." });
    }

    const data = orders[0];

    console.log(data);

    const validatorUsername = data.validatorUsername;
    // check the approved by user/admin
    if (validatorUsername) {
      const [db_user] = await pool.query(
        "SELECT * FROM users WHERE username = ?",
        [validatorUsername]
      );

      if (!db_user.length) {
        return res.status(404).json({ message: "User not found." });
      }
      if (!db_user[0].status) {
        return res.status(403).json({
          message:
            "Unauthorized: Your account has not been enabled for the day.",
        });
      }
      if (db_user[0].upiid !== orders[0].validatorUPIID) {
        return res.status(403).json({
          message:
            "Unauthorized: You are not authorized to approve this order.",
        });
      }
      if (db_user[0].payOutLimit < orders[0].amount) {
        return res.status(403).json({
          message: "You don't have sufficiant pay out limit",
        });
      }

      req.validator = db_user[0];
    } else {
      return res.status(403).json({
        message: "validatorUsername not found.",
      });
    }

    const now = moment().tz(process.env.TIMEZONE);

    // Update the paymentStatus of Pay Out Order
    const [results] = await pool.query(
      "UPDATE orders SET paymentStatus = ?, transactionID = ?, approvedBy = ?, approvedByUsername = ?, updatedAt = ? WHERE refID = ?",
      [
        paymentStatus,
        transactionID,
        role,
        username,
        now.format("YYYY-MM-DD HH:mm:ss"),
        refID,
      ]
    );

    const io = getIO();

    if (isInstantPayout) {

      let [updateOrder] = await pool.query('UPDATE orders SET instant_paid = instant_paid + ?, instant_balance = instant_balance - ? WHERE refID = ?', [instantBalanceAmount, instantBalanceAmount, refID]);
      // update if this flag is set
      let [updatedBatch] = await pool.query(
        `UPDATE instant_payout_batches SET utr_no = ?, confirmed_by_admin_at = ?, system_confirmed_at = ?, updated_at = ? WHERE uuid = ?`,
        [transactionID, createdAt, updatedAt, updatedAt, adminInitiatedBatch.uuid]
      );

      [payoutBatches] = await pool.query(`SELECT *  FROM  instant_payout_batches WHERE id = ? `, [
        adminInitiatedBatch.id,
      ]);

      let payoutBatch;
      if (payoutBatches.length > 0) {
        payoutBatch = payoutBatches[0];

        delete payoutBatch.pay_in_order_id;
        delete payoutBatch.pay_in_ref_id;
        delete payoutBatch.id;
      }

      if (payoutBatch) {
        console.log("================emitter fired!!!!========");
        console.log(payoutBatch);
        let payoutRoom = `instant-withdraw-${refID}`;
        io.emit(payoutRoom, payoutBatch);
      }
    }

    const changedData = {
      refID: refID,
      paymentStatus: paymentStatus,
      transactionID: transactionID,
    };

    io.emit(`${vendor}-payout-order-update-status-and-trnx`, changedData);

    // update the payment status of payout order
    data.paymentStatus = paymentStatus;

    // Populate req.order with the order details
    req.order = data;

    logger.info(
      `Pay Out Order ${paymentStatus} successfully. refID:${refID}, orderId:${data.merchantOrderId}`
    );

    res.body = {
      message: `Pay Out Order ${paymentStatus} successfully. refID:${refID}, orderId:${data.merchantOrderId}`,
      order: results,
    };
    next();
  } catch (error) {
    logger.error(
      "An error occurred while trying to update pay out order payment status.",
      error
    );
    logger.debug(error);
    return res.status(500).json({
      message: error.message,
    });
  }
}

module.exports = approvePayOutOrder;
