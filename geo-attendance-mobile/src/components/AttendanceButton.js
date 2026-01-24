import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';

export function AttendanceButton({
  session,
  loading,
  geofenceStatus,
  locationStatus,
  onStart,
  onEnd
}) {
  if (!session) {
    return (
      <TouchableOpacity
        style={[
          styles.button,
          styles.primary,
          geofenceStatus && !geofenceStatus.isWithin && styles.buttonDisabled,
        ]}
        onPress={onStart}
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
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, styles.secondary]}
      onPress={onEnd}
      disabled={loading}
    >
      <Text style={styles.buttonSecondaryText}>
        {loading ? 'Ending...' : 'End Attendance'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  buttonDisabled: {
    backgroundColor: '#4b5563',
  },
});
