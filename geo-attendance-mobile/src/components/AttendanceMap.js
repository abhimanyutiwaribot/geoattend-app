import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export function AttendanceMap({
  currentLocation,
  geofenceStatus,
  officeGeofence = { center: { lat: 28.6139, lng: 77.2090 }, radius: 100 }
}) {
  const mapRef = useRef(null);

  // Center map on user location when it updates
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
  }, [currentLocation]);

  const initialRegion = {
    latitude: currentLocation?.latitude || officeGeofence.center.lat,
    longitude: currentLocation?.longitude || officeGeofence.center.lng,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation={false} // We'll use custom marker
      showsMyLocationButton={false}
      showsCompass={true}
      rotateEnabled={false}
      pitchEnabled={false}
    >
      {/* Office Geofence Circle */}
      <Circle
        center={{
          latitude: officeGeofence.center.lat,
          longitude: officeGeofence.center.lng,
        }}
        radius={officeGeofence.radius}
        fillColor={geofenceStatus?.isWithin ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
        strokeColor={geofenceStatus?.isWithin ? '#22c55e' : '#ef4444'}
        strokeWidth={2}
      />

      {/* Office Center Marker */}
      <Marker
        coordinate={{
          latitude: officeGeofence.center.lat,
          longitude: officeGeofence.center.lng,
        }}
        title="Office"
        description="Geofence Center"
        pinColor="#3b82f6"
      />

      {/* User Location Marker */}
      {currentLocation && (
        <>
          {/* GPS Accuracy Circle */}
          {currentLocation.accuracy && (
            <Circle
              center={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              radius={currentLocation.accuracy}
              fillColor="rgba(59, 130, 246, 0.2)"
              strokeColor="rgba(59, 130, 246, 0.4)"
              strokeWidth={1}
            />
          )}

          {/* User Position Marker */}
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Your Location"
            description={geofenceStatus?.isWithin ? 'Inside Office' : 'Outside Office'}
            pinColor={geofenceStatus?.isWithin ? '#22c55e' : '#ef4444'}
          />
        </>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 300,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
});
