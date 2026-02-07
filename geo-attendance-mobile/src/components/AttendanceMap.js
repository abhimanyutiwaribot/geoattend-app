import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import MapView, { Circle, Polygon, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Dark mode map style for Google Maps
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#1e293b" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#94a3b8" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#020617" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{ "color": "#475569" }]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#cbd5e1" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#e2e8f0" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#64748b" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#0f172a" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#475569" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#334155" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#1e293b" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#475569" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#1e293b" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#cbd5e1" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#0f172a" }]
  },
  {
    "featureType": "transit.station",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#64748b" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#0c4a6e" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#475569" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#020617" }]
  }
];

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
    const lat = currentLocation?.latitude || geofenceCenter?.lat || 28.6139;
    const lng = currentLocation?.longitude || geofenceCenter?.lng || 77.2090;

    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
  }, []);

  useEffect(() => {
    if (!regionRef.current) {
      regionRef.current = initialRegion;
    }
  }, []);

  const isFirstLocation = useRef(true);
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      if (isFirstLocation.current) {
        mapRef.current.animateToRegion({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
        isFirstLocation.current = false;
      }
    }
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const onRegionChangeComplete = (region) => {
    regionRef.current = region;
  };

  const centerOnLocation = async () => {
    console.log('Center button pressed', { currentLocation });

    if (!currentLocation && onRequestLocation) {
      console.log('Fetching current location...');
      try {
        const location = await onRequestLocation(false, true);
        if (!location || !location.coords) {
          console.log('Failed to get location');
          return;
        }
        console.log('Location fetched:', location.coords.latitude, location.coords.longitude);

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
          customMapStyle={darkMapStyle}
        >

          {/* Office Geofence - Circle or Polygon */}
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
                radius={10}
                fillColor={
                  geofenceStatus?.isWithin
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)'
                }
                strokeColor={
                  geofenceStatus?.isWithin
                    ? 'rgba(9, 24, 15, 0.4)'
                    : 'rgba(239, 68, 68, 0.4)'
                }
                strokeWidth={2}
              />
              {/* Inner solid dot */}
              <Circle
                center={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                radius={3}
                fillColor={
                  geofenceStatus?.isWithin
                    ? '#05170bff'
                    : '#ef4444'
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
    overflow: 'hidden',
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
  attribution: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

const getContainerStyle = (geofenceStatus, officeGeofence) => {
  let glowColor;

  if (!officeGeofence) {
    glowColor = '#64748b';
  } else if (geofenceStatus?.isWithin) {
    glowColor = '#08f15eff';
  } else {
    glowColor = '#f13535ff';
  }

  return {
    height: 460,
    width: '100%',
    borderRadius: 16,
    overflow: 'visible',
    marginBottom: 32,
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 30,
  };
};
