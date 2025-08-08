const { json } = require("express");
const poolPromise = require("../../../db");
const moment = require("moment-timezone");
const logger = require("../../../logger");
const { getIO } = require("../../../socket");
const request = require("request");
const mysql = require("mysql2/promise");

// Configure database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

class NewOrderController {


    // call back post 
    async postAsync(options) {
        return new Promise((resolve, reject) => {
            request.post(options, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ response, body });
                }
            });
        });
    }

    async processBankResponse() {
        console.log("cron running from sub");
        const batchSize = 1000;
        let offset = 0;
        const pool = await poolPromise;
        await this.processRecordsBatch(pool, batchSize, offset, async (records) => {
            for (const record of records) {

                var req = {};
                var res = {};

                try {
                    const accountNo = record.account_no;
                    const amount = record.amount;
                    const utrNo = record.utr;
                    const transactionID = record.utr;

                    const [userResult] = await pool.query(
                        "SELECT * FROM users WHERE accountNumber = ?",
                        [accountNo]
                    );
                    if (userResult.length === 0) {

                    } else {
                        const validatorUsername = userResult[0].username;
                        const now = moment().tz(process.env.TIMEZONE);
                        const fiveMinutesAgoMoment = now.subtract(5, 'minutes');
                        const fiveMinutesAgo = fiveMinutesAgoMoment.format("YYYY-MM-DD HH:mm:ss");
                        const query = "SELECT * FROM orders WHERE validatorUsername = ? AND updatedAt >= ? AND paymentMethod = ? AND amount = ? AND type = ? AND paymentStatus = ?";
                        //const query = "SELECT * FROM orders WHERE  validatorUsername = ? AND updatedAt >= ? AND amount = ? AND type = ? AND paymentStatus = ?";
                        const queryParams = [validatorUsername, fiveMinutesAgo, 'automatic_payment_with_sms', amount, 'payin', 'pending'];
                        //const queryParams = [validatorUsername, fiveMinutesAgo, amount, 'payin', 'pending'];
                        const [orderResult] = await pool.query(
                            query,
                            queryParams
                        );
                        if (orderResult.length === 1) {
                            req.validator = userResult[0];
                            const refID = orderResult[0].refID;
                            const vendor = orderResult[0].vendor;
                            // update the order status to approved
                            const [results] = await pool.query(
                                "UPDATE orders SET automation_type = ?, paymentStatus = ?, transactionID = ?, approvedBy = ?, updatedAt = ? WHERE refID = ?",
                                [
                                    "bank_data",
                                    "approved",
                                    utrNo,
                                    'auto',
                                    now.format("YYYY-MM-DD HH:mm:ss"),
                                    refID,
                                ]
                            );
                            const changedData = {
                                refID: refID,
                                paymentStatus: 'approved',
                                transactionID: transactionID,
                            };
                            const io = getIO();
                            io.emit(`${vendor}-order-update-status-and-trnx`, changedData);
                            req.order = orderResult[0];
                            req.order.paymentStatus = "approved";
                            req.order.transactionID = transactionID;
                            logger.info(
                                `Order approved automatically with extension. refID:${req.order.refID}, orderId:${req.order.merchantOrderId}`
                            );
                            res.body = {
                                message: "Order approved automatically with extension.",
                                order: results,
                            };

                            if (req.order.transactionType == 'auto') {
                                try {
                                    // Fetch callbackURL from secrets table and send a POST request with the following fields: type, amount, orderId, status
                                    const [secrets] = await pool.query(
                                        "SELECT * FROM secrets WHERE clientName = ?",
                                        [req.order.clientName]
                                    );

                                    if (!secrets.length) {
                                        logger.error(
                                            `Bank response Invalid clientName. Attempted clientName:: '${req.order.clientName}'`
                                        );
                                    } else {
                                        const callbackURL = secrets[0].callbackURL;
                                        //console.log(callbackURL);
                                        const { response, body } = await this.postAsync({
                                            url: callbackURL,
                                            json: {
                                                type: req.order.type,
                                                amount: parseFloat(req.order.amount),
                                                orderId: req.order.merchantOrderId,
                                                utr: req.body.transactionID,
                                                status: req.order.paymentStatus,
                                            },
                                        });

                                        logger.info(
                                            `Callback sent successfully. input from bank response Order ID: ${req.order.merchantOrderId}`
                                        );
                                        logger.debug(body);
                                    }
                                } catch (error) {
                                    console.log(error);
                                    logger.error(
                                        `An error occurred while trying to fetch callbackURL. Order ID: ${req.order.merchantOrderId}`
                                    );
                                    logger.debug(error);
                                }
                            } else {
                                logger.info(
                                    `Manual Pay in false Callback sent successfully. Order ID: ${req.order.merchantOrderId}`
                                );

                            }
                            const [updateBankResponse] = await pool.query(
                                "UPDATE bank_responses SET status = ? WHERE id = ?",
                                [
                                    1,
                                    record.id,
                                ]
                            );

                        } else {
                            if (orderResult.length > 1) {
                                logger.error(
                                    `duplicate Orders. refID:${req.order.refID}, orderId:${req.order.merchantOrderId}`
                                );
                            } else {

                                logger.error(
                                    `No Order with. refID:${req.order.refID}, orderId:${req.order.merchantOrderId}`
                                );
                            }

                            const [updateBankResponse] = await pool.query(
                                "UPDATE bank_responses SET status = ? WHERE id = ?",
                                [2, record.id]
                            );

                        }
                    }

                } catch (error) {
                    console.log(error);
                    if (error.code == 'ER_DUP_ENTRY') {
                        logger.error("Duplicate UTR Number  while processing from bank response");
                    }

                    logger.error(
                        `Unknown Error while approving Order from bank response`
                    );


                    const [updateBankResponse] = await pool.query(
                        "UPDATE bank_responses SET status = ? WHERE id = ?",
                        [2, record.id]
                    );
                }


            }

        });
    }


    async processRecordsBatch(pool, batchSize, offset, processFunction) {
        const [rows] = await pool.query('SELECT * FROM bank_responses WHERE status = ? LIMIT ? OFFSET ?', [0, batchSize, offset]);

        if (rows.length > 0) {
            processFunction(rows);
            // Fetch the next batch recursively
            await processRecordsBatch(pool, batchSize, offset + batchSize, processFunction);
        }
    }

    async moveOldTransactions() {
        // Define batch size
        const BATCH_SIZE = 1000;
    
        const connection = await pool.getConnection();
        let cronHistoryId;

        try {

            const startTime = moment().tz(process.env.TIMEZONE);

            // Insert initial record into cron_history
            const [cronInsertResult] = await connection.query(`
                INSERT INTO cron_history (name, status, start_time, records_count) 
                VALUES (?, ?, ?, ?)
            `, ['move-old-transaction', 'started', startTime.format("YYYY-MM-DD HH:mm:ss"), 0]);

            cronHistoryId = cronInsertResult.insertId;

            while (true) {
                await connection.beginTransaction();
          
                // Select a batch of transactions older than 7 days
                const [rows] = await connection.query(`
                  SELECT * FROM orders 
                  WHERE updatedAt < CURDATE() - INTERVAL 7 DAY
                  LIMIT ?
                `, [BATCH_SIZE]);
          
                if (rows.length === 0) {
                  console.log('No more transactions older than 7 days to move.');
                  logger.info('No more transactions older than 7 days to move.');
                  await connection.commit();
                  break;
                }

                // Delete moved rows from orders_history
                await connection.query(`
                  DELETE FROM orders_history WHERE refID IN (?)
                `, [rows.map(row => row.refID)]);
          
                // Insert selected rows into orders_history
                const [insertResult] = await connection.query(`
                  INSERT INTO orders_history (SELECT * FROM orders WHERE refID IN (?))
                `, [rows.map(row => row.refID)]);

                const insertedRows = insertResult.affectedRows;
          
                // Delete moved rows from orders
                await connection.query(`
                  DELETE FROM orders WHERE refID IN (?)
                `, [rows.map(row => row.refID)]);

                // Update records_count in cron_history
                await connection.query(`
                    UPDATE cron_history SET records_count = records_count + ? WHERE id = ?
                `, [insertedRows, cronHistoryId]);

                console.log(`Moved ${insertedRows} transactions to orders_history and deleted them from orders.`);
                logger.info(`Moved ${insertedRows} transactions to orders_history and deleted them from orders.`);
          
                await connection.commit();

            }

            const endTime = moment().tz(process.env.TIMEZONE);

            // Update end_time in cron_history
            await connection.query(`
                UPDATE cron_history SET status = ?, end_time = ? WHERE id = ?
            `, ['finished', endTime.format("YYYY-MM-DD HH:mm:ss"), cronHistoryId]);

        } catch (error) {
            await connection.rollback();
            console.error('Error moving transactions:', error);
            logger.error('Error moving transactions:', error);
        } finally {
            connection.release();
        }
    }

}

module.exports = NewOrderController;