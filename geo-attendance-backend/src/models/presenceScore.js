const mongoose = require('mongoose');

const PresenceScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  attendanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Individual signal scores (0-100)
  signals: {
    geofence: {
      score: { type: Number, min: 0, max: 100 },
      weight: { type: Number, default: 0.35 },
      data: {
        isWithin: Boolean,
        distance: Number,
        lastCheck: Date
      }
    },
    locationConsistency: {
      score: { type: Number, min: 0, max: 100 },
      weight: { type: Number, default: 0.15 },
      data: {
        anomalies: [String],
        flags: [String],
        checksPerformed: Number
      }
    },
    deviceActivity: {
      score: { type: Number, min: 0, max: 100 },
      weight: { type: Number, default: 0.20 },
      data: {
        lastActivityMinutesAgo: Number,
        activityCount: Number,
        lastActivityType: String
      }
    },
    motionPattern: {
      score: { type: Number, min: 0, max: 100 },
      weight: { type: Number, default: 0.15 },
      data: {
        movementLevel: String,
        isRealistic: Boolean,
        anomalyFlags: [String]
      }
    },
    challengeSuccess: {
      score: { type: Number, min: 0, max: 100 },
      weight: { type: Number, default: 0.15 },
      data: {
        totalChallenges: Number,
        passedChallenges: Number,
        failedChallenges: Number,
        lastChallengeStatus: String
      }
    }
  },

  // Computed scores
  totalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  confidence: {
    type: String,
    enum: ['present', 'uncertain', 'absent'],
    required: true
  },

  // Metadata
  flags: [String], // Anomalies detected
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },

  // For debugging
  calculationMetadata: {
    version: { type: String, default: '1.0' },
    processingTime: Number // milliseconds
  }
}, { timestamps: true });

// Compound indexes for efficient queries
PresenceScoreSchema.index({ userId: 1, timestamp: -1 });
PresenceScoreSchema.index({ attendanceId: 1, timestamp: -1 });
PresenceScoreSchema.index({ confidence: 1, timestamp: -1 }); // For uncertain cases query
PresenceScoreSchema.index({ riskLevel: 1, timestamp: -1 }); // For high-risk query

// TTL index - keep for 1 year for analytics
PresenceScoreSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

const PresenceScore = mongoose.model('PresenceScore', PresenceScoreSchema);

module.exports = PresenceScore;
