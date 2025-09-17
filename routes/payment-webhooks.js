const express = require("express");
const router = express.Router();
const logger = require("../logger");
const { autoCompletionService } = require("../helpers/autoCompletionService");
const crypto = require("crypto");

/**
 * Payment Gateway Webhook Integration
 * 
 * Handles webhooks from various payment gateways to automatically
 * complete instant payout batches when payments are confirmed.
 */

/**
 * Generic webhook handler
 * POST /api/v1/payment-webhooks/generic
 */
router.post("/generic", async (req, res) => {
  try {
    console.log('🔗 Generic webhook received:', req.body);
    logger.info('Payment webhook received:', req.body);

    const webhookData = {
      orderId: req.body.orderId || req.body.order_id || req.body.merchantOrderId,
      transactionId: req.body.transactionId || req.body.transaction_id || req.body.txnId,
      status: req.body.status || req.body.paymentStatus,
      amount: req.body.amount,
      gateway: req.body.gateway || 'generic',
      timestamp: new Date().toISOString(),
      rawData: req.body
    };

    if (!webhookData.orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required"
      });
    }

    const result = await autoCompletionService.handleWebhookCompletion(webhookData);

    if (result.success) {
      logger.info('Webhook completion successful:', result);
      res.status(200).json({
        success: true,
        message: "Payment processed successfully",
        data: {
          orderId: webhookData.orderId,
          batchesCompleted: result.batchesCompleted
        }
      });
    } else {
      logger.warn('Webhook completion failed:', result);
      res.status(200).json({
        success: false,
        message: result.message || "Payment processing failed"
      });
    }

  } catch (error) {
    logger.error("Webhook processing error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/**
 * Razorpay webhook handler
 * POST /api/v1/payment-webhooks/razorpay
 */
router.post("/razorpay", async (req, res) => {
  try {
    console.log('🔗 Razorpay webhook received');
    
    // Verify webhook signature if secret is configured
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const signature = req.headers['x-razorpay-signature'];
      const body = JSON.stringify(req.body);
      
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.error('Razorpay webhook signature verification failed');
        return res.status(400).json({ success: false, message: "Invalid signature" });
      }
    }

    const event = req.body;
    
    if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
      const payment = event.payload.payment.entity;
      
      const webhookData = {
        orderId: payment.order_id,
        transactionId: payment.id,
        status: payment.status === 'captured' ? 'success' : payment.status,
        amount: payment.amount / 100, // Razorpay amounts are in paise
        gateway: 'razorpay',
        timestamp: new Date().toISOString(),
        rawData: event
      };

      const result = await autoCompletionService.handleWebhookCompletion(webhookData);
      
      logger.info('Razorpay webhook processed:', result);
      res.status(200).json({ success: true });
      
    } else {
      console.log('Razorpay webhook event not handled:', event.event);
      res.status(200).json({ success: true, message: "Event not handled" });
    }

  } catch (error) {
    logger.error("Razorpay webhook error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * Paytm webhook handler
 * POST /api/v1/payment-webhooks/paytm
 */
router.post("/paytm", async (req, res) => {
  try {
    console.log('🔗 Paytm webhook received');
    
    const webhookData = {
      orderId: req.body.ORDERID,
      transactionId: req.body.TXNID,
      status: req.body.STATUS === 'TXN_SUCCESS' ? 'success' : req.body.STATUS,
      amount: parseFloat(req.body.TXNAMOUNT),
      gateway: 'paytm',
      timestamp: new Date().toISOString(),
      rawData: req.body
    };

    const result = await autoCompletionService.handleWebhookCompletion(webhookData);
    
    logger.info('Paytm webhook processed:', result);
    res.status(200).json({ success: true });

  } catch (error) {
    logger.error("Paytm webhook error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * PhonePe webhook handler
 * POST /api/v1/payment-webhooks/phonepe
 */
router.post("/phonepe", async (req, res) => {
  try {
    console.log('🔗 PhonePe webhook received');
    
    const webhookData = {
      orderId: req.body.merchantTransactionId,
      transactionId: req.body.transactionId,
      status: req.body.code === 'PAYMENT_SUCCESS' ? 'success' : req.body.code,
      amount: req.body.amount / 100, // PhonePe amounts are in paise
      gateway: 'phonepe',
      timestamp: new Date().toISOString(),
      rawData: req.body
    };

    const result = await autoCompletionService.handleWebhookCompletion(webhookData);
    
    logger.info('PhonePe webhook processed:', result);
    res.status(200).json({ success: true });

  } catch (error) {
    logger.error("PhonePe webhook error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * UPI webhook handler (for direct UPI integrations)
 * POST /api/v1/payment-webhooks/upi
 */
router.post("/upi", async (req, res) => {
  try {
    console.log('🔗 UPI webhook received');
    
    const webhookData = {
      orderId: req.body.merchantOrderId || req.body.orderId,
      transactionId: req.body.upiTransactionId || req.body.utr,
      status: req.body.status === 'SUCCESS' ? 'success' : req.body.status,
      amount: parseFloat(req.body.amount),
      gateway: 'upi',
      timestamp: new Date().toISOString(),
      rawData: req.body
    };

    const result = await autoCompletionService.handleWebhookCompletion(webhookData);
    
    logger.info('UPI webhook processed:', result);
    res.status(200).json({ success: true });

  } catch (error) {
    logger.error("UPI webhook error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * Manual UTR completion endpoint
 * POST /api/v1/payment-webhooks/manual-utr
 */
router.post("/manual-utr", async (req, res) => {
  try {
    const { payinOrderId, utrNumber, verifiedBy } = req.body;

    if (!payinOrderId || !utrNumber) {
      return res.status(400).json({
        success: false,
        message: "Payin order ID and UTR number are required"
      });
    }

    console.log('🔢 Manual UTR completion triggered:', { payinOrderId, utrNumber, verifiedBy });

    const result = await autoCompletionService.handleUTRCompletion(
      payinOrderId,
      utrNumber,
      verifiedBy || 'manual'
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "UTR completion processed successfully",
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || "UTR completion failed"
      });
    }

  } catch (error) {
    logger.error("Manual UTR completion error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/**
 * Admin approval endpoint
 * POST /api/v1/payment-webhooks/admin-approve
 */
router.post("/admin-approve", async (req, res) => {
  try {
    const { payinOrderId, adminUsername, transactionId } = req.body;

    if (!payinOrderId || !adminUsername) {
      return res.status(400).json({
        success: false,
        message: "Payin order ID and admin username are required"
      });
    }

    console.log('👨‍💼 Admin approval triggered:', { payinOrderId, adminUsername, transactionId });

    const result = await autoCompletionService.handleAdminApproval(
      payinOrderId,
      adminUsername,
      transactionId
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Admin approval processed successfully",
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || "Admin approval failed"
      });
    }

  } catch (error) {
    logger.error("Admin approval error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/**
 * Get completion statistics
 * GET /api/v1/payment-webhooks/stats
 */
router.get("/stats", async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '24h';
    const stats = await autoCompletionService.getCompletionStats(timeframe);

    if (stats.success) {
      res.status(200).json({
        success: true,
        data: stats
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to get completion statistics"
      });
    }

  } catch (error) {
    logger.error("Error getting completion stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/**
 * Test webhook endpoint (for development/testing)
 * POST /api/v1/payment-webhooks/test
 */
router.post("/test", async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: "Not found" });
  }

  try {
    console.log('🧪 Test webhook triggered:', req.body);

    const testData = {
      orderId: req.body.orderId || 'test-order-123',
      transactionId: req.body.transactionId || 'test-txn-' + Date.now(),
      status: 'success',
      amount: req.body.amount || 100,
      gateway: 'test',
      timestamp: new Date().toISOString(),
      rawData: req.body
    };

    const result = await autoCompletionService.handleWebhookCompletion(testData);

    res.status(200).json({
      success: true,
      message: "Test webhook processed",
      data: result
    });

  } catch (error) {
    logger.error("Test webhook error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

module.exports = router;





