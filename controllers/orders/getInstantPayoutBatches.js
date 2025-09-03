const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require("uuid");
const { getIO } = require("../../socket");
const moment = require("moment-timezone");

// Removed duplicate generateReceiptId function - already exists in other files

async function getInstantPayoutBatches(req, res, next) {
  try {


    const now = moment().tz(process.env.TIMEZONE);

    const nowTime = now
      .subtract(0, "minutes")
      .format("YYYY-MM-DD HH:mm:ss");

    const refID = req.params.refID;

    const pool = await poolPromise;

    const [results] = await pool.query(
      "SELECT * FROM orders WHERE refID = ? and type = ? and payout_type = ?",
      [refID, "payout", "instant"]
    );

    if (results.length === 0) {
      logger.error(`Order '${refID}' attempted to get does not exist.`);
      return res.status(404).json({ message: "Order not found." });
    }

    const payoutOrder = results[0];

    const [payoutBatches] = await pool.query(
      `
      SELECT id,
             uuid, 
             amount,
             utr_no,
             status,
             ref_id,
             order_id, 
             payment_from, 
             payment_to,
             system_confirmed_at,
             confirmed_by_customer_at,
             vendor
      FROM instant_payout_batches 
      WHERE order_id = ? AND system_confirmed_at IS NOT NULL
      ORDER BY id DESC
  `,
      [payoutOrder.id]
    );

    


    let fasterOrder = false;



    const [fastOrder] = await pool.query(
      "SELECT * FROM orders WHERE refID = ? AND type = ? AND payout_type = ? AND is_payout_time_extended = ? AND instant_payout_expiry_at <= ?",
      [refID, "payout", "instant", 1,nowTime]
    );


    if (fastOrder.length > 0) {
      fasterOrder = true;
    }

    logger.info(`📊 Batches for order ${payoutOrder.refID}: ${payoutBatches.length} found`);
    
    return res.status(200).json({
      message: "list",
      data: {
        batchItems: payoutBatches,
        total: payoutOrder.amount,
        paid: payoutOrder.instant_paid,
        balance: payoutOrder.instant_balance,
        //now: nowTime,
        //expiry: instantPayoutExpiry,
        expiate: fasterOrder,
      },
      redirect: payoutOrder.paymentStatus == "approved" ? true : false,
    });
  } catch (error) {
    logger.error("An error occurred while trying to get orders.", error);
    logger.debug(error);
    return res.status(500).json({
      message: `An error occurred while trying to get orders: ${error}`,
    });
  }
}

module.exports = getInstantPayoutBatches;
