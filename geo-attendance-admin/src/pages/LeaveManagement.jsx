import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Layout from '../components/layout/Layout';

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processingId, setProcessingId] = useState(null);

  const fetchLeaves = async () => {
    try {
      const response = await apiClient.get(`/api/v1/leaves/admin/all?status=${filter}`);
      setLeaves(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLeaves();
  }, [filter]);

  const handleStatusUpdate = async (id, status) => {
    const comment = prompt(`Enter a comment for this ${status}:`);
    if (comment === null) return;

    setProcessingId(id);
    try {
      await apiClient.put(`/api/v1/leaves/admin/${id}/status`, {
        status,
        adminComment: comment
      });
      fetchLeaves();
    } catch (error) {
      alert('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'var(--geist-success)';
      case 'rejected': return 'var(--geist-error)';
      case 'pending': return 'var(--geist-warning)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-primary)' }}>Leave Management</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Review, approve, and manage staff leave requests.</p>
          </div>

          {/* Segmented Control */}
          <div style={{ display: 'flex', background: 'var(--accents-1)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            {['pending', 'approved', 'rejected', 'all'].map((s) => {
              const isActive = filter === s || (filter === '' && s === 'all');
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s === 'all' ? '' : s)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: isActive ? 'var(--text-primary)' : 'transparent',
                    color: isActive ? 'var(--bg-base)' : 'var(--text-secondary)',
                    transition: 'all 0.1s ease',
                    textTransform: 'capitalize'
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6rem 0' }}>
            <div style={{ width: '24px', height: '24px', border: '3px solid var(--accents-2)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div className="v-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="v-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.length > 0 ? leaves.map((leave) => (
                    <tr key={leave._id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{leave.userId?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{leave.userId?.email}</div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {leave.type}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.875rem' }}>
                          {new Date(leave.startDate).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          to {new Date(leave.endDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ maxWidth: '200px' }}>
                        <div style={{
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          fontSize: '0.875rem', color: 'var(--text-secondary)'
                        }} title={leave.reason}>
                          {leave.reason}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(leave.status) }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: getStatusColor(leave.status) }}>
                            {leave.status}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {leave.status === 'pending' ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                              disabled={processingId === leave._id}
                              onClick={() => handleStatusUpdate(leave._id, 'approved')}
                              className="v-btn"
                              style={{ height: '28px', fontSize: '0.75rem', borderColor: 'var(--geist-success)', color: 'var(--geist-success)' }}
                            >
                              Approve
                            </button>
                            <button
                              disabled={processingId === leave._id}
                              onClick={() => handleStatusUpdate(leave._id, 'rejected')}
                              className="v-btn"
                              style={{ height: '28px', fontSize: '0.75rem', borderColor: 'var(--geist-error)', color: 'var(--geist-error)' }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        No leave requests found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
