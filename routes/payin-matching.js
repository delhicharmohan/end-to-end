const express = require("express");
const router = express.Router();
const { completePayinMatching, processPendingPayinMatching } = require("../controllers/orders/completePayinMatching");
const logger = require("../logger");

/**
 * POST /api/v1/payin-matching/complete/:payinOrderId
 * Complete payin matching for a specific order
 */
router.post("/complete/:payinOrderId", async (req, res) => {
  try {
    const { payinOrderId } = req.params;
    const { transactionId, confirmedBy } = req.body;
    
    if (!payinOrderId) {
      return res.status(400).json({
        success: false,
        message: "Payin order ID is required"
      });
    }
    
    const result = await completePayinMatching(
      parseInt(payinOrderId), 
      transactionId, 
      confirmedBy || 'manual'
    );
    
    logger.info(`Payin matching completed for order ${payinOrderId}`, result);
    
    res.status(200).json({
      success: true,
      message: "Payin matching completed successfully",
      data: result
    });
    
  } catch (error) {
    logger.error("Error completing payin matching:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});

/**
 * POST /api/v1/payin-matching/process-pending
 * Process all pending payin orders that need matching
 */
router.post("/process-pending", async (req, res) => {
  try {
    const result = await processPendingPayinMatching();
    
    logger.info("Processed pending payin matching:", result);
    
    res.status(200).json({
      success: true,
      message: `Processed ${result.processed} out of ${result.total || result.processed} pending payin orders`,
      data: result
    });
    
  } catch (error) {
    logger.error("Error processing pending payin matching:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});

/**
 * GET /api/v1/payin-matching/status
 * Get status of pending payin orders that need matching
 */
router.get("/status", async (req, res) => {
  try {
    const poolPromise = require("../db");
    const pool = await poolPromise;
    
    // Get pending payin orders with batches
    const [pendingPayins] = await pool.execute(`
      SELECT 
        o.id, o.refID, o.amount, o.paymentStatus, o.createdAt,
        COUNT(ipb.id) as batch_count,
        SUM(ipb.amount) as total_batch_amount
      FROM orders o
      INNER JOIN instant_payout_batches ipb ON ipb.pay_in_order_id = o.id
      WHERE o.type = 'payin'
      AND ipb.status = 'pending'
      AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY o.id
      ORDER BY o.createdAt DESC
      LIMIT 20
    `);
    
    // Get successful payin orders that need batch completion
    const [successPayins] = await pool.execute(`
      SELECT 
        o.id, o.refID, o.amount, o.paymentStatus, o.createdAt,
        COUNT(ipb.id) as batch_count,
        SUM(ipb.amount) as total_batch_amount
      FROM orders o
      INNER JOIN instant_payout_batches ipb ON ipb.pay_in_order_id = o.id
      WHERE o.type = 'payin'
      AND o.paymentStatus = 'success'
      AND ipb.status = 'pending'
      AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY o.id
      ORDER BY o.createdAt DESC
      LIMIT 20
    `);
    
    res.status(200).json({
      success: true,
      data: {
        pending_payins: pendingPayins,
        success_payins_with_pending_batches: successPayins,
        summary: {
          total_pending: pendingPayins.length,
          ready_for_completion: successPayins.length
        }
      }
    });
    
  } catch (error) {
    logger.error("Error getting payin matching status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});

module.exports = router;

