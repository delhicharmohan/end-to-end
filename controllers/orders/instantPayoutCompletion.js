const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");

/**
 * Complete instant payout batch when payin payment is confirmed
 * This is the missing piece that updates batch status from 'pending' to 'sys_confirmed'
 * 
 * @param {number} payinOrderId - The payin order ID that was confirmed
 * @param {string} transactionId - UTR/Transaction ID from payment
 * @param {string} confirmedBy - Who confirmed the payment (admin, gateway, etc.)
 * @returns {Object} Result of the completion process
 */
async function completeInstantPayoutBatch(payinOrderId, transactionId = null, confirmedBy = 'system') {
  const pool = await poolPromise;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    logger.info(`🔄 Starting instant payout completion for payin order ${payinOrderId}`);
    
    // 1. Get the payin order details
    const [payinOrders] = await connection.execute(
      `SELECT * FROM orders WHERE id = ? AND type = 'payin'`,
      [payinOrderId]
    );
    
    if (payinOrders.length === 0) {
      throw new Error(`Payin order ${payinOrderId} not found`);
    }
    
    const payinOrder = payinOrders[0];
    logger.info(`📥 Found payin order: ${payinOrder.id} - ₹${payinOrder.amount} (${payinOrder.paymentStatus})`);
    
    // 2. Find pending batches for this payin order
    const [pendingBatches] = await connection.execute(`
      SELECT * FROM instant_payout_batches 
      WHERE pay_in_order_id = ? 
      AND status = 'pending'
      ORDER BY created_at DESC
    `, [payinOrderId]);
    
    if (pendingBatches.length === 0) {
      logger.info(`ℹ️ No pending batches found for payin order ${payinOrderId}`);
      
      // Still update the payin order status if it's not already approved
      if (payinOrder.paymentStatus !== 'approved') {
        await connection.execute(
          `UPDATE orders SET 
           paymentStatus = 'approved', 
           transactionID = ?,
           updatedAt = NOW()
           WHERE id = ?`,
          [transactionId, payinOrderId]
        );
        logger.info(`✅ Updated payin order ${payinOrderId} status to approved`);
      }
      
      await connection.commit();
      return { success: true, completedBatches: 0, payinOrderId };
    }
    
    // 3. Update the payin order status to approved
    await connection.execute(
      `UPDATE orders SET 
       paymentStatus = 'approved', 
       transactionID = ?,
       updatedAt = NOW()
       WHERE id = ?`,
      [transactionId, payinOrderId]
    );
    
    const now = moment().tz(process.env.TIMEZONE).format("YYYY-MM-DD HH:mm:ss");
    let completedBatches = 0;
    const batchResults = [];
    
    // 4. Process each pending batch
    for (const batch of pendingBatches) {
      logger.info(`🔄 Processing batch ${batch.id} for payout order ${batch.order_id}`);
      
      // Update the batch status to sys_confirmed
      await connection.execute(`
        UPDATE instant_payout_batches 
        SET status = 'sys_confirmed',
            system_confirmed_at = ?,
            utr_no = ?,
            updated_at = ?
        WHERE id = ?
      `, [now, transactionId || `AUTO_${Date.now()}`, now, batch.id]);
      
      // Note: instant_balance should remain as-is (representing remaining amount to be matched)
      // No need to add amount back - instant_balance already correctly shows remaining balance
      
      completedBatches++;
      batchResults.push({
        batchId: batch.id,
        payoutOrderId: batch.order_id,
        amount: batch.amount,
        uuid: batch.uuid
      });
      
      logger.info(`✅ Completed batch ${batch.id} - Added ₹${batch.amount} back to payout order ${batch.order_id}`);
      
      // Emit real-time socket event to frontend
      const io = getIO();
      const eventData = {
        uuid: batch.uuid,
        amount: batch.amount,
        utr_no: transactionId || `AUTO_${Date.now()}`,
        system_confirmed_at: now,
        confirmed_by_customer_at: null,
        status: 'sys_confirmed'
      };
      
      // Emit to the specific payout order's channel
      const socketChannel = `instant-withdraw-${batch.ref_id}`;
      io.emit(socketChannel, eventData);
      logger.info(`📡 Emitted socket event to ${socketChannel}`);
    }
    
    // 5. Commit the transaction
    await connection.commit();
    
    logger.info(`✅ Successfully completed instant payout for payin order ${payinOrderId}`);
    logger.info(`   - Updated payin status to 'success'`);
    logger.info(`   - Completed ${completedBatches} batches`);
    logger.info(`   - Transaction ID: ${transactionId}`);
    
    return {
      success: true,
      payinOrderId: payinOrderId,
      completedBatches: completedBatches,
      transactionId: transactionId,
      batchResults: batchResults
    };
    
  } catch (error) {
    // Rollback transaction on error
    await connection.rollback();
    logger.error(`❌ Error completing instant payout for order ${payinOrderId}:`, error);
    throw error;
    
  } finally {
    connection.release();
  }
}

