import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { api } from '../api/client';

/**
 * Custom hook for tracking device activity
 * Logs app foreground/background events and batches them for efficient syncing
 */
export function useDeviceActivity(session) {
  const appState = useRef(AppState.currentState);
  const activityQueue = useRef([]);
  const lastSync = useRef(Date.now());
  const foregroundStartTime = useRef(null);

  // Batch activities and sync every 5 minutes or when queue is full
  const syncActivities = async () => {
    if (activityQueue.current.length === 0) return;

    try {
      await api.post('/attendance/activity/batch', {
        activities: activityQueue.current
      });

      console.log(`Synced ${activityQueue.current.length} activities`);
      activityQueue.current = [];
      lastSync.current = Date.now();
    } catch (e) {
      console.log('Activity sync failed:', e.message);
      // Keep activities in queue for retry
    }
  };

  const logActivity = (activityType, metadata = {}) => {
    if (!session?.attendanceId) return;

    activityQueue.current.push({
      attendanceId: session.attendanceId,
      activityType,
      timestamp: new Date().toISOString(),
      metadata
    });

    // Sync if queue is large (10 items) or 5 min passed
    if (activityQueue.current.length >= 10 ||
      Date.now() - lastSync.current > 5 * 60 * 1000) {
      syncActivities();
    }
  };

  useEffect(() => {
    if (!session?.attendanceId) return;

    // Track app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        foregroundStartTime.current = Date.now();
        logActivity('app_foreground');
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App went to background
        const duration = foregroundStartTime.current
          ? (Date.now() - foregroundStartTime.current) / 1000
          : 0;

        logActivity('app_background', { duration });
        foregroundStartTime.current = null;
      }

      appState.current = nextAppState;
    });

    // Periodic sync every 5 minutes
    const syncInterval = setInterval(syncActivities, 5 * 60 * 1000);

    // Initial foreground log
    if (appState.current === 'active') {
      foregroundStartTime.current = Date.now();
      logActivity('app_foreground');
    }

    return () => {
      subscription?.remove();
      clearInterval(syncInterval);
      syncActivities(); // Final sync on unmount
    };
  }, [session?.attendanceId]);

  return { logActivity };
}
