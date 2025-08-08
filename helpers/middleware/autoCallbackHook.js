const poolPromise = require("../../db");
const logger = require("../../logger");
const request = require("request");

function postAsync(options) {
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

async function autoCallbackHook(req, res) {
  if (req.order.transactionType == 'auto') {
    try {
      const pool = await poolPromise;

      // Fetch callbackURL from secrets table and send a POST request with the following fields: type, amount, orderId, status
      const [secrets] = await pool.query(
        "SELECT * FROM secrets WHERE clientName = ?",
        [req.order.clientName]
      );

      if (!secrets.length) {
        logger.error(
          `Invalid clientName. Attempted clientName: '${req.order.clientName}'`
        );
        return res.status(201).json({
          status: false,
          message: `Invalid clientName. Attempted clientName: '${req.order.clientName}'`
        });
      }

      const callbackURL = secrets[0].callbackURL;

      // Send a POST request to callbackURL using the request library (async version)
      const { response, body } = await postAsync({
        url: callbackURL,
        json: {
          type: req.order.type,
          amount: parseFloat(req.order.amount),
          orderId: req.order.merchantOrderId,
          utr: req.body.transactionID,
          status: req.order.paymentStatus,
        },
      });

      logger.info(
        `Callback sent successfully. Order ID: ${req.order.merchantOrderId}`
      );

      return res.json({
        status: true,
        message: `Order has been approved successfully. Order ID: ${req.order.merchantOrderId}`,
      });
    } catch (error) {
      logger.error(
        `An error occurred while trying to fetch callbackURL. Order ID: ${req.order.merchantOrderId}`
      );
      return res.status(201).json({
        status: false,
        message: `An error occurred while trying to fetch callbackURL. Order ID: ${req.order.merchantOrderId}`,
      });
    }
  } else {
    logger.info(
      `Manual Pay in false Callback sent successfully. Order ID: ${req.order.merchantOrderId}`
    );
    return res.status(201).json({
      status: true,
      message: `Manual Pay In Order has been approved successfully. Order ID: ${req.order.merchantOrderId}`,
    });
  }
}

module.exports = autoCallbackHook;
