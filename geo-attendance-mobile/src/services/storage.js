// src/services/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageService = {
  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage error:', error);
      return false;
    }
  },

  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value != null ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Storage error:', error);
      return null;
    }
  },

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage error:', error);
      return false;
    }
  },
};

export const authStorage = {
  async setAuthToken(token) {
    return await storageService.setItem('authToken', token);
  },

  async getAuthToken() {
    return await storageService.getItem('authToken');
  },

  async setUserData(user) {
    return await storageService.setItem('userData', user);
  },

  async getUserData() {
    return await storageService.getItem('userData');
  },

  async setDeviceId(deviceId) {
    return await storageService.setItem('deviceId', deviceId);
  },

  async getDeviceId() {
    return await storageService.getItem('deviceId');
  },

  async clearAuth() {
    await storageService.removeItem('authToken');
    await storageService.removeItem('userData');
  },
};