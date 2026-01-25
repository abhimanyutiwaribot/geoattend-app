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
      page: 1, // Reset to first page on filter change
    }));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white">Attendance History</h2>
        </div>

        {/* Filters */}
        <div className="card grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
            <select
              name="status"
              className="input text-sm"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="tentative">Tentative</option>
              <option value="confirmed">Confirmed</option>
              <option value="flagged">Flagged</option>
              <option value="completed">Completed</option>
              <option value="invalid">Invalid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              className="input text-sm"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              className="input text-sm"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ page: 1, status: '', startDate: '', endDate: '' })}
              className="btn btn-secondary w-full text-sm"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : attendances.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="table">
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
                          <div className="font-medium text-white">{record.userId?.name || 'Unknown'}</div>
                          <div className="text-xs text-slate-400">{record.userId?.email || 'N/A'}</div>
                        </td>
                        <td className="text-slate-300">
                          {format(new Date(record.startTime), 'MMM dd, yyyy')}
                        </td>
                        <td className="text-slate-300">
                          {format(new Date(record.startTime), 'hh:mm a')}
                        </td>
                        <td className="text-slate-300">
                          {record.totalDuration ? `${Math.round(record.totalDuration)} min` : '--'}
                        </td>
                        <td>
                          <div className="flex items-center space-x-2">
                            <span className={`font-bold ${record.validationScore >= 80 ? 'text-green-500' :
                                record.validationScore >= 50 ? 'text-yellow-500' : 'text-red-500'
                              }`}>
                              {Math.round(record.validationScore)}
                            </span>
                            <div className="flex-1 bg-slate-700 h-1.5 w-16 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${record.validationScore >= 80 ? 'bg-green-500' :
                                    record.validationScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                style={{ width: `${record.validationScore}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${record.status === 'confirmed' || record.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                              record.status === 'flagged' ? 'bg-red-600/20 text-red-400' :
                                'bg-slate-700 text-slate-300'
                            }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.total > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
                  <p className="text-slate-400 text-sm">
                    Showing {attendances.length} records
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={filters.page === 1}
                      className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-white text-sm">
                      Page {pagination.current} of {pagination.total}
                    </span>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={filters.page === pagination.total}
                      className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-slate-400">No attendance records found with the current filters.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
