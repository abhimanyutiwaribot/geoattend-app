import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { api } from '../api/client';

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validate location to prevent jumps and spoofing
 */
function validateLocation(newCoords, lastCoords, lastTimestamp) {
  // Check for mock location
  if (newCoords.mocked) {
    console.log('🚫 Rejected: Mock location detected');
    return false;
  }

  // Accuracy filter - stricter for geofencing
  if (newCoords.accuracy > 50) {
    console.log('🚫 Rejected: Poor accuracy', newCoords.accuracy);
    return false;
  }

  // No previous location - accept first reading
  if (!lastCoords || !lastTimestamp) {
    return true;
  }

  // Calculate distance and time difference
  const distance = calculateDistance(
    lastCoords.latitude,
    lastCoords.longitude,
    newCoords.latitude,
    newCoords.longitude
  );
  const timeDiff = (Date.now() - lastTimestamp) / 1000; // seconds

  // Prevent impossible movements (> 120 km/h)
  const maxSpeed = 33.33; // ~120 km/h in m/s
  const calculatedSpeed = distance / timeDiff;

  if (calculatedSpeed > maxSpeed) {
    console.log('🚫 Rejected: Impossible speed', {
      distance: distance.toFixed(2),
      timeDiff: timeDiff.toFixed(2),
      speed: calculatedSpeed.toFixed(2)
    });
    return false;
  }

  // Additional validation: reject if distance is too large for the time interval
  // For 30s intervals, max expected movement is ~1000m
  const maxDistanceForInterval = maxSpeed * Math.max(timeDiff, 30);
  if (distance > maxDistanceForInterval) {
    console.log('🚫 Rejected: Location jump detected');
    return false;
  }

  return true;
}

/**
 * Base location tracking hook
 */
export function useLocationTracking() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const lastLocationRef = useRef(null);
  const lastUpdateTime = useRef(null);

  const readCurrentLocation = async (validateWithServer = false, highAccuracy = true) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: highAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced,
        maximumAge: 10000,
        timeout: 15000
      });

      const coords = location.coords;

      // Validate location before using
      if (!validateLocation(coords, lastLocationRef.current, lastUpdateTime.current)) {
        return null;
      }

      // Server validation if required
      if (validateWithServer) {
        try {
          const validation = await api.post('/attendance/validate-location', {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            isMockLocation: location.mocked || false
          });
          if (!validation.data.success) {
            console.log('🚫 Server validation failed');
            return null;
          }
        } catch (e) {
          console.log('⚠️ Server validation error:', e.message);
        }
      }

      setCurrentLocation(coords);
      lastLocationRef.current = coords;
      lastUpdateTime.current = Date.now();
      setLocationStatus('granted');

      return location;
    } catch (e) {
      console.log('❌ Location read error:', e.message);
      return null;
    }
  };

  return {
    currentLocation,
    setCurrentLocation,
    locationStatus,
    setLocationStatus,
    lastLocationRef,
    lastUpdateTime,
    readCurrentLocation
  };
}

/**
 * UNIFIED Location Tracking & Geofence Monitoring
 * Single location service - battery optimized
 */
