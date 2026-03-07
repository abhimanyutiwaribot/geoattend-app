import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Layout from '../components/layout/Layout';

export default function PresenceDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboard = async () => {
    try {
      const response = await apiClient.get('/api/v1/admin/presence/dashboard');
      console.log(response.data.data)
      setDashboardData(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
          <div style={{ width: '24px', height: '24px', border: '3px solid var(--accents-2)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem' }}>Checking Attendance Signals...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-primary)' }}>Live Presence Radar</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Real-time 5-point verification monitoring.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Last Updated: {dashboardData?.timestamp ? new Date(dashboardData.timestamp).toLocaleTimeString() : '--'}
            </span>
            <button className="v-btn" onClick={() => setAutoRefresh(!autoRefresh)} style={{ borderColor: 'var(--border)' }}>
              {autoRefresh ? (
                <>
                  <div style={{ width: '8px', height: '8px', background: 'var(--geist-success)', borderRadius: '50%', marginRight: '0.5rem', boxShadow: '0 0 6px var(--geist-success)' }} />
                  Auto-Refresh
                </>
              ) : (
                <>
                  <div style={{ width: '8px', height: '8px', background: 'var(--text-secondary)', borderRadius: '50%', marginRight: '0.5rem' }} />
                  Paused
                </>
              )}
            </button>
            <button className="v-btn v-btn-primary" onClick={fetchDashboard} style={{ background: '#fff', color: '#000' }}>Refresh</button>
          </div>
        </div>

        {/* Global Summary Stats */}
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <SignalStat label="Total Staff" value={dashboardData?.stats?.totalUsers || 0} />
          <SignalStat label="Present" value={dashboardData?.stats?.totalActive || 0} color="var(--geist-success)" />
          <SignalStat label="On Leave" value={dashboardData?.stats?.totalOnLeave || 0} />
          <SignalStat label="Absent" value={dashboardData?.stats?.totalAbsent || 0} />
          <SignalStat label="Uncertain" value={dashboardData?.sessions.filter(s => s.presenceScore?.confidence === 'uncertain').length || 0} color="var(--geist-warning)" />
          <SignalStat label="High Risk" value={dashboardData?.sessions.filter(s => s.presenceScore?.riskLevel === 'high').length || 0} color="var(--geist-error)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', alignItems: 'flex-start' }}>

          {/* Active Status Feed */}
          <div className="v-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--accents-1)' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Live Activity Feed</h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="v-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th style={{ width: '120px' }}>Check-In</th>
                    <th>Presence Signals (Geofence, Loc, Device, Motion, Face)</th>
                    <th style={{ textAlign: 'right', width: '200px' }}>Trust Score</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData?.sessions?.length > 0 ? (
                    dashboardData.sessions.map((session) => (
                      <tr key={session.attendanceId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              background: 'var(--accents-2)', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)'
                            }}>
                              {session.user?.name?.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{session.user?.name}</div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {session.user?._id || 'ID UNKNOWN'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {session.startTime ? new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                            <SignalMeter label="GFN" score={session.presenceScore?.signals?.geofence?.score} />
                            <SignalMeter label="LOC" score={session.presenceScore?.signals?.locationConsistency?.score} />
                            <SignalMeter label="DEV" score={session.presenceScore?.signals?.deviceActivity?.score} />
                            <SignalMeter label="MOT" score={session.presenceScore?.signals?.motionPattern?.score} />
                            <SignalMeter label="FAC" score={session.presenceScore?.signals?.faceIdentity?.score} />
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <TrustBadge score={session.presenceScore?.totalScore} status={session.presenceScore?.confidence} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        No employees currently checked in.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side Lists inline */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <SideList title="Employees on Leave" data={dashboardData?.onLeave} />
            <SideList title="Absent Employees" data={dashboardData?.absent} isAlert />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SignalStat({ label, value, color = 'var(--text-primary)' }) {
  return (
    <div className="v-card" style={{ flex: '1 0 140px', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', color }}>{value}</div>
    </div>
  );
}

function SignalMeter({ label, score }) {
  const bars = [1, 2, 3, 4];
  const activeCount = Math.ceil((score || 0) / 25);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', alignItems: 'center' }} title={`${score || 0}%`}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px' }}>
        {bars.map((bar) => {
          const isActive = bar <= activeCount;
          const height = 4 + bar * 3;
          return (
            <div
              key={bar}
              style={{
                width: '4px',
                height: `${height}px`,
                background: isActive ? 'var(--text-primary)' : 'var(--accents-2)',
                borderRadius: '1px'
              }}
            />
          );
        })}
      </div>
      <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  );
}

function TrustBadge({ score, status }) {
  const num = Math.round(score || 0);
  const color = num >= 80 ? 'var(--geist-success)' : num >= 50 ? 'var(--geist-warning)' : 'var(--geist-error)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
        padding: '0.125rem 0.5rem', borderRadius: '4px', border: `1px solid ${color}`,
        color: color, fontSize: '0.75rem', fontWeight: 700
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
        {num}% CONFIDENT
      </div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
        {status === 'present' ? 'Verified Present' : status === 'uncertain' ? 'Needs Review' : 'Outdated Data'}
      </div>
    </div>
  );
}

function SideList({ title, data, isAlert }) {
  return (
    <div className="v-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accents-1)' }}>
        <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--bg-base)', background: 'var(--text-primary)', padding: '0 0.5rem', borderRadius: '99px' }}>{data?.length || 0}</span>
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {data?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.map((item, idx) => {
              const name = item.user?.name || item.name;
              const subText = item.until
                ? `Until ${new Date(item.until).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                : item.employeeId;

              return (
                <div key={idx} style={{
                  padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{subText || 'No Detail'}</div>
                  </div>
                  {isAlert && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--geist-error)' }} />}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            None reported
          </div>
        )}
      </div>
    </div>
  );
}
