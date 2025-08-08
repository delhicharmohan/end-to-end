const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");

async function createClient(req, res, next) {

  try {
    const pool = await poolPromise;

    const now = moment().tz(process.env.TIMEZONE);
    const created_at = updated_at = now.format("YYYY-MM-DD HH:mm:ss");

    const result = await pool.query(
      "INSERT INTO secrets (secret, xKey, clientName, callbackURL, payOutCallbackURL, wallet_callback, failedOrderCallbackURL, vendor, instant_payout_limit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        req.body.secret,
        req.body.xKey,
        req.body.clientName,
        req.body.callbackURL,
        req.body.payOutCallbackURL,
        req.body.wallet_callback,
        req.body.failedOrderCallbackURL,
        req.body.vendor,
        req.body.instant_payout_limit,
        created_at,
        updated_at,
      ]
    );

    return res.status(201).json({
      message: "Client created successfully",
    });
  } catch (error) {
    logger.error("Error while creating client.");
    logger.debug(error);
    return res.status(500).json({ message: "Error while creating client" });
  }
}

module.exports = createClient;
