import { useAuth } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { name: 'Overview', href: '/dashboard' },
  { name: 'Live Presence', href: '/presence' },
  { name: 'Attendance', href: '/attendance' },
  { name: 'Users', href: '/users' },
  { name: 'Geofences', href: '/geofences' },
  { name: 'Leaves', href: '/leaves' },
  { name: 'Suspicious Activity', href: '/suspicious' },
  { name: 'Reports', href: '/reports' },
];

export default function Header() {
  const { admin, logout } = useAuth();
  const location = useLocation();

  return (
    <header style={{
      background: 'var(--bg-base)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 9999
    }}>
      {/* Top Bar: Logo & Avatar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1.5rem',
        width: '100%'
      }}>
        {/* Left Side: Logo and Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Custom GeoAttend Logo */}
          {/* <div style={{
            width: '28px', height: '28px', background: 'var(--brand-accent)',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(16,185,129,0.4)',
          }}>
            <svg width="16" height="16" fill="var(--bg-base)" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div> */}

          {/* <svg fill="none" width="24" height="24" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" shapeRendering="geometricPrecision" viewBox="0 0 24 24">
            <path d="M16.88 3.549L7.12 20.451" />
          </svg> */}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Geo-Attendance</span>
          </div>

          <span style={{
            padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase',
            background: 'var(--accents-1)', border: '1px solid var(--border)', borderRadius: '4px',
            color: 'var(--brand-accent)', marginLeft: '0.5rem', letterSpacing: '0.05em'
          }}>
            Admin
          </span>
        </div>

        {/* Right Side: Feedback & Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* <button className="v-btn v-btn-primary">Feedback</button> */}

          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--accents-2)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '0.875rem', fontWeight: 500,
            color: 'var(--text-primary)', border: '1px solid var(--border)',
            cursor: 'pointer'
          }} title={admin?.email}>
            {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>

          <button onClick={logout} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '0.875rem', transition: 'color 0.15s ease'
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem',
        display: 'flex', gap: '1.5rem', overflowX: 'auto', width: '100%'
      }}>
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.href;
          return (
            <Link key={tab.name} to={tab.href} style={{
              fontSize: '0.875rem',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              textDecoration: 'none',
              padding: '0.75rem 0 0.875rem 0',
              borderBottom: isActive ? '2px solid var(--text-primary)' : '2px solid transparent',
              transition: 'color 0.15s ease',
              whiteSpace: 'nowrap',
              marginBottom: '-1px' /* overlap with bottom border */
            }}>
              {tab.name}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
