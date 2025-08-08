const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require("uuid");
const { getIO } = require("../../socket");

function generateReceiptId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 6);
  return `${randomStr}${timestamp}`.substring(0, 10).toUpperCase();
}

async function getInstantPayoutBatchForAdmin(req, res, next) {
  try {


    const refID = req.params.refID;

    const pool = await poolPromise;

    const [results] = await pool.query(
      "SELECT * FROM orders WHERE refID = ? and type = ? and payout_type = ?",
      [refID, 'payout', 'instant']
    );

    if (results.length === 0) {
      logger.error(`Order '${refID}' attempted to get does not exist.`);
      return res.status(404).json({ message: "Order not found." });
    }

    const payoutOrder = results[0];
    
    const [payoutBatches] = await pool.query(`
      SELECT *
      FROM instant_payout_batches 
      WHERE ref_id = ? 
      ORDER BY id DESC
  `, [payoutOrder.refID]);

        return res.status(200).json( {
          message: 'list',
          data: {
            batchItems: payoutBatches,
            total: payoutOrder.amount,
            paid: payoutOrder.instant_paid,
            balance: payoutOrder.instant_balance,
          },
        });
    
  } catch (error) {
    logger.error("An error occurred while trying to get orders.", error);
    logger.debug(error);
    return res.status(500).json({
      message: `An error occurred while trying to get orders: ${error}`,
    });
  }
}

module.exports = getInstantPayoutBatchForAdmin;
