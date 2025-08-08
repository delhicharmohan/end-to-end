const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require("uuid");

function generateReceiptId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${randomStr}${timestamp}`.substring(0, 10).toUpperCase();
}

async function getStatus(req, res, next) {
  try {
    const refID = req.params.refID;
    const apiType = req.query.apiType;

    const pool = await poolPromise;

    const [results] = await pool.query(
      "SELECT is_end_to_end, merchantOrderID, refID, type, paymentStatus, approvedBy, createdAt, updatedAt, validatorUsername, amount, actualAmount, customerUPIID, returnUrl, transactionID as utr, vendor, accountNumber, ifsc, bankName, paymentMethod, website FROM orders WHERE refID = ?",
      [refID]
    );

    if (results.length === 0) {
      logger.error(`Order '${refID}' attempted to get does not exist.`);
      return res.status(404).json({ message: "Order not found." });
    }


    let isEndToEnd = results[0].is_end_to_end;
    if (isEndToEnd ) { 
      // altering logic for end to end
      let result = results[0];
      const actualAmount = result.actualAmount;
      const paymentMethod = result.paymentMethod;
      if (result.type == 'payin') {
          delete result.accountNumber;
          delete result.ifsc;
          delete result.bankName;
        
          return res.json(result);
      }
    } else {
      const username = results[0].validatorUsername;
      delete results[0].validatorUsername;
      let result = results[0];
  
      if (typeof apiType === "undefined") {
  
        const actualAmount = result.actualAmount;
        const paymentMethod = result.paymentMethod;
  
        delete result.actualAmount;
        delete result.paymentMethod;
        
        if (result.type == 'payin') {
          delete result.accountNumber;
          delete result.ifsc;
          delete result.bankName;
  
          if (paymentMethod == 'automatic_payment_with_sms' || paymentMethod == 'chrome_extension_with_decimal') {
            result.amount = actualAmount;
          }
  
          return res.json(result);
        } else {
          delete result.customerUPIID;
          return res.json(result);
        }
      } else {
        if (result.paymentStatus != 'pending' && result.approvedBy != 'auto') {
          logger.info(
            `The transaction is already done! Order ID: ${result.customerUPIID}, Receipt ID: ${result.receiptId}, UTR: ${result.transactionID}.`
          );
          return res.status(500).json({
            message: "The transaction is already done!",
            returnUrl: result.returnUrl,
          });
        }
  
        const [userResults] = await pool.query(
          "SELECT * FROM `users` WHERE `username` LIKE ? AND `status` = 1 AND `isLoggedIn` = 1",
          [username]
        );
  
        if (userResults.length === 0) {
          logger.error(`User '${username}' is not logged in or inactive.`);
          return res.status(406).json({
            message: "Assigned user is not logged in or inactive.",
          });
        }
  
        // generate a token if it is Automatic Payment
        if (userResults[0].paymentMethod == 'Automatic Payment' && result.paymentStatus == 'pending') {
          const token = uuidv4();
          const receiptId = generateReceiptId();
  
          await pool.query("UPDATE orders SET token = ?, receiptId = ? WHERE refID = ?", [
            token,
            receiptId,
            refID,
          ]);
  
          result.token = token;
          result.receiptId = receiptId;
        }
  
        result.is_utr_enabled = userResults[0].is_utr_enabled;
        result.isPayNow = userResults[0].isPayNow;
        result.paymentMethod = userResults[0].paymentMethod;
        result.merchantCode = userResults[0].merchantCode;
        result.merchantName = userResults[0].merchantName;
        result.accountHolderName = userResults[0].accountHolderName;
        result.accountNumber = userResults[0].accountNumber;
        result.ifsc = userResults[0].ifsc;
        result.bankName = userResults[0].bankName;
        result.qr = userResults[0].qr;
  
        return res.json(result);
      }
    }

    

 
  } catch (error) {
    logger.error("An error occurred while trying to get orders.", error);
    logger.debug(error);
    return res.status(500).json({
      message: `An error occurred while trying to get orders: ${error}`,
    });
  }
}

module.exports = getStatus;
