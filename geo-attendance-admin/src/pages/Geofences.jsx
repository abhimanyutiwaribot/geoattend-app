import { useState, useEffect } from 'react';
import { MapContainer, Marker, Circle, Polygon, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Layout from '../components/layout/Layout';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import L from 'leaflet';
import '@maplibre/maplibre-gl-leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Geofences() {
  const navigate = useNavigate();
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGeofence, setSelectedGeofence] = useState(null);

  useEffect(() => {
    fetchGeofences();
  }, []);

  const fetchGeofences = async () => {
    try {
      setLoading(true);
      const response = await api.getGeofences();
      setGeofences(response.data.data.geofences);
    } catch (error) {
      console.error('Failed to fetch geofences:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate center for map view (average of all geofences)
  const mapCenter = geofences.length > 0
    ? (() => {
      let totalLat = 0;
      let totalLng = 0;
      let count = 0;

      geofences.forEach(g => {
        if (g.type === 'polygon' && g.polygon && g.polygon.length > 0) {
          g.polygon.forEach(p => {
            totalLat += p.lat;
            totalLng += p.lng;
            count++;
          });
        } else if (g.center) {
          totalLat += g.center.lat;
          totalLng += g.center.lng;
          count++;
        }
      });

      return count > 0 ? [totalLat / count, totalLng / count] : [28.6139, 77.2090];
    })()
    : [28.6139, 77.2090]; // Default to Delhi

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-primary)' }}>Office Geofences</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Define attendance zones and locations for perimeter monitoring.</p>
          </div>
          <button className="v-btn v-btn-primary" onClick={() => navigate('/geofences/create')} style={{ background: '#fff', color: '#000' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ marginRight: '0.5rem' }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Geofence
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6rem 0' }}>
            <div style={{ width: '24px', height: '24px', border: '3px solid var(--accents-2)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : geofences.length === 0 ? (
          <div className="v-card" style={{ padding: '6rem 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--accents-2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>No Geofences configured</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Create your first perimeter to enable geofence matching.</p>
            </div>
            <button className="v-btn v-btn-primary" onClick={() => navigate('/geofences/create')} style={{ background: '#fff', color: '#000' }}>Create Perimeter</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Map View */}
            <div className="v-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ borderBottom: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Interactive Zone Map</h3>
              </div>
              <div style={{ height: '400px', background: 'var(--accents-1)' }}>
                <MapContainer center={mapCenter} zoom={11} style={{ height: '100%', width: '100%' }}>
                  <MapLibreTileLayer />
                  {geofences.map((geofence) => (
                    <div key={geofence._id}>
                      {geofence.type === 'polygon' && geofence.polygon ? (
                        <Polygon
                          positions={geofence.polygon.map(p => [p.lat, p.lng])}
                          pathOptions={{
                            color: selectedGeofence?._id === geofence._id ? '#fff' : '#3b82f6',
                            fillColor: selectedGeofence?._id === geofence._id ? '#fff' : '#3b82f6',
                            fillOpacity: 0.3,
                            weight: 2
                          }}
                        >
                          <Popup>
                            <div style={{ color: '#000', fontSize: '12px' }}>
                              <b style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>{geofence.name}</b>
                              Points: {geofence.polygon.length}
                            </div>
                          </Popup>
                        </Polygon>
                      ) : (
                        geofence.center && geofence.center.lat && geofence.center.lng ? (
                          <>
                            <Marker position={[geofence.center.lat, geofence.center.lng]}>
                              <Popup>
                                <div style={{ color: '#000', fontSize: '12px' }}>
                                  <b style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>{geofence.name}</b>
                                  Radius: {geofence.radius}m
                                </div>
                              </Popup>
                            </Marker>
                            <Circle
                              center={[geofence.center.lat, geofence.center.lng]}
                              radius={geofence.radius}
                              pathOptions={{
                                color: selectedGeofence?._id === geofence._id ? '#fff' : '#3b82f6',
                                fillColor: selectedGeofence?._id === geofence._id ? '#fff' : '#3b82f6',
                                fillOpacity: 0.3,
                                weight: 2
                              }}
                            />
                          </>
                        ) : null
                      )}
                    </div>
                  ))}
                </MapContainer>
              </div>
            </div>

            {/* Geofences List Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {geofences.map((geofence) => (
                <div key={geofence._id}
                  className="v-card"
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedGeofence?._id === geofence._id ? 'var(--text-primary)' : 'var(--border)'
                  }}
                  onClick={() => setSelectedGeofence(geofence)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--accents-2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{geofence.name}</h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>Office Area • {geofence.type || 'Circle'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {geofence.type === 'polygon' ? (
                      <StatusRow label="Boundary Vertices" value={geofence.polygon?.length || 0} />
                    ) : (
                      <>
                        <StatusRow label="Radius" value={`${geofence.radius}m`} />
                        <StatusRow label="Center Lat" value={parseFloat(geofence.center?.lat).toFixed(6)} />
                        <StatusRow label="Center Lng" value={parseFloat(geofence.center?.lng).toFixed(6)} />
                      </>
                    )}
                  </div>

                  {geofence.center && geofence.center.lat && geofence.center.lng && (
                    <a href={`https://www.google.com/maps?q=${geofence.center.lat},${geofence.center.lng}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--geist-success)', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      View in Maps
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatusRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

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
