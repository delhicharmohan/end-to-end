const { v4: uuidv4 } = require("uuid");
const poolPromise = require("../../db");
const getRandomValidator = require("../../helpers/getRandomValidator");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");

async function checkNoOfOrderCreated(orderCreator, OneMinuteAgo) {
    const pool = await poolPromise;
    const query = "SELECT COUNT(refID) AS order_count FROM orders WHERE created_by = ? AND createdAt >= ?";
    const params = [orderCreator, OneMinuteAgo];

    try {
        const [result] = await pool.query(query, params);
        const orderCount = result[0].order_count;
        return { orderCountStatus: true, orderCount: orderCount, orderCountMessage: 'Success' };
    } catch (error) {
        return { orderCountStatus: false, orderCount: null, orderCountMessage: error };
    }
}

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

function generateReceiptId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${randomStr}${timestamp}`.substring(0, 10).toUpperCase();
}

async function addDeposit(req, res) {

    if (!req.body.vendor) {
        logger.error("Missing required field: vendor");
        return res.status(201).json({ success: false, message: `Missing required field: vendor` });
    }

    const orderCreator = req.body.vendor;
    const actualAmount = req.body.amount;
    let amount = req.body.amount;
    let txnFee = 0;
    let diffAmount = 0;

    // find the vendor of order creator
    const pool = await poolPromise;
    const [vendorResult] = await pool.query(
        "SELECT vendor FROM `users` WHERE `username` = ?",
        [orderCreator]
    );

    if (vendorResult.length == 0) {
      logger.error(`Vendor does not exist.`);
      return res.status(201).json({ success: false, message: `Vendor does not exist.` });
    }

    const vendor = vendorResult[0].vendor;

    if (amount <= 0) {
        logger.error(`Amount must be greater than 0.`);
        return res.status(201).json({ success: false, message: `Amount must be greater than 0.` });
    }
  
    if (amount === null) {
        logger.error(`Invalid amount.`);
        return res.status(201).json({ success: false, message: `Invalid amount.` });
    }

    const now = moment().tz(process.env.TIMEZONE);
    const createdAt = now.format("YYYY-MM-DD HH:mm:ss");
    const OneMinuteAgoMoment = now.subtract(1, 'minutes');
    const OneMinuteAgo = OneMinuteAgoMoment.format("YYYY-MM-DD HH:mm:ss");

    const { orderCountStatus, orderCount, orderCountMessage } = await checkNoOfOrderCreated(orderCreator, OneMinuteAgo);
    if (orderCountStatus) {
        if (orderCount >= 60) {
            logger.error(`Maximum number of order created. Order Count: ${orderCount}`);
            return res.status(201).json({ success: false, message: "Maximum number of order created. Please try again later!" });
        }
    } else {
        logger.error(orderCountMessage);
        return res.status(201).json({ success: false, message: orderCountMessage });
    }
    

    try {

        let validator;
        let validatorUsername;
        let validatorUPIID;
        let uniqueIdentifier;
        let paymentMethod;
        let accountNumber;

        validator = await getRandomValidator(
            'payin',
            actualAmount,
            "",
            vendor
        );

        if (!validator) {
            logger.error("No validators available.");
            return res.status(201).json({ success: false, message: `No validators available.` });
        } else {
            validatorUsername = validator.username;
            validatorUPIID = validator.upiid;
            uniqueIdentifier = validator.uniqueIdentifier;
            paymentMethod = validator.paymentMethod;
            accountNumber = validator.accountNumber;
        }

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

        const [secrets] = await pool.query(
            "SELECT clientName FROM `secrets` WHERE `vendor` = ?",
            [vendor]
        );

        if (secrets.length === 0) {
            logger.error(`Vendor '${vendor}' does not have clientName.`);
            return res.status(201).json({ success: false, message: `Vendor '${vendor}' does not have clientName.` });
        }

        const clientName = secrets[0].clientName;
        const refID = uuidv4();
        const token = uuidv4();
        const merchantOrderId = uuidv4();
        const receiptId = generateReceiptId();

        const data = {
            refID: refID,
            receiptId: receiptId,
            token: token,
            clientName: clientName,
            type: 'payin',
            customerName: `${vendor}-customerName`,
            customerIp: req.ip,
            customerMobile: `${vendor}-customerMobile`,
            customerUPIID: "",
            merchantOrderId: merchantOrderId,
            mode: 'upi',
            returnUrl: "",
            paymentStatus: 'pending',
            validatorUsername: validatorUsername,
            validatorUPIID: validatorUPIID,
            paymentMethod: paymentMethod,
            website: "",
            createdAt: createdAt,
            updatedAt: createdAt,
            vendor: vendor,
            transactionType: "manual",
            uniqueIdentifier: uniqueIdentifier,
            amount: amount,
            actualAmount: actualAmount,
            txnFee: txnFee,
            diffAmount: diffAmount,
            accountNumber: accountNumber,
            created_by: orderCreator,
            isPayoutLink: 0,
        };

        const [insertResult] = await pool.query("INSERT INTO orders SET ?", data);

        if (insertResult.affectedRows !== 1) {
            logger.error("No Order was inserted");
            return res.status(201).json({
                success: false,
                message: `Error inserting order: No Order was inserted`,
            });
        }

        const [selectResult] = await pool.query(
            "SELECT * FROM orders WHERE merchantOrderId = ?",
            [merchantOrderId]
        );

    if (selectResult.length === 0) {
      logger.error("merchantOrderId not found in orders");
      return res
        .status(201)
        .json({ success: false, message: "Invalid merchantOrderId" });
    }

    const insertedOrder = selectResult[0];

    const io = getIO();

    logger.info(
        `Manual Order created successfully from common link. refID: ${insertedOrder.refID}, orderId: ${insertedOrder.merchantOrderId}`
    );

    io.emit(`${vendor}-order-created`, insertedOrder);
    io.emit(`${vendor}-order-created-with-common-link-${insertedOrder.created_by}`, insertedOrder);

    if (validatorUsername) {
        io.emit(`${vendor}-order-created-${validatorUsername}`, insertedOrder);
    }

    // const [versionQueryResults] = await pool.query("SELECT version FROM secrets WHERE vendor = ?", [vendor]);
    let paymentRoute = "pay";
    // const appVersion = versionQueryResults[0].version;
    // if (appVersion == 1) {
    //     paymentRoute = "pay";
    // } else if (appVersion == 2) {
    //     paymentRoute = "payment";
    // } else {
    //     paymentRoute = "pay";
    // }

    res.status(201).json({
      success: true,
      message: "Payin Order created successfully.",
      status: 201,
      data: {
        refID: insertedOrder.refID,
        redirectURL: `${process.env.ORDER_CREATE_REDIRECT_URL}/#/${paymentRoute}/${insertedOrder.refID}`,
        orderStatus: 'pending',
      },
    });

  } catch (error) {
    logger.error(error.sqlMessage);
    return res
      .status(201)
      .json({ success: false, message: error.sqlMessage });
  }
}

module.exports = addDeposit;
