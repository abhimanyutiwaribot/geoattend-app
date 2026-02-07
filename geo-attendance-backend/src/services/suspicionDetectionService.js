const MotionModel = require("../models/motion");
const AttendanceModel = require("../models/attendance");

class SuspicionDetectionService {

    // Check for suspicious patterns in attendance session
    async analyzeSuspicion(attendanceId, userId) {
        try {
            const suspicionReasons = [];
            let suspicionScore = 0;

            const attendance = await AttendanceModel.findById(attendanceId);
            if (!attendance) {
                return {
                    isSuspicious: false,
                    suspicionScore: 0,
                    reasons: [],
                    requiresRevalidation: false
                };
            }

            const sessionDuration = (Date.now() - new Date(attendance.startTime)) / (1000 * 60); // minutes


            // 2. Check session patterns (very short or very long sessions)
            const sessionPatternResult = this.checkSessionPatterns(attendance, sessionDuration);
            if (sessionPatternResult.isSuspicious) {
                suspicionReasons.push(sessionPatternResult.reason);
                suspicionScore += sessionPatternResult.score;
            }

            // 3. Check motion only in first 10 minutes (initial validation window)
            if (sessionDuration <= 10) {
                const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
                const recentMotions = await MotionModel.find({
                    attendanceId: attendanceId,
                    timestamp: { $gte: tenMinutesAgo }
                }).sort({ timestamp: 1 });

                const initialMotionResult = this.checkInitialMotion(recentMotions, sessionDuration);
                if (initialMotionResult.isSuspicious) {
                    suspicionReasons.push(initialMotionResult.reason);
                    suspicionScore += initialMotionResult.score;
                }
            }

            // 4. Check for unusual motion patterns (if any motion data exists)
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const recentMotions = await MotionModel.find({
                attendanceId: attendanceId,
                timestamp: { $gte: tenMinutesAgo }
            }).sort({ timestamp: 1 });

            if (recentMotions.length > 0) {
                const motionPatternResult = this.checkUnusualMotionPatterns(recentMotions);
                if (motionPatternResult.isSuspicious) {
                    suspicionReasons.push(motionPatternResult.reason);
                    suspicionScore += motionPatternResult.score;
                }
            }

            return {
                isSuspicious: suspicionScore >= 30, // Threshold for potential flagging
                suspicionScore: suspicionScore,
                reasons: suspicionReasons
            };
        } catch (error) {
            console.error("Suspicion analysis error:", error);
            return {
                isSuspicious: false,
                suspicionScore: 0,
                reasons: ["Analysis failed"]
            };
        }
    }


    // Check session patterns (suspicious durations)
    checkSessionPatterns(attendance, sessionDurationMinutes) {
        // Very short sessions (< 5 minutes) might be suspicious
        if (sessionDurationMinutes < 5 && attendance.status === "completed") {
            return {
                isSuspicious: true,
                reason: "Very short session detected",
                score: 25
            };
        }

        // Extremely long sessions (> 12 hours) might be suspicious
        if (sessionDurationMinutes > 12 * 60) {
            return {
                isSuspicious: true,
                reason: "Unusually long session detected",
                score: 20
            };
        }

        return { isSuspicious: false, reason: "", score: 0 };
    }

    // Check motion only in initial window (first 10 minutes)
    checkInitialMotion(motionLogs, sessionDurationMinutes) {
        if (sessionDurationMinutes > 10) {
            return { isSuspicious: false, reason: "", score: 0 };
        }

        if (motionLogs.length === 0) {
            // In first 5 minutes, expect some motion
            if (sessionDurationMinutes <= 5) {
                return {
                    isSuspicious: true,
                    reason: "No motion detected during initial check-in period",
                    score: 30
                };
            }
        }

        // Check if we have any active motion in first few minutes
        const firstFewMinutes = motionLogs.filter(log => {
            const logTime = (Date.now() - new Date(log.timestamp)) / (1000 * 60);
            return logTime <= 5 && this.isActiveMotion(log);
        });

        if (firstFewMinutes.length === 0 && sessionDurationMinutes <= 5) {
            return {
                isSuspicious: true,
                reason: "No significant movement during initial period",
                score: 25
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
            motionLog.gyro[0] ** 2 + motionLog.gyro[1] ** 2 + motionLog.gyro[2] ** 2
        );
        const accelMagnitude = Math.sqrt(
            motionLog.accel[0] ** 2 + motionLog.accel[1] ** 2 + motionLog.accel[2] ** 2
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