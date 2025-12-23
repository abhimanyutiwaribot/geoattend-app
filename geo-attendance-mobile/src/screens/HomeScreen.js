import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerForPushNotificationsAsync, scheduleLocalNotification, saveLocalNotificationEntry } from '../utils/notifications';

export default function HomeScreen() {
  const navigation = useNavigation();
  const notificationListener = useRef();
  const responseListener = useRef();
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [motionSub, setMotionSub] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [lastChallengeId, setLastChallengeId] = useState(null); // Track last challenge shown
  const [geofenceStatus, setGeofenceStatus] = useState(null);

  useEffect(() => {
    fetchActiveSession();
    
    // Set up notifications
    registerForPushNotificationsAsync();
    
    // Listen for notifications when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const { challengeId, attendanceId, wordLength, maxAttempts } = notification.request.content.data;
      if (challengeId && attendanceId) {
        navigation.navigate('WordleChallenge', {
          challengeId,
          attendanceId,
          wordLength,
          maxAttempts,
        });
      }
    });

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const { challengeId, attendanceId, wordLength, maxAttempts } = response.notification.request.content.data;
      if (challengeId && attendanceId) {
        navigation.navigate('WordleChallenge', {
          challengeId,
          attendanceId,
          wordLength,
          maxAttempts,
        });
      }
    });

    return () => {
      if (motionSub) {
        motionSub.remove();
      }
      if (notificationListener.current?.remove) {
        notificationListener.current.remove();
      }
      if (responseListener.current?.remove) {
        responseListener.current.remove();
      }
    };
  }, [navigation, motionSub]);

  // Periodically refresh location while a session is active (e.g. every 60 seconds)
  useEffect(() => {
    if (!session?.attendanceId) {
      return;
    }

    const id = setInterval(() => {
      // this updates currentLocation + status and is also used for debugging
      readCurrentLocation();
    }, 60000); // 60 seconds

    return () => clearInterval(id);
  }, [session?.attendanceId]);

  // Live location/geofence polling before attendance starts
  useEffect(() => {
    if (session?.attendanceId) {
      return;
    }
    if (locationStatus !== 'granted') {
      return;
    }

    const id = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentLocation(loc.coords);
        await checkGeofenceStatus(loc.coords);
      } catch (e) {
        // ignore polling errors
      }
    }, 15000); // every 15 seconds

    return () => clearInterval(id);
  }, [session?.attendanceId, locationStatus]);

  // Periodic suspicion check (every 20-30 minutes) while session is active
  useEffect(() => {
    if (!session?.attendanceId) {
      return;
    }

    // Check immediately, then every 25 minutes
    const checkSuspicion = async () => {
      try {
        const res = await api.post('/attendance/check-suspicion', {
          attendanceId: session.attendanceId,
        });

        const { suspicionAnalysis, challenge } = res.data.data;

        if (challenge && challenge.success && challenge.challengeType === 'wordle') {
          // Only show notification if this is a new challenge (different from last one)
          if (challenge.challengeId !== lastChallengeId) {
            setLastChallengeId(challenge.challengeId);
            
            // Show notification
            await scheduleLocalNotification(
              'Take a quick brain break ✨',
              'Play a short puzzle to keep your session active.',
              {
                challengeId: challenge.challengeId,
                attendanceId: session.attendanceId,
                wordLength: challenge.challengeData?.wordLength || 4,
                maxAttempts: challenge.challengeData?.maxAttempts || 4,
              }
            );

            // Save to local list for Notifications tab
            await saveLocalNotificationEntry({
              id: challenge.challengeId,
              title: 'Take a quick brain break ✨',
              body: 'Play a short puzzle to keep your session active.',
              timestamp: Date.now(),
              data: {
                challengeId: challenge.challengeId,
                attendanceId: session.attendanceId,
                wordLength: challenge.challengeData?.wordLength || 4,
                maxAttempts: challenge.challengeData?.maxAttempts || 4,
              },
            });

            // Also navigate directly if app is open
            navigation.navigate('WordleChallenge', {
              challengeId: challenge.challengeId,
              attendanceId: session.attendanceId,
              wordLength: challenge.challengeData?.wordLength || 4,
              maxAttempts: challenge.challengeData?.maxAttempts || 4,
            });
          }
        }
      } catch (e) {
        // Ignore errors for periodic checks
        console.log('Suspicion check error:', e.message);
      }
    };

    // Initial check after 2 minutes (to avoid immediate checks)
    const initialTimeout = setTimeout(() => {
      checkSuspicion();
    }, 2 * 60 * 1000); // 2 minutes

    // Then check every 25 minutes
    const intervalId = setInterval(() => {
      checkSuspicion();
    }, 25 * 60 * 1000); // 25 minutes

      return () => {
        clearTimeout(initialTimeout);
        clearInterval(intervalId);
      };
    }, [session?.attendanceId, navigation, lastChallengeId]);

  const fetchActiveSession = async () => {
    try {
      setCheckingSession(true);
      const res = await api.get('/attendance/active-session');
      if (res.status === 200 && res.data?.data) {
        // If we already have this session running, do not restart motion sampling
        if (session?.attendanceId !== res.data.data.attendanceId) {
          setSession(res.data.data);
          startMotionValidation(res.data.data.attendanceId);
        } else {
          setSession(res.data.data);
        }
      } else {
        setSession(null);
      }
    } catch (e) {
      // 204 or error -> no active session
      setSession(null);
    } finally {
      setCheckingSession(false);
    }
  };

  // Reset challenge tracker when session ends or changes
  useEffect(() => {
    if (!session) {
      setLastChallengeId(null);
    }
  }, [session]);

  // Listen for navigation focus to reset challenge tracker after returning from Wordle screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      // When returning to Home screen, check if challenge was completed
      // If session status is "confirmed", reset tracker to allow new challenges
      if (session?.attendanceId) {
        try {
          const res = await api.get('/attendance/active-session');
          if (res.status === 200 && res.data?.data) {
            const activeSession = res.data.data;
            // If session is confirmed, reset challenge tracker to allow next challenge
            if (activeSession.status === 'confirmed') {
              setLastChallengeId(null);
            }
            // Update session state
            setSession(activeSession);
          }
        } catch (e) {
          // Ignore errors
        }
      }
    });

    return unsubscribe;
  }, [navigation, session?.attendanceId]);

  const readCurrentLocation = async () => {
    try {
      setLocationStatus('requesting');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        Alert.alert('Permission required', 'Location permission is needed to mark attendance.');
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation(loc.coords);
      setLocationStatus('granted');
      await checkGeofenceStatus(loc.coords);
      return loc;
    } catch (e) {
      setLocationStatus('error');
      return null;
    }
  };

  const checkGeofenceStatus = async (coords) => {
    try {
      const res = await api.post('/attendance/geofence-status', {
        lat: coords.latitude,
        lng: coords.longitude,
      });
      setGeofenceStatus(res.data.data);
    } catch (e) {
      // ignore for now
    }
  };

  const handleStartAttendance = async () => {
    try {
      setLoading(true);
      const loc = await readCurrentLocation();
      if (!loc) {
        setLoading(false);
        return;
      }
      const res = await api.post('/attendance/start', {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });

      const data = res.data.data;
      setSession({
        attendanceId: data.attendanceId,
        status: data.status,
        startTime: data.startTime,
        validationScore: data.validationScore || 0,
        location: data.location,
      });
      startMotionValidation(data.attendanceId);
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        (e.response?.data?.error === 'OUTSIDE_GEOFENCE'
          ? 'You are outside the office geofence.'
          : 'Failed to start attendance');
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const startMotionValidation = async (attendanceId) => {
    // basic polling of motion sensors, not continuous stream
    const accelData = { x: 0, y: 0, z: 0 };
    const gyroData = { x: 0, y: 0, z: 0 };

    Accelerometer.setUpdateInterval(1000);
    Gyroscope.setUpdateInterval(1000);

    // Clear any previous subscriptions/intervals before starting new ones
    if (motionSub && motionSub.remove) {
      motionSub.remove();
    }

    const accelSub = Accelerometer.addListener((data) => {
      accelData.x = data.x;
      accelData.y = data.y;
      accelData.z = data.z;
    });

    const gyroSub = Gyroscope.addListener((data) => {
      gyroData.x = data.x;
      gyroData.y = data.y;
      gyroData.z = data.z;
    });

    setMotionSub({
      remove: () => {
        accelSub && accelSub.remove();
        gyroSub && gyroSub.remove();
        clearInterval(intervalId);
      },
    });

    // every 30 seconds, send snapshot
    const intervalId = setInterval(async () => {
      try {
        if (!attendanceId) return;
        console.log('Motion snapshot being sent', { gyro: gyroData, accel: accelData });
        const res = await api.post('/attendance/validate', {
          attendanceId,
          gyro: gyroData,
          accel: accelData,
        });
        const d = res.data.data;
        setSession((prev) =>
          prev
            ? {
                ...prev,
                status: d.attendanceStatus,
                validationScore: d.validationScore,
              }
            : prev
        );
      } catch (e) {
        // ignore single failures
      }
    }, 30000);

    // attach interval cleanup
    setMotionSub({
      remove: () => {
        accelSub && accelSub.remove();
        gyroSub && gyroSub.remove();
        clearInterval(intervalId);
      },
      intervalId,
    });
  };

  const handleEndAttendance = async () => {
    if (!session?.attendanceId) return;
    try {
      setLoading(true);
      await api.post('/attendance/end', { attendanceId: session.attendanceId });
      if (motionSub) {
        motionSub.remove();
      }
      Alert.alert('Success', 'Attendance session ended.');
      setSession(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to end attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Live presence</Text>
      <Text style={styles.subtitle}>
        {geofenceStatus
          ? geofenceStatus.isWithin
            ? 'You are inside the office geofence.'
            : 'You are currently outside the office area.'
          : 'We use your location to check if you are at the office.'}
      </Text>

      {/* Geofence status card */}
      <View
        style={[
          styles.statusCard,
          geofenceStatus
            ? geofenceStatus.isWithin
              ? styles.statusCardInside
              : styles.statusCardOutside
            : styles.statusCardIdle,
        ]}
      >
        <View style={styles.statusHeader}>
          <View
            style={[
              styles.statusPill,
              geofenceStatus
                ? geofenceStatus.isWithin
                  ? styles.statusPillInside
                  : styles.statusPillOutside
                : styles.statusPillIdle,
            ]}
          >
            <Text style={styles.statusPillText}>
              {geofenceStatus
                ? geofenceStatus.isWithin
                  ? 'INSIDE OFFICE'
                  : 'OUTSIDE OFFICE'
                : 'LOCATION'}
            </Text>
          </View>
          {currentLocation && (
            <Text style={styles.statusCoords}>
              {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </Text>
          )}
        </View>
        <Text style={styles.statusDistance}>
          {geofenceStatus
            ? geofenceStatus.distance != null
              ? geofenceStatus.isWithin
                ? `~${Math.max(0, Math.round(geofenceStatus.distance))} m from office center`
                : `~${Math.round(geofenceStatus.distance)} m away from office`
              : 'Distance not available'
            : locationStatus === 'requesting'
            ? 'Checking your location...'
            : 'Tap refresh to update your location.'}
        </Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={readCurrentLocation}
          disabled={locationStatus === 'requesting'}
        >
          <Text style={styles.refreshText}>
            {locationStatus === 'requesting' ? 'Updating location…' : 'Refresh location'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Session status card */}
      {checkingSession ? (
        <View style={styles.infoCard}>
          <ActivityIndicator color="#22c55e" />
          <Text style={styles.infoText}>Checking active session...</Text>
        </View>
      ) : session ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>
            Session status:{' '}
            <Text style={styles.infoValue}>{session.status}</Text>
          </Text>
          <Text style={styles.infoLabel}>
            Started at:{' '}
            <Text style={styles.infoValue}>
              {new Date(session.startTime).toLocaleTimeString()}
            </Text>
          </Text>
          <Text style={styles.infoLabel}>
            Validation score:{' '}
            <Text style={styles.infoValue}>{session.validationScore ?? 0}</Text>
          </Text>
        </View>
      ) : null}

      {!session ? (
        <TouchableOpacity
          style={[
            styles.button,
            styles.primary,
            geofenceStatus && !geofenceStatus.isWithin && styles.buttonDisabled,
          ]}
          onPress={handleStartAttendance}
          disabled={
            loading ||
            (geofenceStatus && geofenceStatus.isWithin === false) ||
            locationStatus !== 'granted'
          }
        >
          <Text style={styles.buttonText}>
            {loading
              ? 'Starting...'
              : geofenceStatus && geofenceStatus.isWithin === false
              ? 'Move closer to office to start'
              : 'Start Attendance'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.secondary]}
          onPress={handleEndAttendance}
          disabled={loading}
        >
          <Text style={styles.buttonSecondaryText}>{loading ? 'Ending...' : 'End Attendance'}</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 18,
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusCardInside: {
    backgroundColor: '#022c22',
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  statusCardOutside: {
    backgroundColor: '#2b0b0b',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  statusCardIdle: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillInside: {
    backgroundColor: '#22c55e33',
  },
  statusPillOutside: {
    backgroundColor: '#f9731633',
  },
  statusPillIdle: {
    backgroundColor: '#4b556333',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#e5e7eb',
  },
  statusCoords: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusDistance: {
    fontSize: 14,
    color: '#e5e7eb',
    marginBottom: 12,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  refreshText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 12,
  },
  primary: {
    backgroundColor: '#22c55e',
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  buttonText: {
    color: '#022c22',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSecondaryText: {
    color: '#e5e7eb',
    fontWeight: '500',
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    color: '#9ca3af',
    marginTop: 8,
  },
  infoLabel: {
    color: '#9ca3af',
    marginBottom: 4,
  },
  infoValue: {
    color: '#e5e7eb',
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#4b5563',
  },
  smallButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
});


