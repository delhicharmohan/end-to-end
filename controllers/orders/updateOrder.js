const poolPromise = require("../../db");
const logger = require("../../logger");

async function updateOrder(req, res, next) {
  // Update order with different validator
  if (req.body.validator.username && req.body.validator.upiid) {
    try {
      const query =
        "UPDATE orders SET validatorUsername = ?, validatorUPIID = ? WHERE refID = ?";
      const values = [
        req.body.validator.username,
        req.body.validator.upiid,
        req.params.refID,
      ];

      const pool = await poolPromise;

      await pool.query(query, values);

      logger.info("Order updated successfully.");
      return res.status(200).json({
        message: "Order updated successfully.",
      });
    } catch (error) {
      console.log(error);
      logger.error("An error occurred while trying to access the database.");
      logger.debug(error);
      return res.status(500).json({
        message: "An error occurred while trying to access the database.",
      });
    }
  }
}

module.exports = updateOrder;
