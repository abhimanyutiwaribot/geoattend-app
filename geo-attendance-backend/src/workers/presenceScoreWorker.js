const cron = require('node-cron');
const AttendanceModel = require('../models/attendance');
const PresenceEngineService = require('../services/presenceEngineService');
const SuspicionDetectionService = require('../services/suspicionDetectionService');

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
    this.cronJob = cron.schedule('*/15 * * * *', async () => {
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

          // Guard: user might be on approved leave — no summary in that case
          if (result.status === 'on_leave') {
            console.log(`⏭️  ${session.userId}: Skipped (on approved leave)`);
          } else {
            const { totalScore, riskLevel, confidence } = result.summary || {};
            console.log(`✅ ${session.userId}: Score ${totalScore}, Confidence: ${confidence}, Risk: ${riskLevel}`);

            // 🚨 Auto-flag high-risk sessions with very low scores
            if (riskLevel === 'high' && totalScore < 30) {
              await AttendanceModel.findByIdAndUpdate(session._id, {
                status: 'flagged',
                remarks: `Auto-flagged by PresenceEngine: score=${totalScore}, risk=${riskLevel}`
              });
              console.log(`🚨 [Worker] Session ${session._id} auto-flagged (score=${totalScore}, risk=high)`);

              // Also run the suspicion service to append specific reasons
              try {
                const suspicion = await SuspicionDetectionService.analyzeSuspicion(session._id, session.userId);
                if (suspicion.reasons.length > 0) {
                  await AttendanceModel.findByIdAndUpdate(session._id, {
                    remarks: `Auto-flagged: score=${totalScore} | ${suspicion.reasons.join(', ')}`
                  });
                }
              } catch (sErr) {
                console.error(`⚠️ [Worker] Suspicion analysis failed for ${session._id}:`, sErr.message);
              }
            }
          }
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
