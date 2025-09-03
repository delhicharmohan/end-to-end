const express = require("express");
const router = express.Router();
const { 
  completeInstantPayoutBatch, 
  processAllPendingInstantPayouts,
  getInstantPayoutStatus 
} = require("../controllers/orders/instantPayoutCompletion");
const logger = require("../logger");

/**
 * POST /api/v1/instant-payout/complete/:payinOrderId
 * Complete instant payout batch for a specific payin order
 */
router.post("/complete/:payinOrderId", async (req, res) => {
  try {
    const { payinOrderId } = req.params;
    const { transactionId, confirmedBy } = req.body;
    
    if (!payinOrderId || isNaN(payinOrderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid payin order ID is required"
      });
    }
    
    const result = await completeInstantPayoutBatch(
      parseInt(payinOrderId), 
      transactionId, 
      confirmedBy || 'manual'
    );
    
    logger.info(`Instant payout completed for payin order ${payinOrderId}`, result);
    
    res.status(200).json({
      success: true,
      message: "Instant payout batch completed successfully",
      data: result
    });
    
  } catch (error) {
    logger.error("Error completing instant payout batch:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});

/**
 * POST /api/v1/instant-payout/process-pending
 * Process all pending instant payout batches
 */
router.post("/process-pending", async (req, res) => {
  try {
    const result = await processAllPendingInstantPayouts();
    
    logger.info("Processed all pending instant payouts:", result);
    
    const message = result.errors > 0 
      ? `Processed ${result.processed} out of ${result.total} orders (${result.errors} errors)`
      : `Successfully processed ${result.processed} out of ${result.total} pending instant payouts`;
    
    res.status(200).json({
      success: true,
      message: message,
      data: result
    });
    
  } catch (error) {
    logger.error("Error processing pending instant payouts:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});

/**
 * GET /api/v1/instant-payout/status
 * Get status of pending instant payout batches
 */
router.get("/status", async (req, res) => {
  try {
    const status = await getInstantPayoutStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
    
  } catch (error) {
    logger.error("Error getting instant payout status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});

/**
 * GET /api/v1/instant-payout/batches/:payoutOrderId
 * Get all batches for a specific payout order
 */
router.get("/batches/:payoutOrderId", async (req, res) => {
  try {
    const { payoutOrderId } = req.params;
    
    if (!payoutOrderId || isNaN(payoutOrderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid payout order ID is required"
      });
    }
    
    const poolPromise = require("../db");
    const pool = await poolPromise;
    
    const [batches] = await pool.execute(`
      SELECT 
        ipb.*,
        po.refID as payin_ref_id,
        po.paymentStatus as payin_status,
        po.transactionID as payin_utr
      FROM instant_payout_batches ipb
      LEFT JOIN orders po ON ipb.pay_in_order_id = po.id
      WHERE ipb.order_id = ?
      ORDER BY ipb.created_at DESC
    `, [payoutOrderId]);
    
    res.status(200).json({
      success: true,
      data: {
        payout_order_id: payoutOrderId,
        batches: batches
      }
    });
    
  } catch (error) {
    logger.error("Error getting instant payout batches:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});

module.exports = router;

