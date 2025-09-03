const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");

/**
 * Complete the payin-payout matching process when a payin order is confirmed
 * This should be called when:
 * 1. Payment gateway confirms the payment
 * 2. UTR/Transaction ID is verified
 * 3. Admin approves the payment
 * 4. Screenshot is uploaded and verified
 */
async function completePayinMatching(payinOrderId, transactionId = null, confirmedBy = 'system') {
  const pool = await poolPromise;
  let connection;
  
  try {
    // Start transaction for data consistency
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    console.log(`🔄 Starting payin matching completion for order ${payinOrderId}`);
    
    // 1. Get the payin order details
    const [payinOrders] = await connection.execute(
      `SELECT * FROM orders WHERE id = ? AND type = 'payin'`,
      [payinOrderId]
    );
    
    if (payinOrders.length === 0) {
      throw new Error(`Payin order ${payinOrderId} not found`);
    }
    
    const payinOrder = payinOrders[0];
    console.log(`📥 Found payin order: ${payinOrder.id} - ₹${payinOrder.amount} (${payinOrder.paymentStatus})`);
    
    // 2. Check if this payin order has associated batches
    const [batches] = await connection.execute(`
      SELECT * FROM instant_payout_batches 
      WHERE pay_in_order_id = ? 
      AND status = 'pending'
      ORDER BY created_at DESC
    `, [payinOrderId]);
    
    if (batches.length === 0) {
      console.log(`ℹ️ No pending batches found for payin order ${payinOrderId}`);
      // Still update the payin order status
      await connection.execute(
        `UPDATE orders SET 
         paymentStatus = 'success', 
         transactionID = ?,
         updatedAt = NOW()
         WHERE id = ?`,
        [transactionId, payinOrderId]
      );
      
      await connection.commit();
      console.log(`✅ Updated payin order ${payinOrderId} status to success`);
      return { success: true, matchedBatches: 0 };
    }
    
    console.log(`🎯 Found ${batches.length} pending batches to complete`);
    
    // 3. Update the payin order status to success
    await connection.execute(
      `UPDATE orders SET 
       paymentStatus = 'success', 
       transactionID = ?,
       updatedAt = NOW()
       WHERE id = ?`,
      [transactionId, payinOrderId]
    );
    
    const now = moment().tz(process.env.TIMEZONE).format("YYYY-MM-DD HH:mm:ss");
    let completedBatches = 0;
    
    // 4. Process each batch
    for (const batch of batches) {
      console.log(`🔄 Processing batch ${batch.id} for payout order ${batch.order_id}`);
      
      // Update the batch status
      await connection.execute(`
        UPDATE instant_payout_batches 
        SET status = 'sys_confirmed',
            system_confirmed_at = ?,
            utr_no = ?,
            updated_at = ?
        WHERE id = ?
      `, [now, transactionId || `AUTO_${Date.now()}`, now, batch.id]);
      
      // Update the payout order's instant_balance (add back the amount)
      await connection.execute(`
        UPDATE orders 
        SET instant_balance = COALESCE(instant_balance, 0) + ?
        WHERE id = ?
      `, [batch.amount, batch.order_id]);
      
      completedBatches++;
      console.log(`✅ Completed batch ${batch.id} - Added ₹${batch.amount} to payout order ${batch.order_id}`);
      
      // Emit socket event for real-time updates
      const io = getIO();
      const eventData = {
        uuid: batch.uuid,
        amount: batch.amount,
        utr_no: transactionId || `AUTO_${Date.now()}`,
        system_confirmed_at: now,
        confirmed_by_customer_at: null
      };
      
      io.emit(`instant-withdraw-${batch.ref_id}`, eventData);
      console.log(`📡 Emitted socket event for payout order ${batch.ref_id}`);
    }
    
    // 5. Commit the transaction
    await connection.commit();
    
    console.log(`✅ Successfully completed payin matching for order ${payinOrderId}`);
    console.log(`   - Updated payin status to 'success'`);
    console.log(`   - Completed ${completedBatches} batches`);
    console.log(`   - Transaction ID: ${transactionId}`);
    
    return {
      success: true,
      payinOrderId: payinOrderId,
      matchedBatches: completedBatches,
      transactionId: transactionId
    };
    
  } catch (error) {
    // Rollback transaction on error
    if (connection) {
      await connection.rollback();
    }
    
    logger.error(`❌ Error completing payin matching for order ${payinOrderId}:`, error);
    throw error;
    
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Find and complete pending payin orders that should be matched
 * This can be used as a cron job or manual process
 */
async function processPendingPayinMatching() {
  const pool = await poolPromise;
  
  try {
    console.log('🔍 Looking for pending payin orders that need matching...');
    
    // Find payin orders that have pending batches but are still in pending status
    const [pendingPayins] = await pool.execute(`
      SELECT DISTINCT o.id, o.refID, o.amount, o.paymentStatus, o.createdAt
      FROM orders o
      INNER JOIN instant_payout_batches ipb ON ipb.pay_in_order_id = o.id
      WHERE o.type = 'payin'
      AND o.paymentStatus = 'success'
      AND ipb.status = 'pending'
      AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY o.createdAt DESC
    `);
    
    if (pendingPayins.length === 0) {
      console.log('✅ No pending payin orders found that need matching');
      return { processed: 0 };
    }
    
    console.log(`Found ${pendingPayins.length} payin orders that need matching completion`);
    
    let processedCount = 0;
    for (const payin of pendingPayins) {
      try {
        console.log(`Processing payin order ${payin.id}...`);
        await completePayinMatching(payin.id, payin.transactionID || `AUTO_${Date.now()}`, 'auto_processor');
        processedCount++;
      } catch (error) {
        console.error(`Failed to process payin order ${payin.id}:`, error.message);
      }
    }
    
    console.log(`✅ Processed ${processedCount} out of ${pendingPayins.length} pending payin orders`);
    return { processed: processedCount, total: pendingPayins.length };
    
  } catch (error) {
    logger.error('❌ Error in processPendingPayinMatching:', error);
    throw error;
  }
}

module.exports = {
  completePayinMatching,
  processPendingPayinMatching
};

