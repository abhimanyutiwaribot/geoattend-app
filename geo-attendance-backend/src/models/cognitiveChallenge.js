const mongoose = require('mongoose');

const CognitiveChallengeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: true
  },
  challengeType: {
    type: String,
    enum: ['reaction_time', 'color_match', 'pattern_memory', 'math_quick'],
    required: true
  },
  challengeData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  userResponse: {
    responseTime: Number, // milliseconds
    answer: mongoose.Schema.Types.Mixed,
    timestamp: Date
  },
  status: {
    type: String,
    enum: ['pending', 'passed', 'failed', 'expired'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

// Auto-expire challenges after 30 seconds
CognitiveChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for quick lookups
CognitiveChallengeSchema.index({ userId: 1, attendanceId: 1, status: 1 });

const CognitiveChallenge = mongoose.model('CognitiveChallenge', CognitiveChallengeSchema);

module.exports = CognitiveChallenge;
