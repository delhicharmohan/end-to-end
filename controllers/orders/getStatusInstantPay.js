const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require("uuid");
const { getIO } = require("../../socket");
const request = require("request");
const moment = require("moment-timezone");

function generateReceiptId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${randomStr}${timestamp}`.substring(0, 10).toUpperCase();
}

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

async function getStatusInstantPayOut(req, res, next) {

  const now = moment().tz(process.env.TIMEZONE);
  const fifteenMinutesAfter = moment().tz(process.env.TIMEZONE).add(15, "minutes").format("YYYY-MM-DD HH:mm:ss");


  try {
    const refID = req.params.refID;
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

    if (
      payoutOrder.paymentStatus == "unassigned" ||
      payoutOrder.paymentStatus == "pending"
    ) {
      if (
        payoutOrder.customerUPIID != undefined &&
        payoutOrder.customerUPIID != ""
      ) {
        let query = "UPDATE orders set is_instant_payout = ?";
        let assignedValue = [true];
        if (payoutOrder.instant_balance == null) {
          query += ", instant_balance = ?";
          assignedValue.push(payoutOrder.amount);
        }

        if(payoutOrder.instant_payout_expiry_at == null) {
          query += ", instant_payout_expiry_at = ?";
          assignedValue.push(fifteenMinutesAfter);
        }

        query += " WHERE refID= ?";
        assignedValue.push(refID);
        const [update] = await pool.query(query, assignedValue);
      }

      if (
        payoutOrder.type == "payout" &&
        typeof payoutOrder.payout_type !== undefined &&
        payoutOrder.payout_type == "instant"
      ) {
        const [secrets] = await pool.query(
          "SELECT * FROM secrets WHERE clientName = ?",
          [payoutOrder.clientName]
        );

        if (secrets.length > 0) {
          const walletCallBack = secrets[0].wallet_callback;

          if (walletCallBack !== undefined && walletCallBack != "") {
            // proceed wallet callback to lock
            const { response2, body2 } = await postAsync({
              url: walletCallBack,
              json: {
                orderId: payoutOrder.merchantOrderId,
                walletStatus: "lock",
              },
            });

            logger.info(
              `Wallet lock status Callback Done! . Order ID: ${payoutOrder.merchantOrderId}`
            );
            logger.debug(body2);
          }
        }
      }

      return res.status(200).json({
        message: "pending payout",
        data: payoutOrder,
        redirect: false,
      });
    } else if (payoutOrder.paymentStatus == "approved") {
      return res.status(200).json({
        message: "This payout has been already completed!",
        data: payoutOrder,
        redirect: true,
      });
    } else {
      return res.status(200).json({
        message: "This payout has been already completed!",
        data: payoutOrder,
        redirect: true,
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

module.exports = getStatusInstantPayOut;
