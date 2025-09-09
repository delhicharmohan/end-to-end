const poolPromise = require("../../db");
const logger = require("../../logger");
const { getIO } = require("../../socket");
const moment = require("moment-timezone");
const request = require("request");
const GoogleGenerativeAIController = require("./GoogleGenerativeAIController");

// Read API key from environment instead of hardcoding
const googleGenerativeAIController = new GoogleGenerativeAIController(
  process.env.GOOGLE_API_KEY
);

const { Storage } = require("@google-cloud/storage");
// Use Application Default Credentials. On Render, set GOOGLE_APPLICATION_CREDENTIALS to the Secret File path.
const storage = new Storage();

async function uploadToGoogleStorage(fileBuffer, fileName, bucketName) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  return new Promise((resolve, reject) => {
    const stream = file.createWriteStream({
      metadata: {
        contentType: "image/jpeg", // Set the appropriate content type for your file
      },
    });

    stream.on("error", (err) => {
      reject(err);
    });

    stream.on("finish", () => {
      resolve(`https://storage.googleapis.com/${bucketName}/${fileName}`);
    });

    stream.end(fileBuffer);
  });
}

async function uploadScreenshot(req, res, next) {
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
  let batchOrder;

  try {
    const pool = await poolPromise;

    const [orderResults] = await pool.query(
      "SELECT * FROM orders WHERE refID = ?",
      [refID]
    );

    if (orderResults.length === 0) {
      logger.error(`Order '${refID}' attempted to get does not exist.`);
      return res.status(201).json({
        status: false,
        message: `Order not found. refID: ${refID}`,
      });
    }

    const data = orderResults[0];

    if (data.customerUtr) {
      logger.error("UTR is already updated.");
      return res
        .status(201)
        .json({ status: false, message: "UTR is already updated." });
    }

    let generativeAIResponse;
    generativeAIResponse =
      await googleGenerativeAIController.processImageBuffer(
        req.file.buffer,
        req.file.mimetype
      );

    let amount = null;
    let transactionId = null;

    if (
      generativeAIResponse &&
      generativeAIResponse.status &&
      generativeAIResponse.text
    ) {
      try {
        // Clean the JSON response string
        const cleanedText = generativeAIResponse.text
          .replace(/```json|```/g, "")
          .trim();
        const jsonResponse = JSON.parse(cleanedText);
        amount = parseFloat(jsonResponse.amount).toFixed(2);
        transactionId = jsonResponse.id;
      } catch (error) {
        logger.error(`Error parsing JSON response: ${error}`);
      }
    }

    // console.log('======AMOUNT=====');
    // console.log(amount);
    // console.log('======transacation id=====');
    // console.log(transactionId);

    // Check if the record exists in orders_history
    const [orderTxnResults] = await pool.query(
      "SELECT * FROM orders WHERE transactionID = ?",
      [transactionId]
    );
    if (orderTxnResults.length) {
      return res.status(201).json({
        status: false,
        message: `Duplicate UTR.`,
      });
    } else {
      const [orderHistoryTxnResults] = await pool.query(
        "SELECT * FROM orders_history WHERE transactionID = ?",
        [transactionId]
      );
      if (orderHistoryTxnResults.length) {
        return res.status(201).json({
          status: false,
          message: `Duplicate UTR.`,
        });
      }
    }
    if (amount != data.amount) {
      return res.status(201).json({
        status: false,
        message: `Amount is mismatch. Incorrect payment and reach out to support.`,
      });
    }

    const now = moment().tz(process.env.TIMEZONE);
    const created_at = (updated_at = now.format("YYYY-MM-DD HH:mm:ss"));

    const attachmentFileName = `attachment_${now.unix()}.jpeg`;
    const bucketName = "wizpay-master-upload-screenshot"; // Replace with your desired bucket name

    // Check if the bucket exists
    const [bucketExists] = await storage.bucket(bucketName).exists();

    if (!bucketExists) {
      // If the bucket does not exist, create it
      await storage.createBucket(bucketName);
    }

    const attachmentUrl = await uploadToGoogleStorage(
      req.file.buffer,
      attachmentFileName,
      bucketName
    );

    await pool.query(
      "UPDATE orders SET upload_screenshot = ?, customerUtr = ? WHERE refID = ?",
      [attachmentUrl, transactionId, refID]
    );

    const updateData = {
      refID: refID,
      customerUtr: transactionId,
    };

    const vendor = data.vendor;

    const SocketEventHandler = require('../../helpers/utils/socketEventHandler');
    SocketEventHandler.emitCustomerUtrUpdate(vendor, refID, transactionId);

    // Only update batch status to system-confirmed, do NOT approve payin
    // Payin approval will happen only when customer confirms on withdrawal page
    try {
      const pool = await poolPromise;
      
      // Update batches to system-confirmed status only
      const [batchUpdate] = await pool.query(`
        UPDATE instant_payout_batches 
        SET status = 'sys_confirmed',
            system_confirmed_at = NOW(),
            utr_no = ?
        WHERE pay_in_order_id = ? AND status = 'pending'
      `, [transactionId, data.id]);

      const affected = batchUpdate?.affectedRows ?? 0;
      if (affected > 0) {
        logger.info(`✅ sys_confirmed set for ${affected} batch(es) for payin_id=${data.id}, utr=${transactionId}`);
      } else {
        logger.warn(`⚠️ No pending batches marked sys_confirmed for payin_id=${data.id}. Possible reasons: already confirmed, wrong mapping, or missing batch.`);
      }
    } catch (error) {
      logger.error(`❌ Error updating batch status for payin ${data.id}:`, error);
    }

    //check the utr exist in chorme_extension_logs
    [chorme_extension_logs] = await pool.query(
      "SELECT * FROM chorme_extension_logs WHERE utr = ? AND status = ?",
      [transactionId, 0]
    );
    if (chorme_extension_logs.length) {
      if (chorme_extension_logs[0].amount == data.amount) {
        await approveChromeExtensionOrder(
          data,
          transactionId,
          chorme_extension_logs[0].amount
        );
      }
    }

    logger.info(`Screenshot uploaded successfully. refID: ${refID}`);
    return res.status(201).json({
      status: true,
      message: `Screenshot Submitted Successfully!`,
    });
  } catch (error) {
    logger.error(`Error while uploading screenshot. error: ${error}`);
    return res
      .status(500)
      .json({ message: `Error while uploading screenshot. error: ${error}` });
  }
}

