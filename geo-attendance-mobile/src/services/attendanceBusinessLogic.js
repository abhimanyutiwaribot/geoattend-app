/**
 * BUSINESS LOGIC SERVICE
 * 
 * Reacts to geofence transition events
 * Handles: warnings, auto-checkout, notifications
 */

import { Alert } from 'react-native';
import { api } from '../api/client';

export class AttendanceBusinessLogic {
  constructor(config = {}) {
    this.maxOutsideTime = config.maxOutsideTime || 300000; // 5 minutes default
    this.warningTime = config.warningTime || 180000; // 3 minutes default

    this.outsideTimer = null;
    this.warningTimer = null;
    this.hasShownWarning = false;
    this.session = null;
  }

  /**
   * Set current session
   */
  setSession(session) {
    this.session = session;
  }

  /**
   * Handle geofence ENTRY event
   */
  async onEntry(geofenceStatus) {
    console.log('✅ [BusinessLogic] User entered office area');

    // Clear any pending timers
    this.clearTimers();
    this.hasShownWarning = false;

    // Log entry event
    if (this.session?.attendanceId) {
      try {
        await api.post('/attendance/log-event', {
          attendanceId: this.session.attendanceId,
          eventType: 'GEOFENCE_ENTRY',
          location: {
            latitude: geofenceStatus.location?.coords.latitude,
            longitude: geofenceStatus.location?.coords.longitude
          },
          distance: geofenceStatus.distance
        });
      } catch (error) {
        console.error('Error logging entry event:', error);
      }
    }

    // Business logic: Allow check-in, reset warnings, etc.
    return {
      action: 'ENTRY',
      allowCheckIn: true,
      message: 'Welcome back to the office!'
    };
  }

  /**
   * Handle geofence EXIT event
   */
  async onExit(geofenceStatus) {
    console.log('⚠️ [BusinessLogic] User left office area');

    // Log exit event
    if (this.session?.attendanceId) {
      try {
        await api.post('/attendance/log-event', {
          attendanceId: this.session.attendanceId,
          eventType: 'GEOFENCE_EXIT',
          location: {
            latitude: geofenceStatus.location?.coords.latitude,
            longitude: geofenceStatus.location?.coords.longitude
          },
          distance: geofenceStatus.distance
        });
      } catch (error) {
        console.error('Error logging exit event:', error);
      }
    }

    // Start warning timer
    this.warningTimer = setTimeout(() => {
      this.showWarning();
    }, this.warningTime);

    // Start auto-checkout timer
    this.outsideTimer = setTimeout(() => {
      this.autoCheckout();
    }, this.maxOutsideTime);

    return {
      action: 'EXIT',
      message: 'You have left the office area'
    };
  }

  /**
   * Show warning to user
   */
  showWarning() {
    if (this.hasShownWarning) return;

    this.hasShownWarning = true;
    const remainingTime = Math.floor((this.maxOutsideTime - this.warningTime) / 1000 / 60);

    console.log(`⚠️ [BusinessLogic] Showing warning - ${remainingTime} minutes remaining`);

    Alert.alert(
      'Return to Office',
      `You have been outside the office area for ${Math.floor(this.warningTime / 1000 / 60)} minutes. Please return within ${remainingTime} minutes or your attendance will be automatically ended.`,
      [{ text: 'OK' }]
    );
  }

  /**
   * Auto-checkout user
   */
  async autoCheckout() {
    console.log('🔴 [BusinessLogic] Auto-checkout triggered');

    Alert.alert(
      'Attendance Ended',
      'You have been outside the office area for too long. Your attendance has been automatically ended.',
      [{ text: 'OK' }]
    );

    // End attendance session
    if (this.session?.attendanceId) {
      try {
        await api.post('/attendance/end', {
          attendanceId: this.session.attendanceId,
          reason: 'AUTO_CHECKOUT_GEOFENCE'
        });
      } catch (error) {
        console.error('Error ending attendance:', error);
      }
    }

    this.clearTimers();
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.outsideTimer) {
      clearTimeout(this.outsideTimer);
      this.outsideTimer = null;
    }
  }

  /**
   * Reset business logic state
   */
  reset() {
    this.clearTimers();
    this.hasShownWarning = false;
    this.session = null;
  }
}

/**
 * Hook to use business logic with event-driven location
 */
import { useEffect, useRef } from 'react';

export function useAttendanceBusinessLogic({ session, pipeline }) {
  const businessLogicRef = useRef(null);

  useEffect(() => {
    // Initialize business logic
    businessLogicRef.current = new AttendanceBusinessLogic({
      maxOutsideTime: 300000,  // 5 minutes
      warningTime: 180000      // 3 minutes
    });

    return () => {
      businessLogicRef.current?.reset();
    };
  }, []);

  // Update session
  useEffect(() => {
    businessLogicRef.current?.setSession(session);
  }, [session]);

  // Subscribe to geofence transitions
  useEffect(() => {
    if (!pipeline) return;

    const unsubscribe = pipeline.onGeofenceTransition(async (eventType, geofenceStatus) => {
      if (eventType === 'ENTRY') {
        await businessLogicRef.current?.onEntry(geofenceStatus);
      } else if (eventType === 'EXIT') {
        await businessLogicRef.current?.onExit(geofenceStatus);
      }
    });

    return unsubscribe;
  }, [pipeline]);

  return businessLogicRef.current;
}
