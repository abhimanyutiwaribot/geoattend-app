import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polygon, useMapEvents } from 'react-leaflet';
import { api } from '../../api/client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
            color: '#22c55e',
            fillColor: '#22c55e',
            fillOpacity: 0.2
          }}
        />
      )}
    </>
  );
}

export default function CreateGeofenceModal({ onClose, onSuccess }) {
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
      onSuccess();
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-slate-800 rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto relative z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Create Office Geofence</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Office Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Office Name
            </label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g., Mumbai Office"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Geofence Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Geofence Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setGeofenceType('circle');
                  setPolygonPoints([]);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${geofenceType === 'circle'
                  ? 'border-primary-600 bg-primary-600/20'
                  : 'border-slate-600 hover:border-slate-500'
                  }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  </svg>
                  <span className="text-white font-medium">Circle</span>
                  <span className="text-xs text-slate-400">Best for most offices</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGeofenceType('polygon');
                  setPosition(null);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${geofenceType === 'polygon'
                  ? 'border-primary-600 bg-primary-600/20'
                  : 'border-slate-600 hover:border-slate-500'
                  }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21l-4-4m0 0l4-4m-4 4h11.5M17 3l4 4m0 0l-4 4m4-4H10.5" />
                  </svg>
                  <span className="text-white font-medium">Polygon</span>
                  <span className="text-xs text-slate-400">Custom shape</span>
                </div>
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {geofenceType === 'circle' ? 'Circle Mode' : 'Polygon Mode'}
            </h4>
            <ul className="text-sm text-blue-300 space-y-1">
              {geofenceType === 'circle' ? (
                <>
                  <li>• Click anywhere on the map to set office location</li>
                  <li>• Drag the marker to adjust position</li>
                  <li>• Adjust radius to cover your office area</li>
                </>
              ) : (
                <>
                  <li>• Click on map to add points (minimum 3 points)</li>
                  <li>• Click around your office building to create shape</li>
                  <li>• Polygon will auto-close when you have 3+ points</li>
                  <li>• Use "Undo" to remove last point or "Clear" to start over</li>
                </>
              )}
            </ul>
          </div>

          {/* Current Location Button (Circle only) */}
          {geofenceType === 'circle' && (
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={useCurrentLocation}
              className="btn btn-secondary w-full"
            >
              {useCurrentLocation ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Getting location...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  Use My Current Location
                </span>
              )}
            </button>
          )}

          {/* Polygon Controls */}
          {geofenceType === 'polygon' && polygonPoints.length > 0 && (
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleUndoLastPoint}
                className="flex-1 btn btn-secondary"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Undo Last Point
              </button>
              <button
                type="button"
                onClick={handleClearPolygon}
                className="flex-1 btn btn-danger"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear All
              </button>
            </div>
          )}

          {/* Interactive Map */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              {geofenceType === 'circle' ? 'Select Office Location on Map' : 'Draw Polygon on Map'}
              {geofenceType === 'polygon' && (
                <span className="ml-2 text-primary-400">
                  ({polygonPoints.length} points)
                </span>
              )}
            </label>
            <div className="rounded-lg overflow-hidden border-2 border-slate-700 h-96 relative z-0">
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {geofenceType === 'circle' ? (
                  <>
                    <LocationMarker position={position} setPosition={setPosition} mode="circle" />
                    {position && (
                      <Circle
                        center={position}
                        radius={formData.radius}
                        pathOptions={{
                          color: '#22c55e',
                          fillColor: '#22c55e',
                          fillOpacity: 0.2
                        }}
                      />
                    )}
                  </>
                ) : (
                  <PolygonDrawer polygonPoints={polygonPoints} setPolygonPoints={setPolygonPoints} />
                )}
              </MapContainer>
            </div>
            {geofenceType === 'circle' && position && (
              <p className="text-xs text-slate-400">
                Selected: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </p>
            )}
          </div>

          {/* Radius Slider (Circle only) */}
          {geofenceType === 'circle' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Geofence Radius: <span className="text-primary-400">{formData.radius}m</span>
              </label>
              <input
                type="range"
                min="20"
                max="500"
                step="10"
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                value={formData.radius}
                onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>20m</span>
                <span>500m</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Recommended: 50-200m for most offices. Accounts for GPS accuracy (±10m).
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn btn-primary"
              disabled={loading || (geofenceType === 'circle' ? !position : polygonPoints.length < 3)}
            >
              {loading ? 'Creating...' : 'Create Geofence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
