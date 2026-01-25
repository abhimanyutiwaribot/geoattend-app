import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Geofences from './pages/Geofences';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Suspicious from './pages/Suspicious';
import PresenceDashboard from './pages/PresenceDashboard';
import './index.css';

function PrivateRoute({ children }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return admin ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { admin } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={admin ? <Navigate to="/dashboard" /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute>
            <Users />
          </PrivateRoute>
        }
      />
      <Route
        path="/geofences"
        element={
          <PrivateRoute>
            <Geofences />
          </PrivateRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <PrivateRoute>
            <Attendance />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/suspicious"
        element={
          <PrivateRoute>
            <Suspicious />
          </PrivateRoute>
        }
      />
      <Route path="/presence" element={
        <PrivateRoute>
          <PresenceDashboard />
        </PrivateRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
