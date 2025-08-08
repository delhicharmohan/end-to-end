const poolPromise = require("../../db");
const logger = require("../../logger");

class StatusController {

    async getStatusWithOrderId(req, res) {

        if (!req.params.merchantOrderId) {
            logger.error("Missing Order ID");
            return res.status(200).json({
                status: false,
                message: "Missing Order ID",
            });
        }

        const merchantOrderId = req.params.merchantOrderId;

        try {

            const pool = await poolPromise;

            const [results] = await pool.query(
                "SELECT merchantOrderID, refID, type, paymentStatus, approvedBy, createdAt, updatedAt, amount, actualAmount, customerUPIID, returnUrl, transactionID as utr, vendor, accountNumber, ifsc, bankName, paymentMethod FROM orders WHERE merchantOrderId = ?",
                [merchantOrderId]
            );

            if (results.length === 0) {
                logger.error(`Invalid Order ID: '${merchantOrderId}'`);
                return res.status(200).json({
                    status: false,
                    message: "Invalid Order ID",
                });
            }

            let order = results[0];
            const actualAmount = order.actualAmount;
            const paymentMethod = order.paymentMethod;

            delete order.actualAmount;
            delete order.paymentMethod;

            if (order.type == 'payin') {
                delete order.accountNumber;
                delete order.ifsc;
                delete order.bankName;
        
                if (paymentMethod == 'automatic_payment_with_sms' || paymentMethod == 'chrome_extension_with_decimal') {
                    order.amount = actualAmount;
                }

                return res.status(200).json({
                    status: true,
                    data: order,
                });
            } else {
                delete order.customerUPIID;
                return res.status(200).json({
                    status: true,
                    data: order,
                });
            }
        } catch (e) {
            logger.error(e);
            return res.status(200).json({
                status: false,
                message: "Failed to get the status of this order. Please try again later!"
            });
        }
    }
}

module.exports = StatusController;