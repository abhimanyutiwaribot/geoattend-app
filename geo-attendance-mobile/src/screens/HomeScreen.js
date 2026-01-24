import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';

// Custom Hooks
import { useLocationTracking, useLocationPolling, useGeofenceMonitoring } from '../hooks/useLocation';
import { useAttendanceSession, useMotionValidation } from '../hooks/useSession';
import { useNotifications, useSuspicionCheck } from '../hooks/useNotifications';
import { useOfficeGeofence } from '../hooks/useOfficeGeofence';

// Components
import { GeofenceStatusCard } from '../components/GeofenceStatusCard';
import { SessionInfoCard } from '../components/SessionInfoCard';
import { AttendanceButton } from '../components/AttendanceButton';
import { AttendanceMap } from '../components/AttendanceMap';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [geofenceStatus, setGeofenceStatus] = useState(null);

  // Custom hooks
  const {
    currentLocation,
    setCurrentLocation,
    locationStatus,
    setLocationStatus,
    lastLocationRef,
    readCurrentLocation
  } = useLocationTracking();

  const {
    session,
    setSession,
    checkingSession,
    loading,
    fetchActiveSession,
    startAttendance,
    endAttendance
  } = useAttendanceSession();

  const { motionSub, startMotionValidation, stopMotionValidation } = useMotionValidation();

  // Fetch office geofence from backend
  const { geofence: officeGeofence } = useOfficeGeofence();

  // Geofence status checker
  const checkGeofenceStatus = async (coords) => {
    try {
      const res = await api.post('/attendance/geofence-status', {
        lat: coords.latitude,
        lng: coords.longitude,
      });
      if (res.data?.data) {
        setGeofenceStatus(res.data.data);
        return res.data.data.isWithin;
      }
      return null;
    } catch (e) {
      console.log('Geofence check error:', e.message);
      return null;
    }
  };

  // Handle end attendance with cleanup
  const handleEndAttendance = async () => {
    if (!session?.attendanceId) return;
    try {
      await endAttendance(session.attendanceId);
      stopMotionValidation();

      // Reset geofence tracking
      setOutsideGeofenceSince(null);
      setHasShownWarning(false);

      Alert.alert('Success', 'Attendance session ended.');
      setSession(null);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Geofence monitoring
  const {
    outsideGeofenceSince,
    setOutsideGeofenceSince,
    hasShownWarning,
    setHasShownWarning
  } = useGeofenceMonitoring({
    session,
    readCurrentLocation,
    checkGeofenceStatus,
    handleEndAttendance
  });

  // Location polling before session starts
  useLocationPolling({
    session,
    locationStatus,
    setLocationStatus,
    setCurrentLocation,
    lastLocationRef,
    checkGeofenceStatus
  });

  // Notifications
  useNotifications(navigation);

  // Suspicion checking
  useSuspicionCheck({ session, navigation });

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      const activeSession = await fetchActiveSession();
      if (activeSession) {
        setSession(activeSession);
        startMotionValidation(activeSession.attendanceId, setSession);
      }
    };
    initSession();
  }, []);

  // Cleanup motion subscription on unmount
  useEffect(() => {
    return () => {
      if (motionSub) {
        stopMotionValidation();
      }
    };
  }, [motionSub]);

  // Handle start attendance
  const handleStartAttendance = async () => {
    // Validate location with server before starting attendance
    const loc = await readCurrentLocation(true); // Pass true to enable server validation
    if (!loc) return;

    try {
      const data = await startAttendance(loc.coords.latitude, loc.coords.longitude);
      setSession({
        attendanceId: data.attendanceId,
        status: data.status,
        startTime: data.startTime,
        validationScore: data.validationScore || 0,
        location: data.location,
      });
      startMotionValidation(data.attendanceId, setSession);
    } catch (e) {
      Alert.alert('Error', e.message);
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

      <AttendanceMap
        currentLocation={currentLocation}
        geofenceStatus={geofenceStatus}
        officeGeofence={officeGeofence}
      />

      <GeofenceStatusCard
        geofenceStatus={geofenceStatus}
        currentLocation={currentLocation}
        locationStatus={locationStatus}
        onRefresh={readCurrentLocation}
      />

      <SessionInfoCard
        session={session}
        checkingSession={checkingSession}
      />

      <AttendanceButton
        session={session}
        loading={loading}
        geofenceStatus={geofenceStatus}
        locationStatus={locationStatus}
        onStart={handleStartAttendance}
        onEnd={handleEndAttendance}
      />
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
});
