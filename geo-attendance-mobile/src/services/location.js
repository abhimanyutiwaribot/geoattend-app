// src/services/location.js
import * as Location from 'expo-location';
import { isWithinGeofence, getLocationState } from '../utils/geofence';

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.isTracking = false;
    this.locationState = 'AWAY';
  }

  async requestPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }
      
      console.log('📍 Location permission granted');
      return true;
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  }

  async getCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      // Check geofence status
      const geofenceStatus = isWithinGeofence(
        this.currentLocation.latitude,
        this.currentLocation.longitude
      );

      this.locationState = getLocationState(geofenceStatus.distance);

      return {
        ...this.currentLocation,
        geofenceStatus,
        state: this.locationState,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      throw error;
    }
  }

  // Start smart location tracking
  startSmartTracking(onLocationUpdate) {
    if (this.isTracking) return;

    this.isTracking = true;
    this.onLocationUpdate = onLocationUpdate;

    // Initial location check
    this.performLocationCheck();

    // Set up interval based on current state
    this.startTrackingInterval();
  }

  stopTracking() {
    this.isTracking = false;
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }
  }

  startTrackingInterval() {
    const intervals = {
      AWAY: 30 * 60 * 1000,        // 30 minutes
      APPROACHING: 5 * 60 * 1000,  // 5 minutes
      IN_OFFICE: 2 * 60 * 1000,    // 2 minutes
      ACTIVE_SESSION: 30 * 1000,   // 30 seconds
    };

    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }

    this.trackingInterval = setInterval(() => {
      this.performLocationCheck();
    }, intervals[this.locationState] || intervals.AWAY);
  }

  async performLocationCheck() {
    try {
      const locationData = await this.getCurrentLocation();
      
      if (this.onLocationUpdate) {
        this.onLocationUpdate(locationData);
      }

      // Update tracking interval if state changed
      this.startTrackingInterval();
      
    } catch (error) {
      console.log('Location check failed:', error);
    }
  }
}

export default new LocationService();