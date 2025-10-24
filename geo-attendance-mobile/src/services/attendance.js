// src/services/attendance.js
import api from './api';

export const attendanceService = {
  async startAttendance(location) {
    try {
      const response = await api.post('/attendance/start', {
        lat: location.latitude,
        lng: location.longitude,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async validatePresence(attendanceId, motionData) {
    try {
      const response = await api.post('/attendance/validate', {
        attendanceId,
        gyro: motionData.gyro || [0, 0, 0],
        accel: motionData.accel || [0, 0, 0],
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async endAttendance(attendanceId) {
    try {
      const response = await api.post('/attendance/end', {
        attendanceId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async checkSuspicion(attendanceId) {
    try {
      const response = await api.post('/attendance/check-suspicion', {
        attendanceId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async validateChallenge(challengeId, attendanceId, responseData) {
    try {
      const response = await api.post('/attendance/validate-challenge', {
        challengeId,
        attendanceId,
        response: responseData,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};