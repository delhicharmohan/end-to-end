const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const templateList = require('../sms/template');
const moment = require("moment-timezone");
const { getIO } = require("../../socket");

class OrdersController {



    async recordTransactions(req, res) {

        console.log(req);
        console.log(res);


        try {



            const requiredFields = ['amount', 'utr', 'account_no'];
            const fields = req.body;
            const missingFields = requiredFields.filter(field => !fields.hasOwnProperty(field));
            if (missingFields.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                });
            }

            const amount = fields.amount;
            const accountNo = fields.account_no;
            const utrNo = fields.utr;
            var reciptCode = fields.recipt_code;
            if (reciptCode == null || reciptCode == undefined) {
                reciptCode = '';
            }
            const pool = await poolPromise;
            const currentTimestamp = Date.now();
            const now = moment().tz(process.env.TIMEZONE);
            const currentTime = now.format("YYYY-MM-DD HH:mm:ss");
            const [transactionResult] = await pool.query(
                "SELECT * FROM bank_responses WHERE utr = ?",
                [utrNo]
            );

            if (transactionResult.length === 0) {
                const [result] = await pool.query(
                    "INSERT INTO bank_responses (account_no, utr, amount, recipt_code, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    [
                        accountNo,
                        utrNo,
                        amount,
                        reciptCode,
                        0,
                        currentTime,
                    ]
                );
                if (result.affectedRows > 0) {
                    return res.status(200).json({
                        status: true,
                        message: "Bank Callback accepted!",

                    });
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "Bank call back does not accepted."
                    });
                }
            } else {
                return res.status(404).json({
                    status: false,
                    message: "Bank call back does not accepted. Duplicate Request"
                });
            }

        } catch (e) {
            console.log(e);
            return res.status(500).json({
                status: false,
                message: "Undefied error Occred"
            });
        }
    }

    async approveOrderFromBank(req, res) {

        try {
            const requiredFields = ['amount', 'utr', 'account_no'];

            const fields = req.body;
            const missingFields = requiredFields.filter(field => !fields.hasOwnProperty(field));
            if (missingFields.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                });
            }


            //const message = fields.message;
            //const senderId = fields.sender_id;

            const amount = fields.amount;
            const accountNo = fields.account_no;
            const utrNo = fields.utr;

            const pool = await poolPromise;

            const [userResult] = await pool.query(
                "SELECT * FROM users WHERE accountNumber = ?",
                [accountNo]
            );

            if (userResult.length === 0) {
                logger.error("Account No not found");
                return res
                    .status(404)
                    .json({ status: false, message: "Invalid Vendor Account No" });
            }

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
                    "UPDATE orders SET paymentStatus = ?, transactionID = ?, approvedBy = ?, updatedAt = ? WHERE refID = ?",
                    [
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
                next();
            } else {
                // console.log(orderResult.length)
                // return res
                // .status(200)
                // .json({ status: false, message: "Unknown Error while approving Order automatically with sms app." });
                if (orderResult.length > 1) {
                    return res
                        .status(400)
                        .json({ status: false, message: "duplicate orders." });
                } else {
                    return res
                        .status(404)
                        .json({ status: false, message: "no order." });
                }
            }
        } catch (error) {

            if (error.code == 'ER_DUP_ENTRY') {
                logger.error("Duplicate UTR Number ");
                return res
                    .status(400)
                    .json({ status: false, message: "Duplicate UTR Number" });
            }

            console.log(error)
            logger.error("Unknown Error while approving Order automatically with sms app.");
            return res
                .status(500)
                .json({ status: false, message: "Unknown Error while approving Order automatically with sms app." });
        }

    }


}

module.exports = OrdersController;