const poolPromise = require("../../../db");
const logger = require("../../../logger");

async function updateOrders(type, currentStatus, newStatus) {
  try {
    const pool = await poolPromise;

    const query = `
      UPDATE orders 
      SET paymentStatus = ? 
      WHERE type = ? AND paymentStatus = ? AND TIMESTAMPDIFF(HOUR, createdAt, NOW()) > 24;
    `;

    const [result] = await pool.query(query, [newStatus, type, currentStatus]);

    logger.info(`${result.affectedRows} orders updated from ${currentStatus} to '${newStatus}' status.`);

  } catch (error) {
    logger.error(`An error occurred in updateOrders. ERROR ===>>> error`);
    throw error; // Re-throw the error to be caught by the calling function or the catch block in your cron job
  }
}

module.exports = updateOrders;
