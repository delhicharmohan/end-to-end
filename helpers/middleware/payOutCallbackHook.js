const poolPromise = require("../../db");
const logger = require("../../logger");
const request = require("request");
const { resolveCallbackURL } = require("../utils/callbackHandler");

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

async function payOutCallbackHook(req, res) {
  if (req.order.transactionType == 'auto') {
    try {
      const pool = await poolPromise;

      // Resolve per-order callback if provided, else fallback to client-level callback
      const callbackURL = await resolveCallbackURL(req.order);

      const walletCallBack = null; // deprecated wallet callback handling
      
      

      let callBackPayload = {
        type: req.order.type,
        amount: parseFloat(req.order.amount),
        orderId: req.order.merchantOrderId,
        utr: req.body.transactionID,
        status: req.order.paymentStatus,
      };

      if(req.order.type =='payout' &&  (typeof req.order.payout_type !== undefined) && req.order.payout_type == 'instant') {
        callBackPayload.walletStatus = 'unlock';
        if(callBackPayload.status  != 'approved') {
          callBackPayload.status = 'approved';
        }
      }

      // Send a POST request to payout callbackURL using the request library (async version)
      const { response, body } = await postAsync({
        url: callbackURL,
        json: callBackPayload,
      });


      // if(req.order.type =='payout' &&  (typeof req.order.payout_type !== undefined) && req.order.payout_type == 'instant') {
      //    // instant payout unlock wallet api call

      //    if(walletCallBack !== undefined && walletCallBack != '') {
      //     // procceed wallet callback

      //     const { response2, body2 } = await postAsync({
      //       url: walletCallBack,
      //       json: {
      //         orderId: req.order.merchantOrderId,
      //         walletStatus: 'unlock',
      //       },
      //     });

      //     logger.info(
      //       `Wallet status Callback Done! . Order ID: ${req.order.merchantOrderId}`
      //     );
      //     logger.debug(body2);
      //    }
      // }

      logger.info(
        `Pay Out Callback sent successfully. Order ID: ${req.order.merchantOrderId}`
      );
      logger.debug(body);

      return res.json({
        message: `Pay Out Callback sent successfully. Order ID: ${req.order.merchantOrderId}`,
      });
    } catch (error) {
      console.log(error);
      logger.error(
        `An error occurred while trying to send Pay Out callback. Order ID: ${req.order.merchantOrderId}`
      );
      logger.debug(error);
      return res.status(500).json({
        message: `An error occurred while trying to send Pay Out callback. Order ID: ${req.order.merchantOrderId}`,
      });
    }
  } else {
    logger.info(
      `Manual Pay Out false Callback sent successfully. Order ID: ${req.order.merchantOrderId}`
    );
    return res.json({
      message: `Manual Pay Out false Callback sent successfully. Order ID: ${req.order.merchantOrderId}`,
    });
  }
}

module.exports = payOutCallbackHook;
