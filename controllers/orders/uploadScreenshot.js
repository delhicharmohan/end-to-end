const poolPromise = require("../../db");
const logger = require("../../logger");
const { getIO } = require("../../socket");
const moment = require("moment-timezone");
const request = require("request");
const GoogleGenerativeAIController = require("./GoogleGenerativeAIController");

const googleGenerativeAIController = new GoogleGenerativeAIController(
  "AIzaSyBC87wX0u7i8Ojujt-gOweb4r0feeypA5w"
);

const { Storage } = require("@google-cloud/storage");
const storage = new Storage({
  keyFilename: "gcloud/best-live-404609-214f2657ad28.json", // Replace with the path to your Service Account Key
  projectId: "best-live-404609", // Replace with your Google Cloud project ID
});

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

    const io = getIO();
    io.emit(`${vendor}-customer-utr-updated`, updateData);

    // if end to end update those order status

    // console.log("reaching here!!!================");

    // console.log(refID);

    const [endToEndOrders] = await pool.query(
      "SELECT * FROM orders where refID = ?",
      [refID]
    );
    if (endToEndOrders.length == 1) {
      // console.log("==============end to end call success===========");
      // console.
      let endToEndOrder = endToEndOrders[0];
      console.log(endToEndOrder);
      const [batchOrders] = await pool.query(
        "SELECT * FROM instant_payout_batches WHERE pay_in_ref_id = ? ",
        [refID]
      );
      if (batchOrders.length == 1) {
        batchOrder = batchOrders[0];
        console.log(batchOrder);
        if (batchOrder.utr_no == null) {
          let [payOutOrders] = await pool.query(
            "SELECT * FROM orders where id = ? ",
            [batchOrder.order_id]
          );
          let payoutOrder;
          if (payOutOrders.length > 0) {
            payoutOrder = payOutOrders[0];
          }

          if (payoutOrder) {
            // update utr no, update orders balance etc
            let updateUTR = await pool.query(
              "UPDATE instant_payout_batches SET status = ?, utr_no = ?, system_confirmed_at = ? WHERE id = ?",
              ["sys_confirmed", transactionId, created_at, batchOrder.id]
            );
            let [payoutBatches] = await pool.query(
              "SELECT * FROM instant_payout_batches WHERE id = ?",
              [batchOrder.id]
            );


            console.log(payoutBatches);
            batchOrder = payoutBatches[0];

            console.log("from here 222!!!!");
            console.log(batchOrder);
            let updatePayoutOrder = await pool.query(
              `
            UPDATE orders
            SET instant_paid = instant_paid + ${endToEndOrder.amount}, 
            instant_balance = instant_balance - ${endToEndOrder.amount} 
            WHERE id = ?`,
              [payoutOrder.id]
            );
            // delete for security while posting to public

            delete batchOrder.pay_in_order_id;
            delete batchOrder.pay_in_ref_id;
            delete batchOrder.id;

            let payoutRoom = `instant-withdraw-${payoutOrder.refID}`;

            console.log(
              "========PAYOUT BATCH ======DATA PRITING FROM UPLOAD======="
            );
            console.log(batchOrder);
            console.log(
              "========PAYOUT BATCH ======DATA PRITING FROM UPLOAD END======="
            );
            io.emit(payoutRoom, batchOrder);
          }
        }
      }
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
  const [results] = await pool.query(
    "UPDATE orders SET chrome_status = ?, chrome_amount = ?, paymentStatus = ?, transactionID = ?, approvedBy = ?, updatedAt = ? WHERE refID = ?",
    [
      "completed",
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
    paymentStatus: "approved",
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

async function sendCallback(order) {
  if (order.transactionType == "auto") {
    try {
      let amount;
      if (
        order.paymentMethod == "automatic_payment_with_sms" ||
        order.paymentMethod == "chrome_extension_with_decimal"
      ) {
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
        };
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

module.exports = uploadScreenshot;
