import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export function GeofenceStatusCard({
  geofenceStatus,
  currentLocation,
  locationStatus,
  onRefresh
}) {
  return (
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
          ? geofenceStatus.distance != null && !isNaN(geofenceStatus.distance)
            ? geofenceStatus.isWithin
              ? `~${Math.max(0, Math.round(geofenceStatus.distance))} m from office center`
              : `~${Math.round(geofenceStatus.distance)} m away from office`
            : geofenceStatus.error
              ? 'Unable to check distance'
              : 'Checking distance...'
          : locationStatus === 'requesting'
            ? 'Checking your location...'
            : 'Tap refresh to update your location.'}
      </Text>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={onRefresh}
        disabled={locationStatus === 'requesting'}
      >
        <Text style={styles.refreshText}>
          {locationStatus === 'requesting' ? 'Updating location…' : 'Refresh location'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
