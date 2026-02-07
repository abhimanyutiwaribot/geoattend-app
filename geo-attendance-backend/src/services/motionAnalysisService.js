// const MotionLog = require("../models/motion");

class MotionAnalysisService {

    // Analyze motion patterns to detect human activity
    analyzeMotionPattern(gyroData, accelData) {
        try {
            // Validate input data
            const isValid = (d) => Array.isArray(d) ? d.length === 3 : (d && typeof d === 'object' && d.x !== undefined);
            if (!isValid(gyroData) || !isValid(accelData)) {
                return {
                    isActive: false,
                    confidence: 0,
                    motionType: "unknown",
                    gyroMagnitude: 0,
                    accelMagnitude: 0
                };
            }

            const getCoords = (data) => {
                if (Array.isArray(data)) return data;
                if (data && typeof data === 'object') return [data.x || 0, data.y || 0, data.z || 0];
                return [0, 0, 0];
            };

            const [gx, gy, gz] = getCoords(gyroData);
            const [ax, ay, az] = getCoords(accelData);

            // Calculate motion intensity
            const gyroMagnitude = Math.sqrt(gx * gx + gy * gy + gz * gz);
            const accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);

            // Handle special cases
            // Note: Accelerometer is in G-force units (1G ≈ 9.8 m/s²)
            // At rest, magnitude should be ~1.0 (gravity)
            const isZeroData = gyroMagnitude === 0 && accelMagnitude === 0;
            const isStationary = gyroMagnitude < 0.01 && Math.abs(accelMagnitude - 1.0) < 0.1;
            const hasSignificantMotion = gyroMagnitude > 0.2;
            const hasVehicleMotion = Math.abs(accelMagnitude - 1.0) > 0.5; // Changed from 2.0

            let motionType = "stationary";
            let confidence = 0;
            let isActive = false;

            if (isZeroData || isStationary) {
                motionType = "stationary";
                confidence = isZeroData ? 10 : 90;
                isActive = false;
            } else if (hasVehicleMotion) {
                motionType = "vehicle";
                confidence = 75;
                isActive = true;
            } else if (hasSignificantMotion) {
                motionType = "walking";
                confidence = 70;
                isActive = true;
            } else {
                motionType = "light_movement";
                confidence = 50;
                isActive = true;
            }

            // Only log on significant motion changes (not every data point)
            const shouldLog = hasSignificantMotion || hasVehicleMotion || (Math.random() < 0.05); // 5% sampling
            if (shouldLog) {
                console.log(`🔍 Motion: ${motionType} (${confidence}%) | Gyro: ${gyroMagnitude.toFixed(3)} | Accel: ${accelMagnitude.toFixed(3)}G`);
            }

            return {
                isActive: isActive,
                confidence: confidence,
                motionType: motionType,
                gyroMagnitude: gyroMagnitude,
                accelMagnitude: accelMagnitude
            };
        } catch (error) {
            console.error("❌ Motion analysis error:", error);
            return {
                isActive: false,
                confidence: 0,
                motionType: "unknown",
                gyroMagnitude: 0,
                accelMagnitude: 0
            };
        }
    }

    // Check if motion suggests genuine human presence
    isGenuinePresence(motionHistory) {
        if (!motionHistory || motionHistory.length === 0) {
            return false;
        }

        // Simple logic: if we have consistent motion in last 5 minutes
        const recentMotions = motionHistory
            .filter(m => new Date() - new Date(m.timestamp) < 5 * 60 * 1000)
            .map(m => m.isActive);

        const activeCount = recentMotions.filter(Boolean).length;
        return activeCount >= 2; // At least 2 active readings in last 5 minutes
    }
}

module.exports = new MotionAnalysisService();