const poolPromise = require("../../db");
const logger = require("../../logger");

async function isValidOrder(req, res) {
  const refID = req.params.refID;
  const type = req.query.type;
  const isPayoutLink = req.query.isPayoutLink;
  try {
    const pool = await poolPromise;

    let query = "SELECT * FROM `orders` WHERE `refID` = ? AND type = ? AND paymentStatus = ?";

    if (isPayoutLink) {
      query += " AND isPayoutLink = 1";
    }

    const queryParams = [refID, type, 'created'];

    const [results] = await pool.query(query, queryParams);

    if (results.length === 0) {
      logger.error(`Order '${refID}' does not exist.`);
      return res.status(200).json({ success: false, message: `Order '${refID}' does not exist.` });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    logger.error(
      "A Database error occurred while trying to validate order."
    );
    return res.status(200).json({
      success: false,
      message: `A Database error occurred while trying to validate order, error: ${error}`,
    });
  }
}

module.exports = isValidOrder;
