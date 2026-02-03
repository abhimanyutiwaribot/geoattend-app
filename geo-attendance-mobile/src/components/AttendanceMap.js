import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import MapView, { Circle, Polygon, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function AttendanceMap({
  currentLocation,
  geofenceStatus,
  officeGeofence,
  onRequestLocation,
  onMapInteractionChange
}) {
  const mapRef = useRef(null);
  const regionRef = useRef(null);

  // Calculate center for polygon geofences
  const getGeofenceCenter = () => {
    if (!officeGeofence) {
      // No geofence loaded yet, use current location or fallback
      return null;
    }

    if (officeGeofence.type === 'polygon' && officeGeofence.polygon && officeGeofence.polygon.length > 0) {
      const latSum = officeGeofence.polygon.reduce((sum, p) => sum + p.lat, 0);
      const lngSum = officeGeofence.polygon.reduce((sum, p) => sum + p.lng, 0);
      return {
        lat: latSum / officeGeofence.polygon.length,
        lng: lngSum / officeGeofence.polygon.length
      };
    }

    return officeGeofence.center || null;
  };

  const geofenceCenter = useMemo(() => getGeofenceCenter(), [officeGeofence]);

  const initialRegion = useMemo(() => {
    // Priority: current location > geofence center > default fallback
    const lat = currentLocation?.latitude || geofenceCenter?.lat || 28.6139;
    const lng = currentLocation?.longitude || geofenceCenter?.lng || 77.2090;

    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
  }, []);

  // Initialize regionRef
  useEffect(() => {
    if (!regionRef.current) {
      regionRef.current = initialRegion;
    }
  }, []);

  // Update marker position without auto-centering (unless it's the first location)
  const isFirstLocation = useRef(true);
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      // Only auto-center on first location update
      if (isFirstLocation.current) {
        mapRef.current.animateToRegion({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
        isFirstLocation.current = false;
      }
      // Otherwise just update the marker (no camera movement)
    }
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const onRegionChangeComplete = (region) => {
    regionRef.current = region;
  };

  const centerOnLocation = async () => {
    console.log('Center button pressed', { currentLocation });

    // If no current location, try to fetch it first
    if (!currentLocation && onRequestLocation) {
      console.log('Fetching current location...');
      try {
        const location = await onRequestLocation(false, true);
        if (!location || !location.coords) {
          console.log('Failed to get location');
          return;
        }
        console.log('Location fetched:', location.coords.latitude, location.coords.longitude);

        // Center on the newly fetched location
        if (mapRef.current) {
          setTimeout(() => {
            mapRef.current.animateToRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: regionRef.current?.latitudeDelta || 0.005,
              longitudeDelta: regionRef.current?.longitudeDelta || 0.005,
            }, 800);
          }, 300);
        }
        return;
      } catch (error) {
        console.error('Error fetching location:', error);
        return;
      }
    }

    if (!currentLocation) {
      console.log('No current location available');
      return;
    }

    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: regionRef.current?.latitudeDelta || 0.005,
        longitudeDelta: regionRef.current?.longitudeDelta || 0.005,
      }, 800);
      console.log('Map centered to:', currentLocation.latitude, currentLocation.longitude);
    }
  };

  return (
    <View style={getContainerStyle(geofenceStatus, officeGeofence)}>
      {/* Inner container to maintain rounded corners */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={initialRegion}
          onRegionChangeComplete={onRegionChangeComplete}
          onTouchStart={() => onMapInteractionChange?.(true)}
          onTouchEnd={() => onMapInteractionChange?.(false)}
          onPanDrag={() => onMapInteractionChange?.(true)}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          rotateEnabled={false}
          pitchEnabled={false}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          {/* Office Geofence - Circle or Polygon - Only show if loaded from backend */}
          {officeGeofence && (
            <>
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
              ) : officeGeofence.center && officeGeofence.radius ? (
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
              ) : null}
            </>
          )}

          {/* User Location - Pulsing Circle */}
          {currentLocation && (
            <>
              {/* Outer pulse ring */}
              <Circle
                center={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                radius={10} // 10 meters radius for pulse
                fillColor={
                  geofenceStatus?.isWithin
                    ? 'rgba(34, 197, 94, 0.15)' // Green with low opacity
                    : 'rgba(239, 68, 68, 0.15)' // Red with low opacity
                }
                strokeColor={
                  geofenceStatus?.isWithin
                    ? 'rgba(9, 24, 15, 0.4)' // Green
                    : 'rgba(239, 68, 68, 0.4)' // Red
                }
                strokeWidth={2}
              />
              {/* Inner solid dot */}
              <Circle
                center={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                radius={3} // 3 meters radius for dot
                fillColor={
                  geofenceStatus?.isWithin
                    ? '#05170bff' // Solid green
                    : '#ef4444' // Solid red
                }
                strokeColor="#ffffff"
                strokeWidth={1}
              />
            </>
          )}
        </MapView>

        {/* Center on Location Button */}
        <TouchableOpacity
          style={styles.centerButton}
          onPress={centerOnLocation}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#e5e7eb" />
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden', // Keeps map corners rounded
  },
  map: {
    flex: 1,
  },
  centerButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#1e293b',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

// Dynamic container style with enhanced glow effect
const getContainerStyle = (geofenceStatus, officeGeofence) => {
  // Determine glow color based on geofence status
  let glowColor;

  if (!officeGeofence) {
    // No geofence assigned - neutral gray glow
    glowColor = '#64748b';
  } else if (geofenceStatus?.isWithin) {
    // Inside geofence - green glow
    glowColor = '#08f15eff';
  } else {
    // Outside geofence - red glow
    glowColor = '#f13535ff';
  }

  return {
    height: 460,
    width: '100%',
    borderRadius: 16,
    overflow: 'visible', // Allow glow to be visible
    marginBottom: 32, // Extra space for glow
    // Enhanced multi-layer shadow for intense, diffused glow effect
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, // Very high opacity for strong glow
    shadowRadius: 50, // Large radius for wide diffusion
    elevation: 30, // High elevation for Android
  };
};

