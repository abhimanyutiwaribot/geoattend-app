const DeviceActivity = require('../models/deviceActivity');

class DeviceActivityService {
  /**
   * Log a single device activity
   */
  async logActivity(userId, attendanceId, activityType, metadata = {}) {
    try {
      const activity = new DeviceActivity({
        userId,
        attendanceId,
        activityType,
        metadata,
        timestamp: new Date()
      });

      await activity.save();
      return { success: true, activity };
    } catch (error) {
      console.error('Activity logging error:', error);
      throw error;
    }
  }

  /**
   * Batch log multiple activities (for offline sync)
   */
  async logActivitiesBatch(userId, activities) {
    try {
      const docs = activities.map(activity => ({
        userId,
        attendanceId: activity.attendanceId,
        activityType: activity.activityType,
        timestamp: new Date(activity.timestamp),
        metadata: activity.metadata || {}
      }));

      const result = await DeviceActivity.insertMany(docs, { ordered: false });
      return { success: true, count: result.length };
    } catch (error) {
      console.error('Batch activity logging error:', error);
      throw error;
    }
  }

  /**
   * Get last activity for a user
   */
  async getLastActivity(userId) {
    return await DeviceActivity.findOne({ userId })
      .sort({ timestamp: -1 });
  }

  /**
   * Calculate activity score based on recent activity
   */
  async calculateActivityScore(userId, timeWindow = 30) {
    const since = new Date(Date.now() - timeWindow * 60 * 1000);

    const activities = await DeviceActivity.find({
      userId,
      timestamp: { $gte: since }
    }).sort({ timestamp: -1 });

    // No recent activity
    if (activities.length === 0) {
      return {
        score: 0,
        lastActivityMinutesAgo: null,
        activityCount: 0
      };
    }

    const recentActivity = activities[0];
    const minutesSinceActivity = (Date.now() - recentActivity.timestamp) / 60000;

    // Recency score: 100% if <5min, decays to 0% at 30min
    const recencyScore = Math.max(0, 100 - (minutesSinceActivity / timeWindow) * 100);

    // Frequency score: more activities = higher confidence (cap at 100%)
    const frequencyScore = Math.min(100, (activities.length / 10) * 100);

    // Weighted combination: recency is more important
    const totalScore = (recencyScore * 0.7 + frequencyScore * 0.3);

    return {
      score: Math.round(totalScore),
      lastActivityMinutesAgo: Math.round(minutesSinceActivity),
      activityCount: activities.length,
      recentActivities: activities.slice(0, 5).map(a => ({
        type: a.activityType,
        timestamp: a.timestamp
      }))
    };
  }

  /**
   * Get activity timeline for a user
   */
  async getActivityTimeline(userId, startDate, endDate) {
    return await DeviceActivity.find({
      userId,
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ timestamp: 1 });
  }

  /**
   * Get activity statistics for a user
   */
  async getActivityStats(userId, attendanceId) {
    const activities = await DeviceActivity.find({
      userId,
      attendanceId
    });

    const stats = {
      total: activities.length,
      byType: {},
      firstActivity: null,
      lastActivity: null
    };

    if (activities.length > 0) {
      stats.firstActivity = activities[0].timestamp;
      stats.lastActivity = activities[activities.length - 1].timestamp;

      // Count by type
      activities.forEach(activity => {
        const type = activity.activityType;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });
    }

    return stats;
  }
}

module.exports = new DeviceActivityService();
