const mongoose = require("mongoose");

const AttendanceTable = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sessionId: { type: String, unique: true }, // For tracking entire sessions
  status: { 
    type: String, 
    enum: ["tentative", "confirmed", "flagged", "completed", "invalid"], 
    default: "tentative" 
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  // Add these for session tracking
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  totalDuration: { type: Number }, // in minutes
  validationScore: { type: Number, default: 0 }, // 0-100 confidence score
  revalidationPassed: { type: Boolean, default: false }
}, { timestamps: true });

const AttendanceModel = mongoose.model("Attendance", AttendanceTable);

module.exports = AttendanceModel;
