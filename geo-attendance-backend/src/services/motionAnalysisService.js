class MotionAnalysisService {
    // Analyze motion patterns to detect human activity
    analyzeMotionPattern(gyroData, accelData) {
        if (!gyroData || !accelData || gyroData.length !== 3 || accelData.length !== 3) {
            return {
                isActive: false,
                confidence: 0,
                motionType: "invalid_data"
            };
        }

        const [gx, gy, gz] = gyroData;
        const [ax, ay, az] = accelData;

        // Calculate motion intensity
        const gyroMagnitude = Math.sqrt(gx*gx + gy*gy + gz*gz);
        const accelMagnitude = Math.sqrt(ax*ax + ay*ay + az*az);
        
        // Basic thresholds (can be calibrated)
        const isMoving = gyroMagnitude > 0.1 || Math.abs(accelMagnitude - 9.8) > 0.3;
        
        let motionType = "stationary";
        let confidence = 0;

        if (isMoving) {
            if (gyroMagnitude > 0.5) {
                motionType = "walking";
                confidence = 70;
            } else if (accelMagnitude > 10.5 || accelMagnitude < 9.1) {
                motionType = "vehicle";
                confidence = 60;
            } else {
                motionType = "light_movement";
                confidence = 50;
            }
        } else {
            motionType = "stationary";
            confidence = 90;
        }

        return {
            isActive: isMoving,
            confidence: confidence,
            motionType: motionType,
            gyroMagnitude: gyroMagnitude,
            accelMagnitude: accelMagnitude
        };
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