const mongoose = require("mongoose");

const MotionTable = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Attendance", required: true },
  gyro: { type: [Number], default: [] },   // [x, y, z]
  accel: { type: [Number], default: [] },  // [x, y, z]
  // Add these for better analysis
  motionType: { 
    type: String, 
    enum: ["walking", "stationary", "vehicle", "unknown"],
    default: "unknown"
  },
  confidence: { type: Number, default: 0 }, // 0-100
  deviceOrientation: { type: String } // portrait, landscape
}, { timestamps: true });

const MotionModel = mongoose.model("MotionLog", MotionTable);

module.exports = MotionModel;
