import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { api } from '../api/client';

/**
 * Custom hook for managing attendance session state
 */
export function useAttendanceSession() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchActiveSession = async () => {
    try {
      setCheckingSession(true);
      const res = await api.get('/attendance/active-session');
      if (res.status === 200 && res.data?.data) {
        return res.data.data;
      }
      return null;
    } catch (e) {
      return null;
    } finally {
      setCheckingSession(false);
    }
  };

  const startAttendance = async (latitude, longitude, identityData) => {
    try {
      // identityData can be either a photo (base64 string) or embedding (array)
      const isPhoto = typeof identityData === 'string' && identityData.startsWith('data:image');

      console.log('📡 Calling /attendance/start API with:', {
        latitude,
        longitude,
        dataType: isPhoto ? 'photo' : 'embedding',
        dataSize: isPhoto ? `${(identityData.length / 1024).toFixed(2)}KB` : `${identityData?.length} dimensions`
      });

      setLoading(true);
      const res = await api.post('/attendance/start', {
        lat: latitude,
        lng: longitude,
        // Send either image or embedding based on what we received
        ...(isPhoto ? { identityImage: identityData } : { identityEmbedding: identityData })
      });
      console.log('✅ Attendance started successfully:', res.data);
      return res.data.data;
    } catch (e) {
      console.error('❌ Start attendance error:', e.response?.data || e.message);
      const msg =
        e.response?.data?.message ||
        (e.response?.data?.error === 'OUTSIDE_GEOFENCE'
          ? 'You are outside the office geofence.'
          : e.response?.data?.error === 'IDENTITY_VERIFICATION_FAILED'
            ? 'Identity verification failed. Please try again.'
            : 'Failed to start attendance');
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const endAttendance = async (attendanceId) => {
    try {
      setLoading(true);
      await api.post('/attendance/end', { attendanceId });
      return true;
    } catch (e) {
      throw new Error('Failed to end attendance');
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    setSession,
    checkingSession,
    loading,
    setLoading,
    fetchActiveSession,
    startAttendance,
    endAttendance
  };
}

/**
 * Custom hook for motion sensor validation
 */
export function useMotionValidation() {
  const [motionSub, setMotionSub] = useState(null);

  const startMotionValidation = async (attendanceId, setSession) => {
    const accelData = { x: 0, y: 0, z: 0 };
    const gyroData = { x: 0, y: 0, z: 0 };

    Accelerometer.setUpdateInterval(1000);
    Gyroscope.setUpdateInterval(1000);

    // Clear any previous subscriptions
    if (motionSub && motionSub.remove) {
      motionSub.remove();
    }

    const accelSub = Accelerometer.addListener((data) => {
      accelData.x = data.x;
      accelData.y = data.y;
      accelData.z = data.z;
    });

    const gyroSub = Gyroscope.addListener((data) => {
      gyroData.x = data.x;
      gyroData.y = data.y;
      gyroData.z = data.z;
    });

    // Send snapshot every 30 seconds
    const intervalId = setInterval(async () => {
      try {
        if (!attendanceId) return;
        console.log('Motion snapshot being sent', { gyro: gyroData, accel: accelData });
        const res = await api.post('/attendance/validate', {
          attendanceId,
          gyro: gyroData,
          accel: accelData,
        });
        const d = res.data.data;
        setSession((prev) =>
          prev
            ? {
              ...prev,
              status: d.attendanceStatus,
              validationScore: d.validationScore,
            }
            : prev
        );
      } catch (e) {
        // ignore single failures
      }
    }, 30000);

    setMotionSub({
      remove: () => {
        accelSub && accelSub.remove();
        gyroSub && gyroSub.remove();
        clearInterval(intervalId);
      },
      intervalId,
    });
  };

  const stopMotionValidation = () => {
    if (motionSub) {
      motionSub.remove();
    }
  };

  return {
    motionSub,
    startMotionValidation,
    stopMotionValidation
  };
}
