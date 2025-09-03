const poolPromise = require("../db");
const logger = require("../logger");

/**
 * Instant Payout Validation Utility
 * 
 * Provides comprehensive validation functions for instant payout operations
 * to prevent over-allocation and maintain data integrity.
 */

/**
 * Validates if a payout order can accept a new split
 * @param {number} payoutOrderId - The payout order ID
 * @param {number} requestedAmount - The amount to be allocated
 * @param {object} connection - Optional database connection (for transactions)
 * @returns {object} - Validation result with success/error details
 */
async function validatePayoutSplit(payoutOrderId, requestedAmount, connection = null) {
  const pool = connection || await poolPromise;
  
  try {
    console.log(`🔍 Validating payout split: Order ${payoutOrderId}, Amount ₹${requestedAmount}`);
    
    const [orderResult] = await pool.execute(`
      SELECT 
        id, refID, amount, instant_balance, instant_paid, 
        current_payout_splits, paymentStatus, is_instant_payout,
        (amount - instant_paid) as calculated_balance
      FROM orders 
      WHERE id = ? AND is_instant_payout = 1
    `, [payoutOrderId]);
    
    if (orderResult.length === 0) {
      return {
        success: false,
        error: 'PAYOUT_NOT_FOUND',
        message: 'Payout order not found or not an instant payout order'
      };
    }
    
    const order = orderResult[0];
    const requestedAmountFloat = parseFloat(requestedAmount);
    const availableBalance = parseFloat(order.instant_balance);
    
    console.log(`   📊 Order Details:`, {
      id: order.id,
      refID: order.refID,
      totalAmount: order.amount,
      availableBalance: availableBalance,
      paidAmount: order.instant_paid,
      currentSplits: order.current_payout_splits,
      status: order.paymentStatus,
      calculatedBalance: order.calculated_balance
    });
    
    // Validation checks
    if (order.paymentStatus !== 'unassigned') {
      return {
        success: false,
        error: 'INVALID_STATUS',
        message: `Payout order status is '${order.paymentStatus}', must be 'unassigned'`,
        currentStatus: order.paymentStatus
      };
    }
    
    if (order.current_payout_splits >= 5) {
      return {
        success: false,
        error: 'MAX_SPLITS_REACHED',
        message: `Maximum splits reached (${order.current_payout_splits}/5)`,
        currentSplits: order.current_payout_splits
      };
    }
    
    if (availableBalance <= 0) {
      return {
        success: false,
        error: 'ZERO_BALANCE',
        message: `No available balance (₹${availableBalance})`,
        availableBalance: availableBalance
      };
    }
    
    if (availableBalance < requestedAmountFloat) {
      return {
        success: false,
        error: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance. Available: ₹${availableBalance}, Requested: ₹${requestedAmountFloat}`,
        availableBalance: availableBalance,
        requestedAmount: requestedAmountFloat
      };
    }
    
    // Check for balance consistency
    const expectedBalance = parseFloat(order.amount) - parseFloat(order.instant_paid);
    if (Math.abs(availableBalance - expectedBalance) > 0.01) {
      logger.warn(`Balance inconsistency detected in order ${payoutOrderId}: available=${availableBalance}, expected=${expectedBalance}`);
      
      return {
        success: false,
        error: 'BALANCE_INCONSISTENCY',
        message: `Balance inconsistency detected. Please contact support.`,
        availableBalance: availableBalance,
        expectedBalance: expectedBalance
      };
    }
    
    console.log(`   ✅ Validation passed for order ${payoutOrderId}`);
    
    return {
      success: true,
      order: order,
      availableBalance: availableBalance,
      requestedAmount: requestedAmountFloat,
      remainingBalance: availableBalance - requestedAmountFloat,
      newSplitCount: order.current_payout_splits + 1
    };
    
  } catch (error) {
    logger.error(`Validation error for payout order ${payoutOrderId}:`, error);
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Internal validation error',
      details: error.message
    };
  }
}

/**
 * Validates the overall health of instant payout system
 * @returns {object} - System health metrics
 */
async function validateSystemHealth() {
  const pool = await poolPromise;
  
  try {
    console.log('🏥 Running instant payout system health check...');
    
    const [healthMetrics] = await pool.execute(`
      SELECT 
        COUNT(*) as total_instant_payouts,
        COUNT(CASE WHEN instant_balance < 0 THEN 1 END) as negative_balances,
        COUNT(CASE WHEN current_payout_splits > 5 THEN 1 END) as over_splits,
        COUNT(CASE WHEN ABS(instant_balance - (amount - instant_paid)) > 0.01 THEN 1 END) as balance_mismatches,
        COUNT(CASE WHEN paymentStatus = 'unassigned' AND instant_balance > 0 THEN 1 END) as available_orders,
        SUM(CASE WHEN paymentStatus = 'unassigned' THEN instant_balance ELSE 0 END) as total_available_balance
      FROM orders 
      WHERE is_instant_payout = 1
    `);
    
    const [batchMetrics] = await pool.execute(`
      SELECT 
        COUNT(*) as total_batches,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_batches,
        COUNT(CASE WHEN status = 'sys_confirmed' THEN 1 END) as confirmed_batches,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_batches,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount
      FROM instant_payout_batches
    `);
    
    const metrics = {
      ...healthMetrics[0],
      ...batchMetrics[0],
      timestamp: new Date().toISOString(),
      health_score: 100
    };
    
    // Calculate health score
    if (metrics.negative_balances > 0) metrics.health_score -= 30;
    if (metrics.over_splits > 0) metrics.health_score -= 20;
    if (metrics.balance_mismatches > 0) metrics.health_score -= 25;
    if (metrics.pending_batches > 10) metrics.health_score -= 10;
    
    console.log('📊 System Health Metrics:', metrics);
    
    return {
      success: true,
      metrics: metrics,
      status: metrics.health_score >= 80 ? 'HEALTHY' : 
              metrics.health_score >= 60 ? 'WARNING' : 'CRITICAL'
    };
    
  } catch (error) {
    logger.error('System health check error:', error);
    return {
      success: false,
      error: 'HEALTH_CHECK_ERROR',
      message: 'Failed to perform system health check',
      details: error.message
    };
  }
}

/**
 * Fixes balance inconsistencies (for maintenance operations)
 * @param {boolean} dryRun - If true, only shows what would be fixed
 * @returns {object} - Fix results
 */
async function fixBalanceInconsistencies(dryRun = true) {
  const pool = await poolPromise;
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    console.log(`🔧 ${dryRun ? 'DRY RUN - ' : ''}Fixing balance inconsistencies...`);
    
    const [inconsistentOrders] = await connection.execute(`
      SELECT 
        id, refID, amount, instant_balance, instant_paid,
        (amount - instant_paid) as calculated_balance,
        ABS(instant_balance - (amount - instant_paid)) as discrepancy
      FROM orders 
      WHERE is_instant_payout = 1 
      AND ABS(instant_balance - (amount - instant_paid)) > 0.01
      ORDER BY discrepancy DESC
    `);
    
    if (inconsistentOrders.length === 0) {
      return { success: true, message: 'No balance inconsistencies found', fixed: 0 };
    }
    
    console.log(`Found ${inconsistentOrders.length} orders with balance inconsistencies`);
    
    if (dryRun) {
      console.table(inconsistentOrders);
      return { 
        success: true, 
        message: `DRY RUN: Would fix ${inconsistentOrders.length} orders`, 
        orders: inconsistentOrders 
      };
    }
    
    await connection.beginTransaction();
    
    let fixedCount = 0;
    for (const order of inconsistentOrders) {
      const correctBalance = parseFloat(order.amount) - parseFloat(order.instant_paid);
      
      await connection.execute(`
        UPDATE orders 
        SET instant_balance = ?
        WHERE id = ?
      `, [correctBalance, order.id]);
      
      console.log(`Fixed order ${order.id}: ${order.instant_balance} → ${correctBalance}`);
      fixedCount++;
    }
    
    await connection.commit();
    
    return { 
      success: true, 
      message: `Fixed ${fixedCount} balance inconsistencies`, 
      fixed: fixedCount 
    };
    
  } catch (error) {
    if (connection) await connection.rollback();
    logger.error('Fix balance inconsistencies error:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  validatePayoutSplit,
  validateSystemHealth,
  fixBalanceInconsistencies
};

