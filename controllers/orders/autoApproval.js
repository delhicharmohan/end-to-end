const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");

async function autoApproval(req, res, next) {
  
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

  // check if required fields (status) is present in the request body
  if (!req.body.status) {
    logger.error("Missing required fields: status");
    return res.status(201).json({
      status: false,
      message: `Missing required fields: status`,
    });
  }
  const paymentStatus = req.body.status;

  // check if required fields (transactionId) is present in the request body
  if (!req.body.transactionId) {
    logger.error("Missing required fields: transactionId");
    return res.status(201).json({
      status: false,
      message: `Missing required fields: transactionId`,
    });
  }
  const transactionID = req.body.transactionId;

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

    const validatorUsername = autoOrder[0].validatorUsername;

    // check the approved by user/admin
    if (validatorUsername) {
      const [db_user] = await pool.query(
        "SELECT * FROM users WHERE username = ?",
        [validatorUsername]
      );

      if (!db_user.length) {
        logger.info(`Agent not found. validatorUsername:${validatorUsername}}`);
        return res.status(201).json({
          status: false,
          message: "Agent not found."
        });
      }
      if (!db_user[0].status) {
        logger.info(`Agent account has not been enabled for the day. validatorUsername:${validatorUsername}}`);
        return res.status(201).json({
          status: false,
          message: "Agent account has not been enabled for the day.",
        });
      }
      if (db_user[0].payInLimit < autoOrder[0].amount) {
        logger.info(`Agent don't have sufficiant pay in limit. validatorUsername:${validatorUsername}}`);
        return res.status(201).json({
          status: false,
          message: "Agent don't have sufficiant pay in limit",
        });
      }
      req.validator = db_user[0];
    } else {
      logger.info(`Agent not found. validatorUsername:${validatorUsername}}`);
      return res.status(403).json({
        status: false,
        message: "Agent not found.",
      });
    }

    const now = moment().tz(process.env.TIMEZONE);

    // update the order status to approved
    const [results] = await pool.query(
      "UPDATE orders SET paymentStatus = ?, transactionID = ?, approvedBy = ?, updatedAt = ? WHERE refID = ?",
      [
        paymentStatus,
        transactionID,
        "auto",
        now.format("YYYY-MM-DD HH:mm:ss"),
        refID,
      ]
    );

    if (results.affectedRows === 0) {
      logger.error(`Order not updated. refID:${refID}`);
      return res.status(201).json({
        success: false,
        message: 'Order not updated.',
      });
    }

    if (paymentStatus === 'failed') {
      return res.status(201).json({
        status: true,
        message: "Order has been updated as failed.",
      });
    }

    const approvedData = {
      refID: refID,
      paymentStatus: paymentStatus,
    };

    const io = getIO();
    io.emit(`auto-order-approved-${refID}`, approvedData);

    // Populate req.order with the order details
    req.order = autoOrder[0];
    req.order.paymentStatus = "approved";

    logger.info(`Order has been approved successfully. refID:${refID}, orderId:${autoOrder[0].merchantOrderId}`);

    res.body = {
      message: "Order approved successfully.",
      order: results,
    };
    next();

  } catch (error) {
    logger.error(error);
    return res.status(201).json({
      status: false,
      message: `An error occurred while trying to approve order automatically: ${error}`,
    });
  }

}

module.exports = autoApproval;
