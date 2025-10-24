// src/utils/constants.js
export const API_BASE_URL = 'http://10.229.55.93:8000/api/v1';

export const OFFICE_LOCATION = {
  lat: 28.6129,  // Your office coordinates
  lng: 77.2295
};

export const GEOFENCE_RADIUS = 100; // meters

export const LOCATION_STATES = {
  AWAY: 'AWAY',
  APPROACHING: 'APPROACHING', 
  IN_OFFICE: 'IN_OFFICE',
  ACTIVE_SESSION: 'ACTIVE_SESSION',
  HIGH_SECURITY: 'HIGH_SECURITY'
};

export const ATTENDANCE_STATUS = {
  TENTATIVE: 'tentative',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  FLAGGED: 'flagged'
};