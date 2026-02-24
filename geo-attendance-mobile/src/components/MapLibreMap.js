import React, { useRef, useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// Initialize MapLibre
MapLibreGL.setConnected(true);

// Custom styles using free OSM tiles
const DARK_STYLE = {
  version: 8,
  name: 'Dark',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0f172a' }
    },
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-opacity': 0.4,
        'raster-brightness-min': 0,
        'raster-brightness-max': 0.3,
        'raster-contrast': 0.2,
        'raster-saturation': -0.6
      }
    }
  ]
};

const LIGHT_STYLE = {
  version: 8,
  name: 'Light',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#f8fafc' }
    },
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-opacity': 0.8,
        'raster-saturation': -0.2
      }
    }
  ]
};

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

  // Use the appropriate style based on theme
  const mapStyle = isDark ? DARK_STYLE : LIGHT_STYLE;

  // Calculate geofence center
  const getGeofenceCenter = () => {
    if (!officeGeofence) return null;

    if (officeGeofence.type === 'polygon' && officeGeofence.polygon?.length > 0) {
      const latSum = officeGeofence.polygon.reduce((sum, p) => sum + p.lat, 0);
      const lngSum = officeGeofence.polygon.reduce((sum, p) => sum + p.lng, 0);
      return [
        lngSum / officeGeofence.polygon.length,
        latSum / officeGeofence.polygon.length
      ];
    }

    return officeGeofence.center ? [officeGeofence.center.lng, officeGeofence.center.lat] : null;
  };

  const geofenceCenter = useMemo(() => getGeofenceCenter(), [officeGeofence]);

  const initialCenter = useMemo(() => {
    if (currentLocation) return [currentLocation.longitude, currentLocation.latitude];
    return geofenceCenter || [77.2090, 28.6139];
  }, []);

  // Center on user location
  const centerOnLocation = async () => {
    if (!currentLocation && onRequestLocation) {
      try {
        const location = await onRequestLocation(false, true);
        if (location?.coords && cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [location.coords.longitude, location.coords.latitude],
            zoomLevel: 16,
            animationDuration: 800
          });
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      }
      return;
    }

    if (currentLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
        zoomLevel: 16,
        animationDuration: 800
      });
    }
  };

  // Create geofence circle GeoJSON
  const createCircleGeoJSON = (center, radiusInMeters) => {
    const points = 64;
    const coords = [];
    const distanceX = radiusInMeters / (111320 * Math.cos((center.lat * Math.PI) / 180));
    const distanceY = radiusInMeters / 110540;

    for (let i = 0; i <= points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      coords.push([center.lng + x, center.lat + y]);
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      }
    };
  };

  // Get geofence GeoJSON
  const geofenceGeoJSON = useMemo(() => {
    if (!officeGeofence) return null;

    if (officeGeofence.type === 'polygon' && officeGeofence.polygon) {
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [officeGeofence.polygon.map(p => [p.lng, p.lat])]
        }
      };
    }

    if (officeGeofence.center && officeGeofence.radius) {
      return createCircleGeoJSON(officeGeofence.center, officeGeofence.radius);
    }

    return null;
  }, [officeGeofence]);

  const fillColor = geofenceStatus?.isWithin ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  const strokeColor = geofenceStatus?.isWithin ? '#22c55e' : '#ef4444';

  const containerStyle = fullScreen ? styles.fullScreenContainer : getContainerStyle(geofenceStatus, officeGeofence);

  return (
    <View style={containerStyle}>
      <View style={styles.mapContainer}>
        <MapLibreGL.MapView
          ref={mapRef}
          style={styles.map}
          styleJSON={JSON.stringify(mapStyle)}
          logoEnabled={false}
          attributionEnabled={false}
          onDidFinishLoadingMap={() => setIsReady(true)}
          onPress={() => onMapInteractionChange?.(false)}
        >
          <MapLibreGL.Camera
            ref={cameraRef}
            zoomLevel={16}
            centerCoordinate={initialCenter}
            animationDuration={0}
          />

          {/* Geofence Layer */}
          {geofenceGeoJSON && (
            <MapLibreGL.ShapeSource id="geofence" shape={geofenceGeoJSON}>
              <MapLibreGL.FillLayer
                id="geofence-fill"
                style={{
                  fillColor: fillColor,
                  fillOpacity: 1
                }}
              />
              <MapLibreGL.LineLayer
                id="geofence-line"
                style={{
                  lineColor: strokeColor,
                  lineWidth: 2
                }}
              />
            </MapLibreGL.ShapeSource>
          )}

          {/* User Location Marker */}
          {currentLocation && (
            <>
              {/* Outer ring */}
              <MapLibreGL.ShapeSource
                id="location-pulse"
                shape={{
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [currentLocation.longitude, currentLocation.latitude]
                  }
                }}
              >
                <MapLibreGL.CircleLayer
                  id="location-pulse-circle"
                  style={{
                    circleRadius: 10,
                    circleColor: geofenceStatus?.isWithin
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                    circleStrokeColor: geofenceStatus?.isWithin
                      ? 'rgba(9, 24, 15, 0.4)'
                      : 'rgba(255, 255, 255, 0.4)',
                    circleStrokeWidth: 2
                  }}
                />
              </MapLibreGL.ShapeSource>

              {/* Inner dot */}
              <MapLibreGL.ShapeSource
                id="location-dot"
                shape={{
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [currentLocation.longitude, currentLocation.latitude]
                  }
                }}
              >
                <MapLibreGL.CircleLayer
                  id="location-dot-circle"
                  style={{
                    circleRadius: 4,
                    circleColor: geofenceStatus?.isWithin ? (isDark ? '#05170bff' : '#22c55e') : '#ef4444',
                    circleStrokeColor: '#ffffff',
                    circleStrokeWidth: 1.5
                  }}
                />
              </MapLibreGL.ShapeSource>
            </>
          )}
        </MapLibreGL.MapView>

        {/* Center Button */}
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
    bottom: 20,
    right: 20,
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
