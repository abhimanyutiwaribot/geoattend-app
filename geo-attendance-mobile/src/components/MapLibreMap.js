import React, { useRef, useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Dimensions } from 'react-native';
import {
  MapView,
  Camera,
  UserLocation,
  ShapeSource,
  FillLayer,
  LineLayer,
  Logger,
  setConnected
} from '@maplibre/maplibre-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');


const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;

// Initialize MapLibre Engine
setConnected(true);


Logger.setLogCallback(log => {
  if (log.message.includes('Canceled') || log.tag === 'Mbgl-HttpRequest') {
    return true; // Return true to suppress
  }
  return false;
});

export function MapLibreMap({
  currentLocation,
  geofenceStatus,
  officeGeofence,
  onRequestLocation,
  onMapInteractionChange,
  fullScreen = false
}) {
  const { colors, isDark } = useTheme();
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  const currentStyleURL = isDark
    ? `https://api.maptiler.com/maps/streets-v4-dark/style.json?key=${MAPTILER_KEY}`
    : `https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}`;

  const initialCenter = useMemo(() => {
    if (currentLocation) return [currentLocation.longitude, currentLocation.latitude];
    return [77.2090, 28.6139];
  }, []);

  const centerOnLocation = () => {
    if (cameraRef.current) {
      const target = currentLocation ? [currentLocation.longitude, currentLocation.latitude] : [77.2090, 28.6139];
      cameraRef.current.setCamera({
        centerCoordinate: target,
        zoomLevel: 17,
        pitch: 0, // Flat 2D View
        animationDuration: 1200
      });
    }
  };

  const geofenceGeoJSON = useMemo(() => {
    if (!officeGeofence || !officeGeofence.center) return null;
    const center = officeGeofence.center;
    const radius = officeGeofence.radius || 100;
    const points = 64;
    const coords = [];
    const dX = radius / (111320 * Math.cos((center.lat * Math.PI) / 180));
    const dY = radius / 110540;
    for (let i = 0; i <= points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      coords.push([center.lng + dX * Math.cos(theta), center.lat + dY * Math.sin(theta)]);
    }
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } };
  }, [officeGeofence]);

  const glowColor = geofenceStatus?.isWithin ? '#22c55e' : '#ef4444';

  return (
    <View style={[styles.container, { height: fullScreen ? '100%' : 460 }]}>
      <MapView
        key={`map-v10-prod-${isDark}`}
        ref={mapRef}
        style={styles.map}
        mapStyle={currentStyleURL}
        styleURL={currentStyleURL}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        onDidFinishLoadingMap={() => setIsReady(true)}
      >
        <Camera
          ref={cameraRef}
          zoomLevel={15}
          pitch={0}
          centerCoordinate={initialCenter}
        />

        <UserLocation
          visible={true}
          animated={true}
          showsUserHeadingIndicator={false}
        />

        {geofenceGeoJSON && (
          <ShapeSource id="gf" shape={geofenceGeoJSON}>
            <FillLayer id="gf-fill" style={{ fillColor: glowColor, fillOpacity: 0.2 }} />
            <LineLayer id="gf-line" style={{ lineColor: glowColor, lineWidth: 3 }} />
          </ShapeSource>
        )}
      </MapView>

      <TouchableOpacity
        style={[styles.centerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={centerOnLocation}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', overflow: 'hidden', borderRadius: 20 },
  map: { flex: 1 },
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
