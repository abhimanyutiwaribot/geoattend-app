const mongoose = require("mongoose");

const AttendanceTable = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { 
    type: String, 
    enum: ["tentative", "confirmed", "flagged"], 
    default: "tentative" 
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Attendance", AttendanceTable);
