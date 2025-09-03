const express = require('express');
const router = express.Router();
const { validateSystemHealth } = require('../helpers/instantPayoutValidator');

/**
 * Health Monitor Routes
 * Provides endpoints for monitoring system health and instant payout metrics
 */

// Get instant payout system health
router.get('/instant-payout', async (req, res) => {
  try {
    const healthResult = await validateSystemHealth();
    
    if (healthResult.success) {
      res.json({
        success: true,
        status: healthResult.status,
        metrics: healthResult.metrics,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: healthResult.error,
        message: healthResult.message
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'HEALTH_CHECK_FAILED',
      message: 'Failed to retrieve health metrics'
    });
  }
});

// Get comprehensive health metrics
router.get('/metrics', async (req, res) => {
  try {
    const healthResult = await validateSystemHealth();
    
    res.json({
      success: true,
      metrics: healthResult.metrics || {},
      status: healthResult.status || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'METRICS_FAILED',
      message: 'Failed to retrieve system metrics'
    });
  }
});

// Basic health check endpoint
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