export function useUnifiedLocationTracking({
  session,
  locationStatus,
  setLocationStatus,
  setCurrentLocation,
  lastLocationRef,
  lastUpdateTime,
  checkGeofenceStatus,
  handleEndAttendance
}) {
  const watchId = useRef(null);
  const lastGeofenceStatus = useRef(null);
  const [outsideGeofenceSince, setOutsideGeofenceSince] = useState(null);
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const locationBuffer = useRef([]); // Smoothing buffer

  useEffect(() => {
    // Only run during active session
    if (!session?.attendanceId) {
      if (watchId.current) {
        watchId.current.remove();
        watchId.current = null;
      }
      setOutsideGeofenceSince(null);
      setHasShownWarning(false);
      return;
    }

    const startTracking = async () => {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }
      setLocationStatus('granted');

      // Clean up existing watcher
      if (watchId.current) {
        watchId.current.remove();
      }

      // Start location watching
      watchId.current = await Location.watchPositionAsync(
        {
          // OPTIMIZED CONFIGURATION
          accuracy: Location.Accuracy.High, // High accuracy for geofencing
          timeInterval: 30000, // 30 seconds - balanced
          distanceInterval: 15, // 15 meters - sensitive enough
          mayShowUserSettingsDialog: true
        },
        async (location) => {
          const coords = location.coords;

          // VALIDATE LOCATION - prevent jumps
          if (!validateLocation(coords, lastLocationRef.current, lastUpdateTime.current)) {
            return; // Skip invalid readings
          }

          // LOCATION SMOOTHING - reduce jitter
          locationBuffer.current.push(coords);
          if (locationBuffer.current.length > 3) {
            locationBuffer.current.shift();
          }

          // Use average of last 3 readings for smoother tracking
          const smoothedCoords = locationBuffer.current.length >= 2
            ? {
              latitude: locationBuffer.current.reduce((sum, c) => sum + c.latitude, 0) / locationBuffer.current.length,
              longitude: locationBuffer.current.reduce((sum, c) => sum + c.longitude, 0) / locationBuffer.current.length,
              accuracy: Math.max(...locationBuffer.current.map(c => c.accuracy)),
              altitude: coords.altitude,
              heading: coords.heading,
              speed: coords.speed
            }
            : coords;

          // Update state
          lastLocationRef.current = smoothedCoords;
          lastUpdateTime.current = Date.now();
          setCurrentLocation(smoothedCoords);

          console.log('📍 Location updated:', {
            lat: smoothedCoords.latitude.toFixed(6),
            lng: smoothedCoords.longitude.toFixed(6),
            accuracy: smoothedCoords.accuracy.toFixed(1)
          });

          // GEOFENCE CHECK
          const isWithinGeofence = await checkGeofenceStatus(smoothedCoords);

          // Handle geofence transitions
          if (lastGeofenceStatus.current !== null &&
            lastGeofenceStatus.current !== isWithinGeofence) {
            const eventType = isWithinGeofence ? 'ENTER' : 'EXIT';
            console.log(`🚪 Geofence ${eventType}`);

            // You can trigger custom events here
            if (!isWithinGeofence) {
              // User left geofence
              setOutsideGeofenceSince(Date.now());
              setHasShownWarning(false);
            } else {
              // User re-entered geofence
              setOutsideGeofenceSince(null);
              setHasShownWarning(false);
            }
          }
          lastGeofenceStatus.current = isWithinGeofence;

          // GEOFENCE VIOLATION HANDLING
          if (isWithinGeofence === false) {
            if (!outsideGeofenceSince) {
              setOutsideGeofenceSince(Date.now());
            } else {
              const minutesOutside = (Date.now() - outsideGeofenceSince) / (60000);

              // Warning at 3 minutes
              if (minutesOutside >= 3 && !hasShownWarning) {
                setHasShownWarning(true);
                Alert.alert(
                  '⚠️ Warning',
                  'You have left the office area. Please return within 5 minutes or your attendance will be automatically ended.',
                  [{ text: 'OK' }]
                );
              }

              // Auto end at 8 minutes
              if (minutesOutside >= 8) {
                Alert.alert(
                  '⏹️ Attendance Ended',
                  'Your attendance has been automatically ended due to being outside the office area.',
                  [{ text: 'OK' }]
                );
                await handleEndAttendance();
              }
            }
          } else if (isWithinGeofence === true) {
            // Reset if back inside
            setOutsideGeofenceSince(null);
            setHasShownWarning(false);
          }

          // LOG TO BACKEND (with retry logic)
          const logLocation = async (retries = 2) => {
            try {
              await api.post('/attendance/location/log', {
                lat: smoothedCoords.latitude,        // ✅ Backend expects 'lat'
                lng: smoothedCoords.longitude,       // ✅ Backend expects 'lng'
                accuracy: smoothedCoords.accuracy,
                metadata: {
                  speed: smoothedCoords.speed || 0,
                  altitude: smoothedCoords.altitude || 0,
                  heading: smoothedCoords.heading || 0,
                  isMock: location.mocked || false,
                  timestamp: Date.now()
                }
              });
              console.log('✅ Location logged to server');
            } catch (e) {
              if (retries > 0) {
                console.log(`⚠️ Retrying log (${retries} left)...`);
                setTimeout(() => logLocation(retries - 1), 2000);
              } else {
                console.log('❌ Location log failed:', e.message);
              }
            }
          };

          logLocation();
        }
      );

      console.log('🎯 Location tracking started');
    };

    startTracking();

    // Cleanup
    return () => {
      if (watchId.current) {
        watchId.current.remove();
        watchId.current = null;
        console.log('🛑 Location tracking stopped');
      }
    };
  }, [session?.attendanceId]); // ✅ Only restart when session changes

  return {
    outsideGeofenceSince,
    hasShownWarning
  };
}

/**
 * OPTIONAL: Background location tracking (requires background permissions)
 * Use this if you need tracking when app is in background
 */
export function useBackgroundLocationTracking(session) {
  useEffect(() => {
    if (!session?.attendanceId) return;

    const startBackgroundTracking = async () => {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('⚠️ Background location not granted');
        return;
      }

      await Location.startLocationUpdatesAsync('ATTENDANCE_TRACKING', {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000, // 1 minute in background
        distanceInterval: 50,
        foregroundService: {
          notificationTitle: 'Attendance Active',
          notificationBody: 'Tracking your location for attendance',
          notificationColor: '#4CAF50'
        }
      });

      console.log('🌍 Background tracking started');
    };

    startBackgroundTracking();

    return () => {
      Location.stopLocationUpdatesAsync('ATTENDANCE_TRACKING').catch(() => { });
    };
  }, [session?.attendanceId]);
}