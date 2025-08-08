const poolPromise = require("../../db");
const logger = require("../../logger");
const request = require("request");
const moment = require("moment-timezone");

async function postAsync(options) {
  return new Promise((resolve, reject) => {
    request.post(options, (error, response, body) => {
      if (error) {
        logger.error(
          `An error occurred while trying to send callback. error: ${error}`
        );
        reject(error);
      } else {
        logger.info(
          `Response from callback. response: ${response}, body: ${body}`
        );
        resolve({ response, body });
      }
    });
  });
}

async function sendCallbackToFailedOrders(req, res) {
  const vendor = req.user.vendor;
  try {
    const selectedIds = req.body.selectedIds;
    const paymentStatus = req.body.paymentStatus;

    const query = `SELECT * FROM orders WHERE refID IN (${selectedIds
      .map(() => "?")
      .join(",")})`;

    const pool = await poolPromise;

    const [results] = await pool.query(query, selectedIds);

    if (results.length === 0) {
      logger.info("No records found.");
      return res.status(404).json({ message: "No records found" });
    }

    const [secrets] = await pool.query(
      "SELECT vendor, clientName, failedOrderCallbackURL FROM secrets WHERE vendor = ?",
      [vendor]
    );

    results.forEach(async (record) => {
      
      const secretElement = secrets.find(secret => secret.vendor === record.vendor);
      const failedOrderCallbackURL = secretElement ? secretElement.failedOrderCallbackURL : null;

      if (failedOrderCallbackURL) {
        // Send a POST request to callbackURL using the request library (async version)
        const { response, body } = await postAsync({
          url: failedOrderCallbackURL,
          json: {
            type: record.type,
            amount: parseFloat(record.amount),
            orderId: record.merchantOrderId,
            utr: record.transactionID,
            status: paymentStatus,
          },
        });

        if (response) {

          let now = moment().tz(process.env.TIMEZONE);
          let updatedAt = now.format("YYYY-MM-DD HH:mm:ss")
          
          const updateQuery =
            "UPDATE orders SET paymentStatus = ?, manualCallback = ?, updatedAt = ? WHERE refID = ?";
          const updateParams = [paymentStatus, true, updatedAt, record.refID];
          const [updateResult] = await pool.query(updateQuery, updateParams);

          if (updateResult.affectedRows) {
            logger.info(
              `Callback sent successfully. Order ID: ${record.merchantOrderId}`
            );
          } else {
            logger.info(
              `Callback sent failed. Order ID: ${record.merchantOrderId}`
            );
          }
        }
      }
    });

    return res.status(201).json({
      message: "Callback sent successfully.",
    });
  } catch (error) {
    logger.error(
      "An error occurred while trying to send callback to Failed Orders.",
      error
    );
    logger.debug(error);
    return res.status(500).json({
      message:
        "An error occurred while trying to send callback to Failed Orders",
    });
  }
}

module.exports = sendCallbackToFailedOrders;
