const mongoose = require("mongoose");

const RevalidationChallengeSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    attendanceId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Attendance", 
        required: true 
    },
    challengeType: {
        type: String,
        enum: ["location_photo", "qr_scan", "pattern_match", "question"],
        default: "qr_scan"
    },
    challengeData: {
        // For QR scan
        qrCode: String,
        // For pattern match
        pattern: [String],
        // For question
        question: String,
        correctAnswer: String
    },
    status: {
        type: String,
        enum: ["pending", "completed", "failed", "expired"],
        default: "pending"
    },
    expiresAt: {
        type: Date,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 3
    }
}, { 
    timestamps: true 
});

// TTL index to auto-expire challenges
RevalidationChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RevalidationChallenge", RevalidationChallengeSchema);