const poolPromise = require("../../db");
const logger = require("../../logger");
const { getIO } = require("../../socket");
const moment = require("moment-timezone");

async function unableToPay(req, res, next) {
  try {
    const refID = req.params.refID;
    const paymentStatus = 'failed';

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

    const now = moment().tz(process.env.TIMEZONE);

    // Update the customer's UPI ID
    await pool.query("UPDATE orders SET paymentStatus = ?, unableToPay = ?, updatedAt = ? WHERE refID = ?", [
      paymentStatus,
      true,
      now.format("YYYY-MM-DD HH:mm:ss"),
      refID,
    ]);

    const updateData = {
      refID: refID,
      paymentStatus: paymentStatus,
    };

    const vendor = data.vendor;

    const io = getIO();
    io.emit(`${vendor}-unable-to-pay`, updateData);

    req.order = data;
    req.order.paymentStatus = paymentStatus;

    logger.info(`Transaction failed successfully. refID:${refID}, orderId:${data.merchantOrderId}`);
    
    res.body = {
      message: `Transaction failed successfully. refID:${refID}, orderId:${data.merchantOrderId}`,
      order: data,
    };
    
    next();
  } catch (error) {
    logger.error(
      "An error occurred while trying to fail the transaction.",
      error
    );
    logger.debug(error);
    return res.status(500).json({
      message: "An error occurred while trying to fail the transaction.",
    });
  }
}

module.exports = unableToPay;
