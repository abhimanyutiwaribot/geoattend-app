/**
 * EVENT-DRIVEN LOCATION TRACKING HOOK
 * 
 * Pure event-driven architecture:
 * - No loops
 * - No timers
 * - OS pushes location updates
 * - We react to events
 */

import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { LocationEventPipeline } from '../services/locationEventPipeline';

/**
 * Event-driven location tracking hook
 * Subscribes to OS location stream and processes events through pipeline
 */
export function useEventDrivenLocation({ session, officeGeofence }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [geofenceStatus, setGeofenceStatus] = useState(null);
  const [locationPermission, setLocationPermission] = useState('unknown');

  const pipelineRef = useRef(null);
  const watchSubscriptionRef = useRef(null);

  // Initialize pipeline
  useEffect(() => {
    pipelineRef.current = new LocationEventPipeline({
      validator: {
        maxAccuracy: 50,
        maxSpeed: 33.33 // ~120 km/h
      },
      smootherBufferSize: 3,
      stateMachine: {
        debounceTime: 30000 // 30 seconds
      }
    });

    // Subscribe to processed location events
    const unsubscribeLocation = pipelineRef.current.onLocationUpdate((event) => {
      console.log('📍 [Hook] Location update received');
      setCurrentLocation(event.location.coords);
      setGeofenceStatus(event.geofence);
    });

    // Subscribe to geofence transition events
    const unsubscribeTransition = pipelineRef.current.onGeofenceTransition((eventType, geofenceStatus) => {
      console.log(`🚪 [Hook] Geofence ${eventType}:`, geofenceStatus);

      // Emit custom events for business logic
      if (eventType === 'ENTRY') {
        // User entered geofence
        console.log('✅ User entered office area');
      } else if (eventType === 'EXIT') {
        // User exited geofence
        console.log('⚠️ User left office area');
      }
    });

    return () => {
      unsubscribeLocation();
      unsubscribeTransition();
    };
  }, []);

  // Update geofence when it changes
  useEffect(() => {
    if (pipelineRef.current && officeGeofence) {
      pipelineRef.current.setGeofence(officeGeofence);
    }
  }, [officeGeofence]);

  // Start/stop location watching based on session
  useEffect(() => {
    if (!session?.attendanceId) {
      // No active session - stop watching
      stopWatching();
      return;
    }

    // Active session - start watching
    startWatching();

    return () => {
      stopWatching();
    };
  }, [session?.attendanceId]);

  /**
   * Start watching location (event stream from OS)
   */
  const startWatching = async () => {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermission('denied');
        console.log('❌ [Hook] Location permission denied');
        return;
      }
      setLocationPermission('granted');

      // Stop existing watcher if any
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
      }

      console.log('🎯 [Hook] Starting location watch...');

      // Subscribe to OS location stream
      watchSubscriptionRef.current = await Location.watchPositionAsync(
        {
          // EVENT-DRIVEN CONFIGURATION
          accuracy: Location.Accuracy.High,
          timeInterval: 30000,      // Push update every 30 seconds
          distanceInterval: 15,     // OR when user moves 15 meters
          mayShowUserSettingsDialog: true
        },
        (location) => {
          // LOCATION EVENT RECEIVED FROM OS
          console.log('📡 [Hook] Location event from OS');

          // Create event object
          const locationEvent = {
            coords: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
              altitude: location.coords.altitude,
              heading: location.coords.heading,
              speed: location.coords.speed,
              mocked: location.mocked || false
            },
            timestamp: location.timestamp
          };

          // Push event through pipeline
          pipelineRef.current?.process(locationEvent);
        }
      );

      console.log('✅ [Hook] Location watch started - listening for events');
    } catch (error) {
      console.error('❌ [Hook] Error starting location watch:', error);
    }
  };

  /**
   * Stop watching location
   */
  const stopWatching = () => {
    if (watchSubscriptionRef.current) {
      watchSubscriptionRef.current.remove();
      watchSubscriptionRef.current = null;
      console.log('🛑 [Hook] Location watch stopped');
    }

    // Reset pipeline
    pipelineRef.current?.reset();
  };

  /**
   * Manually request current location (one-time)
   */
  const requestCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      console.log('📍 [Hook] Manual location request');

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000,
        timeout: 15000
      });

      // Process through pipeline
      const locationEvent = {
        coords: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
          heading: location.coords.heading,
          speed: location.coords.speed,
          mocked: location.mocked || false
        },
        timestamp: location.timestamp
      };

      await pipelineRef.current?.process(locationEvent);

      return location;
    } catch (error) {
      console.error('❌ [Hook] Error requesting location:', error);
      return null;
    }
  };

  return {
    currentLocation,
    geofenceStatus,
    locationPermission,
    requestCurrentLocation,
    pipeline: pipelineRef.current
  };
}
