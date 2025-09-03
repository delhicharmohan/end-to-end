const express = require('express');
const router = express.Router();
const { processTimeouts, getTimeoutStatus } = require('../helpers/unifiedTimeoutSystem');

/**
 * Unified Timeout Routes
 * Handles timeout processing and status for instant payouts
 */

// Process timeouts manually
router.post('/process', async (req, res) => {
  try {
    const result = await processTimeouts();
    
    res.json({
      success: true,
      message: 'Timeout processing completed',
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Timeout processing error:', error);
    res.status(500).json({
      success: false,
      error: 'TIMEOUT_PROCESSING_FAILED',
      message: 'Failed to process timeouts'
    });
  }
});

// Get timeout status
router.get('/status', async (req, res) => {
  try {
    const status = await getTimeoutStatus();
    
    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Timeout status error:', error);
    res.status(500).json({
      success: false,
      error: 'TIMEOUT_STATUS_FAILED',
      message: 'Failed to retrieve timeout status'
    });
  }
});

module.exports = router;
