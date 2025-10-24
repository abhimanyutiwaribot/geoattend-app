const MotionModel = require("../models/motion");
const AttendanceModel = require("../models/attendance");

class SuspicionDetectionService {
    
    // Check for suspicious patterns in attendance session
    async analyzeSuspicion(attendanceId, userId) {
        try {
            const suspicionReasons = [];
            let suspicionScore = 0;

            // Get recent motion data (last 10 minutes)
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const recentMotions = await MotionModel.find({
                attendanceId: attendanceId,
                timestamp: { $gte: tenMinutesAgo }
            }).sort({ timestamp: 1 });

            // 1. Check for prolonged inactivity
            const inactivityResult = this.checkProlongedInactivity(recentMotions);
            if (inactivityResult.isSuspicious) {
                suspicionReasons.push(inactivityResult.reason);
                suspicionScore += inactivityResult.score;
            }

            // 2. Check for unusual motion patterns
            const motionPatternResult = this.checkUnusualMotionPatterns(recentMotions);
            if (motionPatternResult.isSuspicious) {
                suspicionReasons.push(motionPatternResult.reason);
                suspicionScore += motionPatternResult.score;
            }

            // 3. Check location consistency (if we had multiple location samples)
            const locationResult = await this.checkLocationConsistency(attendanceId);
            if (locationResult.isSuspicious) {
                suspicionReasons.push(locationResult.reason);
                suspicionScore += locationResult.score;
            }

            return {
                isSuspicious: suspicionScore >= 30, // Threshold for triggering challenge
                suspicionScore: suspicionScore,
                reasons: suspicionReasons,
                requiresRevalidation: suspicionScore >= 30
            };
        } catch (error) {
            console.error("Suspicion analysis error:", error);
            return {
                isSuspicious: false,
                suspicionScore: 0,
                reasons: ["Analysis failed"],
                requiresRevalidation: false
            };
        }
    }

    // Check for prolonged inactivity (no motion for 5+ minutes)
    checkProlongedInactivity(motionLogs) {
        if (motionLogs.length === 0) {
            return {
                isSuspicious: true,
                reason: "No motion data recorded for 10 minutes",
                score: 40
            };
        }

        // Check if we have any active motion in last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentActiveMotions = motionLogs.filter(log => 
            new Date(log.timestamp) >= fiveMinutesAgo && 
            this.isActiveMotion(log)
        );

        if (recentActiveMotions.length === 0) {
            return {
                isSuspicious: true,
                reason: "No significant movement detected in last 5 minutes",
                score: 30
            };
        }

        return { isSuspicious: false, reason: "", score: 0 };
    }

    // Check for unusual motion patterns (possible spoofing)
    checkUnusualMotionPatterns(motionLogs) {
        if (motionLogs.length < 3) {
            return { isSuspicious: false, reason: "", score: 0 };
        }

        // Check for repetitive identical patterns (possible automation)
        const recentPatterns = motionLogs.slice(-5).map(log => ({
            gyro: log.gyro,
            accel: log.accel
        }));

        const isRepetitive = this.checkRepetitivePatterns(recentPatterns);
        if (isRepetitive) {
            return {
                isSuspicious: true,
                reason: "Repetitive motion patterns detected",
                score: 25
            };
        }

        // Check for unrealistic motion (too perfect or chaotic)
        const hasUnrealisticMotion = this.checkUnrealisticMotion(motionLogs);
        if (hasUnrealisticMotion) {
            return {
                isSuspicious: true,
                reason: "Unrealistic motion patterns detected",
                score: 20
            };
        }

        return { isSuspicious: false, reason: "", score: 0 };
    }

    // Check location consistency (if we implement multiple location samples)
    async checkLocationConsistency(attendanceId) {
        // For now, we'll keep it simple
        // In future, we can compare multiple location samples for jumps
        return { isSuspicious: false, reason: "", score: 0 };
    }

    // Helper: Check if motion data indicates active movement
    isActiveMotion(motionLog) {
        if (!motionLog.gyro || !motionLog.accel) return false;
        
        const gyroMagnitude = Math.sqrt(
            motionLog.gyro[0]**2 + motionLog.gyro[1]**2 + motionLog.gyro[2]**2
        );
        const accelMagnitude = Math.sqrt(
            motionLog.accel[0]**2 + motionLog.accel[1]**2 + motionLog.accel[2]**2
        );

        return gyroMagnitude > 0.1 || Math.abs(accelMagnitude - 9.8) > 0.5;
    }

    // Check for repetitive patterns (possible bot)
    checkRepetitivePatterns(patterns) {
        if (patterns.length < 3) return false;

        // Simple check: if last 3 patterns are identical
        const lastThree = patterns.slice(-3);
        const firstPattern = JSON.stringify(lastThree[0]);
        
        return lastThree.every(pattern => 
            JSON.stringify(pattern) === firstPattern
        );
    }

    // Check for unrealistic motion data
    checkUnrealisticMotion(motionLogs) {
        // Check for zero variance (suspiciously perfect)
        const variances = this.calculateMotionVariance(motionLogs);
        return variances.gyroVariance < 0.001 || variances.accelVariance < 0.001;
    }

    calculateMotionVariance(motionLogs) {
        // Simplified variance calculation
        const gyroValues = motionLogs.flatMap(log => log.gyro || []);
        const accelValues = motionLogs.flatMap(log => log.accel || []);

        const gyroVariance = this.calculateVariance(gyroValues);
        const accelVariance = this.calculateVariance(accelValues);

        return { gyroVariance, accelVariance };
    }

    calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b) / values.length;
        return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    }
}

module.exports = new SuspicionDetectionService();