const poolPromise = require("../../db");
const logger = require("../../logger");

async function setCustomerPaymentType(req, res, next) {
  try {
    const refID = req.params.refID;
    const customerPaymentType = req.body.customerPaymentType;

    const pool = await poolPromise;

    // Check if the order exists
    const [orderResults] = await pool.query(
      "SELECT * FROM orders WHERE refID = ?",
      [refID]
    );

    if (orderResults.length === 0) {
      logger.error("Order not found.");
      return res.status(404).json({ message: "Order not found." });
    }

    const data = orderResults[0];

    // Update the customer's UPI ID
    await pool.query(
      "UPDATE orders SET customerPaymentType = ? WHERE refID = ?",
      [customerPaymentType, refID]
    );

    logger.info("Customer Payment Type added successfully.");
    return res.status(201).json({
      message: "Customer Payment Type added successfully.",
      data: data,
    });
  } catch (error) {
    logger.error(
      "An error occurred while trying to add Customer Payment Type.",
      error
    );
    logger.debug(error);
    return res.status(500).json({
      message: "An error occurred while trying to add Customer Payment Type.",
    });
  }
}

module.exports = setCustomerPaymentType;
