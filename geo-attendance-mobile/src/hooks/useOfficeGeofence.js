import { useState, useEffect } from 'react';
import { api } from '../api/client';

/**
 * Hook to fetch office geofence data from backend
 */
export function useOfficeGeofence() {
  const [geofence, setGeofence] = useState({
    center: { lat: 28.6139, lng: 77.2090 }, // Default Delhi coordinates
    radius: 100
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGeofence();
  }, []);

  const fetchGeofence = async () => {
    try {
      // Fetch geofence from backend
      // You'll need to create this endpoint in the backend
      const response = await api.get('/attendance/office-geofence');

      if (response.data?.data) {
        const officeData = response.data.data;
        setGeofence({
          center: {
            lat: officeData.center.lat,
            lng: officeData.center.lng
          },
          radius: officeData.radius || 100
        });
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
