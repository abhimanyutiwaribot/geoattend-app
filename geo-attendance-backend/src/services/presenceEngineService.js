const PresenceScore = require('../models/presenceScore');
const AttendanceModel = require('../models/attendance');
const LocationLog = require('../models/locationLog');
const DeviceActivityService = require('./deviceActivityService');
const LocationLogService = require('./locationLogService');
const MotionModel = require('../models/motion');
const CognitiveChallenge = require('../models/cognitiveChallenge');
const GeofenceService = require('./geofenceService');

class PresenceEngineService {
  constructor() {
    // Configurable weights (sum = 1.0)
    this.weights = {
      geofence: 0.35,
      locationConsistency: 0.15,
      deviceActivity: 0.20,
      motionPattern: 0.15,
      challengeSuccess: 0.15
    };

    // Confidence thresholds
    this.thresholds = {
      present: 80,      // >= 80 = Present
      uncertain: 50     // 50-79 = Uncertain, < 50 = Absent
    };
  }

  /**
   * Calculate comprehensive presence score for a user
   */
  async calculatePresenceScore(userId, attendanceId) {
    const startTime = Date.now();

    try {
      // Verify attendance exists
      const attendance = await AttendanceModel.findOne({
        _id: attendanceId,
        userId,
        status: { $in: ['tentative', 'confirmed'] }
      });

      if (!attendance) {
        throw new Error('Active attendance session not found');
      }

      const signals = {};

      // 1. Geofence Signal
      signals.geofence = await this.calculateGeofenceSignal(userId, attendanceId);

      // 2. Location Consistency Signal
      signals.locationConsistency = await this.calculateLocationConsistencySignal(userId, attendanceId);

      // 3. Device Activity Signal
      signals.deviceActivity = await this.calculateDeviceActivitySignal(userId);

      // 4. Motion Pattern Signal
      signals.motionPattern = await this.calculateMotionPatternSignal(userId, attendanceId);

      // 5. Challenge Success Signal
      signals.challengeSuccess = await this.calculateChallengeSuccessSignal(userId, attendanceId);

      // Calculate weighted total score
      const totalScore = this.calculateWeightedScore(signals);

      // Determine confidence level
      const confidence = this.determineConfidence(totalScore);

      // Detect anomalies
      const flags = this.detectAnomalies(signals);

      // Calculate risk level
      const riskLevel = this.calculateRiskLevel(signals, flags);

      // Save presence score
      const presenceScore = new PresenceScore({
        userId,
        attendanceId,
        signals,
        totalScore: Math.round(totalScore),
        confidence,
        flags,
        riskLevel,
        calculationMetadata: {
          version: '1.0',
          processingTime: Date.now() - startTime
        }
      });

      await presenceScore.save();

      // Update attendance validation score
      await AttendanceModel.findByIdAndUpdate(attendanceId, {
        validationScore: Math.round(totalScore),
        status: confidence === 'present' ? 'confirmed' : attendance.status
      });

      return {
        success: true,
        presenceScore,
        summary: {
          totalScore: Math.round(totalScore),
          confidence,
          riskLevel,
          flags
        }
      };

    } catch (error) {
      console.error('Presence score calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate geofence signal (35% weight)
   */
  async calculateGeofenceSignal(userId, attendanceId) {
    try {
      // Get most recent location
      const recentLocation = await LocationLog.findOne({
        userId,
        attendanceId
      }).sort({ timestamp: -1 });

      if (!recentLocation) {
        return {
          score: 0,
          weight: this.weights.geofence,
          data: {
            isWithin: false,
            distance: null,
            lastCheck: null
          }
        };
      }

      // Score: 100 if inside, 0 if outside
      const score = recentLocation.isInside ? 100 : 0;

      return {
        score,
        weight: this.weights.geofence,
        data: {
          isWithin: recentLocation.isInside,
          distance: recentLocation.distance,
          lastCheck: recentLocation.timestamp
        }
      };
    } catch (error) {
      console.error('Geofence signal error:', error);
      return {
        score: 0,
        weight: this.weights.geofence,
        data: { isWithin: false, distance: null, lastCheck: null }
      };
    }
  }

  /**
   * Calculate location consistency signal (15% weight)
   */
  async calculateLocationConsistencySignal(userId, attendanceId) {
    try {
      const analysis = await LocationLogService.analyzeLocationConsistency(
        userId,
        attendanceId,
        30 // 30 minute window
      );

      return {
        score: analysis.score,
        weight: this.weights.locationConsistency,
        data: {
          anomalies: analysis.anomalies.map(a => a.type),
          flags: analysis.flags,
          checksPerformed: analysis.anomalies.length
        }
      };
    } catch (error) {
      console.error('Location consistency signal error:', error);
      return {
        score: 100, // Assume OK if can't check
        weight: this.weights.locationConsistency,
        data: { anomalies: [], flags: [], checksPerformed: 0 }
      };
    }
  }

  /**
   * Calculate device activity signal (20% weight)
   */
  async calculateDeviceActivitySignal(userId) {
    try {
      const activityData = await DeviceActivityService.calculateActivityScore(userId, 30);

      return {
        score: activityData.score,
        weight: this.weights.deviceActivity,
        data: {
          lastActivityMinutesAgo: activityData.lastActivityMinutesAgo,
          activityCount: activityData.activityCount,
          lastActivityType: activityData.recentActivities?.[0]?.type || null
        }
      };
    } catch (error) {
      console.error('Device activity signal error:', error);
      return {
        score: 0,
        weight: this.weights.deviceActivity,
        data: { lastActivityMinutesAgo: null, activityCount: 0, lastActivityType: null }
      };
    }
  }

  /**
   * Calculate motion pattern signal (15% weight)
   * NOTE: Motion is optional - give benefit of doubt if no data
   */
  async calculateMotionPatternSignal(userId, attendanceId) {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const recentMotions = await MotionModel.find({
        userId,
        attendanceId,
        timestamp: { $gte: thirtyMinutesAgo }
      }).sort({ timestamp: -1 }).limit(20);

      // If no motion data, give neutral score (not penalize)
      if (recentMotions.length === 0) {
        return {
          score: 75, // Neutral - don't penalize for missing optional data
          weight: this.weights.motionPattern,
          data: {
            movementLevel: 'not_tracked',
            isRealistic: true,
            anomalyFlags: []
          }
        };
      }

      // Calculate score based on motion presence and realism
      const activeMotions = recentMotions.filter(m =>
        m.motionType && m.motionType !== 'still'
      );

      const realisticMotions = recentMotions.filter(m =>
        !m.anomalyFlags || m.anomalyFlags.length === 0
      );

      // Score: presence of motion (50%) + realism (50%)
      const presenceScore = Math.min(100, (activeMotions.length / 10) * 100);
      const realismScore = (realisticMotions.length / recentMotions.length) * 100;
      const score = (presenceScore * 0.5) + (realismScore * 0.5);

      const latestMotion = recentMotions[0];

      return {
        score: Math.round(score),
        weight: this.weights.motionPattern,
        data: {
          movementLevel: latestMotion.movementLevel || latestMotion.motionType || 'unknown',
          isRealistic: (latestMotion.anomalyFlags?.length || 0) === 0,
          anomalyFlags: latestMotion.anomalyFlags || []
        }
      };
    } catch (error) {
      console.error('Motion pattern signal error:', error);
      return {
        score: 75, // Neutral score if can't check
        weight: this.weights.motionPattern,
        data: { movementLevel: 'unknown', isRealistic: true, anomalyFlags: [] }
      };
    }
  }

  /**
   * Calculate challenge success signal (15% weight)
   */
  async calculateChallengeSuccessSignal(userId, attendanceId) {
    try {
      const challenges = await CognitiveChallenge.find({
        userId,
        attendanceId
      });

      if (challenges.length === 0) {
        return {
          score: 100, // No challenges = assume OK
          weight: this.weights.challengeSuccess,
          data: {
            totalChallenges: 0,
            passedChallenges: 0,
            failedChallenges: 0,
            lastChallengeStatus: null
          }
        };
      }

      const passed = challenges.filter(c => c.status === 'passed').length;
      const failed = challenges.filter(c => c.status === 'failed').length;
      const total = challenges.length;

      // Score: percentage of passed challenges
      const score = total > 0 ? (passed / total) * 100 : 100;

      const latestChallenge = challenges.sort((a, b) =>
        b.createdAt - a.createdAt
      )[0];

      return {
        score: Math.round(score),
        weight: this.weights.challengeSuccess,
        data: {
          totalChallenges: total,
          passedChallenges: passed,
          failedChallenges: failed,
          lastChallengeStatus: latestChallenge?.status || null
        }
      };
    } catch (error) {
      console.error('Challenge success signal error:', error);
      return {
        score: 100,
        weight: this.weights.challengeSuccess,
        data: { totalChallenges: 0, passedChallenges: 0, failedChallenges: 0, lastChallengeStatus: null }
      };
    }
  }

  /**
   * Calculate weighted total score
   */
  calculateWeightedScore(signals) {
    let totalScore = 0;

    for (const [signalName, signal] of Object.entries(signals)) {
      totalScore += signal.score * signal.weight;
    }

    return totalScore;
  }

  /**
   * Determine confidence level based on score
   */
  determineConfidence(score) {
    if (score >= this.thresholds.present) return 'present';
    if (score >= this.thresholds.uncertain) return 'uncertain';
    return 'absent';
  }

  /**
   * Detect anomalies across all signals
   */
  detectAnomalies(signals) {
    const flags = [];

    if (signals.geofence.score === 0) {
      flags.push('outside_geofence');
    }

    if (signals.locationConsistency.score < 50) {
      flags.push('location_inconsistent');
    }

    if (signals.deviceActivity.score < 30) {
      flags.push('low_device_activity');
    }

    // Only flag motion if VERY low (not just missing data)
    if (signals.motionPattern.score < 50) {
      flags.push('suspicious_motion');
    }

    if (signals.challengeSuccess.score < 50) {
      flags.push('challenge_failures');
    }

    return flags;
  }

  /**
   * Calculate risk level
   */
  calculateRiskLevel(signals, flags) {
    if (flags.length >= 3) return 'high';
    if (flags.length >= 1) return 'medium';
    return 'low';
  }

  /**
   * Get presence score history
   */
  async getPresenceScoreHistory(userId, attendanceId) {
    return await PresenceScore.find({
      userId,
      attendanceId
    }).sort({ timestamp: 1 });
  }

  /**
   * Get latest presence score
   */
  async getLatestPresenceScore(userId, attendanceId) {
    return await PresenceScore.findOne({
      userId,
      attendanceId
    }).sort({ timestamp: -1 });
  }

  /**
   * Get uncertain cases (for manager review)
   */
  async getUncertainCases(startDate, endDate) {
    return await PresenceScore.find({
      confidence: 'uncertain',
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('userId', 'name email')
      .populate('attendanceId')
      .sort({ timestamp: -1 });
  }
}

module.exports = new PresenceEngineService();
