const mongoose = require("mongoose");

const MotionTable = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Attendance", required: true },
  gyro: { type: [Number], default: [] },   // [x, y, z]
  accel: { type: [Number], default: [] },  // [x, y, z]
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("MotionLog", MotionTable);
