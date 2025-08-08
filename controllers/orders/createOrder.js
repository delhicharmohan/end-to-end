const { v4: uuidv4 } = require("uuid");
const poolPromise = require("../../db");
const getRandomValidator = require("../../helpers/getRandomValidator");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");
const getEndToEndValidator = require("../../helpers/getEndToEndValidator");

function generateReceiptId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${randomStr}${timestamp}`.substring(0, 10).toUpperCase();
}

let lastRandomValues = new Map();

async function findTransactionFee(uniqueIdentifier, fiveMinutesAgo) {
  const pool = await poolPromise;

  const query =
    "SELECT txnFee FROM orders WHERE createdAt >= ? AND uniqueIdentifier = ?";
  const params = [fiveMinutesAgo, uniqueIdentifier];

  try {
    const [rows] = await pool.query(query, params);

    // If there are existing txnFee values
    if (rows && rows.length > 0) {
      const existingTxnFees = rows.map((row) => row.txnFee);

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

async function createOrder(req, res, next) {

  const { vendor } = req.headers;
  let { website = "", type, amount, payoutType, customerUPIID, accountNumber, ifsc, bankName, merchantOrderID, mode, returnUrl, customerName, customerIp, customerMobile } = req.body;

  console.log(customerMobile);
  console.log(payoutType);
  if(process.env.NODE_ENV === 'development' && merchantOrderID == null) {
    merchantOrderID = generateReceiptId();    

  }

  try {
    const isPayout = type === "payout";
    const isInstantPayout = isPayout && payoutType === "instant";
    const skipRandomValidator = isInstantPayout;
    const now = moment().tz(process.env.TIMEZONE);
    const createdAt = now.format("YYYY-MM-DD HH:mm:ss");
    const fiveMinutesAgo = now.subtract(5, "minutes").format("YYYY-MM-DD HH:mm:ss");

    if (isInstantPayout) {
      //return res.status(400).json({ success: false, message: "Invalid customerUPIID" });
    }

    console.log(`skip random validator status is ${skipRandomValidator}`);
    console.log(skipRandomValidator);

    let validator = null;
    let customerAsValidator = null;
    let orderStatus = "unassigned";
    let validatorDetails = { username: "", upiid: "", accountNumber: "", paymentMethod: "", uniqueIdentifier: "" };

    if (!skipRandomValidator) {

      console.log("SKIPPING VALIDATOR BLOCK REACHED!!!...");
      if (type === "payin") {

        console.log("SECOND PAYIN THREAD...");
        // Try to get end-to-end validator
        try {
          customerAsValidator = await getEndToEndValidator(amount, vendor, customerMobile);
          if(customerAsValidator) {

            let duplicateInsertQuery = `INSERT INTO instant_payin_logs ('customer_mobile', 'order_id') VALUES (?, ?)`;
            let duplicateInsert = await pool.query(duplicateInsertQuery, [customerMobile, customerAsValidator.id]);
          }
        } catch (e) {
          console.log("Could not find a customer for end-to-end validation");
        }
      }

      if (customerAsValidator) {
        // Assign values from customerAsValidator (assuming structure is different)
        validatorDetails = {
          username: "",
          upiid: customerAsValidator.customerUPIID,
          accountNumber: "",
          paymentMethod: "UPI",
          uniqueIdentifier: ""
        };
        orderStatus = "pending";
      } else {
        console.log('=====NO CUSTOMER MOVING TO ADMIN====');
        // Fallback to getRandomValidator
        validator = await getRandomValidator(type, amount, website, vendor);
        console.log(validator);
        if (validator) {
          validatorDetails = {
            username: validator.username,
            upiid: validator.upiid,
            accountNumber: validator.accountNumber,
            paymentMethod: validator.paymentMethod,
            uniqueIdentifier: validator.uniqueIdentifier
          };
          orderStatus = "pending";
        } else {
          logger.error("No validators available.");
          req.notifyAdmins = true;
        }
      }
    }

    let txnFee = 0;
    let diffAmount = 0;
    let finalAmount = amount;

    if (validator && type === "payin" && ["automatic_payment_with_sms", "chrome_extension_with_decimal"].includes(validator.paymentMethod)) {
      const { txnFeeStatus, txnFeeAmount, txnFeeMessage } = await findTransactionFee(validator.uniqueIdentifier, fiveMinutesAgo);

      if (txnFeeStatus) {
        finalAmount += txnFeeAmount - 1;
        txnFee = txnFeeAmount;
        diffAmount = 1 - txnFee;
      } else {
        logger.error(txnFeeMessage);
        return res.status(400).json({ success: false, message: txnFeeMessage });
      }
    }

    const data = {
      refID: uuidv4(),
      receiptId: generateReceiptId(),
      clientName: req.clientName,
      type,
      customerName,
      customerIp,
      customerMobile,
      customerUPIID,
      merchantOrderId: merchantOrderID,
      amount: finalAmount,
      mode,
      returnUrl,
      paymentStatus: orderStatus,
      validatorUsername: validatorDetails.username,
      validatorUPIID: validatorDetails.upiid,
      accountNumber: validatorDetails.accountNumber,
      website,
      createdAt,
      updatedAt: createdAt,
      vendor,
      paymentMethod: validatorDetails.paymentMethod,
      uniqueIdentifier: validatorDetails.uniqueIdentifier,
      actualAmount: amount,
      txnFee,
      diffAmount,
      payout_type: isPayout ? payoutType : null,
      is_end_to_end: customerAsValidator ? true: false,
      ...isPayout && { accountNumber, ifsc, bankName, mode: "IMPS" }
    };

    const pool = await poolPromise;
    const [insertResult] = await pool.query("INSERT INTO orders SET ?", data);

    if (insertResult.affectedRows !== 1) {
      logger.error("No Order was inserted");
      return res.status(500).json({ success: false, message: "Error inserting order: No Order was inserted" });
    }

    const [selectResult] = await pool.query("SELECT * FROM orders WHERE merchantOrderId = ?", [merchantOrderID]);

    if (selectResult.length === 0) {
      logger.error("merchantOrderId not found in orders");
      return res.status(400).json({ success: false, message: "Invalid merchantOrderId" });
    }

    const insertedOrder = selectResult[0];
    const io = getIO();

    if (isInstantPayout) {
      const emitEvent = isPayout ? `${vendor}-instant-payout-order-created` : `${vendor}-order-created`;
      const emitValidatorEvent = `${emitEvent}-${validatorDetails.username}`;
      io.emit(emitEvent, insertedOrder);
      io.emit(emitValidatorEvent, insertedOrder);
    } else {
      const emitEvent = isPayout ? `${vendor}-payout-order-created` : `${vendor}-order-created`;
      const emitValidatorEvent = `${emitEvent}-${validatorDetails.username}`;
      io.emit(emitEvent, insertedOrder);
      if (validatorDetails.username) io.emit(emitValidatorEvent, insertedOrder);
    }
    const responseData = {
      refID: insertedOrder.refID,
      orderStatus: insertedOrder.paymentStatus,
      ...(isPayout && isInstantPayout && { instantPayoutURL: `${process.env.ORDER_CREATE_REDIRECT_URL}/#/instant-withdraw/${insertedOrder.refID}`, walletStatus: 'lock' })
    };

    if(customerAsValidator) {
       // transaction sub entry to the batches
       let batchData = {
          uuid: uuidv4(),
          order_id: customerAsValidator.id,
          ref_id: customerAsValidator.refID,
          amount: insertedOrder.amount,
          pay_in_order_id: insertedOrder.id,
          pay_in_ref_id: insertedOrder.refID,
          status: 'pending',
          vendor: vendor,
          payment_from: insertedOrder.customerUPIID,
          payment_to: customerAsValidator.customerUPIID,
          created_at: createdAt,
          updated_at: createdAt,
       };


       let [batchPayoutOrder] = await pool.query("INSERT INTO instant_payout_batches SET ?", batchData);
       if (batchPayoutOrder.affectedRows !== 1) {
        logger.error("batch payout failed!");
        return res.status(500).json({ success: false, message: "Error inserting order: No Order was inserted" });
      }

      const query = "UPDATE orders SET current_payout_splits = current_payout_splits + 1 WHERE id = ?";
      const [updateCustomerAsValidator] = await pool.query(query, [customerAsValidator.id]);

    }

    res.status(201).json({
      success: true,
      message: isPayout ? "Payout Order created successfully." : "Order created successfully.",
      status: 201,
      data: responseData,
      ...(type === "payin" && {
        data: {
          ...responseData,
          redirectURL: orderStatus === "pending" ? `${process.env.ORDER_CREATE_REDIRECT_URL}/#/pay/${insertedOrder.refID}` : ""
        }
      })
    });
  } catch (error) {
    logger.error(error.sqlMessage);
    return res.status(400).json({ success: false, message: error.sqlMessage });
  }
}


module.exports = createOrder;
