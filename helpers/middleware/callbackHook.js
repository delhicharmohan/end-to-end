const poolPromise = require("../../db");
const logger = require("../../logger");
const request = require("request");

function postAsync(options) {
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

async function callbackHook(req, res, next) {

  if (req.order.transactionType == 'auto') {
    try {

      let amount;
      if (req.order.paymentMethod == 'automatic_payment_with_sms' || req.order.paymentMethod == 'chrome_extension_with_decimal') {
        amount = req.order.actualAmount;
      } else {
        amount = req.order.amount;
      }

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
        return res.status(401).json({ message: "Unauthorized." });
      }

      const callbackURL = secrets[0].callbackURL;

      var transactionID = '';
      if(req.body.transactionID != undefined) {
        transactionID = req.body.transactionID;
      } else {
        transactionID = req.order.transactionID;
      }



      console.log("\n \n \n CUSTOMER UTR NUMBER!!! \n \n \n \n");
      console.log(transactionID);   
      console.log("\n \n \n \n \n \n \n");
   



      // Send a POST request to callbackURL using the request library (async version)
      const { response, body } = await postAsync({
        url: callbackURL,
        json: {
          type: req.order.type,
          amount: parseFloat(amount),
          orderId: req.order.merchantOrderId,
          utr: transactionID,
          status: req.order.paymentStatus,
        },
      });

      logger.info(
        `Callback sent successfully. Order ID: ${req.order.merchantOrderId}`
      );
      logger.debug(body);

      
      if(req.hasOwnProperty('is_end_to_end_route')) {
        next();
      } else {
        return res.json({
          status: true,
          message: `Callback sent successfully. Order ID: ${req.order.merchantOrderId}`,
        });
      }
    } catch (error) {
      console.log(error);
      logger.error(
        `An error occurred while trying to fetch callbackURL. Order ID: ${req.order.merchantOrderId}`
      );
      logger.debug(error);
      return res.status(500).json({
        status: false,
        message: `An error occurred while trying to fetch callbackURL. Order ID: ${req.order.merchantOrderId}`,
      });
    }
  } else {
    logger.info(
      `Manual Pay in false Callback sent successfully. Order ID: ${req.order.merchantOrderId}`
    );
    return res.json({
      status: true,
      message: `Manual Pay in false Callback sent successfully. Order ID: ${req.order.merchantOrderId}`,
    });
  }
}

module.exports = callbackHook;
