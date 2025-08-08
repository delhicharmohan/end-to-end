const poolPromise = require("../../db");
const logger = require("../../logger");
// const { getIO } = require("../../socket");

async function updateCustomerUpiId(req, res, next) {
  try {
    const refID = req.params.refID;
    const customerUPIID = req.body.customerUPIID;

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
    await pool.query("UPDATE orders SET customerUPIID = ? WHERE refID = ?", [
      customerUPIID,
      refID,
    ]);

    const updateData = {
      refID: refID,
      customerUPIID: customerUPIID,
    };

    const vendor = data.vendor;

    // const io = getIO();
    // io.emit(`${vendor}-customer-upi-updated`, updateData);

    logger.info("Customer UPI ID updated successfully.");
    return res.status(201).json({
      message: "Customer UPI ID updated successfully.",
      data: data,
    });
  } catch (error) {
    logger.error(
      "An error occurred while trying to update customer UPI ID.",
      error
    );
    logger.debug(error);
    return res.status(500).json({
      message: "An error occurred while trying to update customer UPI ID.",
    });
  }
}

module.exports = updateCustomerUpiId;
