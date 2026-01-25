const mongoose = require('mongoose');

const DeviceActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  attendanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  activityType: {
    type: String,
    enum: [
      'app_foreground',
      'app_background',
      'screen_unlock',
      'touch_interaction',
      'screen_on',
      'screen_off'
    ],
    required: true
  },
  metadata: {
    duration: Number, // seconds in foreground
    interactionCount: Number,
    batteryLevel: Number
  }
}, { timestamps: true });

// Compound index for efficient queries
DeviceActivitySchema.index({ userId: 1, timestamp: -1 });
DeviceActivitySchema.index({ attendanceId: 1, timestamp: -1 });

// TTL index - auto-delete after 90 days
DeviceActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const DeviceActivity = mongoose.model('DeviceActivity', DeviceActivitySchema);

module.exports = DeviceActivity;
