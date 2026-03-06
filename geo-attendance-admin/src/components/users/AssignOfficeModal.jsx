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
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div className="v-card" style={{ maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Assign Facility</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--accents-1)', borderRadius: '6px', border: '1px solid var(--border)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accents-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{user.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--geist-error)', color: 'var(--geist-error)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Facility Restraint</label>
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="">-- No Restriction (Global) --</option>
              {offices.map((office) => (
                <option key={office._id} value={office._id}>
                  {office.name}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Restricts attendance marking solely to this geofence.</span>
          </div>

          {user.assignedOfficeId && (
            <div style={{ fontSize: '0.75rem', color: 'var(--brand-accent)', padding: '0.5rem 0' }}>
              Current binding: <strong style={{ color: 'var(--text-primary)' }}>{user.assignedOfficeId.name}</strong>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="v-btn" style={{ flex: 1, height: '40px' }} disabled={loading}>Close</button>
            <button type="submit" className="v-btn v-btn-primary" style={{ flex: 1, height: '40px' }} disabled={loading}>
              {loading ? 'Binding...' : 'Apply Rule'}
            </button>
          </div>

          {user.assignedOfficeId && (
            <button
              type="button"
              onClick={async () => {
                if (confirm('Sever facility binding? User will be able to mark attendance globally again.')) {
                  setLoading(true);
                  try {
                    await api.assignOffice(user._id, null);
                    onSuccess();
                  } catch (error) {
                    setError('Failed to decouple rule');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              className="v-btn"
              style={{ width: '100%', height: '40px', borderColor: 'var(--geist-error)', color: 'var(--geist-error)' }}
              disabled={loading}
            >
              Sever Binding Constraint
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
