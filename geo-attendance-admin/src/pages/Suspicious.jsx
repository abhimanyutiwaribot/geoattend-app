import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Layout from '../components/layout/Layout';
import { format } from 'date-fns';

// Map flag keys to readable labels
const FLAG_LABELS = {
  outside_geofence: 'Outside Geofence',
  location_inconsistent: 'Location Inconsistent',
  low_device_activity: 'Low Device Activity',
  suspicious_motion: 'Suspicious Motion',
  identity_unverified: 'Identity Unverified',
};

const FLAG_COLORS = {
  outside_geofence: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  location_inconsistent: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  low_device_activity: { bg: 'rgba(156,163,175,0.12)', color: '#6b7280' },
  suspicious_motion: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  identity_unverified: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

function FlagBadge({ flag }) {
  const label = FLAG_LABELS[flag] || flag.replace(/_/g, ' ');
  const style = FLAG_COLORS[flag] || { bg: 'rgba(0,0,0,0.08)', color: 'var(--text-secondary)' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '99px',
      fontSize: '0.7rem',
      fontWeight: 600,
      marginRight: '4px',
      marginBottom: '4px',
      background: style.bg,
      color: style.color,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

export default function Suspicious() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuspiciousData();
  }, []);

  const fetchSuspiciousData = async () => {
    try {
      setLoading(true);
      const response = await api.getSuspiciousActivities();
      setData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch suspicious activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ width: '24px', height: '24px', border: '3px solid var(--accents-2)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      </Layout>
    );
  }

  const records = data?.suspiciousAttendances || [];
  const highRiskCount = data?.highRiskCount ?? records.filter(r => r.presenceScore?.riskLevel === 'high').length;

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-primary)' }}>Suspicious Activity</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Flagged sessions detected by motion analysis and the Presence Engine.</p>
          </div>
          <button className="v-btn" onClick={fetchSuspiciousData}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ marginRight: '0.5rem' }}>
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="v-card" style={{ borderLeft: '3px solid var(--geist-error)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Flagged Attendances</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.04em', lineHeight: 1 }}>{records.length}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Requiring manual investigation</p>
          </div>
          <div className="v-card" style={{ borderLeft: '3px solid var(--geist-warning)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>High Risk Sessions</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.04em', lineHeight: 1 }}>{highRiskCount}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Score &lt; 30 with multiple anomaly flags</p>
          </div>
        </div>

        {/* Flagged Attendances Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Flagged Attendances</h2>
          <div className="v-card" style={{ padding: 0, overflow: 'hidden' }}>
            {records.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="v-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Date</th>
                      <th>Score</th>
                      <th>Risk</th>
                      <th>Anomaly Flags</th>
                      <th>Status</th>
                      {/* <th style={{ textAlign: 'right' }}>Actions</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => {
                      const ps = record.presenceScore;
                      const riskColor = ps?.riskLevel === 'high'
                        ? 'var(--geist-error)'
                        : ps?.riskLevel === 'medium'
                          ? 'var(--geist-warning)'
                          : 'var(--text-secondary)';

                      return (
                        <tr key={record._id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{record.userId?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{record.userId?.email}</div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {format(new Date(record.startTime), 'MMM dd, hh:mm a')}
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: 'var(--geist-error)' }}>
                              {ps?.totalScore ?? Math.round(record.validationScore)}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '2px' }}>/100</span>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '99px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              color: riskColor,
                              background: ps?.riskLevel === 'high'
                                ? 'rgba(239,68,68,0.1)'
                                : ps?.riskLevel === 'medium'
                                  ? 'rgba(245,158,11,0.1)'
                                  : 'var(--accents-1)',
                            }}>
                              {ps?.riskLevel ?? '—'}
                            </span>
                          </td>
                          <td style={{ maxWidth: '280px' }}>
                            {ps?.flags?.length > 0
                              ? ps.flags.map(f => <FlagBadge key={f} flag={f} />)
                              : <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>—</span>
                            }
                            {record.remarks && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {record.remarks}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 500, textTransform: 'capitalize',
                              background: 'rgba(255,0,0,0.1)', color: 'var(--geist-error)'
                            }}>{record.status}</span>
                          </td>
                          {/* <td style={{ textAlign: 'right' }}>
                            <button className="v-btn" style={{ fontSize: '0.75rem', height: '28px' }}>Investigate</button>
                          </td> */}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                No flagged attendances found.
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}
