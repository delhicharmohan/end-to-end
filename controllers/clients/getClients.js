const poolPromise = require("../../db");
const logger = require("../../logger");

async function getClient(req, res, next) {
  const vendor = req.user.vendor;

  try {
    const pool = await poolPromise;

    let query = "SELECT * FROM secrets";

    // Add vendor condition if it exists
    if (vendor) {
      query += " WHERE vendor = ?";
    }

    const queryParams = vendor ? [vendor] : [''];

    const [result] = await pool.query(query, queryParams);

    if (result.length === 0) {
      logger.info("No clients found.");
      return res.status(200).json({ message: "No clients found", count: 0, clients: [] });
    }

    return res.status(200).json({
      count: result.length,
      clients: result.map((client) => {
        return {
          secret: client.secret,
          xKey: client.xKey,
          clientName: client.clientName,
          callbackURL: client.callbackURL,
          payOutCallbackURL: client.payOutCallbackURL,
          failedOrderCallbackURL: client.failedOrderCallbackURL,
          vendor: client.vendor,
          is_instant_payout: client.is_instant_payout,
          wallet_callback: client.wallet_callback,
          instant_payout_limit: client.instant_payout_limit
        };
      }),
    });
  } catch (error) {
    logger.error("Error while getting clients list.");
    logger.debug(error);
    return res
      .status(500)
      .json({ message: "Error while getting clients list" });
  }
}

module.exports = getClient;
