const poolPromise = require("../db");
const logger = require("../logger");
const moment = require("moment-timezone");
const { getIO } = require("../socket");

/**
 * Automatic Completion Service for Instant Payouts
 * 
 * Handles automatic completion of batches when payments are confirmed
 * through various methods: webhooks, UTR verification, admin approval, etc.
 */

class AutoCompletionService {
  constructor() {
    this.TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';
    this.completionMethods = {
      WEBHOOK: 'webhook',
      UTR_VERIFICATION: 'utr_verification',
      ADMIN_APPROVAL: 'admin_approval',
      SCREENSHOT_UPLOAD: 'screenshot_upload',
      SYSTEM_AUTO: 'system_auto',
      MANUAL: 'manual'
    };
  }

  /**
   * Main completion handler - determines completion method and triggers appropriate flow
   */
  async handleCompletion(payinOrderId, completionData = {}) {
    const {
      transactionId = null,
      method = this.completionMethods.SYSTEM_AUTO,
      confirmedBy = 'system',
      additionalData = {}
    } = completionData;

    console.log(`\n⚡ === AUTOMATIC COMPLETION TRIGGERED ===`);
    console.log('📅 Timestamp:', moment().tz(this.TIMEZONE).format("YYYY-MM-DD HH:mm:ss"));
    console.log('🔍 Payin Order ID:', payinOrderId);
    console.log('🎯 Method:', method);
    console.log('👤 Confirmed By:', confirmedBy);
    console.log('🆔 Transaction ID:', transactionId);

    try {
      // Step 1: Validate payin order exists and is in correct state
      const validationResult = await this.validatePayinOrder(payinOrderId);
      if (!validationResult.success) {
        console.log('❌ Validation failed:', validationResult.message);
        return validationResult;
      }

      const payinOrder = validationResult.order;
      console.log('✅ Payin order validated:', {
        id: payinOrder.id,
        refID: payinOrder.refID,
        amount: payinOrder.amount,
        currentStatus: payinOrder.paymentStatus
      });

      // Step 2: Find associated batches
      const batchResult = await this.findAssociatedBatches(payinOrderId);
      if (!batchResult.success) {
        console.log('❌ No batches found:', batchResult.message);
        return batchResult;
      }

      const batches = batchResult.batches;
      console.log(`📦 Found ${batches.length} associated batches`);

      // Step 3: Complete each batch
      const completionResults = [];
      for (const batch of batches) {
        try {
          const result = await this.completeBatch(batch, payinOrder, {
            transactionId,
            method,
            confirmedBy,
            additionalData
          });
          completionResults.push(result);
          console.log(`✅ Batch ${batch.id} completed successfully`);
        } catch (error) {
          console.error(`❌ Failed to complete batch ${batch.id}:`, error.message);
          completionResults.push({
            success: false,
            batchId: batch.id,
            error: error.message
          });
        }
      }

      // Step 4: Update payin order status
      await this.updatePayinOrderStatus(payinOrderId, transactionId, method);

      // Step 5: Send notifications
      await this.sendCompletionNotifications(payinOrder, batches, completionResults);

      // Step 6: Log completion event
      await this.logCompletionEvent(payinOrderId, method, completionResults);

      const successCount = completionResults.filter(r => r.success).length;
      console.log(`\n🎉 Completion Summary: ${successCount}/${completionResults.length} batches completed`);

      return {
        success: true,
        payinOrderId,
        batchesProcessed: completionResults.length,
        batchesCompleted: successCount,
        method,
        results: completionResults
      };

    } catch (error) {
      logger.error(`❌ Auto-completion failed for payin ${payinOrderId}:`, error);
      return {
        success: false,
        error: error.message,
        payinOrderId
      };
    }
  }

  /**
   * Validate payin order is in correct state for completion
   */
  async validatePayinOrder(payinOrderId) {
    const pool = await poolPromise;

    try {
      const [orders] = await pool.execute(`
        SELECT * FROM orders 
        WHERE id = ? AND type = 'payin'
      `, [payinOrderId]);

      if (orders.length === 0) {
        return {
          success: false,
          message: 'Payin order not found'
        };
      }

      const order = orders[0];

      // Check if order is in a state that can be completed
      const validStatuses = ['pending', 'created', 'unassigned'];
      if (!validStatuses.includes(order.paymentStatus)) {
        return {
          success: false,
          message: `Order status '${order.paymentStatus}' cannot be completed`,
          currentStatus: order.paymentStatus
        };
      }

      return {
        success: true,
        order: order
      };

    } catch (error) {
      return {
        success: false,
        message: 'Database error during validation',
        error: error.message
      };
    }
  }

