import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Initialize MapLibre inside component to be safe

// Custom dark style using free OSM tiles
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
      paint: { 'background-color': '#1e293b' }
    },
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-opacity': 0.7,
        'raster-brightness-min': 0.2,
        'raster-brightness-max': 0.5,
        'raster-contrast': 0.3,
        'raster-saturation': -0.4
      }
    }
  ]
};

export function MapLibreMap({
  currentLocation,
  geofenceStatus,
  officeGeofence,
  onRequestLocation,
  onMapInteractionChange
}) {
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    MapLibreGL.setConnected(true);
  }, []);

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

  const geofenceCenter = getGeofenceCenter();
  const initialCenter = currentLocation
    ? [currentLocation.longitude, currentLocation.latitude]
    : geofenceCenter || [77.2090, 28.6139];

  // Center on user location
  const centerOnLocation = async () => {
    console.log('Center button pressed', { currentLocation });

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
  const getGeofenceGeoJSON = () => {
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
  };

  const geofenceGeoJSON = getGeofenceGeoJSON();
  const fillColor = geofenceStatus?.isWithin ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  const strokeColor = geofenceStatus?.isWithin ? '#22c55e' : '#ef4444';

  return (
    <View style={getContainerStyle(geofenceStatus, officeGeofence)}>
      <View style={styles.mapContainer}>
        <MapLibreGL.MapView
          ref={mapRef}
          style={styles.map}
          styleJSON={JSON.stringify(DARK_STYLE)}
          logoEnabled={false}
          attributionEnabled={false}
          onDidFinishLoadingMap={() => setIsReady(true)}
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
              {/* Outer pulse ring */}
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
                    circleRadius: 15,
                    circleColor: geofenceStatus?.isWithin
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                    circleStrokeColor: geofenceStatus?.isWithin
                      ? 'rgba(9, 24, 15, 0.4)'
                      : 'rgba(239, 68, 68, 0.4)',
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
                    circleRadius: 6,
                    circleColor: geofenceStatus?.isWithin ? '#05170bff' : '#ef4444',
                    circleStrokeColor: '#ffffff',
                    circleStrokeWidth: 2
                  }}
                />
              </MapLibreGL.ShapeSource>
            </>
          )}
        </MapLibreGL.MapView>

        {/* Center Button */}
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
