// src/services/auth.js
import api from './api';
import { authStorage } from './storage';

export const authService = {
  async login(email, password, deviceID) {
    try {
      const response = await api.post('/user/auth/login', {
        email,
        password,
        deviceID
      });
      
      // Store token and user data
      if (response.data && response.data.success) {
        await authStorage.setAuthToken(response.data.data.token);
        await authStorage.setUserData(response.data.data.user);
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async register(userData) {
    try {
      const response = await api.post('/user/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async logout() {
    await authStorage.clearAuth();
  },

  async getStoredUser() {
    return await authStorage.getUserData();
  },

  async isAuthenticated() {
    const token = await authStorage.getAuthToken();
    return !!token;
  },
};