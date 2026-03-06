import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Layout from '../components/layout/Layout';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.getDashboard();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
          <div style={{ width: '24px', height: '24px', border: '3px solid var(--accents-2)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Loading Overview...</p>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Vercel Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-primary)' }}>Overview</h1>
          {/* <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="v-btn">View Metrics</button>
            <button className="v-btn v-btn-primary" style={{ background: '#fff', color: '#000' }}>Export Report</button>
          </div> */}
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <StatCard title="Total Staff" value={stats?.overview?.totalUsers || 0} />
          <StatCard title="Checked In" value={stats?.overview?.activeSessions || 0} />
          <StatCard title="On Leave" value={stats?.stats?.totalOnLeave || 0} />
          <StatCard title="Suspicious Activity" value={stats?.overview?.suspiciousActivities || 0} isWarning={stats?.overview?.suspiciousActivities > 0} />
        </div>

        {/* Chart / List area */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>

          {/* Main Chart Card */}
          <div className="v-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Weekly Attendance Trend</h3>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Last 7 Days</span>
            </div>

            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {stats?.weeklyTrend && stats.weeklyTrend.length > 0 ? (
                stats.weeklyTrend.map((day) => {
                  const maxVal = stats?.overview?.totalUsers || 10;
                  const percent = Math.min((day.count / maxVal) * 100, 100);
                  return (
                    <div key={day._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ width: '40px', fontSize: '0.8125rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {day._id.substring(0, 3)}
                      </span>
                      <div style={{ flex: 1, height: '24px', display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          height: '100%',
                          width: `${percent}%`,
                          background: 'var(--text-primary)',
                          transition: 'width 1s ease-out',
                          borderRadius: '2px'
                        }} />
                      </div>
                      <span style={{ width: '24px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 500 }}>
                        {day.count}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '2rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
                  No trend data available for this week.
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="v-card">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>System Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <StatusRow label="Live Tracking Core" />
                <StatusRow label="Face Verification Engine" />
                <StatusRow label="Geofence Monitoring" />
              </div>
            </div>

            {/* Quick Actions placeholder (Vercel style Event Log) */}
            <div className="v-card" style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <a href="/presence" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '6px',
                  color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.875rem',
                  fontWeight: 500, background: 'rgba(255,255,255,0.02)'
                }}>
                  Live Radar View <IconArrowRight />
                </a>
                <a href="/suspicious" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '6px',
                  color: 'var(--geist-error)', textDecoration: 'none', fontSize: '0.875rem',
                  fontWeight: 500, background: 'rgba(238,0,0,0.05)'
                }}>
                  Review Flagged <IconArrowRight />
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, isWarning }) {
  return (
    <div className="v-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem' }}>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.02em' }}>
        {title}
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: isWarning ? 'var(--geist-error)' : 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function StatusRow({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--geist-success)' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--geist-success)' }}>Ready</span>
      </div>
    </div>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
