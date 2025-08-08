const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");

let lastRandomValues = new Map();

async function findTransactionFee(uniqueIdentifier, fiveMinutesAgo) {

  const pool = await poolPromise;

  const query = "SELECT txnFee FROM orders WHERE createdAt >= ? AND uniqueIdentifier = ?";
  const params = [fiveMinutesAgo, uniqueIdentifier];

  try {
    const [rows] = await pool.query(query, params);

    // If there are existing txnFee values
    if (rows && rows.length > 0) {
      const existingTxnFees = rows.map(row => row.txnFee);

      // Create a set of existing txnFee values
      const existingTxnFeeSet = new Set(existingTxnFees);

      // Find the lowest number not in the set
      for (let i = 99; i >= 1; i--) {
        const potentialTxnFee = i / 100;
        if (!existingTxnFeeSet.has(potentialTxnFee)) {
          lastRandomValues.set(uniqueIdentifier, potentialTxnFee); // Update the last potentialTxnFee for this identifier
          return { txnFeeStatus: true, txnFeeAmount: potentialTxnFee };
        }
      }

      // Generate a random value between 0.1 and 0.99, ensuring it's not the same as the last one for this uniqueIdentifier
      let randomValue;
      do {
        randomValue = Math.floor(Math.random() * (99 - 1 + 1)) + 1;
        randomValue /= 100; // Convert to a value between 0.1 and 0.99
      } while (randomValue === lastRandomValues.get(uniqueIdentifier)); // Ensure new value is not the same as the last one for this identifier
      lastRandomValues.set(uniqueIdentifier, randomValue); // Update the last random value for this identifier
      return { txnFeeStatus: true, txnFeeAmount: randomValue };
    } else {
      return { txnFeeStatus: true, txnFeeAmount: 0.99 };
    }
  } catch (error) {
    return { txnFeeStatus: false, txnFeeAmount: null, txnFeeMessage: error };
  }
}

async function createManualOrder(req, res) {

  const refID = req.body.refID;
  const actualAmount = req.body.amount;
  let amount = req.body.amount;
  let txnFee = 0;
  let diffAmount = 0;
  const type = req.body.type;

  try {

    const pool = await poolPromise;

    const [orderResults] = await pool.query(
      "SELECT * FROM orders WHERE refID = ? AND paymentStatus = ?",
      [refID, 'created']
    );

    if (orderResults.length === 0) {
      logger.error(`Order not found.`);
      return res.status(201).json({ success: false, message: `Order not found.` });
    }

    if (amount <= 0) {
      logger.error(`Amount must be greater than 0.`);
      return res.status(201).json({ success: false, message: `Amount must be greater than 0.` });
    }

    if (amount === null) {
      logger.error(`Invalid amount.`);
      return res.status(201).json({ success: false, message: `Invalid amount.` });
    }

    const now = moment().tz(process.env.TIMEZONE);

    if (type == 'payin') {

      const paymentMethod = orderResults[0].paymentMethod;
      const uniqueIdentifier = orderResults[0].uniqueIdentifier;
      const validatorUsername = orderResults[0].validatorUsername;

      if (paymentMethod == 'automatic_payment_with_sms' || paymentMethod == 'chrome_extension_with_decimal') {
        const fiveMinutesAgoMoment = now.subtract(5, 'minutes');
        const fiveMinutesAgo = fiveMinutesAgoMoment.format("YYYY-MM-DD HH:mm:ss");
        
        const { txnFeeStatus, txnFeeAmount, txnFeeMessage } = await findTransactionFee(uniqueIdentifier, fiveMinutesAgo);
        if (txnFeeStatus) {
          if (txnFeeAmount > 0) {
            amount = (amount - 1) + txnFeeAmount;
          } else {
            amount = amount + txnFeeAmount;
          }
          txnFee = txnFeeAmount;
          diffAmount = 1 - txnFee;
        } else {
          logger.error(txnFeeMessage);
          return res
            .status(201)
            .json({ success: false, message: txnFeeMessage });
        }
      }

      const [userResults] = await pool.query(
        "SELECT accountNumber FROM users WHERE username = ?",
        [validatorUsername]
      );
      let extAccountNumber = null;
      if (userResults && userResults.length > 0) {
        extAccountNumber = userResults[0].accountNumber;
      }

      [updateResult] = await pool.query("UPDATE orders SET amount = ?, actualAmount = ?, txnFee = ?, diffAmount = ?, paymentStatus = ?, accountNumber = ?, updatedAt = ? WHERE refID = ?", [
        amount,
        actualAmount,
        txnFee,
        diffAmount,
        'pending',
        extAccountNumber,
        now.format("YYYY-MM-DD HH:mm:ss"),
        refID,
      ]);

      if (updateResult.affectedRows === 0) {
        logger.error(`Amount is not updated.`);
        return res.status(201).json({ success: false, message: `Amount is not updated. Please try again later!` });
      }

    } else {
      const accountNumber = req.body.accountNumber;
      const ifsc = req.body.ifsc;
      const bankName = req.body.bankName;

      [updateResult] = await pool.query("UPDATE orders SET amount = ?, accountNumber = ?, ifsc = ?, bankName = ?, paymentStatus = ?, updatedAt = ? WHERE refID = ?", [
        amount,
        accountNumber,
        ifsc,
        bankName,
        'pending',
        now.format("YYYY-MM-DD HH:mm:ss"),
        refID,
      ]);

      if (updateResult.affectedRows === 0) {
        logger.error(`Amount is not updated.`);
        return res.status(201).json({ success: false, message: `Amount is not updated. Please try again later!` });
      }
      
    }

    const insertedOrder = orderResults[0];
    const validatorUsername = insertedOrder.validatorUsername;
    const vendor = insertedOrder.vendor;

    const io = getIO();

    logger.info(
      `Manual Order created successfully. refID: ${insertedOrder.refID}, orderId: ${insertedOrder.merchantOrderId}`
    );

    if (type == "payin") {

      const changedData = {
        refID: insertedOrder.refID,
        amount: amount,
        paymentStatus: 'pending',
      };

      io.emit(`${vendor}-order-amount-created`, changedData);
      io.emit(`${vendor}-order-amount-created-${insertedOrder.created_by}`, changedData);

      if (validatorUsername) {
        io.emit(`${vendor}-order-amount-created-${validatorUsername}`, changedData);
      }

      res.status(201).json({
        success: true,
        message: "Manual Payin Order created successfully.",
        status: 201,
        data: {
          refID: insertedOrder.refID,
          redirectURL: `${process.env.ORDER_CREATE_REDIRECT_URL}/#/pay/${insertedOrder.refID}`,
          orderStatus: 'pending',
        },
      });
    } else {

      const changedData = {
        refID: insertedOrder.refID,
        amount: amount,
        paymentStatus: 'pending',
        accountNumber: req.body.accountNumber,
        ifsc: req.body.ifsc,
        bankName: req.body.bankName,
      };

      io.emit(`${vendor}-payout-order-amount-created`, changedData);
      io.emit(`${vendor}-payout-order-amount-created-${insertedOrder.created_by}`, changedData);

      if (validatorUsername) {
        io.emit(`${vendor}-payout-order-amount-created-${validatorUsername}`, changedData);
      }

      res.status(201).json({
        success: true,
        message: "Manual Payout Order created successfully.",
        status: 201,
        data: {
          refID: insertedOrder.refID,
          orderStatus: 'pending',
        },
      });
    }
  } catch (error) {
    logger.error(error.sqlMessage);
    return res.status(201).json({ success: false, message: error.sqlMessage });
  }
}

module.exports = createManualOrder;