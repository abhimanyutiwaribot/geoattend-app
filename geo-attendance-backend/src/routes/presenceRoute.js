const express = require("express");
const authMiddleware = require("../middleware/authmiddleware");
const PresenceEngineService = require('../services/presenceEngineService');

const presenceRouter = express.Router();

// Calculate presence score on-demand
presenceRouter.post('/calculate', authMiddleware, async (req, res) => {
  try {
    const { attendanceId } = req.body;
    const userId = req.user._id;

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: 'attendanceId is required'
      });
    }

    const result = await PresenceEngineService.calculatePresenceScore(userId, attendanceId);

    res.json({
      success: true,
      data: result.summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Presence score calculation failed',
      error: error.message
    });
  }
});

// Get presence score history
presenceRouter.get('/history', authMiddleware, async (req, res) => {
  try {
    const { attendanceId } = req.query;
    const userId = req.user._id;

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: 'attendanceId is required'
      });
    }

    const history = await PresenceEngineService.getPresenceScoreHistory(userId, attendanceId);

    res.json({
      success: true,
      data: {
        count: history.length,
        scores: history
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch presence score history',
      error: error.message
    });
  }
});

// Get latest presence score
presenceRouter.get('/latest', authMiddleware, async (req, res) => {
  try {
    const { attendanceId } = req.query;
    const userId = req.user._id;

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: 'attendanceId is required'
      });
    }

    const latestScore = await PresenceEngineService.getLatestPresenceScore(userId, attendanceId);

    if (!latestScore) {
      return res.status(404).json({
        success: false,
        message: 'No presence score found'
      });
    }

    res.json({
      success: true,
      data: latestScore
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest presence score',
      error: error.message
    });
  }
});

// Get uncertain cases (admin only)
presenceRouter.get('/uncertain', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const uncertainCases = await PresenceEngineService.getUncertainCases(
      startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate || new Date()
    );

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

module.exports = presenceRouter;
