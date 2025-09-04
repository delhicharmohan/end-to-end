const poolPromise = require("../../db");
const logger = require("../../logger");
const { getIO } = require("../../socket");
const moment = require("moment-timezone");
const request = require("request");
const GoogleGenerativeAIController = require('../orders/GoogleGenerativeAIController');

const googleGenerativeAIController = new GoogleGenerativeAIController(process.env.GOOGLE_API_KEY);

const { Storage } = require('@google-cloud/storage');
// Use Application Default Credentials (ADC). On Render, set GOOGLE_APPLICATION_CREDENTIALS to the Secret File path.
const storage = new Storage();

async function uploadToGoogleStorage(fileBuffer, fileName, bucketName) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  return new Promise((resolve, reject) => {
    const stream = file.createWriteStream({
      metadata: {
        contentType: 'image/jpeg', // Set the appropriate content type for your file
      },
    });

    stream.on('error', (err) => {
      reject(err);
    });

    stream.on('finish', () => {
      resolve(`https://storage.googleapis.com/${bucketName}/${fileName}`);
    });

    stream.end(fileBuffer);
  });
}

async function uploadScreenshot(req, res) {

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
  const edit_amount = req.body.edit_amount;

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
      return res.status(201).json({ status: false, message: "UTR is already updated." });
    }

    let actualAmount = data.actualAmount;
    let txnFee = data.txnFee;
    let diffAmount = data.diffAmount;

    let generativeAIResponse;
    generativeAIResponse = await googleGenerativeAIController.processImageBuffer(req.file.buffer, req.file.mimetype);

    let amount = null;
    let transactionId = null;

    if (generativeAIResponse && generativeAIResponse.status && generativeAIResponse.text) {
      try {
        // Clean the JSON response string
        const cleanedText = generativeAIResponse.text.replace(/```json|```/g, '').trim();
        const jsonResponse = JSON.parse(cleanedText);
        amount = parseFloat(jsonResponse.amount).toFixed(2);
        transactionId = jsonResponse.id;
      } catch (error) {
        logger.error(`Error parsing JSON response: ${error}`);
      }
    }

    // Check if the record exists in orders_history
    const [orderTxnResults] = await pool.query("SELECT * FROM orders WHERE transactionID = ?", [transactionId]);
    if (orderTxnResults.length) {
      return res.status(201).json({
          status: false,
          message: `Duplicate UTR.`
      });
    } else {
      const [orderHistoryTxnResults] = await pool.query("SELECT * FROM orders_history WHERE transactionID = ?", [transactionId]);
      if (orderHistoryTxnResults.length) {
        return res.status(201).json({
          status: false,
          message: `Duplicate UTR.`
        });
      }
    }

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

    if (amount != data.amount) {
      return res.status(201).json({
        status: false,
        message: `Amount is mismatch. Incorrect payment and reach out to support.`,
      });
    }

    const now = moment().tz(process.env.TIMEZONE);
    const created_at = updated_at = now.format("YYYY-MM-DD HH:mm:ss");

    const attachmentFileName = `attachment_${now.unix()}.jpeg`;
    const bucketName = 'wizpay-master-upload-screenshot'; // Replace with your desired bucket name

    // Check if the bucket exists
    const [bucketExists] = await storage.bucket(bucketName).exists();

    if (!bucketExists) {
      // If the bucket does not exist, create it
      await storage.createBucket(bucketName);
    }

    const attachmentUrl = await uploadToGoogleStorage(req.file.buffer, attachmentFileName, bucketName);

    await pool.query(
      "UPDATE orders SET upload_screenshot = ?, customerUtr = ?, amount = ?, actualAmount = ?, txnFee = ?, diffAmount = ? WHERE refID = ?",
      [
        attachmentUrl,
        transactionId,
        amount,
        actualAmount,
        txnFee,
        diffAmount,
        refID,
      ]
    );

    const updateData = {
      refID: refID,
      customerUtr: transactionId,
    };

    const vendor = data.vendor;
    data.customerUtr = transactionId;
    data.upload_screenshot = attachmentUrl;

    const io = getIO();
    io.emit(`${vendor}-customer-utr-updated`, updateData);

    //check the utr exist in chorme_extension_logs
    [chorme_extension_logs] = await pool.query("SELECT * FROM chorme_extension_logs WHERE utr = ? AND status = ?", [transactionId, 0]);
    if (chorme_extension_logs.length) {
      if (chorme_extension_logs[0].amount == data.amount) {
        await approveChromeExtensionOrder(data, transactionId, chorme_extension_logs[0].amount);
        // Do not set paymentStatus to 'approved' here; approval happens after customer confirmation
        data.transactionID = transactionId;
      }
    }

    logger.info(`Screenshot uploaded successfully. refID: ${refID}`);
    return res.status(201).json({
      status: true,
      message: `Screenshot Submitted Successfully!`,
      data: data,
    });
  } catch (error) {
    logger.error(`Error while uploading screenshot. error: ${error}`);
    return res.status(500).json({ message: `Error while uploading screenshot. error: ${error}` });
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
    "UPDATE orders SET chrome_status = ?, chrome_amount = ?, transactionID = ?, updatedAt = ? WHERE refID = ?",
    [
      'completed',
      chrome_amount,
      transactionID,
      now.format("YYYY-MM-DD HH:mm:ss"),
      data.refID,
    ]
  );

  // Mark related batches as system-confirmed only; do not approve payin here
  const [batchUpdate] = await pool.query(
    `UPDATE instant_payout_batches 
     SET status = 'sys_confirmed',
         system_confirmed_at = NOW(),
         utr_no = ?
     WHERE pay_in_order_id = ? AND status = 'pending'`,
    [transactionID, data.id]
  );

  const affectedBatches = batchUpdate?.affectedRows ?? 0;
  if (affectedBatches > 0) {
    logger.info(`✅ (subadmin) sys_confirmed set for ${affectedBatches} batch(es) for payin_id=${data.id}, utr=${transactionID}`);
  } else {
    logger.warn(`⚠️ (subadmin) No pending batches marked sys_confirmed for payin_id=${data.id}. Possible reasons: already confirmed, wrong mapping, or missing batch.`);
  }

  // Keep transaction ID on data for downstream use
  data.transactionID = transactionID;

  logger.info(
    `✅ Chrome extension matched for ${data.refID} (subadmin), marked batch sys_confirmed; awaiting customer confirmation`
  );

  const validatorUsername = data.validatorUsername;

  const [db_user] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [validatorUsername]
  );
  const user = db_user[0];

  // Update the commission and balance (allowed on chrome match), but do not approve order here
  const commissionPercentage = user.payInCommission;
  const commission = (chrome_amount * commissionPercentage) / 100;
  const balanceUpdateQuery = "UPDATE users SET balance = balance + ?, payInLimit = payInLimit - ? WHERE username = ?";
  await pool.query(balanceUpdateQuery, [commission, chrome_amount, validatorUsername]);
  logger.info(
      `Commission updated successfully with utr and chrome extension from subadmin. refID:${data.refID}, orderId:${data.merchantOrderId}`
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
        `Callback sent successfully with utr and chrome extension from subadmin. Order ID: ${order.merchantOrderId}`
      );

    } catch (error) {
      logger.error(
        `An error occurred while trying to fetch callbackURL with chrome extension from subadmin. Order ID: ${order.merchantOrderId}, error: ${error}`
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

module.exports = uploadScreenshot;