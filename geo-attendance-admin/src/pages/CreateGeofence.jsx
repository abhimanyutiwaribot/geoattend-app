import { useState, useEffect } from 'react';
import { MapContainer, Marker, Circle, Polygon, useMapEvents, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Layout from '../components/layout/Layout';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import L from 'leaflet';
import '@maplibre/maplibre-gl-leaflet';

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapLibreTileLayer() {
  const map = useMap();
  useEffect(() => {
    const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
    const styleUrl = apiKey
      ? `https://api.maptiler.com/maps/streets-v4-dark/style.json?key=${apiKey}`
      : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

    const gl = L.maplibreGL({
      style: styleUrl
    }).addTo(map);

    return () => {
      map.removeLayer(gl);
    };
  }, [map]);
  return null;
}

function MapCenterUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, map.getZoom() || 15);
    }
  }, [center, map]);
  return null;
}

function LocationMarker({ position, setPosition, mode }) {
  const map = useMapEvents({
    click(e) {
      if (mode === 'circle') {
        setPosition(e.latlng);
        map.flyTo(e.latlng, map.getZoom());
      }
    },
  });

  return position === null || mode !== 'circle' ? null : (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          setPosition(e.target.getLatLng());
        },
      }}
    />
  );
}

function PolygonDrawer({ polygonPoints, setPolygonPoints }) {
  useMapEvents({
    click(e) {
      setPolygonPoints([...polygonPoints, e.latlng]);
    },
  });

  return (
    <>
      {polygonPoints.map((point, idx) => (
        <Marker key={idx} position={point} />
      ))}
      {polygonPoints.length > 2 && (
        <Polygon
          positions={polygonPoints}
          pathOptions={{
            color: '#3b82f6',     // Changed to blue as requested
            fillColor: '#3b82f6', // Changed to blue as requested
            fillOpacity: 0.3
          }}
        />
      )}
    </>
  );
}

