const poolPromise = require("../../db");
const logger = require("../../logger");

async function isValidVendor(req, res) {

  if (!req.params.vendor) {
    logger.error("Missing required field: vendor");
    return res.status(200).json({ success: false, message: `Missing required field: vendor` });
  }

  const vendor = req.params.vendor;
  
  try {
    const pool = await poolPromise;

    let query = "SELECT * FROM `users` WHERE `username` = ? AND role = ? AND status = ? AND is_deleted = ?";
    const queryParams = [vendor, 'order_creator', 1, 0];

    const [results] = await pool.query(query, queryParams);

    if (results.length == 0) {
      logger.error(`Order Creator '${vendor}' does not exist.`);
      return res.status(200).json({ success: false, message: `Order Creator '${vendor}' does not exist.` });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    logger.error(
      "A Database error occurred while trying to validate Order Creator."
    );
    return res.status(200).json({
      success: false,
      message: `A Database error occurred while trying to validate Order Creator, error: ${error}`,
    });
  }
}

module.exports = isValidVendor;
