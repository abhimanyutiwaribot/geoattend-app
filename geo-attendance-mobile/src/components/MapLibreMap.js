import React, { useRef, useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import {
  MapView,
  Camera,
  ShapeSource,
  FillLayer,
  LineLayer,
  CircleLayer,
  Logger,
  setConnected
} from '@maplibre/maplibre-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;

// Initialize MapLibre Engine
setConnected(true);

Logger.setLogCallback(log => {
  if (log.message.includes('Canceled') || log.tag === 'Mbgl-HttpRequest') {
    return true; // suppress noisy logs
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
  const isFirstLocation = useRef(true);
  // Tracks if the user has manually touched/panned the map.
  // If true, the auto-fly to first GPS location is cancelled.
  const hasUserInteracted = useRef(false);

  const currentStyleURL = isDark
    ? `https://api.maptiler.com/maps/streets-v4-dark/style.json?key=${MAPTILER_KEY}`
    : `https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}`;

  // --- 1. Geofence center calculation (matches AttendanceMap exactly) ---
  const geofenceCenter = useMemo(() => {
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
  }, [officeGeofence]);

  // --- 2. Initial center: currentLocation FIRST, then geofenceCenter, then Delhi ---
  //        (matches AttendanceMap's initialRegion priority)
  //        Empty deps [] so it's computed once at mount — same as AttendanceMap
  const initialCenter = useMemo(() => {
    const lng = currentLocation?.longitude ?? geofenceCenter?.lng ?? 77.2090;
    const lat = currentLocation?.latitude ?? geofenceCenter?.lat ?? 28.6139;
    return [lng, lat];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 3. Animate to user location only on FIRST location update (matches AttendanceMap) ---
  useEffect(() => {
    if (currentLocation && cameraRef.current && isReady) {
      if (isFirstLocation.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
          zoomLevel: 17,
          animationDuration: 1000,
        });
        isFirstLocation.current = false;
      }
    }
  }, [currentLocation?.latitude, currentLocation?.longitude, isReady]);

  // --- 4. Center button handler — includes onRequestLocation fallback (matches AttendanceMap) ---
  const centerOnLocation = async () => {
    if (!currentLocation && onRequestLocation) {
      try {
        const location = await onRequestLocation(false, true);
        if (!location || !location.coords) return;
        if (cameraRef.current) {
          setTimeout(() => {
            cameraRef.current.setCamera({
              centerCoordinate: [location.coords.longitude, location.coords.latitude],
              zoomLevel: 17,
              animationDuration: 800,
            });
          }, 300);
        }
        return;
      } catch (error) {
        console.error('Error fetching location:', error);
        return;
      }
    }

    if (!currentLocation) return;

    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
        zoomLevel: 17,
        animationDuration: 800,
      });
    }
  };

  // --- 5. Geofence GeoJSON (polygon or manually approximated circle) ---
  const geofenceGeoJSON = useMemo(() => {
    if (!officeGeofence) return null;

    if (officeGeofence.type === 'polygon' && officeGeofence.polygon?.length >= 3) {
      const coords = officeGeofence.polygon.map(p => [p.lng, p.lat]);
      // GeoJSON polygons must be closed
      if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
        coords.push(coords[0]);
      }
      return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } };
    }

    if (officeGeofence.type === 'circle' && officeGeofence.center) {
      const center = officeGeofence.center;
      const radius = officeGeofence.radius || 100;
      const points = 64;
      const coords = [];

      // Fixed: use == null check (not falsy) so coordinate value 0 doesn't break it
      if (center.lng == null || center.lat == null) return null;

      const dX = radius / (111320 * Math.cos((center.lat * Math.PI) / 180));
      const dY = radius / 110540;
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        coords.push([center.lng + dX * Math.cos(theta), center.lat + dY * Math.sin(theta)]);
      }
      return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } };
    }

    return null;
  }, [officeGeofence]);

  // --- 6. Custom user location GeoJSON (replaces <UserLocation>, adds dynamic color dot) ---
  const userLocationGeoJSON = useMemo(() => {
    if (!currentLocation) return null;
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [currentLocation.longitude, currentLocation.latitude],
      },
    };
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  // Derived colors (matches AttendanceMap's dot rendering colors)
  const glowColor = geofenceStatus?.isWithin ? '#22c55e' : '#ef4444';
  const dotFillColor = geofenceStatus?.isWithin ? (isDark ? '#05170bff' : '#22c55e') : '#ef4444';
  const haloFillColor = geofenceStatus?.isWithin ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)';
  const haloStrokeClr = geofenceStatus?.isWithin ? 'rgba(9, 24, 15, 0.4)' : 'rgba(255, 255, 255, 0.4)';

  // --- Container style (matches AttendanceMap's getContainerStyle glow shadow) ---
  const containerStyle = fullScreen
    ? styles.fullScreenContainer
    : getContainerStyle(geofenceStatus, officeGeofence);

  return (
    <View style={containerStyle}>
      <MapView
        key={`map-v10-prod-${isDark}`}
        ref={mapRef}
        style={styles.map}
        mapStyle={currentStyleURL}
        styleURL={currentStyleURL}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
        zoomEnabled={true}
        scrollEnabled={true}
        onRegionIsChanging={(feature) => {
          // Only respond to real user gestures, not programmatic setCamera calls
          if (feature?.properties?.isUserInteraction) {
            onMapInteractionChange?.(true);
            // User touched the map — cancel any pending auto-fly to GPS location
            if (!hasUserInteracted.current) {
              hasUserInteracted.current = true;
              isFirstLocation.current = false;
            }
          }
        }}
        onRegionDidChange={(feature) => {
          // Only respond to real user gestures
          if (feature?.properties?.isUserInteraction) {
            onMapInteractionChange?.(false);
          }
        }}
        onDidFinishLoadingMap={() => {
          setIsReady(true);
          cameraRef.current?.setCamera({
            centerCoordinate: initialCenter,
            zoomLevel: 15,
            pitch: 0,
            animationDuration: 0,
          });
        }}
      >
        {/* Camera has NO positioning props — fully imperative to prevent any snap-back */}
        <Camera ref={cameraRef} />

        {/* Geofence overlay */}
        {geofenceGeoJSON && (
          <ShapeSource id="gf" shape={geofenceGeoJSON}>
            <FillLayer id="gf-fill" style={{ fillColor: glowColor, fillOpacity: 0.2 }} />
            <LineLayer id="gf-line" style={{ lineColor: glowColor, lineWidth: 2 }} />
          </ShapeSource>
        )}

        {/* Custom user dot — halo ring (matches AttendanceMap outer Circle radius=10) */}
        {userLocationGeoJSON && (
          <ShapeSource id="user-halo" shape={userLocationGeoJSON}>
            <CircleLayer
              id="user-halo-layer"
              style={{
                circleRadius: 18,
                circleColor: haloFillColor,
                circleStrokeColor: haloStrokeClr,
                circleStrokeWidth: 2,
              }}
            />
          </ShapeSource>
        )}

        {/* Custom user dot — solid inner dot (matches AttendanceMap inner Circle radius=3) */}
        {userLocationGeoJSON && (
          <ShapeSource id="user-dot" shape={userLocationGeoJSON}>
            <CircleLayer
              id="user-dot-layer"
              style={{
                circleRadius: 6,
                circleColor: dotFillColor,
                circleStrokeColor: '#ffffff',
                circleStrokeWidth: 1,
              }}
            />
          </ShapeSource>
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
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    width: '100%',
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

// Matches AttendanceMap's getContainerStyle — dynamic glowing shadow based on geofence status
const getContainerStyle = (geofenceStatus, officeGeofence) => {
  let glowColor;
  if (!officeGeofence) {
    glowColor = '#64748b';
  } else if (geofenceStatus?.isWithin) {
    glowColor = '#22c55e';
  } else {
    glowColor = '#ef4444';
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
