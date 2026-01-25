import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Circle, Polygon, Marker } from 'react-native-maps';

export function AttendanceMap({
  currentLocation,
  geofenceStatus,
  officeGeofence = { type: 'circle', center: { lat: 28.6139, lng: 77.2090 }, radius: 100 }
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

  // Calculate center for polygon geofences
  const getGeofenceCenter = () => {
    if (officeGeofence.type === 'polygon' && officeGeofence.polygon && officeGeofence.polygon.length > 0) {
      const latSum = officeGeofence.polygon.reduce((sum, p) => sum + p.lat, 0);
      const lngSum = officeGeofence.polygon.reduce((sum, p) => sum + p.lng, 0);
      return {
        lat: latSum / officeGeofence.polygon.length,
        lng: lngSum / officeGeofence.polygon.length
      };
    }
    return officeGeofence.center || { lat: 28.6139, lng: 77.2090 };
  };

  const geofenceCenter = getGeofenceCenter();

  const initialRegion = {
    latitude: currentLocation?.latitude || geofenceCenter.lat,
    longitude: currentLocation?.longitude || geofenceCenter.lng,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <MapView
      ref={mapRef}
      // No provider specified = uses platform default
      // Android: Google Maps (requires API key)
      // iOS: Apple Maps (free, no API key)
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={true}
      rotateEnabled={false}
      pitchEnabled={false}
    >
      {/* Office Geofence - Circle or Polygon */}
      {officeGeofence.type === 'polygon' && officeGeofence.polygon ? (
        <Polygon
          coordinates={officeGeofence.polygon.map(p => ({
            latitude: p.lat,
            longitude: p.lng
          }))}
          fillColor={geofenceStatus?.isWithin ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
          strokeColor={geofenceStatus?.isWithin ? '#22c55e' : '#ef4444'}
          strokeWidth={2}
        />
      ) : (
        <Circle
          center={{
            latitude: officeGeofence.center?.lat || 28.6139,
            longitude: officeGeofence.center?.lng || 77.2090,
          }}
          radius={officeGeofence.radius || 100}
          fillColor={geofenceStatus?.isWithin ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
          strokeColor={geofenceStatus?.isWithin ? '#22c55e' : '#ef4444'}
          strokeWidth={2}
        />
      )}

      {/* Office Center Marker */}
      <Marker
        coordinate={{
          latitude: geofenceCenter.lat,
          longitude: geofenceCenter.lng,
        }}
        title="Office"
        description={officeGeofence.name || "Geofence Center"}
        pinColor="#3b82f6"
      />

      {/* User Location Marker */}
      {currentLocation && (
        <Marker
          coordinate={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          }}
          title="Your Location"
          description={geofenceStatus?.isWithin ? 'Inside Office' : 'Outside Office'}
          pinColor={geofenceStatus?.isWithin ? '#22c55e' : '#ef4444'}
        />
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
