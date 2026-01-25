import { useState, useEffect } from 'react';
import { api } from '../api/client';

/**
 * Hook to fetch user's assigned office geofence from backend
 * Supports both circle and polygon geofences
 */
export function useOfficeGeofence() {
  const [geofence, setGeofence] = useState({
    type: 'circle',
    center: { lat: 28.6139, lng: 77.2090 }, // Default Delhi coordinates
    radius: 100,
    polygon: null,
    name: 'Default Office'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGeofence();
  }, []);

  const fetchGeofence = async () => {
    try {
      // Fetch user's assigned geofence from backend
      const response = await api.get('/user/my-geofence');

      if (response.data?.data?.geofence) {
        const officeData = response.data.data.geofence;

        setGeofence({
          type: officeData.type || 'circle',
          name: officeData.name || 'Office',
          // For circle type
          center: officeData.center || { lat: 28.6139, lng: 77.2090 },
          radius: officeData.radius || 100,
          // For polygon type
          polygon: officeData.polygon || null
        });
      } else {
        console.log('No geofence assigned to user, using default');
      }
    } catch (error) {
      console.log('Failed to fetch geofence, using default:', error.message);
      // Keep default values
    } finally {
      setLoading(false);
    }
  };

  return { geofence, loading, refetch: fetchGeofence };
}
