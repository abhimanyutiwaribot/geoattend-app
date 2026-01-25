import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth (uses /api/v1/admin/auth)
  login: (credentials) => apiClient.post(`${API_PREFIX}/admin/auth/login`, credentials),

  // Dashboard
  getDashboard: () => apiClient.get(`${API_PREFIX}/admin/dashboard`),

  // Users
  getUsers: (params) => apiClient.get(`${API_PREFIX}/admin/users`, { params }),
  assignOffice: (userId, officeId) =>
    apiClient.put(`${API_PREFIX}/admin/users/${userId}/assign-office`, { officeId }),

  // Geofences
  getGeofences: () => apiClient.get(`${API_PREFIX}/admin/geofences`),
  createGeofence: (data) => apiClient.post(`${API_PREFIX}/admin/geofences`, data),

  // Attendance
  getAttendances: (params) => apiClient.get(`${API_PREFIX}/admin/attendances`, { params }),

  // Reports
  generateReport: (data) => apiClient.post(`${API_PREFIX}/admin/reports/generate`, data),

  // Suspicious Activities
  getSuspiciousActivities: (params) =>
    apiClient.get(`${API_PREFIX}/admin/suspicious-activities`, { params }),
};

export default apiClient;
