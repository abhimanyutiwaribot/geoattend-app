// src/utils/device.js - Create this new file
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { authStorage } from '../services/storage';

export const getDeviceId = async () => {
  try {
    // First, check if we already have a stored device ID
    const storedDeviceId = await authStorage.getDeviceId();
    if (storedDeviceId) {
      return storedDeviceId;
    }

    // Generate a new device ID
    let deviceId;
    
    if (Device.modelId) {
      deviceId = Device.modelId;
    } else if (Application.androidId) {
      deviceId = Application.androidId;
    } else {
      // Fallback: create a persistent ID
      deviceId = `mobile-${Date.now()}`;
    }

    // Store the device ID for future use
    await authStorage.setDeviceId(deviceId);
    
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    return `mobile-${Date.now()}`;
  }
};