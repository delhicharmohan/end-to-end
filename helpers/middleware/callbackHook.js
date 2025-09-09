const poolPromise = require("../../db");
const logger = require("../../logger");
const request = require("request");
const { resolveCallbackURL } = require("../utils/callbackHandler");

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
  logger.info(`[callbackHook] ▶️ Start orderRef=${req.order?.refID}, type=${req.order?.type}, transactionType=${req.order?.transactionType}`);

  if (req.order.transactionType == 'auto') {
    try {

      let amount;
      if (req.order.paymentMethod == 'automatic_payment_with_sms' || req.order.paymentMethod == 'chrome_extension_with_decimal') {
        amount = req.order.actualAmount;
      } else {
        amount = req.order.amount;
      }

      // Resolve per-order callback if provided, else fallback to client-level callback from secrets
      const callbackURL = await resolveCallbackURL(req.order);

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
      const payload = {
        type: req.order.type,
        amount: parseFloat(amount),
        orderId: req.order.merchantOrderId,
        utr: transactionID,
        status: req.order.paymentStatus,
      };
      logger.info(`[callbackHook] 🔔 Sending callback to client. orderId=${req.order.merchantOrderId}, amount=${payload.amount}, status=${payload.status}`);
      const { response, body } = await postAsync({
        url: callbackURL,
        json: payload,
      });

      logger.info(`Callback sent successfully. Order ID: ${req.order.merchantOrderId}, statusCode=${response?.statusCode}`);
      logger.debug(body);

      
      if(req.hasOwnProperty('is_end_to_end_route')) {
        logger.info(`[callbackHook] ▶️ End-to-end route detected, passing to next()`);
        next();
      } else {
        return res.json({
          status: true,
          message: `Callback sent successfully. Order ID: ${req.order.merchantOrderId}`,
        });
      }
    } catch (error) {
      console.log(error);
      logger.error(`[callbackHook] ❌ Error while sending callback. orderId=${req.order?.merchantOrderId}, message=${error?.message}`);
      logger.debug(error?.stack || error);
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
