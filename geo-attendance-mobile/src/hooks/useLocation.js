import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { scheduleLocalNotification } from '../utils/notifications';
import { api } from '../api/client';

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

/**
 * Custom hook for managing location tracking with GPS smoothing and mock detection
 */
export function useLocationTracking() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const lastLocationRef = useRef(null);

  const readCurrentLocation = async (validateWithServer = false) => {
    try {
      setLocationStatus('requesting');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        Alert.alert('Permission required', 'Location permission is needed to mark attendance.');
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });

      // If manually refreshing, we accept slightly lower accuracy but prefer best
      if (loc.coords.accuracy > 100) {
        console.warn('Low accuracy location:', loc.coords.accuracy);
      }

      // Server-side validation (optional, for critical operations like start attendance)
      if (validateWithServer) {
        try {
          const validation = await api.post('/attendance/validate-location', {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            speed: loc.coords.speed,
            altitude: loc.coords.altitude,
            isMockLocation: loc.mocked || false // Expo provides this on some platforms
          });

          if (!validation.data.success || validation.data.data.action === 'BLOCK') {
            Alert.alert(
              'Location Verification Failed',
              validation.data.message || 'Your location could not be verified. Please disable any mock location apps.',
              [{ text: 'OK' }]
            );
            setLocationStatus('error');
            return null;
          }

          // If action is CHALLENGE, we could trigger additional verification here
          if (validation.data.data.action === 'CHALLENGE') {
            console.warn('Location flagged for challenge:', validation.data.data.flags);
          }
        } catch (validationError) {
          console.error('Location validation error:', validationError);
          // Don't block on validation errors, but log them
        }
      }

      setCurrentLocation(loc.coords);
      setLocationStatus('granted');
      return loc;
    } catch (e) {
      setLocationStatus('error');
      return null;
    }
  };

  return {
    currentLocation,
    setCurrentLocation,
    locationStatus,
    setLocationStatus,
    lastLocationRef,
    readCurrentLocation
  };
}

/**
 * Custom hook for polling location before session starts
 */
export function useLocationPolling({
  session,
  locationStatus,
  setLocationStatus,
  setCurrentLocation,
  lastLocationRef,
  checkGeofenceStatus
}) {
  useEffect(() => {
    if (session?.attendanceId) {
      return; // Don't poll if session is active
    }

    let intervalId = null;

    const startPolling = async () => {
      // Request permission first if not granted
      if (locationStatus !== 'granted') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            setLocationStatus('granted');
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
            lastLocationRef.current = loc.coords;
            setCurrentLocation(loc.coords);
            await checkGeofenceStatus(loc.coords);
          } else {
            setLocationStatus('denied');
            return;
          }
        } catch (e) {
          setLocationStatus('error');
          return;
        }
      }

      // Start polling every 10 seconds
      intervalId = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });

          // Noise Filter: If accuracy is too poor (> 60m), ignore it
          if (loc.coords.accuracy > 60) {
            console.log('Ignoring low accuracy signal:', loc.coords.accuracy);
            return;
          }

          // Calculate distance from last known position
          let newCoords = loc.coords;
          if (lastLocationRef.current) {
            const distance = calculateDistance(
              lastLocationRef.current.latitude,
              lastLocationRef.current.longitude,
              loc.coords.latitude,
              loc.coords.longitude
            );

            // If movement is less than 10 meters, it's likely GPS drift - ignore it
            if (distance < 10) {
              console.log('Ignoring GPS drift:', distance.toFixed(2), 'm');
              return;
            }

            // If movement is between 10-30m, apply heavy smoothing (likely drift)
            // If movement is > 30m, apply light smoothing (likely real movement)
            const alpha = distance < 30 ? 0.1 : 0.3;

            newCoords = {
              ...loc.coords,
              latitude: lastLocationRef.current.latitude * (1 - alpha) + loc.coords.latitude * alpha,
              longitude: lastLocationRef.current.longitude * (1 - alpha) + loc.coords.longitude * alpha
            };
          }

          // Update state and Ref
          lastLocationRef.current = newCoords;
          setCurrentLocation(newCoords);

          // Check geofence with SMOOTHED coordinates
          await checkGeofenceStatus(newCoords);
        } catch (e) {
          console.log('Polling error:', e.message);
        }
      }, 10000);
    };

    startPolling();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [session?.attendanceId]);
}

/**
 * Custom hook for monitoring geofence violations during active session
 */
export function useGeofenceMonitoring({
  session,
  readCurrentLocation,
  checkGeofenceStatus,
  handleEndAttendance
}) {
  const [outsideGeofenceSince, setOutsideGeofenceSince] = useState(null);
  const [hasShownWarning, setHasShownWarning] = useState(false);

  useEffect(() => {
    if (!session?.attendanceId) {
      return;
    }

    const id = setInterval(async () => {
      const loc = await readCurrentLocation();
      if (loc && loc.coords) {
        const geoCheck = await checkGeofenceStatus(loc.coords);

        if (geoCheck === false) {
          if (!outsideGeofenceSince) {
            setOutsideGeofenceSince(Date.now());
            setHasShownWarning(false);
          } else {
            const minutesOutside = (Date.now() - outsideGeofenceSince) / (1000 * 60);

            // Show warning after 2 minutes
            if (minutesOutside >= 2 && !hasShownWarning) {
              setHasShownWarning(true);
              Alert.alert(
                '⚠️ Geofence Warning',
                'You have been outside the office area for 2 minutes. Please return within 3 minutes or your session will be automatically ended.',
                [{ text: 'OK' }]
              );

              await scheduleLocalNotification(
                '⚠️ Return to Office',
                'You are outside the office area. Return within 3 minutes to avoid session termination.',
                {}
              );
            }

            // Auto-end session after 5 minutes
            if (minutesOutside >= 5) {
              Alert.alert(
                'Session Ended',
                'Your attendance session has been automatically ended because you were outside the office area for more than 5 minutes.',
                [{ text: 'OK' }]
              );
              await handleEndAttendance();
            }
          }
        } else if (geoCheck === true) {
          if (outsideGeofenceSince) {
            setOutsideGeofenceSince(null);
            setHasShownWarning(false);

            await scheduleLocalNotification(
              '✅ Back in Office',
              'Welcome back! Your session continues.',
              {}
            );
          }
        }
      }
    }, 60000);

    return () => clearInterval(id);
  }, [session?.attendanceId, outsideGeofenceSince, hasShownWarning]);

  return {
    outsideGeofenceSince,
    setOutsideGeofenceSince,
    hasShownWarning,
    setHasShownWarning
  };
}
