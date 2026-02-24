import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions, Animated, PanResponder, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

// Custom Hooks - EVENT-DRIVEN ARCHITECTURE
import { useEventDrivenLocation } from '../hooks/useEventDrivenLocation';
import { useAttendanceBusinessLogic } from '../services/attendanceBusinessLogic';
import { useAttendanceSession, useMotionValidation } from '../hooks/useSession';
import { useOfficeGeofence } from '../hooks/useOfficeGeofence';
import { useNotifications } from '../hooks/useNotifications';
import { useDeviceActivity } from '../hooks/useDeviceActivity';
import { usePassiveIdentity } from '../hooks/usePassiveIdentity';
import { useTheme } from '../context/ThemeContext';

// Components
import { SessionInfoCard } from '../components/SessionInfoCard';
import { AttendanceButton } from '../components/AttendanceButton';
import { AttendanceMap } from '../components/AttendanceMap';
// import { MapLibreMap } from '../components/MapLibreMap'; // MapLibre (Free)
import { FaceVerificationModal } from '../components/FaceVerificationModal';


export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [isInteractingWithMap, setIsInteractingWithMap] = useState(false);
  const [isFaceModalVisible, setIsFaceModalVisible] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [onLeaveToday, setOnLeaveToday] = useState(null);

  // --- INTERACTIVE DRAWER LOGIC ---
  const drawerHeight = useRef(new Animated.Value(0)).current; // 0 = minimized, 1 = expanded
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleDrawer = () => {
    Animated.spring(drawerHeight, {
      toValue: isExpanded ? 0 : 1,
      useNativeDriver: false,
      tension: 60, // Snappier
      friction: 10,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        // Simple drag logic
        if (gesture.dy < -20 && !isExpanded) toggleDrawer();
        if (gesture.dy > 20 && isExpanded) toggleDrawer();
      },
      onPanResponderRelease: () => { },
    })
  ).current;

  const animatedCardStyle = {
    height: drawerHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [60, 260],
    }),
    width: drawerHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [60, width - 36],
    }),
    borderRadius: drawerHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [30, 24],
    }),
    left: drawerHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [width - 80, 18], // Move to right side (width - size - margin)
    }),
    bottom: 120,
    opacity: drawerHeight.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [1, 0.95, 1], // Subtle flicker-free transition
    }),
  };
  // --------------------------------
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

  // SYNC LOCATION TO BACKEND (Every 30s or 15m delta as per OS config)
  useEffect(() => {
    if (!pipeline || !session?.attendanceId) return;

    const unsubscribe = pipeline.onLocationUpdate(async (event) => {
      try {
        await api.post('/attendance/location/log', {
          lat: event.location.coords.latitude,
          lng: event.location.coords.longitude,
          accuracy: event.location.coords.accuracy,
          metadata: {
            speed: event.location.coords.speed,
            altitude: event.location.coords.altitude,
            isMock: event.location.coords.mocked
          }
        });
        console.log('📡 [Sync] Location synced to backend');
      } catch (err) {
        console.error('❌ [Sync] Location sync failed:', err.message);
      }
    });

    return unsubscribe;
  }, [pipeline, session?.attendanceId]);

  // Handle end attendance with cleanup
  const handleEndAttendance = async () => {
    if (!session?.attendanceId) return;

    Alert.alert(
      'End Attendance',
      'Choose your checkout type:',
      [
        {
          text: 'Standard Checkout',
          onPress: async () => {
            try {
              await endAttendance(session.attendanceId, { exitReason: 'manual' });
              stopMotionValidation();
              Alert.alert('Success', 'Attendance session ended.');
              setSession(null);
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        },
        {
          text: '🚑 Emergency Exit',
          style: 'destructive',
          onPress: async () => {
            try {
              await endAttendance(session.attendanceId, {
                exitReason: 'emergency',
                remarks: 'User triggered emergency exit from mobile app'
              });
              stopMotionValidation();
              Alert.alert('Emergency Recorded', 'Your session has been ended and an emergency leave request has been submitted to Admin.');
              setSession(null);
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  // Notifications
  useNotifications(navigation);

  // Device Activity Tracking
  const { logActivity } = useDeviceActivity(session);

  // Passive Identity Verification (Phase 4.4)
  usePassiveIdentity(session);

  // Initialize session and location on mount
  useEffect(() => {
    const initApp = async () => {
      // 1. Check for active attendance session
      const activeSession = await fetchActiveSession();
      if (activeSession) {
        setSession(activeSession);
        startMotionValidation(activeSession.attendanceId, setSession);
      }

      // 2. Refresh location (event-driven system handles geofence automatically)
      await requestCurrentLocation(false, false); // highAccuracy=false for fast initial fix

      // 3. Check for leave status
      fetchLeaveStatus();
    };
    initApp();
  }, []);

  const fetchLeaveStatus = async () => {
    try {
      const res = await api.get('/leaves/my-requests');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeLeave = res.data.data.find(l =>
        l.status === 'approved' &&
        new Date(l.startDate) <= new Date() &&
        new Date(l.endDate) >= today
      );
      setOnLeaveToday(activeLeave);
    } catch (e) {
      console.log('Error fetching leave status:', e.message);
    }
  };

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

    console.log('🎭 Opening Face Verification Modal');
    setPendingLocation(loc);
    setIsFaceModalVisible(true);
  };

  /**
   * Called after 2s face scan completes successfully
   */
  const handleFaceVerified = async (embedding) => {
    console.log('✅ Face verified, closing modal and starting attendance');
    setIsFaceModalVisible(false);

    if (!pendingLocation) {
      console.error('❌ No pending location found');
      return;
    }

    try {
      const data = await startAttendance(
        pendingLocation.coords.latitude,
        pendingLocation.coords.longitude,
        embedding
      );
      setSession({
        attendanceId: data.attendanceId,
        status: data.status,
        startTime: data.startTime,
        validationScore: data.validationScore || 0,
        location: data.location,
      });
      startMotionValidation(data.attendanceId, setSession);
      setPendingLocation(null);
    } catch (e) {
      Alert.alert('Identity Gate Error', e.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AttendanceMap
        currentLocation={currentLocation}
        geofenceStatus={geofenceStatus}
        officeGeofence={officeGeofence}
        onRequestLocation={requestCurrentLocation}
        onMapInteractionChange={setIsInteractingWithMap}
        fullScreen={true}
      />

      {/* Top Floating Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={[styles.profileCircle, { backgroundColor: colors.pill, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={[styles.statusPill, { backgroundColor: colors.pill, borderColor: colors.border }]}>
          <View style={[
            styles.statusDot,
            { backgroundColor: geofenceStatus?.isWithin ? colors.primary : colors.danger }
          ]} />
          <Text style={[styles.statusText, { color: colors.text }]}>
            {geofenceStatus?.isWithin ? 'At Office' : 'Outside Office'}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.pill, borderColor: colors.border }]}
            onPress={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh" size={22} color={colors.text} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.pill, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Leave Banner Overlay */}
      {onLeaveToday && (
        <View style={[styles.floatingLeaveBanner, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.9)' : 'rgba(255, 255, 255, 0.95)', borderColor: isDark ? 'transparent' : colors.border, borderWidth: isDark ? 0 : 1 }]}>
          <Ionicons name="airplane" size={18} color={isDark ? "#ffffff" : colors.textMuted} />
          <Text style={[styles.leaveText, { color: isDark ? "#ffffff" : colors.text }]}>On Leave: {onLeaveToday.type}</Text>
        </View>
      )}

      {/* Bottom Action Card (Icon -> Compact Drawer) */}
      <Animated.View
        style={[
          styles.bottomCard,
          animatedCardStyle,
          {
            backgroundColor: colors.pill,
            borderColor: colors.border
          }
        ]}
        {...panResponder.panHandlers}
      >
        {!isExpanded && !checkingSession ? (
          <TouchableOpacity
            style={styles.minimizedIconButton}
            onPress={toggleDrawer}
          >
            <Ionicons
              name={session ? "pulse-outline" : "finger-print-outline"}
              size={30}
              color="#22c55e"
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.expandedContent}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleDrawer}
              style={styles.dragArea}
            >
              <View style={[styles.compactDragHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)' }]} />
            </TouchableOpacity>

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
          </View>
        )}
      </Animated.View>

      <FaceVerificationModal
        visible={isFaceModalVisible}
        onVerify={handleFaceVerified}
        onCancel={() => {
          setIsFaceModalVisible(false);
          setPendingLocation(null);
        }}
      />
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '600',
  },
  floatingLeaveBanner: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    gap: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  leaveText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomCard: {
    position: 'absolute',
    borderWidth: 1,
    zIndex: 100,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimizedIconButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedContent: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  dragArea: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  compactDragHandle: {
    width: 32,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    marginBottom: 4,
  },
});
