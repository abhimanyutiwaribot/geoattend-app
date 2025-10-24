// src/hooks/useLocation.js
import { useState, useEffect } from 'react';
import locationService from '../services/location';

const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    initializeLocation();
    
    return () => {
      locationService.stopTracking();
    };
  }, []);

  const initializeLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      const hasPermission = await locationService.requestPermissions();
      setPermissionGranted(hasPermission);

      if (!hasPermission) {
        setError('Location permission is required for attendance tracking');
        setLoading(false);
        return;
      }

      // Get initial location
      const initialLocation = await locationService.getCurrentLocation();
      setLocation(initialLocation);

      // Start smart tracking
      locationService.startSmartTracking((newLocation) => {
        setLocation(newLocation);
      });

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshLocation = async () => {
    try {
      setLoading(true);
      const newLocation = await locationService.getCurrentLocation();
      setLocation(newLocation);
      return newLocation;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    location,
    loading,
    error,
    permissionGranted,
    refreshLocation,
  };
};

export default useLocation;