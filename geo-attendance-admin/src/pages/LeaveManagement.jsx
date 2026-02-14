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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">🗓️ Leave Management</h2>
            <p className="text-slate-400 mt-1">Review and approve employee leave requests</p>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-lg">
            {['pending', 'approved', 'rejected', 'all'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s === 'all' ? '' : s)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${(filter === s || (filter === '' && s === 'all'))
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-3 px-4 text-slate-400 font-medium text-sm">Employee</th>
                    <th className="py-3 px-4 text-slate-400 font-medium text-sm">Type</th>
                    <th className="py-3 px-4 text-slate-400 font-medium text-sm">Duration</th>
                    <th className="py-3 px-4 text-slate-400 font-medium text-sm">Reason</th>
                    <th className="py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                    <th className="py-3 px-4 text-slate-400 font-medium text-sm text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.length > 0 ? leaves.map((leave) => (
                    <tr key={leave._id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                      <td className="py-4 px-4">
                        <div className="font-medium text-white">{leave.userId?.name}</div>
                        <div className="text-xs text-slate-500">{leave.userId?.email}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="capitalize text-slate-300">{leave.type}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-slate-300">
                          {new Date(leave.startDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          to {new Date(leave.endDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-4 truncate max-w-[200px]" title={leave.reason}>
                        <span className="text-slate-400 text-sm">{leave.reason}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold border uppercase ${getStatusBadge(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {leave.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={processingId === leave._id}
                              onClick={() => handleStatusUpdate(leave._id, 'approved')}
                              className="px-3 py-1 bg-green-600/20 text-green-400 border border-green-600/30 rounded hover:bg-green-600/40 text-xs font-semibold"
                            >
                              Approve
                            </button>
                            <button
                              disabled={processingId === leave._id}
                              onClick={() => handleStatusUpdate(leave._id, 'rejected')}
                              className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/40 text-xs font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500">
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
