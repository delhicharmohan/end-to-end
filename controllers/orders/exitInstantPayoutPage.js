const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require("uuid");

function generateReceiptId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${randomStr}${timestamp}`.substring(0, 10).toUpperCase();
}

async function exitInstantPayoutPage(req, res, next) {

  console.log("TesTTT!!!!");
  try {
    const refID = req.params.refID;
    const apiType = req.query.apiType;


    console.log(refID);
    const pool = await poolPromise;


    const [update] = await pool.query(
      "UPDATE orders set is_instant_payout = ? WHERE refID= ?",
      [false, refID]
    );
    const [results] = await pool.query(
      "SELECT merchantOrderID, refID, type, paymentStatus, approvedBy, createdAt, updatedAt, validatorUsername, amount, actualAmount, customerUPIID, returnUrl, transactionID as utr, vendor, accountNumber, ifsc, bankName, paymentMethod, website FROM orders WHERE refID = ? and type = ?",
      [refID, 'payout']
    );

    if (results.length === 0) {
      logger.error(`Order '${refID}' attempted to get does not exist.`);
      return res.status(404).json({ message: "Order not found." });
    }

    const payoutOrder = results[0];


    console.log("\n \n\ n\ n\ n exit instant payout!!!!\n \n \n ");
    return res.status(200).json( {
      message: 'pending payout',
      data:payoutOrder,
    });
    
    
  } catch (error) {
    logger.error("An error occurred while trying to get orders.", error);
    logger.debug(error);
    return res.status(500).json({
      message: `An error occurred while trying to get orders: ${error}`,
    });
  }
}

module.exports = exitInstantPayoutPage;
