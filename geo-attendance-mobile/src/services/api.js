// src/services/api.js
import axios from 'axios';
import { authStorage } from './storage';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Enhanced request logging
api.interceptors.request.use(
  async (config) => {
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data,
      headers: config.headers
    });
    
    try {
      const token = await authStorage.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔐 Token added to request');
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response logging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} SUCCESS:`, {
      status: response.status,
      data: response.data
    });
    return response;
  },
  async (error) => {
    console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} FAILED:`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      await authStorage.clearAuth();
      console.log('🔐 Cleared auth due to 401');
    }
    return Promise.reject(error);
  }
);

export default api;