import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '1.5rem', flexDirection: 'column' }}>
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Header Block Minimalist */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--brand-accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}>
            <svg width="24" height="24" fill="var(--bg-base)" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>GeoAttend Access</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Central Administration Verification</p>
          </div>
        </div>

        {/* Form Component Box */}
        <div className="v-card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--geist-error)', color: 'var(--geist-error)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Identity Vector (Username)</label>
              <input
                type="text"
                required
                placeholder="Terminal ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                style={{
                  padding: '0.875rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px',
                  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Security Key (Password)</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  padding: '0.875rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px',
                  color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', letterSpacing: '0.1em'
                }}
              />
            </div>

            <button
              type="submit"
              className="v-btn v-btn-primary"
              disabled={loading}
              style={{ height: '44px', marginTop: '0.5rem', fontSize: '0.9375rem', fontWeight: 600 }}
            >
              {loading ? 'Authenticating...' : 'Establish Session'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--accents-5)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Encrypted Connection • Staff Protocol Alpha
        </div>
      </div>
    </div>
  );
}
