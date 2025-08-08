const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");

async function approveOrder(req, res, next) {
  const vendor = req.user.vendor;
  // check if required fields (refID, transactionID) are present in the request body
  if (!req.params.refID || !req.body.transactionID) {
    logger.error("Missing required fields: refID, transactionID");
    logger.debug({ provided_fields: [req.params, req.body] });
    return res.status(400).json({
      message: "Missing required fields.",
    });
  }

  const refID = req.params.refID;
  const transactionID = req.body.transactionID;
  const username = req.user.username;
  const role = req.user.role;
  let isExistinOrderHistory = false;

  try {
    const pool = await poolPromise;

    // check if refID exists in the orders table
    let [orders] = await pool.query("SELECT * FROM orders WHERE refID = ?", [
      refID,
    ]);

    if (!orders.length) {
      // Check the order in orders_history table if it does not exist in orders table
      [orders] = await pool.query("SELECT * FROM orders_history WHERE refID = ?", [
        refID,
      ]);

      if (!orders.length) {
        return res.status(404).json({ message: "Order not found." });
      }

      isExistinOrderHistory = true;
      
    }

    // check the utr exist or not
    if (orders[0].transactionID == transactionID) {
      return res
        .status(400)
        .json({ message: "Duplicate UTR." });
    }
    [previousOrder] = await pool.query("SELECT * FROM orders_history WHERE transactionID = ?", [transactionID]);
    if (previousOrder.length) {
      return res.status(400).json({ message: "Duplicate UTR." });
    }

    if (orders[0].paymentStatus === "approved") {
      return res
        .status(400)
        .json({ message: "Order has already been approved." });
    }
    if (orders[0].paymentStatus === "cancelled") {
      return res.status(400).json({ message: "Order has been cancelled." });
    }

    const validatorUsername = orders[0].validatorUsername;

    // check the approved by user/admin
    if (validatorUsername) {
      const [db_user] = await pool.query(
        "SELECT * FROM users WHERE username = ?",
        [validatorUsername]
      );

      if (!db_user.length) {
        return res.status(404).json({ message: "User not found." });
      }
      if (!db_user[0].status) {
        return res.status(403).json({
          message:
            "Unauthorized: Your account has not been enabled for the day.",
        });
      }
      if (db_user[0].upiid !== orders[0].validatorUPIID) {
        return res.status(403).json({
          message:
            "Unauthorized: You are not authorized to approve this order.",
        });
      }
      if (db_user[0].payInLimit < orders[0].amount) {
        return res.status(403).json({
          message: "You don't have sufficiant pay in limit",
        });
      }

      req.validator = db_user[0];
    } else {
      return res.status(403).json({
        message: "validatorUsername not found.",
      });
    }

    const now = moment().tz(process.env.TIMEZONE);

    // update the order status to approved
    let results;
    if (isExistinOrderHistory) {
      [results] = await pool.query(
        "UPDATE orders_history SET paymentStatus = ?, transactionID = ?, approvedBy = ?, approvedByUsername = ?, updatedAt = ? WHERE refID = ?",
        [
          "approved",
          transactionID,
          role,
          username,
          now.format("YYYY-MM-DD HH:mm:ss"),
          refID,
        ]
      );

      // Delete moved rows from orders
      await pool.query(`DELETE FROM orders WHERE refID = ?`, [refID]);
      // Insert selected rows into orders_history
      await pool.query(`INSERT INTO orders (SELECT * FROM orders_history WHERE refID = ?)`, [refID]);
      // Delete moved rows from orders_history
      await pool.query(`DELETE FROM orders_history WHERE refID = ?`, [refID]);

    } else {
      [results] = await pool.query(
        "UPDATE orders SET paymentStatus = ?, transactionID = ?, approvedBy = ?, approvedByUsername = ?, updatedAt = ? WHERE refID = ?",
        [
          "approved",
          transactionID,
          role,
          username,
          now.format("YYYY-MM-DD HH:mm:ss"),
          refID,
        ]
      );
    }

    const approvedData = {
      refID: refID,
      paymentStatus: "approved",
    };

    const changedData = {
      refID: refID,
      paymentStatus: 'approved',
      transactionID: transactionID,
    };

    const io = getIO();
    io.emit(`${vendor}-order-approved-${refID}`, approvedData);
    io.emit(`${vendor}-order-update-status-and-trnx`, changedData);

    // Populate req.order with the order details
    req.order = orders[0];
    req.order.paymentStatus = "approved";

    logger.info(
      `Order approved successfully. refID:${refID}, orderId:${req.order.merchantOrderId}`
    );

    res.body = {
      message: "Order approved successfully.",
      order: results,
    };
    next();
  } catch (error) {
    logger.error(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(500).json({
        message: "This UTR number is already added to another transaction.",
      });
    } else {
      return res.status(500).json({
        message: "An error occurred while trying to access the database.",
      });
    }
  }
}

module.exports = approveOrder;
