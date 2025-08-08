const { validate } = require("node-cron");
const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require("uuid");
const getRandomValidator = require("../../helpers/getRandomValidator");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");

function generateReceiptId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${randomStr}${timestamp}`.substring(0, 10).toUpperCase();
}

async function checkAndReAssignInstantPayout(req, res, next) {
  const now = moment().tz(process.env.TIMEZONE);
  const createdAt = now.format("YYYY-MM-DD HH:mm:ss");

  const io = getIO();


  let minutes = 10;
  try {
    const refID = req.params.refID;
    const pool = await poolPromise;
    const tenMinutesAgo = now
      .subtract(minutes, "minutes")
      .format("YYYY-MM-DD HH:mm:ss");

    let [queryOrder] = await pool.query(
      `SELECT * FROM orders 
       WHERE payout_type = ? 
       AND refID = ? 
       AND createdAt <= ?`,
      ["instant", refID, tenMinutesAgo]
    );
    let order;

    if (queryOrder.length > 0) {
      order = queryOrder[0];
    }
    if (!order) {
      const [queryOrder] = await pool.query(
        `SELECT * FROM orders 
         WHERE payout_type = ? 
         AND refID = ? `,
        ["instant", refID]
      );

      if (queryOrder.length == 0) {
        throw new Error("No Order found!!");
      }
      if (queryOrder.length > 0) {
        order = queryOrder[0];
      }
      return res.status(200).json({
        message: "Order is under processing!",
        data: order,
      });
    }

    if (order.is_payout_time_extended == 0 
      // || 1==1 // for testing only....
    ) {

      let nowCopy = moment().tz(process.env.TIMEZONE);

      const tenMinutesAfter = nowCopy
        .add(10, "minutes")
        .format("YYYY-MM-DD HH:mm:ss");

      let extendTimeQuery = `UPDATE orders SET is_payout_time_extended = ?, instant_payout_expiry_at = ? WHERE refID = ?`;
      let extendTimeQueryParams = [1, tenMinutesAfter, refID];

      let [updateStatus] = await pool.query(
        extendTimeQuery,
        extendTimeQueryParams
      );

      order.is_payout_time_extended = 1;
      order.instant_payout_expiry_at = tenMinutesAfter;

      const channel = `instant-withdraw-extension-${refID}`;
      io.emit(channel, order);
      
      return res.status(200).json({
        message: "Order is under processing!",
        data: order,
      });
      // extend 10 more minutes and inform the user!!!
    }

    let instantPaid = 0.0;
    let instantBalance = 0.0;
    let amount;
    amount = parseFloat(order.amount);

    try {
      if (order.instant_paid != null && order.instant_paid != "0.0") {
        instantPaid = parseFloat(order.instant_paid);
      }
    } catch (e) {
      instantPaid = 0.0;
    }

    try {
      if (order.instant_balance != null && order.instant_balance != "0.0") {
        instantBalance = parseFloat(order.instant_balance);
      } else {
        instantBalance = parseFloat(order.amount);
      }
    } catch (e) {}
    if (instantPaid == amount) {
      // order fully paid!!!
    } else if (instantBalance > 0) {
      // partial payment
      // cancel all pending transactions
      let [batchPending] = await pool.query(
        `UPDATE instant_payout_batches 
        SET  status = ?
        WHERE ref_id = ?
        AND system_confirmed_at IS NULl 
        AND confirmed_by_customer_at IS NULL
        AND confirmed_by_admin_at IS NULl 
        `,
        ["expired", order.refID]
      );

      let type = "payout";
      let mode = "UPI";
      let orderStatus = "pending";
      validator = await getRandomValidator(
        type,
        instantBalance,
        "",
        order.vendor
      );
      if (validator) {
        validatorDetails = {
          username: validator.username,
          upiid: validator.upiid,
          accountNumber: validator.accountNumber,
          paymentMethod: validator.paymentMethod,
          uniqueIdentifier: validator.uniqueIdentifier,
        };
      } else {
        throw Error("no validator found!!");
      }

      let txnFee = 0;
      let diffAmount = 0;
      let finalAmount = instantBalance;

      let vendor = order.vendor;

      let batchData = {
        uuid: uuidv4(),
        order_id: order.id,
        ref_id: order.refID,
        amount: finalAmount,
        pay_in_order_id: null,
        pay_in_ref_id: null,
        status: "pending",
        vendor: vendor,
        payment_from: validatorDetails.upiid,
        payment_to: order.customerUPIID,
        created_at: createdAt,
        updated_at: createdAt,
      };

      let [batchPayoutOrder] = await pool.query(
        "INSERT INTO instant_payout_batches SET ?",
        batchData
      );

      if (order.validatorUPIID == "") {
        let [orderUpdateToAdmin] = await pool.query(
          "UPDATE orders SET instant_balance = ?, validatorUsername = ?, paymentStatus = ?, validatorUPIID = ?  where refID = ?",
          [
            instantBalance,
            validatorDetails.username,
            "pending",
            validatorDetails.upiid,
            order.refID,
          ]
        );
        //console.log(orderUpdateToAdmin);

        let [updatedOrder] = await pool.query(
          "SELECT * FROM orders WHERE refId = ? ",
          [order.refID]
        );

        if (updatedOrder.length > 0) {
          order = updatedOrder[0];
        }

        const io = getIO();
        const emitEvent = `${vendor}-instant-payout-order-updated`;
        const emitValidatorEvent = `${emitEvent}-${validatorDetails.username}`;

        io.emit(emitEvent, order);
        if (validatorDetails.username) {
          io.emit(emitValidatorEvent, order);
        }
      }

      if (batchPayoutOrder.affectedRows !== 1) {
        logger.error("batch payout failed!");
        return res.status(500).json({
          success: false,
          message: "Error inserting order: No Order was inserted",
        });
      } else {
        return res.status(200).json({
          message: "Order is under processing hight priority!!",
          data: order,
        });
      }
    }
  } catch (error) {
    logger.error("An error occurred while trying to get orders.", error);
    logger.debug(error);
    return res.status(500).json({
      message: `An error occurred while trying to get orders: ${error}`,
    });
  }
}

module.exports = checkAndReAssignInstantPayout;
