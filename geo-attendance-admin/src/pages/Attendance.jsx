import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Layout from '../components/layout/Layout';
import { format } from 'date-fns';

export default function Attendance() {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    status: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchAttendances();
  }, [filters]);

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const response = await api.getAttendances(filters);
      setAttendances(response.data.data.attendances);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch attendances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
  };

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-primary)' }}>Attendance History</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>View session logs, tracking metrics, and identity verifications.</p>
          </div>
          {/* <button className="v-btn v-btn-primary" style={{ background: '#fff', color: '#000' }}>Export Logs</button> */}
        </div>

        {/* Filters */}
        <div className="v-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              style={{
                width: '100%', padding: '0.625rem', background: 'var(--bg-base)', border: '1px solid var(--border)',
                borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none'
              }}
            >
              <option value="">All Statuses</option>
              <option value="tentative">Tentative</option>
              <option value="confirmed">Confirmed</option>
              <option value="flagged">Flagged</option>
              <option value="completed">Completed</option>
              <option value="invalid">Invalid</option>
            </select>
          </div>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              style={{
                width: '100%', padding: '0.625rem', background: 'var(--bg-base)', border: '1px solid var(--border)',
                borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', colorScheme: 'dark'
              }}
            />
          </div>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              style={{
                width: '100%', padding: '0.625rem', background: 'var(--bg-base)', border: '1px solid var(--border)',
                borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', colorScheme: 'dark'
              }}
            />
          </div>
          <button
            onClick={() => setFilters({ page: 1, status: '', startDate: '', endDate: '' })}
            className="v-btn"
            style={{ padding: '0.625rem 1.5rem', height: 'auto' }}
          >
            Reset
          </button>
        </div>

        {/* Table */}
        <div className="v-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 0' }}>
              <div style={{ width: '24px', height: '24px', border: '3px solid var(--accents-2)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : attendances.length === 0 ? (
            <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              No attendance records found matching filters.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="v-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Date</th>
                    <th>Check-in</th>
                    <th>Duration</th>
                    <th>Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{record.userId?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{record.userId?.email || 'N/A'}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {format(new Date(record.startTime), 'MMM dd, yyyy')}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {format(new Date(record.startTime), 'hh:mm a')}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {record.totalDuration ? `${Math.round(record.totalDuration)}m` : '--'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{
                            fontSize: '0.875rem', fontWeight: 600, width: '24px', textAlign: 'right',
                            color: record.validationScore >= 80 ? 'var(--geist-success)' : record.validationScore >= 50 ? 'var(--geist-warning)' : 'var(--geist-error)'
                          }}>
                            {Math.round(record.validationScore)}
                          </span>
                          <div style={{ flex: 1, width: '60px', height: '6px', background: 'var(--accents-2)', borderRadius: '99px' }}>
                            <div style={{
                              height: '100%', borderRadius: '99px',
                              width: `${record.validationScore}%`,
                              background: record.validationScore >= 80 ? 'var(--geist-success)' : record.validationScore >= 50 ? 'var(--geist-warning)' : 'var(--geist-error)'
                            }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 500, textTransform: 'capitalize',
                          background: (record.status === 'confirmed' || record.status === 'completed') ? 'rgba(0,112,243,0.1)' :
                            record.status === 'flagged' ? 'rgba(255,0,0,0.1)' : 'rgba(255,255,255,0.05)',
                          color: (record.status === 'confirmed' || record.status === 'completed') ? 'var(--geist-success)' :
                            record.status === 'flagged' ? 'var(--geist-error)' : 'var(--text-secondary)'
                        }}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination && pagination.total > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Showing {attendances.length} records
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))} disabled={filters.page === 1} className="v-btn" style={{ opacity: filters.page === 1 ? 0.5 : 1 }}>Previous</button>
                    <button onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))} disabled={filters.page === pagination.total} className="v-btn" style={{ opacity: filters.page === pagination.total ? 0.5 : 1 }}>Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
