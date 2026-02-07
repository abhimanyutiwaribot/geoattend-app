const express = require("express");
const authMiddleware = require("../middleware/authmiddleware");
const AttendanceModel = require("../models/attendance");
const LocationLogService = require('../services/locationLogService');
const DeviceActivityService = require('../services/deviceActivityService');

const locationActivityRouter = express.Router();

// ============================================
// LOCATION LOGGING ENDPOINTS
// ============================================

// Log location with automatic enter/exit detection
locationActivityRouter.post('/location/log', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, accuracy, metadata } = req.body;
    const userId = req.user._id;

    // Get active attendance session
    const activeSession = await AttendanceModel.findOne({
      userId,
      status: { $in: ['tentative', 'confirmed'] }
    });

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        message: 'No active attendance session found'
      });
    }

    const result = await LocationLogService.logLocation(
      userId,
      activeSession._id,
      { lat, lng, accuracy },
      metadata || {}
    );

    // Trigger full presence engine score calculation for real-time dashboard updates
    try {
      const PresenceEngineService = require("../services/presenceEngineService");
      await PresenceEngineService.calculatePresenceScore(userId, activeSession._id);
    } catch (pesError) {
      console.error("⚠️ Background presence calculation failed:", pesError.message);
    }

    res.json({
      success: true,
      data: {
        eventType: result.eventType,
        isInside: result.geofenceStatus.isWithin,
        distance: result.geofenceStatus.distance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Location logging failed',
      error: error.message
    });
  }
});

// Get location history
locationActivityRouter.get('/location/history', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, attendanceId } = req.query;
    const userId = req.user._id;

    const history = await LocationLogService.getLocationHistory(
      userId,
      startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate || new Date(),
      attendanceId
    );

    res.json({
      success: true,
      data: {
        count: history.length,
        locations: history
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location history',
      error: error.message
    });
  }
});

// Get geofence enter/exit events
locationActivityRouter.get('/location/events', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    const events = await LocationLogService.getGeofenceEvents(
      userId,
      startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate || new Date()
    );

    res.json({
      success: true,
      data: {
        count: events.length,
        events
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch geofence events',
      error: error.message
    });
  }
});

// Analyze location consistency
locationActivityRouter.get('/location/consistency', authMiddleware, async (req, res) => {
  try {
    const { attendanceId, timeWindow = 30 } = req.query;
    const userId = req.user._id;

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: 'attendanceId is required'
      });
    }

    const analysis = await LocationLogService.analyzeLocationConsistency(
      userId,
      attendanceId,
      parseInt(timeWindow)
    );

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Location consistency analysis failed',
      error: error.message
    });
  }
});

// ============================================
// DEVICE ACTIVITY ENDPOINTS
// ============================================

// Log device activity (batch)
locationActivityRouter.post('/activity/batch', authMiddleware, async (req, res) => {
  try {
    const { activities } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Activities array is required'
      });
    }

    const result = await DeviceActivityService.logActivitiesBatch(userId, activities);

    res.json({
      success: true,
      data: {
        logged: result.count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Activity logging failed',
      error: error.message
    });
  }
});

// Get activity score
locationActivityRouter.get('/activity/score', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { timeWindow = 30 } = req.query;

    const scoreData = await DeviceActivityService.calculateActivityScore(
      userId,
      parseInt(timeWindow)
    );

    res.json({
      success: true,
      data: scoreData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate activity score',
      error: error.message
    });
  }
});

// Get activity timeline
locationActivityRouter.get('/activity/timeline', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    const timeline = await DeviceActivityService.getActivityTimeline(
      userId,
      startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate || new Date()
    );

    res.json({
      success: true,
      data: {
        count: timeline.length,
        activities: timeline
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity timeline',
      error: error.message
    });
  }
});

// Get activity statistics
locationActivityRouter.get('/activity/stats', authMiddleware, async (req, res) => {
  try {
    const { attendanceId } = req.query;
    const userId = req.user._id;

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: 'attendanceId is required'
      });
    }

    const stats = await DeviceActivityService.getActivityStats(userId, attendanceId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity stats',
      error: error.message
    });
  }
});

module.exports = locationActivityRouter;
