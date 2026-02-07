const mongoose = require('mongoose');

const FaceProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  baselineEmbedding: {
    type: [Number], // Array of 128 floats (face-api.js / dlib standard)
    required: true,
    validate: {
      validator: function (v) {
        return v && v.length >= 128;
      },
      message: 'Baseline embedding must be a valid face vector (at least 128 dimensions)'
    }
  },
  lastVerified: {
    type: Date,
    default: Date.now
  },
  enrollmentDevice: {
    type: String, // deviceID used during enrollment
    required: true
  },
  trustLevel: {
    type: Number,
    default: 100, // Starts at 100 on enrollment
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const FaceProfile = mongoose.model('FaceProfile', FaceProfileSchema);

module.exports = FaceProfile;
