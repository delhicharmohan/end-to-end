const cron = require('node-cron');
const { timeoutSystem } = require('../unifiedTimeoutSystem');
const logger = require('../../logger');
const moment = require('moment-timezone');

/**
 * Unified Timeout Cron Job
 * 
 * Runs every 5 minutes to process timeouts and reassignments
 * using the consolidated timeout system.
 */

class TimeoutCronJob {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.runCount = 0;
    this.schedule = '*/5 * * * *'; // Every 5 minutes
  }

  /**
   * Start the cron job
   */
  start() {
    console.log('🚀 Starting Unified Timeout Cron Job...');
    console.log(`📅 Schedule: ${this.schedule} (every 5 minutes)`);
    
    this.job = cron.schedule(this.schedule, async () => {
      await this.executeTimeoutProcessing();
    }, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'Asia/Kolkata'
    });

    console.log('✅ Unified Timeout Cron Job started successfully');
    return this;
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('⏹️  Unified Timeout Cron Job stopped');
    }
  }

  /**
   * Execute timeout processing
   */
  async executeTimeoutProcessing() {
    if (this.isRunning) {
      console.log('⚠️  Timeout processing already running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    this.runCount++;
    const startTime = Date.now();

    try {
      console.log(`\n🔄 === TIMEOUT CRON EXECUTION #${this.runCount} ===`);
      console.log('📅 Start Time:', moment().tz(process.env.TIMEZONE || 'Asia/Kolkata').format("YYYY-MM-DD HH:mm:ss"));

      // Execute unified timeout processing
      const result = await timeoutSystem.processTimeouts();

      const duration = Date.now() - startTime;
      this.lastRun = new Date();

      if (result.success) {
        console.log('✅ Timeout processing completed successfully');
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`📊 Summary:`, result.summary);

        // Log significant events
        if (result.summary.totalProcessed > 0) {
          logger.info(`Timeout processing completed: ${result.summary.totalProcessed} items processed`, result.summary);
        }
      } else {
        console.error('❌ Timeout processing failed:', result.error);
        logger.error('Timeout cron job failed:', result.error);
      }

    } catch (error) {
      console.error('❌ Critical error in timeout cron job:', error);
      logger.error('Critical error in timeout cron job:', error);
    } finally {
      this.isRunning = false;
      console.log(`🏁 Timeout cron execution #${this.runCount} finished\n`);
    }
  }

  /**
   * Get cron job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      runCount: this.runCount,
      schedule: this.schedule,
      isScheduled: this.job ? this.job.getStatus() : false
    };
  }

  /**
   * Force run timeout processing (for testing/manual execution)
   */
  async forceRun() {
    console.log('🔧 Force running timeout processing...');
    await this.executeTimeoutProcessing();
  }
}

// Create and export singleton instance
const timeoutCronJob = new TimeoutCronJob();

// Auto-start if this file is run directly
if (require.main === module) {
  timeoutCronJob.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, stopping timeout cron job...');
    timeoutCronJob.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, stopping timeout cron job...');
    timeoutCronJob.stop();
    process.exit(0);
  });

  // Keep the process alive
  console.log('⏰ Timeout cron job is running. Press Ctrl+C to stop.');
}

module.exports = {
  TimeoutCronJob,
  timeoutCronJob
};

