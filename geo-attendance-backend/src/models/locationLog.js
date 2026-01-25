const mongoose = require('mongoose');

const LocationLogSchema = new mongoose.Schema({
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
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  accuracy: {
    type: Number,
    default: 0
  },
  isInside: {
    type: Boolean,
    required: true
  },
  geofenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OfficeGeofence'
  },
  distance: {
    type: Number,
    default: 0
  },
  eventType: {
    type: String,
    enum: ['enter', 'exit', 'periodic', 'manual'],
    default: 'periodic'
  },
  metadata: {
    speed: Number,
    altitude: Number,
    heading: Number,
    isMock: Boolean
  }
}, { timestamps: true });

// Compound indexes for efficient queries
LocationLogSchema.index({ userId: 1, timestamp: -1 });
LocationLogSchema.index({ attendanceId: 1, timestamp: -1 });
LocationLogSchema.index({ userId: 1, eventType: 1, timestamp: -1 });

// TTL index - auto-delete after 90 days
LocationLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const LocationLog = mongoose.model('LocationLog', LocationLogSchema);

module.exports = LocationLog;
