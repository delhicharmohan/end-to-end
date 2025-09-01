const { v4: uuidv4 } = require("uuid");
const poolPromise = require("../../db");
const getRandomValidator = require("../../helpers/getRandomValidator");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");

function generateReceiptId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${randomStr}${timestamp}`.substring(0, 10).toUpperCase();
}

async function createPayOutOrder(req, res) {
  const vendor = req.params.vendor;
  const username = req.user.username;
  const selectedAgent = req.body.selectedAgent;
  const isPayoutLink = req.body.isPayoutLink;

  try {

    console.log(req.user.payIn)
    console.log(req.user.payOut)
    console.log(req.body.type)

    if (req.body.type == 'payin') {
      if (!req.user.payIn) {
        logger.error(`You don't have permission to create Pay In order.`);
        return res.status(400).json({ success: false, message: `You don't have permission to create Pay In order.` });
      }
    } else if (req.body.type == 'payout') {
      if (!req.user.payOut) {
        logger.error(`You don't have permission to create Pay Out order.`);
        return res.status(400).json({ success: false, message: `You don't have permission to create Pay Out order.` });
      }
    }

    const pool = await poolPromise;

    const website = req.body.website ? req.body.website : "";

    const validatorAmount = req.body.type == 'payin' ? 0 : req.body.amount;

    let validator;
    let validatorUsername;
    let validatorUPIID;
    let uniqueIdentifier;
    let orderStatus;
    let paymentMethodInput;

    if (selectedAgent) {

      const [valResults] = await pool.query(
        "SELECT * FROM `users` WHERE `username` = ?",
        [selectedAgent]
      );

      if (valResults.length === 0) {
        logger.error(`Agent '${selectedAgent}' does not exist.`);
        return res.status(400).json({ success: false, message: `Agent '${selectedAgent}' does not exist.` });
      }

      if (valResults[0].isLoggedIn == 0) {
        logger.error(`Agent '${selectedAgent}' is not logged in.`);
        return res.status(400).json({ success: false, message: `Agent '${selectedAgent}' is not logged in.` });
      }

      validator = valResults[0];

    } else {
      validator = await getRandomValidator(
        req.body.type,
        validatorAmount,
        website,
        vendor
      );
    }

    if (!validator) {
      logger.error("No validators available.");
      req.notifyAdmins = true;
      validatorUsername = "";
      validatorUPIID = "";
      uniqueIdentifier = "";
      orderStatus = "unassigned";
      paymentMethodInput = "";
    } else {
      validatorUsername = validator.username;
      validatorUPIID = validator.upiid;
      uniqueIdentifier = validator.uniqueIdentifier;
      paymentMethodInput = validator.paymentMethod;
      orderStatus = req.body.type == 'payin' ? "created" : (isPayoutLink ? "created" : "pending");
    }

    const [secrets] = await pool.query(
      "SELECT clientName FROM `secrets` WHERE `vendor` = ?",
      [vendor]
    );

    if (secrets.length === 0) {
      logger.error(`Vendor '${vendor}' does not have clientName.`);
      return res.status(200).json({ success: false, message: `Vendor '${vendor}' does not have clientName.` });
    }

    const clientName = secrets[0].clientName;

    req.validator = validator;

    const refID = uuidv4();
    const merchantOrderId = uuidv4();
    const receiptId = generateReceiptId();
    const now = moment().tz(process.env.TIMEZONE);

    const data = {
      refID: refID,
      receiptId: receiptId,
      clientName: clientName,
      type: req.body.type,
      customerName: `${vendor}-customerName`,
      customerIp: req.ip,
      customerMobile: `${vendor}-customerMobile`,
      customerUPIID: "",
      merchantOrderId: merchantOrderId,
      mode: req.body.type == 'payout' ? "IMPS" : 'upi',
      returnUrl: "",
      paymentStatus: orderStatus,
      validatorUsername: validatorUsername,
      validatorUPIID: validatorUPIID,
      paymentMethod: paymentMethodInput,
      website: "",
      createdAt: now.format("YYYY-MM-DD HH:mm:ss"),
      updatedAt: now.format("YYYY-MM-DD HH:mm:ss"),
      vendor: vendor,
      transactionType: "manual",
      created_by: username,
      isPayoutLink: isPayoutLink,
      uniqueIdentifier: uniqueIdentifier,
    };

    if (req.body.type == "payout") {
      const requiredFields = ["accountNumber", "ifsc", "bankName"];
      const fields = req.body;

      const missingFields = requiredFields.filter(
        (field) => !Object.keys(fields).includes(field)
      );
      if (missingFields.length) {
        logger.error(`Missing fields: ${missingFields}`);
        return res.status(400).json({ success: false, message: `Missing fields: ${missingFields}` });
      }

      data.amount = req.body.amount;
      data.accountNumber = req.body.accountNumber;
      data.ifsc = req.body.ifsc;
      data.bankName = req.body.bankName;
      
      // Set instant_balance for payout orders to enable end-to-end matching
      data.instant_balance = req.body.amount;
      data.current_payout_splits = 0;
      data.is_instant_payout = 1;
    }

    const [insertResult] = await pool.query("INSERT INTO orders SET ?", data);

    if (insertResult.affectedRows !== 1) {
      logger.error("No Order was inserted");
      return res.status(500).json({
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
        .status(400)
        .json({ success: false, message: "Invalid merchantOrderId" });
    }

    const insertedOrder = selectResult[0];

    const io = getIO();

    logger.info(
      `Order created successfully. refID: ${insertedOrder.refID}, orderId: ${merchantOrderId}`
    );

    if (req.body.type == 'payin') {
      io.emit(`${vendor}-order-created`, insertedOrder);

      if (validatorUsername) {
        io.emit(`${vendor}-order-created-${validatorUsername}`, insertedOrder);
      }
    } else {
      io.emit(`${vendor}-payout-order-created`, insertedOrder);

      if (validatorUsername) {
        io.emit(`${vendor}-payout-order-created-${validatorUsername}`, insertedOrder);
      }
    }

    const success_msg = req.body.type == 'payin' ? "Payin Order created successfully." : "Payout Order created successfully.";

    res.status(201).json({
      success: true,
      message: success_msg,
      status: 201,
      data: {
        refID: insertedOrder.refID,
        orderStatus: insertedOrder.paymentStatus,
        receiptId: receiptId,
      },
    });

  } catch (error) {
    logger.error(error.sqlMessage);
    return res
      .status(400)
      .json({ success: false, message: error.sqlMessage });
  }
}

module.exports = createPayOutOrder;