  /**
   * Find all batches associated with a payin order
   */
  async findAssociatedBatches(payinOrderId) {
    const pool = await poolPromise;

    try {
      const [batches] = await pool.execute(`
        SELECT b.*, o.refID as payout_ref_id, o.customerUPIID as payout_upi
        FROM instant_payout_batches b
        LEFT JOIN orders o ON b.order_id = o.id
        WHERE b.pay_in_order_id = ?
        AND b.status IN ('pending', 'created')
        ORDER BY b.created_at DESC
      `, [payinOrderId]);

      if (batches.length === 0) {
        return {
          success: false,
          message: 'No pending batches found for this payin order'
        };
      }

      return {
        success: true,
        batches: batches
      };

    } catch (error) {
      return {
        success: false,
        message: 'Database error finding batches',
        error: error.message
      };
    }
  }

  /**
   * Complete a specific batch
   */
  async completeBatch(batch, payinOrder, completionData) {
    const pool = await poolPromise;
    const connection = await pool.getConnection();
    const now = moment().tz(this.TIMEZONE);
    const timestamp = now.format("YYYY-MM-DD HH:mm:ss");

    try {
      await connection.beginTransaction();

      console.log(`🔧 Completing batch ${batch.id} for ₹${batch.amount}`);

      // Step 1: Update batch status
      await connection.execute(`
        UPDATE instant_payout_batches 
        SET status = 'sys_confirmed',
            system_confirmed_at = ?,
            utr_no = ?,
            confirmed_by = ?,
            completion_method = ?,
            updated_at = ?
        WHERE id = ?
      `, [
        timestamp,
        completionData.transactionId,
        completionData.confirmedBy,
        completionData.method,
        timestamp,
        batch.id
      ]);

      // Step 2: Update payout order balances
      await connection.execute(`
        UPDATE orders 
        SET instant_paid = instant_paid + ?,
            updatedAt = ?
        WHERE id = ?
      `, [batch.amount, timestamp, batch.order_id]);

      // Step 3: Check if payout order is fully completed
      const [payoutStatus] = await connection.execute(`
        SELECT 
          amount,
          instant_paid,
          instant_balance,
          (amount - instant_paid) as remaining_balance
        FROM orders 
        WHERE id = ?
      `, [batch.order_id]);

      const payout = payoutStatus[0];
      console.log(`💰 Payout order ${batch.order_id} status:`, {
        total: payout.amount,
        paid: payout.instant_paid,
        remaining: payout.remaining_balance
      });

      // Step 4: If payout is fully completed, update its status
      if (parseFloat(payout.remaining_balance) <= 0.01) { // Allow for small rounding errors
        await connection.execute(`
          UPDATE orders 
          SET paymentStatus = 'approved',
              instant_balance = 0,
              updatedAt = ?
          WHERE id = ?
        `, [timestamp, batch.order_id]);

        console.log(`🎉 Payout order ${batch.order_id} fully completed!`);
      }

      await connection.commit();

      return {
        success: true,
        batchId: batch.id,
        amount: batch.amount,
        payoutOrderId: batch.order_id,
        fullyCompleted: parseFloat(payout.remaining_balance) <= 0.01
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update payin order status to success
   */
  async updatePayinOrderStatus(payinOrderId, transactionId, method) {
    const pool = await poolPromise;
    const timestamp = moment().tz(this.TIMEZONE).format("YYYY-MM-DD HH:mm:ss");

    try {
      await pool.execute(`
        UPDATE orders 
        SET paymentStatus = 'success',
            transactionID = COALESCE(?, transactionID),
            completion_method = ?,
            updatedAt = ?
        WHERE id = ?
      `, [transactionId, method, timestamp, payinOrderId]);

      console.log(`✅ Payin order ${payinOrderId} status updated to 'success'`);

    } catch (error) {
      logger.error(`Failed to update payin order status:`, error);
      throw error;
    }
  }

  /**
   * Send real-time notifications about completion
   */
  async sendCompletionNotifications(payinOrder, batches, results) {
    try {
      const io = getIO();
      
      // Notify each payout order room
      for (const batch of batches) {
        const result = results.find(r => r.batchId === batch.id);
        if (result && result.success) {
          const payoutRoom = `instant-withdraw-${batch.payout_ref_id}`;
          
          io.emit(payoutRoom, {
            type: 'batch_completed',
            message: `₹${batch.amount} confirmed and processed`,
            batchId: batch.id,
            amount: batch.amount,
            transactionId: payinOrder.transactionID,
            timestamp: new Date().toISOString(),
            fullyCompleted: result.fullyCompleted
          });

          console.log(`📡 Notification sent to ${payoutRoom}`);
        }
      }

      // Send general completion notification
      io.emit('instant-payout-completion', {
        type: 'payin_completed',
        payinOrderId: payinOrder.id,
        payinRefId: payinOrder.refID,
        amount: payinOrder.amount,
        batchesCompleted: results.filter(r => r.success).length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to send completion notifications:', error);
    }
  }

  /**
   * Log completion event for audit trail
   */
  async logCompletionEvent(payinOrderId, method, results) {
    try {
      const logData = {
        event: 'auto_completion',
        payin_order_id: payinOrderId,
        method: method,
        batches_processed: results.length,
        batches_completed: results.filter(r => r.success).length,
        timestamp: new Date().toISOString(),
        results: results
      };

      logger.info('Instant payout auto-completion event:', logData);

      // Could also store in a dedicated completion_logs table if needed
      
    } catch (error) {
      logger.error('Failed to log completion event:', error);
    }
  }

  /**
   * Webhook handler for payment gateway confirmations
   */
  async handleWebhookCompletion(webhookData) {
    console.log('🔗 Webhook completion triggered:', webhookData);

    const { orderId, transactionId, status, amount, gateway } = webhookData;

    if (status !== 'success' && status !== 'completed') {
      console.log('❌ Webhook status not successful:', status);
      return { success: false, message: 'Payment not successful' };
    }

    // Find payin order by merchant order ID or reference
    const payinOrder = await this.findPayinOrderByReference(orderId);
    if (!payinOrder) {
      console.log('❌ Payin order not found for webhook:', orderId);
      return { success: false, message: 'Order not found' };
    }

    return await this.handleCompletion(payinOrder.id, {
      transactionId: transactionId,
      method: this.completionMethods.WEBHOOK,
      confirmedBy: gateway || 'webhook',
      additionalData: { webhook: webhookData }
    });
  }

  /**
   * UTR verification completion
   */
  async handleUTRCompletion(payinOrderId, utrNumber, verifiedBy = 'system') {
    console.log('🔢 UTR completion triggered:', { payinOrderId, utrNumber, verifiedBy });

    return await this.handleCompletion(payinOrderId, {
      transactionId: utrNumber,
      method: this.completionMethods.UTR_VERIFICATION,
      confirmedBy: verifiedBy,
      additionalData: { utr: utrNumber }
    });
  }

  /**
   * Admin approval completion
   */
  async handleAdminApproval(payinOrderId, adminUsername, transactionId = null) {
    console.log('👨‍💼 Admin approval completion:', { payinOrderId, adminUsername, transactionId });

    return await this.handleCompletion(payinOrderId, {
      transactionId: transactionId,
      method: this.completionMethods.ADMIN_APPROVAL,
      confirmedBy: adminUsername,
      additionalData: { admin: adminUsername }
    });
  }

  /**
   * Screenshot upload completion
   */
  async handleScreenshotCompletion(payinOrderId, screenshotData, transactionId = null) {
    console.log('📸 Screenshot completion triggered:', { payinOrderId, transactionId });

    return await this.handleCompletion(payinOrderId, {
      transactionId: transactionId,
      method: this.completionMethods.SCREENSHOT_UPLOAD,
      confirmedBy: 'customer',
      additionalData: { screenshot: screenshotData }
    });
  }

  /**
   * Find payin order by various references
   */
  async findPayinOrderByReference(reference) {
    const pool = await poolPromise;

    try {
      // Try multiple fields to find the order
      const [orders] = await pool.execute(`
        SELECT * FROM orders 
        WHERE type = 'payin' 
        AND (
          merchantOrderId = ? OR 
          refID = ? OR 
          receiptId = ? OR
          id = ?
        )
        LIMIT 1
      `, [reference, reference, reference, reference]);

      return orders.length > 0 ? orders[0] : null;

    } catch (error) {
      logger.error('Error finding payin order by reference:', error);
      return null;
    }
  }

  /**
   * Get completion statistics
   */
  async getCompletionStats(timeframe = '24h') {
    const pool = await poolPromise;

    try {
      let timeCondition;
      switch (timeframe) {
        case '1h':
          timeCondition = 'DATE_SUB(NOW(), INTERVAL 1 HOUR)';
          break;
        case '24h':
          timeCondition = 'DATE_SUB(NOW(), INTERVAL 24 HOUR)';
          break;
        case '7d':
          timeCondition = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
          break;
        default:
          timeCondition = 'DATE_SUB(NOW(), INTERVAL 24 HOUR)';
      }

      const [stats] = await pool.execute(`
        SELECT 
          COUNT(*) as total_completions,
          COUNT(CASE WHEN completion_method = 'webhook' THEN 1 END) as webhook_completions,
          COUNT(CASE WHEN completion_method = 'utr_verification' THEN 1 END) as utr_completions,
          COUNT(CASE WHEN completion_method = 'admin_approval' THEN 1 END) as admin_completions,
          COUNT(CASE WHEN completion_method = 'screenshot_upload' THEN 1 END) as screenshot_completions,
          AVG(TIMESTAMPDIFF(MINUTE, created_at, system_confirmed_at)) as avg_completion_time_minutes
        FROM instant_payout_batches 
        WHERE system_confirmed_at >= ${timeCondition}
        AND status = 'sys_confirmed'
      `);

      return {
        success: true,
        timeframe,
        stats: stats[0]
      };

    } catch (error) {
      logger.error('Error getting completion stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const autoCompletionService = new AutoCompletionService();

module.exports = {
  AutoCompletionService,
  autoCompletionService
};





