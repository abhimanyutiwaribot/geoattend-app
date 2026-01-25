const express = require("express");
const PresenceScore = require("../models/presenceScore");
const AttendanceModel = require("../models/attendance");
const LocationLog = require("../models/locationLog");
const DeviceActivity = require("../models/deviceActivity");
const User = require("../models/user");
const PresenceEngineService = require("../services/presenceEngineService");
const { adminAuthMiddleware } = require("../middleware/adminauthMiddleware");

const adminPresenceRouter = express.Router();

/**
 * Get real-time presence dashboard
 * Shows all active sessions with current presence scores
 */
adminPresenceRouter.get('/dashboard', adminAuthMiddleware, async (req, res) => {
  try {
    // Get all active attendance sessions
    const activeSessions = await AttendanceModel.find({
      status: { $in: ['tentative', 'confirmed'] }
    })
      .populate('userId', 'name email employeeId')
      .sort({ checkInTime: -1 });

    // Get latest presence score for each session
    const dashboardData = await Promise.all(
      activeSessions.map(async (session) => {
        const latestScore = await PresenceScore.findOne({
          attendanceId: session._id
        }).sort({ timestamp: -1 });

        return {
          attendanceId: session._id,
          user: session.userId,
          checkInTime: session.checkInTime,
          status: session.status,
          validationScore: session.validationScore,
          presenceScore: latestScore ? {
            totalScore: latestScore.totalScore,
            confidence: latestScore.confidence,
            riskLevel: latestScore.riskLevel,
            flags: latestScore.flags,
            lastUpdated: latestScore.timestamp,
            signals: {
              geofence: latestScore.signals.geofence.score,
              locationConsistency: latestScore.signals.locationConsistency.score,
              deviceActivity: latestScore.signals.deviceActivity.score,
              motionPattern: latestScore.signals.motionPattern.score,
              challengeSuccess: latestScore.signals.challengeSuccess.score
            }
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: {
        totalActive: activeSessions.length,
        sessions: dashboardData,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

/**
 * Get detailed presence analysis for a specific user/session
 */
adminPresenceRouter.get('/analysis/:attendanceId', adminAuthMiddleware, async (req, res) => {
  try {
    const { attendanceId } = req.params;

    // Get attendance session
    const session = await AttendanceModel.findById(attendanceId)
      .populate('userId', 'name email employeeId');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found'
      });
    }

    // Get all presence scores for this session
    const presenceScores = await PresenceScore.find({
      attendanceId
    }).sort({ timestamp: 1 });

    // Get location history
    const locationHistory = await LocationLog.find({
      attendanceId
    }).sort({ timestamp: 1 }).limit(100);

    // Get device activity
    const deviceActivity = await DeviceActivity.find({
      attendanceId
    }).sort({ timestamp: -1 }).limit(50);

    // Calculate statistics
    const stats = {
      averageScore: presenceScores.length > 0
        ? Math.round(presenceScores.reduce((sum, s) => sum + s.totalScore, 0) / presenceScores.length)
        : 0,
      lowestScore: presenceScores.length > 0
        ? Math.min(...presenceScores.map(s => s.totalScore))
        : 0,
      highestScore: presenceScores.length > 0
        ? Math.max(...presenceScores.map(s => s.totalScore))
        : 0,
      totalScoreCalculations: presenceScores.length,
      totalLocationLogs: locationHistory.length,
      totalDeviceActivities: deviceActivity.length,
      geofenceEvents: locationHistory.filter(l => l.eventType === 'enter' || l.eventType === 'exit').length
    };

    res.json({
      success: true,
      data: {
        session,
        presenceScores,
        locationHistory,
        deviceActivity,
        stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analysis data',
      error: error.message
    });
  }
});

/**
 * Get uncertain cases requiring review
 */
adminPresenceRouter.get('/uncertain-cases', adminAuthMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;

    const query = {
      confidence: 'uncertain'
    };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const uncertainCases = await PresenceScore.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate({
        path: 'attendanceId',
        populate: {
          path: 'userId',
          select: 'name email employeeId'
        }
      });

    res.json({
      success: true,
      data: {
        count: uncertainCases.length,
        cases: uncertainCases
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch uncertain cases',
      error: error.message
    });
  }
});

/**
 * Get high-risk cases
 */
adminPresenceRouter.get('/high-risk', adminAuthMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;

    const query = {
      riskLevel: 'high'
    };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const highRiskCases = await PresenceScore.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate({
        path: 'attendanceId',
        populate: {
          path: 'userId',
          select: 'name email employeeId'
        }
      });

    res.json({
      success: true,
      data: {
        count: highRiskCases.length,
        cases: highRiskCases
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch high-risk cases',
      error: error.message
    });
  }
});

/**
 * Get presence trends/analytics
 */
adminPresenceRouter.get('/analytics', adminAuthMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }

    // Aggregate statistics
    const analytics = await PresenceScore.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$confidence',
          count: { $sum: 1 },
          avgScore: { $avg: '$totalScore' },
          minScore: { $min: '$totalScore' },
          maxScore: { $max: '$totalScore' }
        }
      }
    ]);

    // Risk level distribution
    const riskDistribution = await PresenceScore.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    // Flag frequency
    const flagFrequency = await PresenceScore.aggregate([
      { $match: matchStage },
      { $unwind: '$flags' },
      {
        $group: {
          _id: '$flags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        confidenceDistribution: analytics,
        riskDistribution,
        flagFrequency
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

/**
 * Manually trigger presence score calculation for a session
 */
adminPresenceRouter.post('/calculate/:attendanceId', adminAuthMiddleware, async (req, res) => {
  try {
    const { attendanceId } = req.params;

    const session = await AttendanceModel.findById(attendanceId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found'
      });
    }

    const result = await PresenceEngineService.calculatePresenceScore(
      session.userId,
      attendanceId
    );

    res.json({
      success: true,
      data: result.summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate presence score',
      error: error.message
    });
  }
});

module.exports = adminPresenceRouter;
