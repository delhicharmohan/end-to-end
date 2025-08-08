const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require("uuid");
const { getIO } = require("../../socket");
const moment = require("moment-timezone");
const request = require("request");

async function postAsync(options) {
  return new Promise((resolve, reject) => {
    request.post(options, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        resolve({ response, body });
      }
    });
  });
}


function generateReceiptId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${randomStr}${timestamp}`.substring(0, 10).toUpperCase();
}

async function confirmBatchPayout(req, res, next) {
  // this is for confirming the batch transaction and  and forward this to the orders table for the approval as next()
  try {
    const now = moment().tz(process.env.TIMEZONE);
    const createdAt = now.format("YYYY-MM-DD HH:mm:ss");

    const refID = req.params.refID;
    const batchUuid = req.body.uuid;

    if (batchUuid == null) {
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

    let payoutBatch;
    const [payoutBatches] = await pool.query(
      `
      SELECT *
      FROM instant_payout_batches
      WHERE uuid = ?
      AND ref_id = ? AND system_confirmed_at IS NOT NULL 
      AND confirmed_by_customer_at IS NULL
    `,
      [batchUuid, payoutOrder.refID]
    );

    if (payoutBatches.length > 0) {
      payoutBatch = payoutBatches[0];
    } else {
      console.log("ITS BREAKING HERE!!!!!!!!!");
    }

    if (payoutBatch) {
      let updatedAt = createdAt;
      await pool.query(
        `UPDATE instant_payout_batches SET confirmed_by_customer_at = ?, updated_at = ? WHERE uuid = ?`,
        [createdAt,updatedAt, batchUuid]
      );
      payoutBatch.confirmed_by_customer_at = createdAt;
      req.payoutBatch = payoutBatch;
      req.payoutOrder = payoutOrder;
      next();
    } else {
      return res.status(400).json({
        message: "order has been already processed",
      });
    }
  } catch (error) {
    logger.error("An error occurred while trying to get orders.", error);
    logger.debug(error);
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


    if(
      req.payoutBatch.confirmed_by_admin_at != null && 
      req.payoutOrder.validatorUPIID != null && 
      req.payoutOrder.paymentStatus == 'approved'
    ) {
      return res.status(200)
      .json({ message: "Payment Confirmed!!" });
    }

    let pool = await poolPromise;
    let payoutBatch = req.payoutBatch;
    let payInOrder;
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
    }

    let transactionID = payInOrder.customerUtr;
    let refID = payInOrder.refID;
    let vendor = payInOrder.vendor;
    if (payInOrder) {
      let [results] = await pool.query(
        "UPDATE orders SET paymentStatus = ?, transactionID = ?,  updatedAt = ? WHERE refID = ?",
        ["approved", transactionID, now.format("YYYY-MM-DD HH:mm:ss"), refID]
      );

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
      next();
    }
  } catch (error) {
    logger.error("An error occurred in updating payin transaction.", error);
    return res.status(500).json({
      message: `An error occurred while trying to get orders: ${error}`,
    });
  }
}

async function confirmPayOutTransaction(req, res, next) {

  console.log("last order!!!!===============");
  const now = moment().tz(process.env.TIMEZONE);
  const createdAt = now.format("YYYY-MM-DD HH:mm:ss");

  try {
    let pool = await poolPromise;
    let payoutBatch = req.payoutBatch;
    let payoutOrder = req.payoutOrder;

    let [payoutOrders] = await pool.query(
      `
      SELECT * FROM orders WHERE type = ?  
      AND refID = ? 
      `,
      ["payout", payoutOrder.refID]
    );

    if (payoutOrders.length > 0) {
      payoutOrder = payoutOrders[0];
    }

    let paymentStatus;
    let transactionID;

    if (payoutOrder) {

      console.log("payoutOrder reached!!! ");
      let totalAmount = parseFloat(payoutOrder.amount);
      let instantPaid = parseFloat(payoutOrder.instant_paid);
      if (payoutOrder.payout_type == "instant") {
        // instant

        console.log("before matching ");

        console.log(typeof totalAmount);
        console.log(typeof instantPaid);

        if (instantPaid == totalAmount) {
          //  full amount paid
          let batchUTR = [];
          let batchUTRString = '';
          let [batchOrders] = await pool.query(
            `
              SELECT * FROM instant_payout_batches 
              WHERE order_id = ? 
              AND utr_no IS NOT NULL
            `,
            [payoutOrder.id]
          );

          if(batchOrders.length > 0) {
            batchOrders.forEach(item => {
              batchUTR.push(item.utr_no);
            });
            batchUTRString = batchUTR.join(', ');
          }

          paymentStatus = "approved";
          transactionID = batchUTRString;

          const [results] = await pool.query(
            "UPDATE orders SET paymentStatus = ?,  updatedAt = ? WHERE refID = ?",
            [
              paymentStatus,
              now.format("YYYY-MM-DD HH:mm:ss"),
              payoutOrder.refID,
            ]
          );
          // callback handle here itself
          const [secrets] = await pool.query(
            "SELECT * FROM secrets WHERE clientName = ?",
            [payoutOrder.clientName]
          );

          if(secrets.length == 0) {
            // throw error
          }
          const callbackURL = secrets[0].payOutCallbackURL;
          const walletCallBack = secrets[0].wallet_callback;

          let callbackPayload = {
            type: payoutOrder.type,
            amount: parseFloat(payoutOrder.amount),
            orderId: payoutOrder.merchantOrderId,
            utr: transactionID,
            status: paymentStatus,
          };


          console.log("\n \n \n \n \n ");
          console.log("call back payload ");
          console.log(callbackPayload);
          console.log("\n \n \n \n \n ");

          if(payoutOrder.type =='payout' &&  (typeof payoutOrder.payout_type !== undefined) && payoutOrder.payout_type == 'instant') {
            callbackPayload.walletStatus = 'unlock';
          }

          const { response, body } = await postAsync({
            url: callbackURL,
            json: callbackPayload,
          });


        //   if(payoutOrder.type =='payout' &&  (typeof payoutOrder.payout_type !== undefined) && payoutOrder.payout_type == 'instant') {
        //     // instant payout unlock wallet api call
   
        //     if(walletCallBack !== undefined && walletCallBack != '') {
        //      // procceed wallet callback
   
        //      const { response2, body2 } = await postAsync({
        //        url: walletCallBack,
        //        json: {
        //          orderId: payoutOrder.merchantOrderId,
        //          walletStatus: 'unlock',
        //        },
        //      });
   
        //      logger.info(
        //        `Wallet status Callback Done! . Order ID: ${payoutOrder.merchantOrderId}`
        //      );
        //      logger.debug(body2);
        //     }
        //  }

          //console.log("payout callback processed!!!!!! ");
          // logger.info(
          //   `Pay Out Callback sent successfully. Order ID: ${payoutOrder.merchantOrderId}`
          // );
          return res.status(200)
          .json({ message: "Payment Confirmed!!" });
          
        } else if (instantPaid <= 0) {
          console.log("Payment not yet done!!");
          // not paid anything
          return res
          .status(204)
          .json({ message: "Payment not yet Done!" });

        } else if (instantPaid < totalAmount) {

          console.log("Partial Payment!!!");
          // partial paid
          return res
          .status(206)
          .json({ message: "Payment Confirmed Partially" });
        }
      } else {
        console.log("here you are!!!");
      }
    } else {
      console.log("Main Else Block");
        return res
          .status(204)
          .json({ message: "Payment not yet Done!" });
    }
  } catch (e) {
    console.log(e);
      return res
          .status(204)
          .json({ message: "Payment not yet Done!" });
  }
}

module.exports = {
  confirmBatchPayout,
  confirmPayInTransaction,
  confirmPayOutTransaction,
};
