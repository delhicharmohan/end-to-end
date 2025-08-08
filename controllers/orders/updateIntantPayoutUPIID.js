const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require("uuid");
const { getIO } = require("../../socket");

function generateReceiptId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${randomStr}${timestamp}`.substring(0, 10).toUpperCase();
}

async function updateInstantPayoutUPIID(req, res, next) {
  try {
    const refID = req.params.refID;

    const requiredFields = ["customerUPIID"];

    const fields = req.body;
    const missingFields = requiredFields.filter(
      (field) => !fields.hasOwnProperty(field)
    );

    // validations
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    let customerUPIID = fields.customerUPIID;

    const pool = await poolPromise;
    const [results] = await pool.query(
      "SELECT * FROM orders WHERE refID = ? AND type = ? AND payout_type = ? AND paymentStatus = ?",
      [refID, "payout", "instant", "unassigned"]
    );
    

    if (results.length === 0) {
      logger.error(`Order '${refID}' attempted to get does not exist.`);
      return res.status(404).json({ message: "Order not found." });
    }

    const payoutOrder = results[0];

    if (
      payoutOrder.customerUPIID == undefined ||
      payoutOrder.customerUPIID == ""
    ) {
      await pool.query("UPDATE orders SET customerUPIID = ? WHERE refID = ?", [
        customerUPIID,
        refID,
      ]);

      payoutOrder.customerUPIID = customerUPIID;

      return res.status(200).json({
        message: "Payout UPI ID Updated!",
        data: payoutOrder,
        redirect: false,
      });
      // payout updatable
    } else {
      return res.status(200).json({
        message: "Payout UPI ID Already Updated!",
        data: payoutOrder,
        redirect: false,
      });
    }
  } catch (error) {
    logger.error("An error occurred while trying to get orders.", error);
    logger.debug(error);
    return res.status(500).json({
      message: `An error occurred while trying to get orders: ${error}`,
    });
  }
}

module.exports = updateInstantPayoutUPIID;