async function approveChromeExtensionOrder(data, transactionID, chrome_amount) {
  const pool = await poolPromise;
  const now = moment().tz(process.env.TIMEZONE);
  
  // Only update chrome status and UTR, do NOT approve payin
  // Payin approval will happen only when customer confirms on withdrawal page
  const [results] = await pool.query(
    "UPDATE orders SET chrome_status = ?, chrome_amount = ?, transactionID = ?, updatedAt = ? WHERE refID = ?",
    [
      "completed",
      chrome_amount,
      transactionID,
      now.format("YYYY-MM-DD HH:mm:ss"),
      data.refID,
    ]
  );

  // Update batch status to system-confirmed only
  await pool.query(`
    UPDATE instant_payout_batches 
    SET status = 'sys_confirmed',
        system_confirmed_at = NOW(),
        utr_no = ?
    WHERE pay_in_order_id = ? AND status = 'pending'
  `, [transactionID, data.id]);

  const SocketEventHandler = require('../../helpers/utils/socketEventHandler');
  SocketEventHandler.emitCustomerUtrUpdate(data.vendor, data.refID, transactionID);

  logger.info(`✅ Chrome extension matched for ${data.refID}, awaiting customer confirmation`);
  data.transactionID = transactionID;

  logger.info(
    `Order approved successfully with utr and chrome extension. refID:${data.refID}, orderId:${data.merchantOrderId}`
  );

  const validatorUsername = data.validatorUsername;

  const [db_user] = await pool.query("SELECT * FROM users WHERE username = ?", [
    validatorUsername,
  ]);
  const user = db_user[0];

  // Update the commission and balance
  const commissionPercentage = user.payInCommission;
  const commission = (chrome_amount * commissionPercentage) / 100;
  const balanceUpdateQuery =
    "UPDATE users SET balance = balance + ?, payInLimit = payInLimit - ? WHERE username = ?";
  await pool.query(balanceUpdateQuery, [
    commission,
    chrome_amount,
    validatorUsername,
  ]);
  logger.info(
    `Commission updated successfully with utr and chrome extension. refID:${data.refID}, orderId:${data.merchantOrderId}`
  );

  await sendCallback(data);

  await pool.query(
    "UPDATE chorme_extension_logs SET status = ?, updated_at = ?, orders_ref_id = ? WHERE utr = ?",
    [1, now.format("YYYY-MM-DD HH:mm:ss"), data.refID, transactionID]
  );
}

const { sendPayinCallback, resolveCallbackURL } = require('../../helpers/utils/callbackHandler');
const SocketEventHandler = require('../../helpers/utils/socketEventHandler');

async function sendCallback(order) {
  if (order.transactionType == "auto") {
    try {
      // Resolve per-order callback if present, fallback to secrets
      const callbackURL = await resolveCallbackURL(order);
      await sendPayinCallback(order, callbackURL);

    } catch (error) {
      logger.error(
        `Chrome extension callback failed. Order ID: ${order.merchantOrderId}, error: ${error}`
      );
    }
  } else {
    logger.info(
      `Manual payin - no callback needed. Order ID: ${order.merchantOrderId}`
    );
  }
}

module.exports = uploadScreenshot;
