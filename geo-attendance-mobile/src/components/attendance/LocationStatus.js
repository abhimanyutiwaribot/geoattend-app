// src/components/attendance/LocationStatus.js
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import StatusCard from '../common/StatusCard';

const LocationStatus = ({ location, loading, error }) => {
  if (loading) {
    return (
      <StatusCard
        icon="🔄"
        title="Checking Location"
        status="Getting your current location..."
      />
    );
  }

  if (error) {
    return (
      <StatusCard
        icon="❌"
        title="Location Error"
        status={error}
      />
    );
  }

  if (!location) {
    return (
      <StatusCard
        icon="📍"
        title="Location Required"
        status="Enable location services to continue"
      />
    );
  }

  const { geofenceStatus, state } = location;
  const { isWithin, distance } = geofenceStatus;

  const getStatusConfig = () => {
    switch (state) {
      case 'AWAY':
        return {
          icon: '🏠',
          title: 'Away from Office',
          status: `You're ${distance}m from office`,
          isActive: false,
        };
      case 'APPROACHING':
        return {
          icon: '🚶‍♂️',
          title: 'Approaching Office',
          status: `You're ${distance}m away - getting closer!`,
          isActive: false,
        };
      case 'IN_OFFICE':
        return {
          icon: '🏢',
          title: 'In Office Area',
          status: `You're within office area (${distance}m)`,
          isActive: true,
        };
      case 'ACTIVE_SESSION':
        return {
          icon: '✅',
          title: 'Active Session',
          status: 'Attendance session in progress',
          isActive: true,
        };
      default:
        return {
          icon: '📍',
          title: 'Checking Location',
          status: 'Determining your status...',
          isActive: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <StatusCard
      icon={config.icon}
      title={config.title}
      status={config.status}
      distance={distance}
      isActive={config.isActive}
    />
  );
};

export default LocationStatus;