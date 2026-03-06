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
      console.log('📡 [Geofence] Fetching from backend...');
      const response = await api.get('/user/my-geofence');
      console.log('📡 [Geofence] Response:', JSON.stringify(response.data, null, 2));

      if (response.data?.success && response.data?.data?.geofence) {
        const officeData = response.data.data.geofence;
        console.log(`✅ [Geofence] Found ${officeData.type}: ${officeData.name}`);
        if (officeData.type === 'circle') {
          console.log(`📍 [Geofence] Center: ${officeData.center?.lat}, ${officeData.center?.lng} | Rad: ${officeData.radius}m`);
        } else {
          console.log(`📍 [Geofence] Polygon Points: ${officeData.polygon?.length}`);
        }

        setGeofence({
          type: officeData.type || 'circle',
          name: officeData.name || 'Office',
          center: officeData.center || (officeData.type === 'polygon' ? null : { lat: 28.6139, lng: 77.2090 }),
          radius: officeData.radius || 100,
          polygon: officeData.polygon || null
        });
      } else {
        console.log('⚠️ [Geofence] No geofence assigned to user or success=false');
      }
    } catch (error) {
      console.error('❌ [Geofence] Failed to fetch:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return { geofence, loading, refetch: fetchGeofence };
}
