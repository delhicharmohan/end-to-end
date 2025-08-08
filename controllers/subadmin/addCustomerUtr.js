const poolPromise = require("../../db");
const logger = require("../../logger");
const { getIO } = require("../../socket");
const moment = require("moment-timezone");
const request = require("request");

async function addCustomerUtr(req, res) {
  try {
    const refID = req.params.refID;
    const customerUtr = req.body.customerUtr;
    const edit_amount = req.body.edit_amount;

    const pool = await poolPromise;

    // Check if the order exists
    const [orderResults] = await pool.query(
      "SELECT * FROM orders WHERE refID = ?",
      [refID]
    );

    if (orderResults.length === 0) {
      logger.error("Order not found.");
      return res.status(201).json({ message: "Order not found." });
    }

    const data = orderResults[0];

    if (data.customerUtr) {
      logger.error("UTR is already updated.");
      return res.status(201).json({ status: false, message: "UTR is already updated." });
    }

    // Check if the record exists in orders_history
    const [orderTxnResults] = await pool.query("SELECT * FROM orders WHERE transactionID = ?", [customerUtr]);
    if (orderTxnResults.length) {
      return res.status(201).json({
          status: false,
          message: `Duplicate UTR.`
      });
    } else {
      const [orderHistoryTxnResults] = await pool.query("SELECT * FROM orders_history WHERE transactionID = ?", [customerUtr]);
      if (orderHistoryTxnResults.length) {
        return res.status(201).json({
          status: false,
          message: `Duplicate UTR.`
        });
      }
    }

    let amount = data.amount;
    let actualAmount = data.actualAmount;
    let txnFee = data.txnFee;
    let diffAmount = data.diffAmount;

    if (data.amount != edit_amount) {
      // add to edit_amount_history table
      await addToEditAmountHistoryTable(data.refID, data.amount, data.actualAmount, data.txnFee, data.diffAmount, edit_amount);
      amount = edit_amount;
      diffAmount = (actualAmount - edit_amount).toFixed(2);
      if (diffAmount > 0) {
        txnFee = (1 - diffAmount).toFixed(2);
      } else {
        txnFee = 0;
      }
      data.amount = edit_amount;
    }

    const now = moment().tz(process.env.TIMEZONE);
    // Update the customer's UPI ID
    await pool.query("UPDATE orders SET customerUtr = ?, amount = ?, actualAmount = ?, txnFee = ?, diffAmount = ?, updatedAt = ? WHERE refID = ?", [
      customerUtr,
      amount,
      actualAmount,
      txnFee,
      diffAmount,
      now.format("YYYY-MM-DD HH:mm:ss"),
      refID,
    ]);

    const updateData = {
      refID: refID,
      customerUtr: customerUtr,
    };

    const vendor = data.vendor;

    const io = getIO();
    io.emit(`${vendor}-customer-utr-updated`, updateData);

    //check the utr exist in chorme_extension_logs
    [chorme_extension_logs] = await pool.query("SELECT * FROM chorme_extension_logs WHERE utr = ? AND status = ?", [customerUtr, 0]);
    if (chorme_extension_logs.length) {
      if (chorme_extension_logs[0].amount == data.amount) {
        await approveChromeExtensionOrder(data, customerUtr, chorme_extension_logs[0].amount);
        data.paymentStatus = 'approved';
      }
    }

    logger.info("Customer UTR Type added successfully.");
    return res.status(201).json({
      status: true,
      message: "Customer UTR Type added successfully.",
      data: data,
    });
  } catch (error) {
    logger.error("An error occurred while trying to add Customer UTR.", error);
    logger.debug(error);
    return res.status(201).json({
      message: `An error occurred while trying to add Customer UTR. ${error}`,
    });
  }
}

async function addToEditAmountHistoryTable(orders_id, amount, actualAmount, txnFee, diffAmount, edit_amount) {
  const pool = await poolPromise;
  const now = moment().tz(process.env.TIMEZONE);

  await pool.query(
    "INSERT INTO edit_amount_history (orders_id, amount, actualAmount, txnFee, diffAmount, edit_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      orders_id,
      amount,
      actualAmount,
      txnFee,
      diffAmount,
      edit_amount,
      now.format("YYYY-MM-DD HH:mm:ss"),
      now.format("YYYY-MM-DD HH:mm:ss"),
    ]
  );
}

