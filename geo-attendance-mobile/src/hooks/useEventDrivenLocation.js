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
        maxAccuracy: 80,   // Rejects readings worse than 80m — filters bad indoor GPS noise
        maxSpeed: 33.33
      },
      smootherBufferSize: 3, // Average over 3 readings — reduces GPS drift jitter on the map dot
      stateMachine: {
        debounceTime: 15000 // 15s — faster geofence confirmation vs old 30s, still avoids false flips
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

  // Check location permission on mount (before any session exists)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        console.log('📍 [Hook] Initial permission check:', status);
        setLocationPermission(status);

        // If not granted, request it
        if (status !== 'granted') {
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          console.log('📍 [Hook] Permission request result:', newStatus);
          setLocationPermission(newStatus);
        }
      } catch (error) {
        console.error('❌ [Hook] Error checking permissions:', error);
        setLocationPermission('denied');
      }
    })();
  }, []);

  // Update geofence when it changes
  useEffect(() => {
    if (pipelineRef.current && officeGeofence) {
      pipelineRef.current.setGeofence(officeGeofence);
    }
  }, [officeGeofence]);

  // Start/stop location watching based on session or geofence presence
  useEffect(() => {
    // We need location updates to check geofence BEFORE starting attendance
    // and to keep tracking DURING attendance.
    if (officeGeofence) {
      startWatching();
    } else {
      stopWatching();
    }

    return () => {
      stopWatching();
    };
  }, [session?.attendanceId, officeGeofence]);

  /**
   * Start watching location (event stream from OS)
   */
  const startWatching = async () => {
    try {
      console.log('🚀 [Hook] startWatching invoked');
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

      console.log('🎯 [Hook] Subscribing to OS Location Stream...');

      // Subscribe to OS location stream
      watchSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // Was High — Balanced uses cell+GPS, saves ~25% battery
          timeInterval: 10000,                  // Was 5000 — 10s is plenty for stationary office users
          distanceInterval: 10,                 // Was 5m — 10m filters GPS drift (typical indoor drift is 3-8m)
          mayShowUserSettingsDialog: true
        },
        (location) => {
          console.log('🛰️ [Hook] RAW OS LOCATION RECEIVED:', location.coords.latitude, location.coords.longitude);

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

      console.log('✅ [Hook] Subscription active');
    } catch (error) {
      console.error('❌ [Hook] Fatal error in startWatching:', error);
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
