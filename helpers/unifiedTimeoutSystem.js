const poolPromise = require("../db");
const logger = require("../logger");
const moment = require("moment-timezone");
const { getIO } = require("../socket");
const { v4: uuidv4 } = require('uuid');
const getEndToEndValidator = require("./getEndToEndValidator");

/**
 * Unified Timeout System for Instant Payouts
 * 
 * Consolidates all timeout approaches into a single, robust system:
 * - 30-minute payout expiry
 * - 15-minute payin timeout
 * - Automatic reassignment
 * - Payment verification
 * - Flag-based processing
 */

class UnifiedTimeoutSystem {
  constructor() {
    this.PAYOUT_EXPIRY_MINUTES = 30;
    this.PAYIN_TIMEOUT_MINUTES = 15;
    this.TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';
  }

  /**
   * Main timeout processing function - should be called by cron job
   */
  async processTimeouts() {
    console.log('\n⏰ === UNIFIED TIMEOUT PROCESSING STARTED ===');
    console.log('📅 Timestamp:', moment().tz(this.TIMEZONE).format("YYYY-MM-DD HH:mm:ss"));

    try {
      // Step 1: Process expired payout orders (30-minute expiry)
      const expiredPayouts = await this.processExpiredPayouts();
      
      // Step 2: Process timed-out payin orders (15-minute timeout)  
      const timedOutPayins = await this.processTimedOutPayins();
      
      // Step 3: Process reassignments
      const reassignments = await this.processReassignments();

      const summary = {
        timestamp: new Date().toISOString(),
        expiredPayouts: expiredPayouts.length,
        timedOutPayins: timedOutPayins.length,
        reassignments: reassignments.length,
        totalProcessed: expiredPayouts.length + timedOutPayins.length + reassignments.length
      };

      console.log('\n📊 === TIMEOUT PROCESSING SUMMARY ===');
      console.log(summary);

      return { success: true, summary };

    } catch (error) {
      logger.error('❌ Unified timeout processing failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process payout orders that have expired (30 minutes)
   */
  async processExpiredPayouts() {
    const pool = await poolPromise;
    const now = moment().tz(this.TIMEZONE);
    
    console.log('\n🕐 Processing expired payout orders (30-minute expiry)...');

    const [expiredPayouts] = await pool.execute(`
      SELECT id, refID, amount, instant_balance, instant_paid, current_payout_splits, 
             customerUPIID, vendor, instant_payout_expiry_at
      FROM orders 
      WHERE is_instant_payout = 1 
      AND paymentStatus = 'unassigned'
      AND instant_payout_expiry_at IS NOT NULL
      AND instant_payout_expiry_at <= NOW()
    `);

    console.log(`📋 Found ${expiredPayouts.length} expired payout orders`);

    for (const payout of expiredPayouts) {
      try {
        await this.expirePayoutOrder(payout);
        console.log(`✅ Expired payout order ${payout.id} (${payout.refID})`);
      } catch (error) {
        console.error(`❌ Failed to expire payout order ${payout.id}:`, error.message);
      }
    }

    return expiredPayouts;
  }

  /**
   * Process payin orders that have timed out (15 minutes)
   */
  async processTimedOutPayins() {
    const pool = await poolPromise;
    const timeoutThreshold = moment().tz(this.TIMEZONE)
      .subtract(this.PAYIN_TIMEOUT_MINUTES, 'minutes')
      .format('YYYY-MM-DD HH:mm:ss');
    
    console.log('\n⏱️  Processing timed-out payin orders (15-minute timeout)...');

    const [timedOutPayins] = await pool.execute(`
      SELECT DISTINCT 
        o.id, o.refID, o.amount, o.vendor, o.createdAt,
        b.id as batch_id, b.order_id as payout_order_id, b.timeout_flag
      FROM orders o
      INNER JOIN instant_payout_batches b ON o.id = b.pay_in_order_id
      WHERE o.type = 'payin' 
      AND o.paymentStatus = 'pending'
      AND o.createdAt <= ?
      AND b.status = 'pending'
      AND (b.timeout_flag IS NULL OR b.timeout_flag = 0)
      AND b.system_confirmed_at IS NULL
      AND b.confirmed_by_customer_at IS NULL
      AND b.confirmed_by_admin_at IS NULL
    `, [timeoutThreshold]);

    console.log(`📋 Found ${timedOutPayins.length} timed-out payin orders`);

    for (const payin of timedOutPayins) {
      try {
        // First check if payment was actually processed
        const paymentProcessed = await this.checkIfPaymentProcessed(payin.id, payin.batch_id);
        
        if (paymentProcessed) {
          await this.confirmLatePayment(payin);
          console.log(`✅ Confirmed late payment for payin ${payin.id}`);
        } else {
          await this.timeoutPayinOrder(payin);
          console.log(`⏰ Timed out payin order ${payin.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to process timed-out payin ${payin.id}:`, error.message);
      }
    }

    return timedOutPayins;
  }

  /**
   * Process reassignments for timed-out amounts
   */
  async processReassignments() {
    const pool = await poolPromise;
    
    console.log('\n🔄 Processing reassignments...');

    // Find payout orders with timed-out batches that need reassignment
    const [reassignmentCandidates] = await pool.execute(`
      SELECT DISTINCT 
        o.id, o.refID, o.amount, o.instant_balance, o.vendor,
        COUNT(b.id) as timed_out_batches,
        SUM(b.amount) as timed_out_amount
      FROM orders o
      INNER JOIN instant_payout_batches b ON o.id = b.order_id
      WHERE o.is_instant_payout = 1 
      AND o.paymentStatus = 'unassigned'
      AND b.status = 'expired'
      AND b.timeout_flag = 1
      AND b.is_reassigned = 0
      GROUP BY o.id
      HAVING o.instant_balance > 0
    `);

    console.log(`📋 Found ${reassignmentCandidates.length} orders needing reassignment`);

    const reassignments = [];
    for (const candidate of reassignmentCandidates) {
      try {
        const newMatch = await this.findNewPayinMatch(candidate);
        if (newMatch) {
          await this.createReassignmentBatch(candidate, newMatch);
          reassignments.push({ payout: candidate, newMatch });
          console.log(`✅ Reassigned ₹${candidate.instant_balance} from order ${candidate.id} to new customer`);
        }
      } catch (error) {
        console.error(`❌ Failed to reassign order ${candidate.id}:`, error.message);
      }
    }

    return reassignments;
  }

  /**
   * Check if payment was actually processed despite timeout
   */
  async checkIfPaymentProcessed(payinOrderId, batchId) {
    const pool = await poolPromise;

    // Check multiple indicators of payment processing
    const [paymentIndicators] = await pool.execute(`
      SELECT 
        o.paymentStatus,
        o.transactionID,
        b.utr_no,
        b.confirmed_by_customer_at,
        b.confirmed_by_admin_at,
        b.system_confirmed_at
      FROM orders o
      LEFT JOIN instant_payout_batches b ON b.id = ?
      WHERE o.id = ?
    `, [batchId, payinOrderId]);

    if (paymentIndicators.length === 0) return false;

    const indicators = paymentIndicators[0];
    
    // Payment is considered processed if any of these are true
    const isProcessed = 
      indicators.paymentStatus === 'success' ||
      indicators.paymentStatus === 'approved' ||
      indicators.transactionID !== null ||
      indicators.utr_no !== null ||
      indicators.confirmed_by_customer_at !== null ||
      indicators.confirmed_by_admin_at !== null ||
      indicators.system_confirmed_at !== null;

    console.log(`🔍 Payment check for payin ${payinOrderId}:`, {
      processed: isProcessed,
      status: indicators.paymentStatus,
      hasUTR: !!indicators.transactionID || !!indicators.utr_no,
      hasConfirmation: !!(indicators.confirmed_by_customer_at || indicators.confirmed_by_admin_at)
    });

    return isProcessed;
  }

  /**
   * Expire a payout order
   */
  async expirePayoutOrder(payoutOrder) {
    const pool = await poolPromise;
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Update payout order status
      await connection.execute(`
        UPDATE orders 
        SET paymentStatus = 'expired',
            updatedAt = NOW()
        WHERE id = ?
      `, [payoutOrder.id]);

      // Mark all pending batches as expired
      await connection.execute(`
        UPDATE instant_payout_batches 
        SET status = 'expired',
            timeout_flag = 1,
            updated_at = NOW()
        WHERE order_id = ? AND status = 'pending'
      `, [payoutOrder.id]);

      // Notify via socket
      const io = getIO();
      const payoutRoom = `instant-withdraw-${payoutOrder.refID}`;
      io.emit(payoutRoom, {
        type: 'payout_expired',
        message: 'Payout order has expired after 30 minutes',
        orderId: payoutOrder.id,
        refID: payoutOrder.refID
      });

      await connection.commit();
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Timeout a payin order
   */
  async timeoutPayinOrder(payinData) {
    const pool = await poolPromise;
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Mark payin order as expired
      await connection.execute(`
        UPDATE orders 
        SET paymentStatus = 'expired',
            updatedAt = NOW()
        WHERE id = ?
      `, [payinData.id]);

      // Mark batch as expired with timeout flag
      await connection.execute(`
        UPDATE instant_payout_batches 
        SET status = 'expired',
            timeout_flag = 1,
            updated_at = NOW()
        WHERE id = ?
      `, [payinData.batch_id]);

      await connection.commit();
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Confirm a late payment
   */
  async confirmLatePayment(payinData) {
    const pool = await poolPromise;
    
    // Only update batch status to system-confirmed, do NOT approve payin
    // Payin approval will happen only when customer confirms on withdrawal page
    await pool.query(`
      UPDATE instant_payout_batches 
      SET status = 'sys_confirmed',
          system_confirmed_at = NOW(),
          utr_no = ?
      WHERE pay_in_order_id = ? AND status = 'pending'
    `, [`LATE_${Date.now()}`, payinData.id]);
    
    logger.info(`⏰ Timeout system updated batches to sys_confirmed for payin ${payinData.id}, awaiting customer confirmation`);
  }

  /**
   * Find new payin match for reassignment
   */
  async findNewPayinMatch(payoutOrder) {
    try {
      // Use existing validator with available balance
      const match = await getEndToEndValidator(payoutOrder.instant_balance, payoutOrder.vendor);
      return match;
    } catch (error) {
      console.log(`No new match found for ₹${payoutOrder.instant_balance}:`, error.message);
      return null;
    }
  }

  /**
   * Create reassignment batch
   */
  async createReassignmentBatch(payoutOrder, newMatch) {
    const pool = await poolPromise;
    const connection = await pool.getConnection();
    const now = moment().tz(this.TIMEZONE);
    const createdAt = now.format("YYYY-MM-DD HH:mm:ss");
    
    try {
      await connection.beginTransaction();

      // Create new batch
      const batchData = {
        uuid: uuidv4(),
        order_id: payoutOrder.id,
        ref_id: payoutOrder.refID,
        amount: Math.min(newMatch.amount, payoutOrder.instant_balance),
        pay_in_order_id: newMatch.id,
        pay_in_ref_id: newMatch.refID,
        status: 'pending',
        vendor: payoutOrder.vendor,
        payment_from: newMatch.customerUPIID,
        payment_to: payoutOrder.customerUPIID,
        created_at: createdAt,
        updated_at: createdAt,
        is_reassigned: 1
      };

      await connection.execute(`
        INSERT INTO instant_payout_batches SET ?
      `, [batchData]);

      // Update payout order with safe balance deduction
      const actualAmountToDeduct = Math.min(parseFloat(batchData.amount), parseFloat(payoutOrder.instant_balance));
      await connection.execute(`
        UPDATE orders 
        SET current_payout_splits = current_payout_splits + 1,
            instant_balance = instant_balance - ?
        WHERE id = ? AND instant_balance >= ?
      `, [actualAmountToDeduct, payoutOrder.id, actualAmountToDeduct]);

      // Mark old expired batches as reassigned
      await connection.execute(`
        UPDATE instant_payout_batches 
        SET is_reassigned = 1
        WHERE order_id = ? AND status = 'expired' AND timeout_flag = 1
      `, [payoutOrder.id]);

      // Notify via socket
      const io = getIO();
      const payoutRoom = `instant-withdraw-${payoutOrder.refID}`;
      io.emit(payoutRoom, {
        type: 'reassignment',
        message: `Order reassigned to new customer`,
        amount: batchData.amount,
        remainingBalance: payoutOrder.instant_balance - batchData.amount
      });

      await connection.commit();
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get timeout system status and metrics
   */
  async getTimeoutStatus() {
    const pool = await poolPromise;
    
    const [metrics] = await pool.execute(`
      SELECT 
        -- Payout metrics
        COUNT(CASE WHEN o.is_instant_payout = 1 AND o.paymentStatus = 'unassigned' THEN 1 END) as active_payouts,
        COUNT(CASE WHEN o.is_instant_payout = 1 AND o.instant_payout_expiry_at <= NOW() THEN 1 END) as expired_payouts,
        
        -- Payin metrics  
        COUNT(CASE WHEN o.type = 'payin' AND o.paymentStatus = 'pending' AND o.createdAt <= DATE_SUB(NOW(), INTERVAL 15 MINUTE) THEN 1 END) as timed_out_payins,
        
        -- Batch metrics
        COUNT(CASE WHEN b.status = 'pending' AND b.timeout_flag = 0 THEN 1 END) as active_batches,
        COUNT(CASE WHEN b.status = 'expired' AND b.timeout_flag = 1 THEN 1 END) as timed_out_batches,
        COUNT(CASE WHEN b.is_reassigned = 1 THEN 1 END) as reassigned_batches
        
      FROM orders o
      LEFT JOIN instant_payout_batches b ON (
        (o.is_instant_payout = 1 AND b.order_id = o.id) OR 
        (o.type = 'payin' AND b.pay_in_order_id = o.id)
      )
    `);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      metrics: metrics[0],
      configuration: {
        payoutExpiryMinutes: this.PAYOUT_EXPIRY_MINUTES,
        payinTimeoutMinutes: this.PAYIN_TIMEOUT_MINUTES,
        timezone: this.TIMEZONE
      }
    };
  }
}

// Export singleton instance
const timeoutSystem = new UnifiedTimeoutSystem();

module.exports = {
  UnifiedTimeoutSystem,
  timeoutSystem,
  
  // Export main functions for backward compatibility
  processTimeouts: () => timeoutSystem.processTimeouts(),
  getTimeoutStatus: () => timeoutSystem.getTimeoutStatus()
};

