const cron = require('node-cron');
const AttendanceModel = require('../models/attendance');
const PresenceEngineService = require('../services/presenceEngineService');

/**
 * Background worker to calculate presence scores periodically
 * Runs every 15 minutes for all active attendance sessions
 */
class PresenceScoreWorker {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  /**
   * Start the background worker
   */
  start() {
    console.log('🤖 Starting Presence Score Worker...');

    // Run every 15 minutes: */15 * * * *
    this.cronJob = cron.schedule('*/1 * * * *', async () => {
      await this.calculateScoresForActiveSessions();
    });

    console.log('✅ Presence Score Worker started (runs every 15 minutes)');

    // Also run immediately on startup
    setTimeout(() => {
      this.calculateScoresForActiveSessions();
    }, 5000); // Wait 5 seconds for server to fully start
  }

  /**
   * Stop the background worker
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('🛑 Presence Score Worker stopped');
    }
  }

  /**
   * Calculate presence scores for all active sessions
   */
  async calculateScoresForActiveSessions() {
    if (this.isRunning) {
      console.log('⏭️  Skipping - previous calculation still running');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('📊 Calculating presence scores...');

      // Get all active attendance sessions
      const activeSessions = await AttendanceModel.find({
        status: { $in: ['tentative', 'confirmed'] }
      }).select('_id userId');

      if (activeSessions.length === 0) {
        console.log('ℹ️  No active sessions found');
        this.isRunning = false;
        return;
      }

      console.log(`🎯 Found ${activeSessions.length} active sessions`);

      let successCount = 0;
      let failCount = 0;

      // Calculate score for each session
      for (const session of activeSessions) {
        try {
          const result = await PresenceEngineService.calculatePresenceScore(
            session.userId,
            session._id
          );

          console.log(`✅ ${session.userId}: Score ${result.summary.totalScore}, Confidence: ${result.summary.confidence}`);
          successCount++;

        } catch (error) {
          console.error(`❌ Failed for ${session.userId}:`, error.message);
          failCount++;
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n📈 Batch Complete:`);
      console.log(`   ✅ Success: ${successCount}`);
      console.log(`   ❌ Failed: ${failCount}`);
      console.log(`   ⏱️  Duration: ${duration}s`);
      console.log(`   📊 Avg: ${(duration / activeSessions.length).toFixed(2)}s per session\n`);

    } catch (error) {
      console.error('❌ Worker error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger calculation (for testing)
   */
  async triggerManual() {
    console.log('🔧 Manual trigger requested');
    await this.calculateScoresForActiveSessions();
  }
}

// Export singleton instance
const worker = new PresenceScoreWorker();

module.exports = worker;
