// const MotionLog = require("../models/motion");

class MotionAnalysisService {
    
    // Analyze motion patterns to detect human activity
    analyzeMotionPattern(gyroData, accelData) {
        try {
            // Validate input data
            if (!gyroData || !accelData || 
                !Array.isArray(gyroData) || !Array.isArray(accelData) ||
                gyroData.length !== 3 || accelData.length !== 3) {
                return {
                    isActive: false,
                    confidence: 0,
                    motionType: "unknown",
                    gyroMagnitude: 0,   
                    accelMagnitude: 0
                };
            }

            const [gx, gy, gz] = gyroData;
            const [ax, ay, az] = accelData;

            // Calculate motion intensity
            const gyroMagnitude = Math.sqrt(gx*gx + gy*gy + gz*gz);
            const accelMagnitude = Math.sqrt(ax*ax + ay*ay + az*az);
            
            // Debug logging
            console.log(`🔍 Motion Analysis:`);
            console.log(`   Gyro: [${gx}, ${gy}, ${gz}] → Magnitude: ${gyroMagnitude.toFixed(4)}`);
            console.log(`   Accel: [${ax}, ${ay}, ${az}] → Magnitude: ${accelMagnitude.toFixed(4)}`);
            console.log(`   Accel diff from 9.8: ${Math.abs(accelMagnitude - 9.8).toFixed(4)}`);

            // Handle special cases
            const isZeroData = gyroMagnitude === 0 && accelMagnitude === 0;
            const isStationary = gyroMagnitude < 0.01 && Math.abs(accelMagnitude - 9.8) < 0.5;
            const hasSignificantMotion = gyroMagnitude > 0.2;
            const hasVehicleMotion = Math.abs(accelMagnitude - 9.8) > 2.0;

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

            console.log(`   Result: ${motionType} (confidence: ${confidence}%, active: ${isActive})`);

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