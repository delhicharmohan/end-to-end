const request = require("request");
const logger = require("../../logger");

/**
 * Centralized callback handler to avoid duplication
 * Handles both payin and payout callbacks with proper error handling
 */
async function postAsync(options) {
  return new Promise((resolve, reject) => {
    request.post(options, (error, response, body) => {
      if (error) {
        logger.error(`Callback request error: ${error}`);
        reject(error);
      } else {
        logger.info(`Callback response received: Status ${response.statusCode}`);
        resolve({ response, body });
      }
    });
  });
}

/**
 * Send payin callback
 */
async function sendPayinCallback(order, callbackURL) {
  try {
    let amount;
    if (
      order.paymentMethod == "automatic_payment_with_sms" ||
      order.paymentMethod == "chrome_extension_with_decimal"
    ) {
      amount = order.actualAmount;
    } else {
      amount = order.amount;
    }

    const callbackPayload = {
      type: order.type,
      amount: parseFloat(amount),
      orderId: order.merchantOrderId,
      utr: order.transactionID,
      status: order.paymentStatus,
    };

    const { response, body } = await postAsync({
      url: callbackURL,
      json: callbackPayload,
    });

    logger.info(`Payin callback sent successfully. Order ID: ${order.merchantOrderId}`);
    return { success: true, response, body };
  } catch (error) {
    logger.error(`Payin callback failed. Order ID: ${order.merchantOrderId}, Error: ${error}`);
    throw error;
  }
}

/**
 * Send payout callback
 */
async function sendPayoutCallback(order, callbackURL, transactionID) {
  try {
    const callbackPayload = {
      type: order.type,
      amount: parseFloat(order.amount),
      orderId: order.merchantOrderId,
      utr: transactionID,
      status: 'approved',
    };

    // Add wallet unlock status for instant payouts
    if (order.type === 'payout' && order.payout_type === 'instant') {
      callbackPayload.walletStatus = 'unlock';
    }

    const { response, body } = await postAsync({
      url: callbackURL,
      json: callbackPayload,
    });

    logger.info(`Payout callback sent successfully. Order ID: ${order.merchantOrderId}`);
    return { success: true, response, body };
  } catch (error) {
    logger.error(`Payout callback failed. Order ID: ${order.merchantOrderId}, Error: ${error}`);
    throw error;
  }
}

module.exports = {
  sendPayinCallback,
  sendPayoutCallback,
  postAsync
};
