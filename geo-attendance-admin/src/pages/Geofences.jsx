import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polygon, Popup } from 'react-leaflet';
import { api } from '../api/client';
import Layout from '../components/layout/Layout';
import CreateGeofenceModal from '../components/geofences/CreateGeofenceModal';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Geofences() {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchGeofences();
  };

  // Calculate center for map view (average of all geofences)
  const mapCenter = geofences.length > 0
    ? (() => {
      let totalLat = 0;
      let totalLng = 0;
      let count = 0;

      geofences.forEach(g => {
        if (g.type === 'polygon' && g.polygon && g.polygon.length > 0) {
          // Use polygon center
          g.polygon.forEach(p => {
            totalLat += p.lat;
            totalLng += p.lng;
            count++;
          });
        } else if (g.center) {
          // Use circle center
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Office Geofences</h2>
            <p className="text-slate-400 mt-1">Manage office locations and attendance zones</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Geofence
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : geofences.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No Geofences Yet</h3>
            <p className="text-slate-400 mb-4">Create your first office geofence to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              Create Geofence
            </button>
          </div>
        ) : (
          <>
            {/* Map View - All Geofences */}
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">All Office Locations</h3>
              <div className="rounded-lg overflow-hidden border-2 border-slate-700 h-96">
                <MapContainer
                  center={mapCenter}
                  zoom={11}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {geofences.map((geofence) => (
                    <div key={geofence._id}>
                      {geofence.type === 'polygon' && geofence.polygon ? (
                        <>
                          <Polygon
                            positions={geofence.polygon.map(p => [p.lat, p.lng])}
                            pathOptions={{
                              color: selectedGeofence?._id === geofence._id ? '#22c55e' : '#3b82f6',
                              fillColor: selectedGeofence?._id === geofence._id ? '#22c55e' : '#3b82f6',
                              fillOpacity: 0.2
                            }}
                          >
                            <Popup>
                              <div className="text-sm">
                                <h4 className="font-bold">{geofence.name}</h4>
                                <p className="text-xs text-gray-600">Type: Polygon</p>
                                <p className="text-xs text-gray-600">{geofence.polygon.length} points</p>
                              </div>
                            </Popup>
                          </Polygon>
                        </>
                      ) : (
                        geofence.center && geofence.center.lat && geofence.center.lng ? (
                          <>
                            <Marker position={[geofence.center.lat, geofence.center.lng]}>
                              <Popup>
                                <div className="text-sm">
                                  <h4 className="font-bold">{geofence.name}</h4>
                                  <p className="text-xs text-gray-600">Type: Circle</p>
                                  <p className="text-xs text-gray-600">Radius: {geofence.radius}m</p>
                                </div>
                              </Popup>
                            </Marker>
                            <Circle
                              center={[geofence.center.lat, geofence.center.lng]}
                              radius={geofence.radius}
                              pathOptions={{
                                color: selectedGeofence?._id === geofence._id ? '#22c55e' : '#3b82f6',
                                fillColor: selectedGeofence?._id === geofence._id ? '#22c55e' : '#3b82f6',
                                fillOpacity: 0.2
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

            {/* Geofences Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {geofences.map((geofence) => (
                <div
                  key={geofence._id}
                  className={`card cursor-pointer transition-all ${selectedGeofence?._id === geofence._id
                    ? 'ring-2 ring-primary-600'
                    : 'hover:ring-2 hover:ring-slate-600'
                    }`}
                  onClick={() => setSelectedGeofence(geofence)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{geofence.name}</h3>
                        <p className="text-sm text-slate-400">Office Location</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Type</span>
                      <span className="text-white font-medium capitalize">
                        {geofence.type || 'circle'}
                      </span>
                    </div>
                    {geofence.type === 'polygon' ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Points</span>
                        <span className="text-white font-medium">{geofence.polygon?.length || 0}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Radius</span>
                          <span className="text-white font-medium">{geofence.radius}m</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Latitude</span>
                          <span className="text-white font-mono text-xs">{geofence.center?.lat.toFixed(6)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Longitude</span>
                          <span className="text-white font-mono text-xs">{geofence.center?.lng.toFixed(6)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700 flex space-x-2">
                    {geofence.center && geofence.center.lat && geofence.center.lng && (
                      <a
                        href={`https://www.google.com/maps?q=${geofence.center.lat},${geofence.center.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-primary-400 hover:text-primary-300 text-sm flex items-center justify-center py-2 rounded-lg hover:bg-primary-600/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Google Maps
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Geofence Modal */}
      {showCreateModal && (
        <CreateGeofenceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </Layout>
  );
}