export default function CreateGeofence() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    radius: 100
  });
  const [geofenceType, setGeofenceType] = useState('circle'); // 'circle' or 'polygon'
  const [position, setPosition] = useState(null); // For circle
  const [polygonPoints, setPolygonPoints] = useState([]); // For polygon
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [defaultCenter, setDefaultCenter] = useState([28.6139, 77.2090]); // Fallback to Delhi

  // Get current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDefaultCenter([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.log('Using default location (Delhi)');
        }
      );
    }
  }, []);

  const handleGetCurrentLocation = () => {
    setUseCurrentLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setPosition(newPos);
          setUseCurrentLocation(false);
        },
        (err) => {
          setError('Failed to get current location');
          setUseCurrentLocation(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setUseCurrentLocation(false);
    }
  };

  const handleClearPolygon = () => {
    setPolygonPoints([]);
  };

  const handleUndoLastPoint = () => {
    setPolygonPoints(polygonPoints.slice(0, -1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (geofenceType === 'circle' && !position) {
      setError('Please select a location on the map');
      return;
    }

    if (geofenceType === 'polygon' && polygonPoints.length < 3) {
      setError('Please draw a polygon with at least 3 points');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        type: geofenceType
      };

      if (geofenceType === 'circle') {
        payload.center = {
          lat: position.lat,
          lng: position.lng
        };
        payload.radius = parseInt(formData.radius);
      } else {
        payload.polygon = polygonPoints.map(p => ({
          lat: p.lat,
          lng: p.lng
        }));
      }

      await api.createGeofence(payload);
      navigate('/geofences'); // Redirect back to list
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create geofence');
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = geofenceType === 'circle'
    ? (position || defaultCenter)
    : (polygonPoints.length > 0
      ? [polygonPoints[0].lat, polygonPoints[0].lng]
      : defaultCenter);

  return (
    <Layout>
      <div style={{ height: 'calc(100vh - 65px)', display: 'grid', gridTemplateColumns: '400px 1fr', overflow: 'hidden' }}>

        {/* Left Side: Form Sidebar */}
        <div style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Sidebar Header */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.03em', margin: 0, color: 'var(--text-primary)' }}>Create Perimeter</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>Configure attendance tracking zone.</p>
            </div>
            <button className="v-btn" onClick={() => navigate('/geofences')} style={{ height: '32px', padding: '0 0.5rem' }} title="Back">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          </div>

          {/* Sidebar Scrollable Form */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <form id="geofence-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--geist-error)', color: 'var(--geist-error)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
                  {error}
                </div>
              )}

              {/* General Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Basic Details</h3>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '1rem' }}>Zone Identifier Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Downtown Headquarters"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ padding: '0.75rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>

              {/* Geofence Type Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Geofence Geometry</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Select the mapping constraints to establish the boundaries.</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => { setGeofenceType('circle'); setPolygonPoints([]); }}
                    style={{
                      padding: '1.5rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.15s',
                      background: geofenceType === 'circle' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-base)',
                      border: `1px solid ${geofenceType === 'circle' ? '#3b82f6' : 'var(--border)'}`,
                      color: geofenceType === 'circle' ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    <svg width="32" height="32" fill="none" stroke={geofenceType === 'circle' ? "#3b82f6" : "currentColor"} viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
                    <span style={{ fontWeight: 600 }}>Radial Bounds</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Standard circle area map</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setGeofenceType('polygon'); setPosition(null); }}
                    style={{
                      padding: '1.5rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.15s',
                      background: geofenceType === 'polygon' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-base)',
                      border: `1px solid ${geofenceType === 'polygon' ? '#3b82f6' : 'var(--border)'}`,
                      color: geofenceType === 'polygon' ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    <svg width="32" height="32" fill="none" stroke={geofenceType === 'polygon' ? "#3b82f6" : "currentColor"} viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21l-4-4m0 0l4-4m-4 4h11.5M17 3l4 4m0 0l-4 4m4-4H10.5" /></svg>
                    <span style={{ fontWeight: 600 }}>Vector Polygon</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Define custom complex shapes</span>
                  </button>
                </div>
              </div>

              <div style={{ background: 'var(--accents-1)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>Map Instructions</strong>
                {geofenceType === 'circle' ? (
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <li>Click coordinates on the map to anchor the facility center.</li>
                    <li>Drag the center marker to fine-tune the strict position.</li>
                    <li>Expand radius parameter using the slider control.</li>
                  </ul>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <li>Left-click map bounds to establish poly-vertices (Requires ≥3).</li>
                    <li>Trace strictly around the physical office premise boundaries.</li>
                    <li>Use adjustment buttons to undo errant points.</li>
                  </ul>
                )}
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexDirection: 'column' }}>
                {geofenceType === 'circle' && (
                  <button type="button" onClick={handleGetCurrentLocation} disabled={useCurrentLocation} className="v-btn" style={{ width: '100%', height: '40px' }}>
                    {useCurrentLocation ? 'Triangulating...' : 'Query Current Device GPS'}
                  </button>
                )}

                {geofenceType === 'polygon' && polygonPoints.length > 0 && (
                  <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                    <button type="button" onClick={handleUndoLastPoint} className="v-btn" style={{ flex: 1, height: '40px', background: 'var(--accents-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>Undo Point</button>
                    <button type="button" onClick={handleClearPolygon} className="v-btn" style={{ flex: 1, height: '40px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--geist-error)', color: 'var(--geist-error)' }}>Clear Array</button>
                  </div>
                )}
              </div>

              {/* Radius Control (Circle only) */}
              {geofenceType === 'circle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--accents-1)', padding: '1.25rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Buffer Radius</label>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#3b82f6' }}>{formData.radius}m</span>
                  </div>
                  <input type="range" min="20" max="1000" step="10"
                    value={formData.radius} onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                    style={{ width: '100%', margin: '1rem 0' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>50-200m recommended.</span>
                </div>
              )}
            </form>
          </div>

          {/* Sidebar Footer Commit Actions */}
          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-base)', display: 'flex', gap: '1rem' }}>
            <button type="button" onClick={() => navigate('/geofences')} className="v-btn" style={{ flex: 1, height: '44px' }} disabled={loading}>Discard</button>
            <button
              type="submit"
              form="geofence-form"
              className="v-btn v-btn-primary"
              style={{ flex: 1, height: '44px', fontWeight: 600 }}
              disabled={loading || (geofenceType === 'circle' ? !position : polygonPoints.length < 3)}
            >
              {loading ? 'Committing...' : 'Commit'}
            </button>
          </div>
        </div>

        {/* Right Side: Map Canvas */}
        <div style={{ padding: '1.5rem', background: 'var(--bg-base)', height: '100%', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ position: 'relative', height: '100%', width: '100%', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
              <MapLibreTileLayer />
              <MapCenterUpdater center={mapCenter} />

              {geofenceType === 'circle' ? (
                <>
                  <LocationMarker position={position} setPosition={setPosition} mode="circle" />
                  {position && (
                    <Circle
                      center={position}
                      radius={formData.radius}
                      pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3 }}
                    />
                  )}
                </>
              ) : (
                <PolygonDrawer polygonPoints={polygonPoints} setPolygonPoints={setPolygonPoints} />
              )}
            </MapContainer>

            {/* Floating crosshair styling info */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 1000, background: 'var(--bg-base)', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>Active Canvas</span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click to plot coordinates</div>
            </div>
          </div>
        </div>
      </div>

    </Layout>
  );
}
