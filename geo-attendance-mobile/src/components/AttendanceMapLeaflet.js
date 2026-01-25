import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export function AttendanceMapLeaflet({
  currentLocation,
  geofenceStatus,
  officeGeofence = { type: 'circle', center: { lat: 28.6139, lng: 77.2090 }, radius: 100 }
}) {
  const webViewRef = useRef(null);
  const isReady = useRef(false);

  // Memoize the base HTML to prevent WebView reloads
  // We only reload if the office geofence itself changes
  const htmlContent = useMemo(() => {
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

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
    html, body { height: 100%; width: 100%; overflow: hidden; touch-action: none; }
    #map { height: 100vh; width: 100vw; touch-action: pan-x pan-y; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    document.body.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });

    const map = L.map('map', {
      zoomControl: true, attributionControl: false, dragging: true, touchZoom: true,
      zoomSnap: 0.5, zoomDelta: 0.5
    }).setView([${geofenceCenter.lat}, ${geofenceCenter.lng}], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, minZoom: 10 }).addTo(map);

    let geofenceLayer = null;
    const updateGeofence = (type, data, isWithin) => {
      if (geofenceLayer) map.removeLayer(geofenceLayer);
      const color = isWithin ? '#22c55e' : '#ef4444';
      if (type === 'polygon') {
        geofenceLayer = L.polygon(data.map(p => [p.lat, p.lng]), { color, fillColor: color, fillOpacity: 0.2, weight: 2 });
      } else {
        geofenceLayer = L.circle([data.lat, data.lng], { color, fillColor: color, fillOpacity: 0.2, weight: 2, radius: data.radius });
      }
      geofenceLayer.addTo(map);
    };

    updateGeofence('${officeGeofence.type}', ${JSON.stringify(officeGeofence.type === 'polygon' ? officeGeofence.polygon : { ...officeGeofence.center, radius: officeGeofence.radius })}, ${geofenceStatus?.isWithin ? 'true' : 'false'});

    const officeIcon = L.divIcon({
      className: 'custom-div-icon',
      html: "<div style='background-color:#3b82f6;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);'></div>",
      iconSize: [16, 16], iconAnchor: [8, 8]
    });
    L.marker([${geofenceCenter.lat}, ${geofenceCenter.lng}], { icon: officeIcon }).addTo(map);

    let userMarker = null;
    window.updateUserLocation = function(lat, lng, isWithin) {
      const color = isWithin ? '#22c55e' : '#ef4444';
      const status = isWithin ? 'Inside Office' : 'Outside Office';
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:" + color + ";width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);'></div>",
        iconSize: [12, 12], iconAnchor: [6, 6]
      });

      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
        userMarker.setIcon(icon);
      } else {
        userMarker = L.marker([lat, lng], { icon }).addTo(map);
      }

      if (geofenceLayer) {
        geofenceLayer.setStyle({ color: color, fillColor: color });
      }

      map.panTo([lat, lng], { animate: true, duration: 0.5 });
    };

    // Signal ready
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
  </script>
</body>
</html>
    `;
  }, [officeGeofence.name, officeGeofence.type, JSON.stringify(officeGeofence.polygon), JSON.stringify(officeGeofence.center)]);

  // Inject update whenever location changes
  useEffect(() => {
    if (currentLocation && isReady.current && webViewRef.current) {
      const script = `window.updateUserLocation(${currentLocation.latitude}, ${currentLocation.longitude}, ${geofenceStatus?.isWithin ? 'true' : 'false'});`;
      webViewRef.current.injectJavaScript(script);
    }
  }, [currentLocation, geofenceStatus?.isWithin]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={(event) => {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'READY') {
            isReady.current = true;
            // Immediate update if location already exists
            if (currentLocation) {
              const script = `window.updateUserLocation(${currentLocation.latitude}, ${currentLocation.longitude}, ${geofenceStatus?.isWithin ? 'true' : 'false'});`;
              webViewRef.current.injectJavaScript(script);
            }
          }
        }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={false}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  webview: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
});
