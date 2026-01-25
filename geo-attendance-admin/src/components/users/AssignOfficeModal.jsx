import { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function AssignOfficeModal({ user, onClose, onSuccess }) {
  const [offices, setOffices] = useState([]);
  const [selectedOffice, setSelectedOffice] = useState(user.assignedOfficeId?._id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    try {
      const response = await api.getGeofences();
      setOffices(response.data.data.geofences);
    } catch (error) {
      setError('Failed to load offices');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.assignOffice(user._id, selectedOffice || null);
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to assign office');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Assign Office</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Info */}
        <div className="bg-slate-700 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-white">{user.name}</p>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Office
            </label>
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="input"
              required
            >
              <option value="">-- Select Office --</option>
              {offices.map((office) => (
                <option key={office._id} value={office._id}>
                  {office.name} ({office.radius}m radius)
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-2">
              User will only be able to mark attendance at the selected office
            </p>
          </div>

          {/* Current Assignment */}
          {user.assignedOfficeId && (
            <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-3">
              <p className="text-sm text-blue-400">
                <strong>Currently assigned to:</strong> {user.assignedOfficeId.name}
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
              disabled={loading}
            >
              {loading ? 'Assigning...' : 'Assign Office'}
            </button>
          </div>

          {/* Remove Assignment */}
          {user.assignedOfficeId && (
            <button
              type="button"
              onClick={async () => {
                if (confirm('Remove office assignment? User will be able to mark attendance at any office.')) {
                  setLoading(true);
                  try {
                    await api.assignOffice(user._id, null);
                    onSuccess();
                  } catch (error) {
                    setError('Failed to remove assignment');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              className="w-full btn btn-danger text-sm"
              disabled={loading}
            >
              Remove Office Assignment
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
