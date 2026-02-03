import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';

// Custom Hooks - EVENT-DRIVEN ARCHITECTURE
import { useEventDrivenLocation } from '../hooks/useEventDrivenLocation';
import { useAttendanceBusinessLogic } from '../services/attendanceBusinessLogic';
import { useAttendanceSession, useMotionValidation } from '../hooks/useSession';
import { useNotifications, useSuspicionCheck } from '../hooks/useNotifications';
import { useOfficeGeofence } from '../hooks/useOfficeGeofence';
import { useDeviceActivity } from '../hooks/useDeviceActivity';

// Components
import { SessionInfoCard } from '../components/SessionInfoCard';
import { AttendanceButton } from '../components/AttendanceButton';
import { AttendanceMap } from '../components/AttendanceMap';


export default function HomeScreen() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [isInteractingWithMap, setIsInteractingWithMap] = useState(false);

  // Session management
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

  // EVENT-DRIVEN LOCATION TRACKING (NEW!)
  const {
    currentLocation,
    geofenceStatus,
    locationPermission: locationStatus,
    requestCurrentLocation,
    pipeline
  } = useEventDrivenLocation({
    session,
    officeGeofence
  });

  // Business logic (auto-warnings, auto-checkout) - EVENT-DRIVEN
  useAttendanceBusinessLogic({
    session,
    pipeline
  });

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

  // Notifications
  useNotifications(navigation);

  // Device Activity Tracking
  const { logActivity } = useDeviceActivity(session);

  // Suspicion checking
  useSuspicionCheck({ session, navigation });

  // Initialize session and location on mount
  useEffect(() => {
    const initApp = async () => {
      // 1. Check for active attendance session
      const activeSession = await fetchActiveSession();
      if (activeSession) {
        setSession(activeSession);
        startMotionValidation(activeSession.attendanceId, setSession);
      }

      // 2. Get initial location to center the map immediately
      // This ensures the map doesn't stay stuck on default coordinates
      await readCurrentLocation(false, false); // highAccuracy=false for fast initial fix
    };
    initApp();
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

      // 2. Refresh location (event-driven system handles geofence automatically)
      await requestCurrentLocation();
    } catch (e) {
      console.log('Refresh error:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle start attendance
  const handleStartAttendance = async () => {
    // Request current location
    const loc = await requestCurrentLocation();
    if (!loc) {
      Alert.alert('Error', 'Unable to get your location. Please try again.');
      return;
    }

    // Check if within geofence
    if (!geofenceStatus?.isWithin) {
      Alert.alert('Error', 'You must be inside the office area to start attendance.');
      return;
    }

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
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            enabled={!isInteractingWithMap}
            tintColor="#22c55e"
            colors={['#22c55e']}
          />
        }
      >
        <Text style={styles.title}>Live presence</Text>
        <Text style={styles.subtitle}>
          {!officeGeofence
            ? 'No office geofence assigned. Contact your administrator to set up attendance tracking.'
            : geofenceStatus
              ? geofenceStatus.isWithin
                ? 'You are inside the office geofence.'
                : 'You are currently outside the office area.'
              : 'We use your location to check if you are at the office.'}
        </Text>


        <AttendanceMap
          currentLocation={currentLocation}
          geofenceStatus={geofenceStatus}
          officeGeofence={officeGeofence}
          onRequestLocation={requestCurrentLocation}
          onMapInteractionChange={setIsInteractingWithMap}
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
