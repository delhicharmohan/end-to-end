const poolPromise = require("../../db");
const logger = require("../../logger");

async function updateOrderStatus(req, res) {
  try {
    const refID = req.params.refID;

    const pool = await poolPromise;

    // Check if the order exists
    const [orderResults] = await pool.query(
      "SELECT * FROM orders WHERE refID = ?",
      [refID]
    );

    if (orderResults.length === 0) {
      logger.error("Order not found.");
      return res.status(201).json({ status: false, message: "Order not found." });
    }

    let paymentStatus = 'pending';
    if ((orderResults[0].customerUtr == null || orderResults[0].customerUtr == '') && (orderResults[0].upload_screenshot == null || orderResults[0].upload_screenshot == '')){
      paymentStatus = 'failed';
    }

    // Update the customer's UPI ID
    await pool.query("UPDATE orders SET paymentStatus = ? WHERE refID = ? AND paymentStatus = ?", [
      paymentStatus,
      refID,
      'pending'
    ]);

    logger.info("paymentStatus updated successfully.");
    return res.status(201).json({
      status: true,
      message: "paymentStatus updated successfully.",
    });
  } catch (error) {
    logger.error(
      "An error occurred while trying to update paymentStatus.",
      error
    );
    return res.status(500).json({
      status: false,
      message: "An error occurred while trying to update paymentStatus.",
    });
  }
}

module.exports = updateOrderStatus;
