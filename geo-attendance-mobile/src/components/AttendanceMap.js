import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import MapView, { Circle, Polygon, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Dark mode map style for Google Maps (Stark Vercel Dark)
const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#0a0a0a" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#888888" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#000000" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#333333" }] },
  { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#ededed" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#ededed" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#666666" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#111111" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#222222" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#0a0a0a" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#111111" }] }
];

// Light mode map style (Stark Vercel Light)
const lightMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#666666" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#eaeaea" }] }
];

export function AttendanceMap({
  currentLocation,
  geofenceStatus,
  officeGeofence,
  onRequestLocation,
  onMapInteractionChange,
  fullScreen = false
}) {
  const { colors, isDark } = useTheme();
  const mapRef = useRef(null);
  const regionRef = useRef(null);

  // Calculate center for polygon geofences
  const getGeofenceCenter = () => {
    if (!officeGeofence) return null;
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
    if (!regionRef.current) regionRef.current = initialRegion;
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
    if (!currentLocation && onRequestLocation) {
      try {
        const location = await onRequestLocation(false, true);
        if (!location || !location.coords) return;
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

    if (!currentLocation) return;

    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: regionRef.current?.latitudeDelta || 0.005,
        longitudeDelta: regionRef.current?.longitudeDelta || 0.005,
      }, 800);
    }
  };

  return (
    <View style={fullScreen ? styles.fullScreenContainer : getContainerStyle(geofenceStatus, officeGeofence, colors, isDark)}>
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
          rotateEnabled={true}
          pitchEnabled={true}
          customMapStyle={isDark ? darkMapStyle : lightMapStyle}
        >
          {officeGeofence && (
            <>
              {officeGeofence.type === 'polygon' && officeGeofence.polygon ? (
                <Polygon
                  coordinates={officeGeofence.polygon.map(p => ({
                    latitude: p.lat,
                    longitude: p.lng
                  }))}
                  fillColor={geofenceStatus?.isWithin ? colors.primarySoft : colors.dangerSoft}
                  strokeColor={geofenceStatus?.isWithin ? colors.primary : colors.danger}
                  strokeWidth={2}
                />
              ) : officeGeofence.center && officeGeofence.radius ? (
                <Circle
                  center={{
                    latitude: officeGeofence.center.lat,
                    longitude: officeGeofence.center.lng,
                  }}
                  radius={officeGeofence.radius}
                  fillColor={geofenceStatus?.isWithin ? colors.primarySoft : colors.dangerSoft}
                  strokeColor={geofenceStatus?.isWithin ? colors.primary : colors.danger}
                  strokeWidth={2}
                />
              ) : null}
            </>
          )}

          {currentLocation && (
            <>
              <Circle
                center={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                radius={10}
                fillColor={geofenceStatus?.isWithin ? colors.primarySoft : colors.dangerSoft}
                strokeColor={geofenceStatus?.isWithin ? colors.primary : colors.danger}
                strokeWidth={1}
              />
              <Circle
                center={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                radius={3}
                fillColor={geofenceStatus?.isWithin ? colors.primary : colors.danger}
                strokeColor={colors.surface}
                strokeWidth={1}
              />
            </>
          )}
        </MapView>

        <TouchableOpacity
          style={[styles.centerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={centerOnLocation}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    width: '100%',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  centerButton: {
    position: 'absolute',
    bottom: 128,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

const getContainerStyle = (geofenceStatus, officeGeofence, colors, isDark) => {
  let glowColor;
  if (!officeGeofence) {
    glowColor = isDark ? '#222' : '#eaeaea';
  } else if (geofenceStatus?.isWithin) {
    glowColor = isDark ? '#ffffff' : '#000000';
  } else {
    glowColor = colors.danger;
  }

  return {
    height: 460,
    width: '100%',
    borderRadius: 16,
    overflow: 'visible',
    marginBottom: 32,
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  };
};
