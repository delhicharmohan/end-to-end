const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");
const request = require("request");

class ExtensionController {

    async approveOrderFromExtension(req, res, next) {
        
        const fields = req.body;
        const requiredFields = ["amount"];
        const missingFields = requiredFields.filter(
            (field) => !Object.keys(fields).includes(field)
        );
        if (missingFields.length) {
            logger.error(`Missing fields: ${missingFields}`);
            return res.status(200).json({
                status: false,
                message: `Missing fields: ${missingFields}`
            });
        }

        const receiptId = fields.receiptId;
        let amount = fields.amount;
        // Remove commas and convert to float
        if (typeof amount === 'string') {
          amount = parseFloat(amount.replace(/,/g, ''));
        } else {
          amount = parseFloat(amount);
        }
        const accountNumber = fields.accountNumber;
        let transactionID = fields.transactionID;

        try {
            const pool = await poolPromise;
            let orders = [];

            // inserting all requests to logs
            const logId = await this.insertIntoChromeExtensionLogs(accountNumber, amount, receiptId, transactionID, 'started');

            if (typeof transactionID !== 'undefined') {
              [orders] = await pool.query("SELECT * FROM orders WHERE transactionID = ?", [transactionID]);
              if (orders.length) {
                await this.updateChromeExtensionLogs(logId, `Duplicate UTR`, 1);
                return res.status(200).json({
                    status: false,
                    message: `Duplicate UTR. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`
                });
              } else {
                [orders] = await pool.query("SELECT * FROM orders_history WHERE transactionID = ?", [transactionID]);
                if (orders.length) {
                  await this.updateChromeExtensionLogs(logId, `Duplicate UTR`, 1);
                  return res.status(200).json({
                      status: false,
                      message: `Duplicate UTR. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`
                  });
                }
              }
            }

            if (accountNumber && amount && typeof receiptId !== 'undefined' && typeof transactionID !== 'undefined') {
              [orders] = await pool.query("SELECT * FROM orders WHERE receiptId LIKE ? AND amount = ? AND accountNumber = ? AND customerUtr = ? ORDER BY createdAt ASC LIMIT 1", [
                  receiptId + '%',
                  amount,
                  accountNumber,
                  transactionID
              ]);
            }

            if (!orders.length) {
              if (accountNumber && amount && typeof receiptId !== 'undefined' && typeof transactionID === 'undefined') {
                [orders] = await pool.query("SELECT * FROM orders WHERE receiptId LIKE ? AND amount = ? AND accountNumber = ? ORDER BY createdAt ASC LIMIT 1", [
                    receiptId + '%',
                    amount,
                    accountNumber,
                ]);
              }
            }
            
            if (!orders.length) {
              if (accountNumber && amount && typeof receiptId === 'undefined' && typeof transactionID !== 'undefined') {
                [orders] = await pool.query("SELECT * FROM orders WHERE customerUtr = ? AND amount = ? AND accountNumber = ? ORDER BY createdAt ASC LIMIT 1", [
                    transactionID,
                    amount,
                    accountNumber,
                ]);
              }
            }
            
            if (accountNumber && amount) {

              const now = moment().tz(process.env.TIMEZONE);
              const tenMinutesAgoMoment = now.subtract(5, 'minutes');
              const tenMinutesAgo = tenMinutesAgoMoment.format("YYYY-MM-DD HH:mm:ss");

              [orders] = await pool.query("SELECT * FROM orders WHERE amount = ? AND accountNumber = ? AND createdAt >= ? ORDER BY createdAt ASC LIMIT 1", [
                amount,
                accountNumber,
                tenMinutesAgo,
              ]);

            }

            if (!orders.length) {
              if (amount && typeof transactionID !== 'undefined') {
                [orders] = await pool.query("SELECT * FROM orders WHERE customerUtr = ? AND amount = ? ORDER BY createdAt ASC LIMIT 1", [
                    transactionID,
                    amount,
                ]);
              } 
            }

            if (!orders.length) {
              if (typeof transactionID !== 'undefined') {
                [orders] = await pool.query("SELECT * FROM orders WHERE customerUtr = ? ORDER BY createdAt ASC LIMIT 1", [
                    transactionID,
                ]);
              } 
            }

            if (!orders.length) {
              await this.updateChromeExtensionLogs(logId, 'Order not found.');
                logger.error(`Order not found. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`);
                return res.status(200).json({
                    status: false,
                    message: `Order not found. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`
                });
            }

            if (orders[0].paymentStatus != "pending") {
              await this.updateChromeExtensionLogs(logId, `Order is ${orders[0].paymentStatus}.`);
                logger.error(`Order is ${orders[0].paymentStatus}. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`);
                return res.status(200).json({
                    status: false,
                    message: `Order is ${orders[0].paymentStatus}. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`
                });
            }

            if (orders[0].paymentMethod != 'automatic_payment_with_extension' && orders[0].paymentMethod != 'chrome_extension_with_decimal') {
              await this.updateChromeExtensionLogs(logId, `Order payment method is not 'Automatic Payment With Chrome Extension'.`);
                logger.error(`Order payment method is not 'Automatic Payment With Chrome Extension'. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`);
                return res.status(200).json({
                    status: false,
                    message: `Order payment method is not 'Automatic Payment With Chrome Extension'. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`
                });
            }

            const validatorUsername = orders[0].validatorUsername;
            if (!validatorUsername) {
              await this.updateChromeExtensionLogs(logId, 'validatorUsername not found.');
                logger.error(`validatorUsername not found. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`);
                return res.status(200).json({
                    status: false,
                    message: `validatorUsername not found. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`
                });
            }

            const [db_user] = await pool.query(
                "SELECT * FROM users WHERE username = ?",
                [validatorUsername]
            );

            if (!db_user.length) {
              await this.updateChromeExtensionLogs(logId, 'user is not found.');
                logger.error(`validatorUsername not found. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`);
                return res.status(200).json({
                    status: false,
                    message: `validatorUsername not found. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`
                });
            }

            if (db_user[0].payInLimit < orders[0].amount) {
              await this.updateChromeExtensionLogs(logId, `${validatorUsername} don't have sufficiant pay in limit.`);
                logger.error(`${validatorUsername} don't have sufficiant pay in limit. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`);
                return res.status(200).json({
                    status: false,
                    message: `${validatorUsername} don't have sufficiant pay in limit. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`
                });
            }

            const user = db_user[0];
            const refID = orders[0].refID;
            const vendor = orders[0].vendor;
            req.order = orders[0];

            if (typeof transactionID === 'undefined') {
              await this.updateChromeExtensionLogs(logId, `UTR does not exist.`);
              logger.error(`UTR does not exist. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`);
              return res.status(200).json({
                  status: false,
                  message: `UTR does not exist. receiptId: ${receiptId}, amount: ${amount}, accountNumber: ${accountNumber}, transactionID: ${transactionID}`
              });
            }

            if(orders[0].amount == amount) {

              const now = moment().tz(process.env.TIMEZONE);

              const [results] = await pool.query(
                  "UPDATE orders SET chrome_status = ?, chrome_amount = ?, paymentStatus = ?, transactionID = ?, approvedBy = ?, updatedAt = ? WHERE refID = ?",
                  [
                    'completed',
                    amount,
                    "approved",
                    transactionID,
                    "auto_extension",
                    now.format("YYYY-MM-DD HH:mm:ss"),
                    refID,
                  ]
              );

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

              req.order.paymentStatus = "approved";
              req.order.transactionID = transactionID;

              logger.info(
                  `Order approved successfully with chrome extension. refID:${refID}, orderId:${req.order.merchantOrderId}`
              );

              // Update the commission and balance
              const commissionPercentage = user.payInCommission;
              const commission = (amount * commissionPercentage) / 100;
              const balanceUpdateQuery = "UPDATE users SET balance = balance + ?, payInLimit = payInLimit - ? WHERE username = ?";
              await pool.query(balanceUpdateQuery, [commission, amount, validatorUsername]);
              logger.info(
                  `Commission updated successfully with chrome extension. refID:${refID}, orderId:${req.order.merchantOrderId}`
              );

              const {status, message} = await this.sendCallback(req.order);

              await this.updateChromeExtensionLogs(logId, message, status, refID);

            } else {
              const now = moment().tz(process.env.TIMEZONE);
              await this.updateChromeExtensionLogs(logId, 'mismatch_amount', false, refID);
              const [results] = await pool.query(
                "UPDATE orders SET chrome_status = ?, chrome_amount = ?, transactionID = ?, approvedBy = ?, updatedAt = ? WHERE refID = ?",
                [
                  'mismatch_amount',
                  amount,
                  transactionID,
                  "auto_extension",
                  now.format("YYYY-MM-DD HH:mm:ss"),
                  refID,
                ]
              );
            }

            return res.status(200).json({
                status: true,
                message: `Order approved successfully with chrome extension. refID:${refID}, orderId:${req.order.merchantOrderId}`
            });
        } catch (error) {
            logger.error(`An error occurred while trying to approve order automatically with chrome extension: ${error}`);
            return res.status(200).json({
                status: false,
                message: `An error occurred while trying to approve order automatically with chrome extension: ${error}`,
            });
        }
    }

