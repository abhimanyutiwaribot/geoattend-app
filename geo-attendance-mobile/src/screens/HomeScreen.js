import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';

// Custom Hooks
import { useLocationTracking, useUnifiedLocationTracking } from '../hooks/useLocation2';
import { useAttendanceSession, useMotionValidation } from '../hooks/useSession';
import { useNotifications, useSuspicionCheck } from '../hooks/useNotifications';
import { useOfficeGeofence } from '../hooks/useOfficeGeofence';
import { useDeviceActivity } from '../hooks/useDeviceActivity';

// Components
import { GeofenceStatusCard } from '../components/GeofenceStatusCard';
import { SessionInfoCard } from '../components/SessionInfoCard';
import { AttendanceButton } from '../components/AttendanceButton';
import { AttendanceMapLeaflet as AttendanceMap } from '../components/AttendanceMapLeaflet';


export default function HomeScreen() {
  const navigation = useNavigation();
  const [geofenceStatus, setGeofenceStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Location tracking hook
  const {
    currentLocation,
    setCurrentLocation,
    locationStatus,
    setLocationStatus,
    lastLocationRef,
    lastUpdateTime,
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
      Alert.alert('Success', 'Attendance session ended.');
      setSession(null);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Unified location tracking (replaces old geofence monitoring + location polling)
  const { outsideGeofenceSince, hasShownWarning } = useUnifiedLocationTracking({
    session,
    locationStatus,
    setLocationStatus,
    setCurrentLocation,
    lastLocationRef,
    lastUpdateTime,
    checkGeofenceStatus,
    handleEndAttendance
  });

  // Notifications
  useNotifications(navigation);

  // Device Activity Tracking
  const { logActivity } = useDeviceActivity(session);

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

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // 1. Refresh session
      const activeSession = await fetchActiveSession();
      if (activeSession) {
        setSession(activeSession);
      } else {
        setSession(null);
      }

      // 2. Refresh location and geofence
      const loc = await readCurrentLocation(false, true); // high accuracy
      if (loc) {
        await checkGeofenceStatus(loc.coords);
      }
    } catch (e) {
      console.log('Refresh error:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle start attendance
  const handleStartAttendance = async () => {
    // Use HIGH accuracy for starting attendance (critical operation)
    const loc = await readCurrentLocation(true, true); // validateWithServer=true, highAccuracy=true
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22c55e"
            colors={['#22c55e']}
          />
        }
      >
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
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
