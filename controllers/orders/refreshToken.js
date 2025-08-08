const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");
const { v4: uuidv4 } = require("uuid");

function generateReceiptId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${randomStr}${timestamp}`.substring(0, 10).toUpperCase();
}

async function refreshToken(req, res) {
  
  // check if required fields (refID) is present in the request params
  if (!req.params.refID) {
    logger.error("Missing required fields: refId");
    logger.debug({ provided_fields: [req.params] });
    return res.status(201).json({
      status: false,
      message: "Missing required fields: refId",
    });
  }
  const refID = req.params.refID;

  // check if required token present in the request
  if (!req.headers["token"]) {
    logger.error("Missing token");
    return res.status(201).json({
      status: false,
      message: "Missing token",
    });
  }
  const token = req.headers["token"];

  try {

    const pool = await poolPromise;

    // check if token exists in the orders table
    const [orders] = await pool.query("SELECT refID FROM orders WHERE token = ?", [
      token,
    ]);

    if (!orders.length) {
      logger.info(`Invalid token. token:${token}`);
      return res.status(201).json({
        status: false,
        message: `Invalid token`,
      });
    }

    if (orders[0].refID != refID) {
      logger.info(`Invalid refID. refID:${refID}`);
      return res.status(201).json({
        status: false,
        message: `Invalid refId`,
      });
    }

    // check if token exists in the orders table
    const [autoOrder] = await pool.query("SELECT * FROM orders WHERE refID = ? AND token = ?", [
      refID,
      token,
    ]);

    if (!autoOrder.length) {
      logger.info(`Order not found. refID:${refID}`);
      return res.status(201).json({
        status: false,
        message: "Order not found."
      });
    }

    if (autoOrder[0].paymentStatus === "approved") {
      logger.info(`Order has been already approved. refID:${refID}, orderId:${autoOrder[0].merchantOrderId}`);
      return res
        .status(201)
        .json({
          status: false,
          message: "Order has been already approved."
        });
    }

    if (autoOrder[0].paymentStatus === "failed") {
      logger.info(`Order has been failed. refID:${refID}, orderId:${autoOrder[0].merchantOrderId}`);
      return res.status(201).json({
        status: false,
        message: "Order has been failed."
      });
    }

    const now = moment().tz(process.env.TIMEZONE);

    const newToken = uuidv4();
    const receiptId = generateReceiptId();

    const [results] = await pool.query("UPDATE orders SET token = ?, receiptId = ?, updatedAt = ? WHERE refID = ?", [
      newToken,
      receiptId,
      now.format("YYYY-MM-DD HH:mm:ss"),
      refID,
    ]);

    if (results.affectedRows === 0) {
      logger.error(`Refresh token not generated. refID:${refID}`);
      return res.status(201).json({
        success: false,
        message: 'Refresh token not generated.',
      });
    }

    const data = {
      refId: refID,
      receiptId: receiptId,
      token: newToken,
    };

    console.log(data)

    return res.status(201).json({
      status: true,
      message: "Refresh token has been generated successfully.",
      data: data,
    });

  } catch (error) {
    logger.error(error);
    return res.status(201).json({
      status: false,
      message: `An error occurred while trying to generate refresh token: ${error}`,
    });
  }

}

module.exports = refreshToken;
