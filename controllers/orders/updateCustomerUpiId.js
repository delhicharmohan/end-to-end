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

    let data = orderResults[0];

    // Update the customer's UPI ID
    await pool.query("UPDATE orders SET customerUPIID = ? WHERE refID = ?", [
      customerUPIID,
      refID,
    ]);

    // Re-fetch the updated order to ensure latest fields
    const [updatedRows] = await pool.query(
      "SELECT * FROM orders WHERE refID = ?",
      [refID]
    );
    data = updatedRows && updatedRows.length ? updatedRows[0] : data;

    // Compute the payee UPI ID to be used for QR generation on the client
    // Priority: orders.validatorUPIID (assigned payee for end-to-end or validator), else assigned user's UPI by username, else batch payment_to
    let payeeUPIID = data.validatorUPIID || null;
    if (!payeeUPIID && data.validatorUsername) {
      const [userRows] = await pool.query(
        "SELECT upiid FROM users WHERE username = ? LIMIT 1",
        [data.validatorUsername]
      );
      if (userRows && userRows.length) {
        payeeUPIID = userRows[0].upiid;
      }
    }
    if (!payeeUPIID) {
      const [batchRows] = await pool.query(
        "SELECT payment_to FROM instant_payout_batches WHERE pay_in_ref_id = ? ORDER BY created_at DESC LIMIT 1",
        [refID]
      );
      if (batchRows && batchRows.length) {
        payeeUPIID = batchRows[0].payment_to;
      }
    }

    logger.info("Customer UPI ID updated successfully.");
    return res.status(201).json({
      message: "Customer UPI ID updated successfully.",
      data: { ...data, payeeUPIID },
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