/**
 * Auto-process pending payin orders that should be completed
 * This can be called by cron job or manual trigger
 */
async function processAllPendingInstantPayouts() {
  const pool = await poolPromise;
  
  try {
    logger.info('🔍 Looking for pending instant payout batches that need completion...');
    
    // Find payin orders that have pending batches but are marked as 'success'
    const [readyForCompletion] = await pool.execute(`
      SELECT DISTINCT o.id, o.refID, o.amount, o.paymentStatus, o.transactionID, o.createdAt
      FROM orders o
      INNER JOIN instant_payout_batches ipb ON ipb.pay_in_order_id = o.id
      WHERE o.type = 'payin'
      AND o.paymentStatus = 'success'
      AND ipb.status = 'pending'
      AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY o.createdAt DESC
      LIMIT 50
    `);
    
    if (readyForCompletion.length === 0) {
      logger.info('✅ No pending instant payout batches found that need completion');
      return { processed: 0, total: 0 };
    }
    
    logger.info(`Found ${readyForCompletion.length} payin orders ready for instant payout completion`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const payin of readyForCompletion) {
      try {
        logger.info(`Processing payin order ${payin.id}...`);
        await completeInstantPayoutBatch(
          payin.id, 
          payin.transactionID || `AUTO_${Date.now()}`, 
          'auto_processor'
        );
        processedCount++;
      } catch (error) {
        errorCount++;
        logger.error(`Failed to process payin order ${payin.id}:`, error.message);
      }
    }
    
    logger.info(`✅ Processed ${processedCount} out of ${readyForCompletion.length} pending instant payouts`);
    if (errorCount > 0) {
      logger.warn(`⚠️ ${errorCount} orders failed to process`);
    }
    
    return { 
      processed: processedCount, 
      total: readyForCompletion.length,
      errors: errorCount 
    };
    
  } catch (error) {
    logger.error('❌ Error in processAllPendingInstantPayouts:', error);
    throw error;
  }
}

/**
 * Get status of pending instant payout batches
 */
async function getInstantPayoutStatus() {
  const pool = await poolPromise;
  
  try {
    // Get summary statistics
    const [pendingStats] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT ipb.pay_in_order_id) as pending_payin_orders,
        COUNT(ipb.id) as pending_batches,
        SUM(ipb.amount) as total_pending_amount,
        COUNT(DISTINCT ipb.order_id) as affected_payout_orders
      FROM instant_payout_batches ipb
      INNER JOIN orders o ON ipb.pay_in_order_id = o.id
      WHERE ipb.status = 'pending'
      AND o.type = 'payin'
      AND ipb.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    
    // Get ready for completion
    const [readyForCompletion] = await pool.execute(`
      SELECT COUNT(DISTINCT o.id) as ready_count
      FROM orders o
      INNER JOIN instant_payout_batches ipb ON ipb.pay_in_order_id = o.id
      WHERE o.type = 'payin'
      AND o.paymentStatus = 'success'
      AND ipb.status = 'pending'
      AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    
    return {
      pending_stats: pendingStats[0],
      ready_for_completion: readyForCompletion[0].ready_count
    };
    
  } catch (error) {
    logger.error('Error getting instant payout status:', error);
    throw error;
  }
}

module.exports = {
  completeInstantPayoutBatch,
  processAllPendingInstantPayouts,
  getInstantPayoutStatus
};
