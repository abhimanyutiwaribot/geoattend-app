const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    type: {
        type: String,
        enum: ["daily_attendance", "suspicious_activity", "user_analytics", "system_health"],
        required: true
    },
    dateRange: {
        start: { type: Date, required: true },
        end: { type: Date, required: true }
    },
    generatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Admin", 
        required: true 
    },
    data: { 
        type: mongoose.Schema.Types.Mixed // Flexible structure for different report types
    },
    downloadUrl: { 
        type: String 
    }
}, { 
    timestamps: true 
});

const Report = mongoose.model("Report", ReportSchema);
module.exports = Report;