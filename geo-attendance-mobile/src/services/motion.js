// src/services/motion.js
import { accelerometer, gyroscope } from 'expo-sensors';

class MotionService {
  constructor() {
    this.isMonitoring = false;
    this.motionData = {
      gyro: [0, 0, 0],
      accel: [0, 0, 0],
    };
    this.subscription = null;
  }

  async startMonitoring() {
    if (this.isMonitoring) return;

    try {
      // Set update interval (in milliseconds)
      accelerometer.setUpdateInterval(1000);
      gyroscope.setUpdateInterval(1000);

      this.subscription = accelerometer.addListener((accelData) => {
        this.motionData.accel = [
          accelData.x,
          accelData.y, 
          accelData.z,
        ];
      });

      gyroscope.addListener((gyroData) => {
        this.motionData.gyro = [
          gyroData.x,
          gyroData.y,
          gyroData.z,
        ];
      });

      this.isMonitoring = true;
      console.log('📱 Motion monitoring started');
    } catch (error) {
      console.error('Failed to start motion monitoring:', error);
    }
  }

  stopMonitoring() {
    if (this.subscription) {
      this.subscription.remove();
    }
    accelerometer.removeAllListeners();
    gyroscope.removeAllListeners();
    this.isMonitoring = false;
    console.log('📱 Motion monitoring stopped');
  }

  getCurrentMotion() {
    return { ...this.motionData };
  }

  // Check if device is moving (basic detection)
  isDeviceMoving() {
    const [x, y, z] = this.motionData.gyro;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    return magnitude > 0.1; // Threshold for movement
  }
}

export default new MotionService();