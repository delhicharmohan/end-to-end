const request = require("request");
const logger = require("../../logger");
const poolPromise = require("../../db");

/**
 * Centralized callback handler to avoid duplication
 * Handles both payin and payout callbacks with proper error handling
 */
async function postAsync(options) {
  const maxAttempts = 3;
  const baseDelayMs = 500; // 0.5s, 1.5s backoff, etc.

  const targetUrl = options?.url || options?.uri || "";
  const host = (() => {
    try { return new URL(targetUrl).host; } catch { return "unknown-host"; }
  })();

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const started = Date.now();
    try {
      const merged = { timeout: 5000, ...options }; // 5s default timeout
      const result = await new Promise((resolve, reject) => {
        request.post(merged, (error, response, body) => {
          if (error) {
            return reject(error);
          }
          resolve({ response, body });
        });
      });

      const { response, body } = result;
      const elapsed = Date.now() - started;
      const code = response?.statusCode ?? 0;
      logger.info(`[callback] host=${host} code=${code} attempt=${attempt}/${maxAttempts} elapsed_ms=${elapsed}`);

      // Retry on 5xx only
      if (code >= 500 && code < 600 && attempt < maxAttempts) {
        const delay = baseDelayMs * attempt * 2 - baseDelayMs; // 500, 1500
        await sleep(delay);
        continue;
      }

      return { response, body };
    } catch (err) {
      const elapsed = Date.now() - started;
      logger.warn(`[callback] error host=${host} attempt=${attempt}/${maxAttempts} elapsed_ms=${elapsed} msg=${err?.message || err}`);
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * attempt * 2 - baseDelayMs;
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Resolve the callback URL for an order.
 * Preference order:
 * 1) order.callback_url (per-order override)
 * 2) secrets.callbackURL (client-level default)
 */
async function resolveCallbackURL(order) {
  if (order && order.callback_url) {
    return order.callback_url;
  }

  const pool = await poolPromise;
  const [secrets] = await pool.query(
    "SELECT callbackURL FROM secrets WHERE clientName = ?",
    [order.clientName]
  );

  if (secrets && secrets.length > 0 && secrets[0].callbackURL) {
    return secrets[0].callbackURL;
  }

  throw new Error("No callback URL configured for this order");
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

/**
 * Send a generic order callback with current or overridden status/utr.
 * Useful for initial "created" or intermediate states.
 */
async function sendGenericCallback(order, callbackURL, overrides = {}) {
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
      utr: overrides.utr !== undefined ? overrides.utr : order.transactionID,
      status: overrides.status !== undefined ? overrides.status : order.paymentStatus,
    };

    const { response, body } = await postAsync({
      url: callbackURL,
      json: callbackPayload,
    });

    logger.info(`Generic callback sent successfully. Order ID: ${order.merchantOrderId}`);
    return { success: true, response, body };
  } catch (error) {
    logger.error(`Generic callback failed. Order ID: ${order.merchantOrderId}, Error: ${error}`);
    throw error;
  }
}

module.exports = {
  sendPayinCallback,
  sendPayoutCallback,
  postAsync,
  resolveCallbackURL,
  sendGenericCallback
};
