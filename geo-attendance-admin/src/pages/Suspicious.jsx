import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Layout from '../components/layout/Layout';
import { format } from 'date-fns';

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

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-primary)' }}>Suspicious Activity</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Review flagged sessions and unresolved verification challenges.</p>
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
            <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.04em', lineHeight: 1 }}>{data?.suspiciousAttendances?.length || 0}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Requiring manual investigation</p>
          </div>
          <div className="v-card" style={{ borderLeft: '3px solid var(--geist-warning)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Failed Challenges</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.04em', lineHeight: 1 }}>{data?.failedChallenges?.length || 0}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Past 24 hours</p>
          </div>
        </div>

        {/* Both Lists container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

          {/* Flagged Attendances Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Recent Flagged Attendances</h2>
            <div className="v-card" style={{ padding: 0, overflow: 'hidden' }}>
              {data?.suspiciousAttendances?.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="v-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Date</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.suspiciousAttendances.map((record) => (
                        <tr key={record._id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{record.userId?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{record.userId?.email}</div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{format(new Date(record.startTime), 'MMM dd, hh:mm a')}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: 'var(--geist-error)' }}>{Math.round(record.validationScore)}</span>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 500, textTransform: 'capitalize',
                              background: 'rgba(255,0,0,0.1)', color: 'var(--geist-error)'
                            }}>{record.status}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="v-btn" style={{ fontSize: '0.75rem', height: '28px' }}>Investigate</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No flagged attendances found.</div>
              )}
            </div>
          </div>

          {/* Failed Challenges Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>Recent Failed Verification Challenges</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
              {data?.failedChallenges?.length > 0 ? (
                data.failedChallenges.map((challenge) => (
                  <div key={challenge._id} className="v-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>{challenge.userId?.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{format(new Date(challenge.createdAt), 'MMM dd, hh:mm:ss a')}</p>
                      </div>
                      <span style={{
                        display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: challenge.status === 'failed' ? 'var(--geist-error)' : 'var(--accents-2)',
                        color: challenge.status === 'failed' ? '#fff' : 'var(--text-secondary)'
                      }}>
                        {challenge.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Challenge Type</span>
                        <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{challenge.challengeType}</span>
                      </div>
                      {challenge.userAnswer && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>User Answer</span>
                          <span style={{ color: 'var(--geist-error)', fontWeight: 500 }}>{challenge.userAnswer}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Response Time</span>
                        <span style={{ fontWeight: 500 }}>{challenge.responseTime ? `${(challenge.responseTime / 1000).toFixed(2)}s` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="v-card" style={{ gridColumn: '1 / -1', padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  No recent failed challenges.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
