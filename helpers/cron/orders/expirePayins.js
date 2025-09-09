const poolPromise = require("../../../db");
const logger = require("../../../logger");
const { getIO } = require("../../../socket");

/**
 * Expire pending payins that passed their expires_at and revert payout balances safely
 * Rules:
 * - Only expire payins with paymentStatus='pending' and expires_at <= NOW()
 * - Find pending batches (not system/customer confirmed) for that payin
 * - For each such batch: set status='expired', add back amount to payout.instant_balance, decrement current_payout_splits
 * - Set payin.paymentStatus='expired'
 * - Emit vendor-scoped socket updates
 */
module.exports = async function expirePayinsTask() {
  const pool = await poolPromise;
  const io = getIO();
  try {
    // 1. Find expired payins
    const [expiredPayins] = await pool.query(`
      SELECT id, refID, vendor
      FROM orders
      WHERE type = 'payin'
        AND paymentStatus = 'pending'
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()
      LIMIT 200
    `);

    for (const payin of expiredPayins) {
      try {
        // 2. Find related pending batches
        const [batches] = await pool.query(`
          SELECT uuid, order_id, amount
          FROM instant_payout_batches
          WHERE pay_in_order_id = ?
            AND status = 'pending'
            AND system_confirmed_at IS NULL
        `, [payin.id]);

        for (const batch of batches) {
          // 3. Mark batch expired
          await pool.query(`
            UPDATE instant_payout_batches
            SET status = 'expired', updated_at = NOW()
            WHERE uuid = ? AND status = 'pending' AND system_confirmed_at IS NULL
          `, [batch.uuid]);

          // 4. Revert payout instant_balance and splits
          await pool.query(`
            UPDATE orders
            SET instant_balance = instant_balance + ?,
                current_payout_splits = GREATEST(0, current_payout_splits - 1),
                updatedAt = NOW()
            WHERE id = ? AND type = 'payout'
          `, [batch.amount, batch.order_id]);
        }

        // 5. Expire the payin itself
        await pool.query(`
          UPDATE orders
          SET paymentStatus = 'expired', updatedAt = NOW()
          WHERE id = ? AND paymentStatus = 'pending'
        `, [payin.id]);

        // 6. Emit socket notifications
        try {
          io.emit(`${payin.vendor}-payin-expired`, { refID: payin.refID });
          io.emit(`${payin.vendor}-instant-payout-available-updated`, { reason: 'payin-expired' });
        } catch (e) {
          logger.warn(`[expirePayinsTask] socket emit failed: ${e?.message}`);
        }

        logger.info(`[expirePayinsTask] Expired payin ${payin.refID} and reverted ${batches.length} batch(es)`);
      } catch (innerErr) {
        logger.error(`[expirePayinsTask] Failed to expire payin id=${payin.id}: ${innerErr?.message}`);
      }
    }
  } catch (error) {
    logger.error(`[expirePayinsTask] Error scanning expired payins: ${error?.message}`);
  }
};