async function approveChromeExtensionOrder(data, transactionID, chrome_amount) {
  const pool = await poolPromise;
  const now = moment().tz(process.env.TIMEZONE);
  const [results] = await pool.query(
    "UPDATE orders SET chrome_status = ?, chrome_amount = ?, paymentStatus = ?, transactionID = ?, approvedBy = ?, updatedAt = ? WHERE refID = ?",
    [
      'completed',
      chrome_amount,
      "approved",
      transactionID,
      "auto_extension",
      now.format("YYYY-MM-DD HH:mm:ss"),
      data.refID,
    ]
  );

  const approvedData = {
      refID: data.refID,
      paymentStatus: "approved",
  };

  const changedData = {
      refID: data.refID,
      paymentStatus: 'approved',
      transactionID: transactionID,
  };

  const io = getIO();
  io.emit(`${data.vendor}-order-approved-${data.refID}`, approvedData);
  io.emit(`${data.vendor}-order-update-status-and-trnx`, changedData);

  data.paymentStatus = "approved";
  data.transactionID = transactionID;

  logger.info(
    `Order approved successfully with utr and chrome extension. refID:${data.refID}, orderId:${data.merchantOrderId}`
  );

  const validatorUsername = data.validatorUsername;

  const [db_user] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [validatorUsername]
  );
  const user = db_user[0];

  // Update the commission and balance
  const commissionPercentage = user.payInCommission;
  const commission = (chrome_amount * commissionPercentage) / 100;
  const balanceUpdateQuery = "UPDATE users SET balance = balance + ?, payInLimit = payInLimit - ? WHERE username = ?";
  await pool.query(balanceUpdateQuery, [commission, chrome_amount, validatorUsername]);
  logger.info(
      `Commission updated successfully with utr and chrome extension. refID:${data.refID}, orderId:${data.merchantOrderId}`
  );

  await sendCallback(data);

  await pool.query(
    "UPDATE chorme_extension_logs SET orders_ref_id = ?, status = ?, updated_at = ? WHERE utr = ?",
    [
      data.refID,
      1,
      now.format("YYYY-MM-DD HH:mm:ss"),
      transactionID,
    ]
  );

}

async function sendCallback(order) {
  if (order.transactionType == 'auto') {
    try {

      let amount;
      if (order.paymentMethod == 'automatic_payment_with_sms' || order.paymentMethod == 'chrome_extension_with_decimal') {
        amount = order.actualAmount;
      } else {
        amount = order.amount;
      }

      const pool = await poolPromise;

      // Fetch callbackURL from secrets table and send a POST request with the following fields: type, amount, orderId, status
      const [secrets] = await pool.query(
        "SELECT * FROM secrets WHERE clientName = ?",
        [order.clientName]
      );

      if (!secrets.length) {
        logger.error(
          `Invalid clientName. Attempted clientName: '${order.clientName}'`
        );
        return {
            status: false,
            message: `Invalid clientName. Attempted clientName: ${order.clientName}`,
        }
      }

      const callbackURL = secrets[0].callbackURL;      

      // Send a POST request to callbackURL using the request library (async version)
      const { response, body } = await postAsync({
        url: callbackURL,
        json: {
          type: order.type,
          amount: parseFloat(amount),
          orderId: order.merchantOrderId,
          utr: order.transactionID,
          status: order.paymentStatus,
        },
      });

      logger.info(
        `Callback sent successfully with utr and chrome extension. Order ID: ${order.merchantOrderId}`
      );

    } catch (error) {
      logger.error(
        `An error occurred while trying to fetch callbackURL with chrome extension. Order ID: ${order.merchantOrderId}, error: ${error}`
      );
    }
  } else {
    logger.info(
      `Manual Pay in false Callback sent successfully. Order ID: ${order.merchantOrderId}`
    );
  }
}

async function postAsync(options) {
  return new Promise((resolve, reject) => {
    request.post(options, (error, response, body) => {
      if (error) {
        logger.error(
          `An error occurred while trying to send callback. error: ${error}`
        );
        reject(error);
      } else {
        logger.info(
          `Response from callback. response: ${response}, body: ${body}`
        );
        resolve({ response, body });
      }
    });
  });
}

module.exports = addCustomerUtr;