    async insertIntoChromeExtensionLogs(account_number, amount, receipt_id, utr, log) {
      const now = moment().tz(process.env.TIMEZONE);
      const created_at = now.format("YYYY-MM-DD HH:mm:ss");
      const data = {
        account_number: account_number,
        amount: amount,
        receipt_id: receipt_id,
        utr: utr,
        log: log,
        created_at: created_at,
        updated_at: created_at,
      };

      try {
        const pool = await poolPromise;
        const [insertResult] = await pool.query("INSERT INTO chorme_extension_logs SET ?", data);
    
        if (insertResult.affectedRows !== 1) {
          logger.error("No chrome_extension_logs inserted");
          throw new Error("Failed to insert log");
        } else {
          logger.info(`Log inserted with ID ${insertResult.insertId}`);
          return insertResult.insertId;
        }
      } catch (error) {
        logger.error(`Error inserting log: ${error.message}`);
        throw error;
      }

    }

    async updateChromeExtensionLogs(logId, log, status = false, refID = null) {
      const now = moment().tz(process.env.TIMEZONE);
      const updated_at = now.format("YYYY-MM-DD HH:mm:ss");

      try {
        const pool = await poolPromise;
        let statusValue;
        if (status) {
          statusValue = 1;
        } else {
          statusValue = 0;
        }
        const query = `UPDATE chorme_extension_logs SET log = ?, updated_at = ?, status = ?, orders_ref_id = ? WHERE id = ?`;
        const values = [log, updated_at, statusValue, refID, logId];
    
        await pool.query(query, values);
        logger.info(`Log with ID ${logId} successfully updated`);
      } catch (error) {
        logger.error(`Failed to update log with ID ${logId}:`, error);
        throw error;
      }
    }

    async sendCallback(order) {
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
              const { response, body } = await this.postAsync({
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
                `Callback sent successfully with chrome extension. Order ID: ${order.merchantOrderId}`
              );

                return {
                    status: true,
                    message: `Callback sent successfully with chrome extension. Order ID: ${order.merchantOrderId}`,
                }
        
            } catch (error) {
              logger.error(
                `An error occurred while trying to fetch callbackURL with chrome extension. Order ID: ${order.merchantOrderId}`
              );
              return {
                status: false,
                message: `An error occurred while trying to fetch callbackURL with chrome extension. Order ID: ${order.merchantOrderId}`,
              }
            }
          } else {
            logger.info(
              `Manual Pay in false Callback sent successfully. Order ID: ${order.merchantOrderId}`
            );
            return {
                status: true,
                message: `Manual Pay in false Callback sent successfully. Order ID: ${order.merchantOrderId}`,
            }
        }
    }

    async postAsync(options) {
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
}

module.exports = ExtensionController;