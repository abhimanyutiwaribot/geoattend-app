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
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white">Suspicious Activities</h2>
          <button onClick={fetchSuspiciousData} className="btn btn-secondary text-sm">
            Refresh Data
          </button>
        </div>

        {/* Overview Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card border-l-4 border-red-500">
            <h3 className="text-lg font-semibold text-white mb-2">Flagged Attendances</h3>
            <p className="text-3xl font-bold text-white">{data?.suspiciousAttendances?.length || 0}</p>
            <p className="text-sm text-slate-400 mt-1">Requiring manual investigation</p>
          </div>
          <div className="card border-l-4 border-yellow-500">
            <h3 className="text-lg font-semibold text-white mb-2">Failed Challenges</h3>
            <p className="text-3xl font-bold text-white">{data?.failedChallenges?.length || 0}</p>
            <p className="text-sm text-slate-400 mt-1">Past 24 hours</p>
          </div>
        </div>

        {/* Flagged Attendances Table */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center">
            <svg className="w-6 h-6 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Recent Flagged Attendances
          </h3>
          <div className="card overflow-hidden p-0">
            {data?.suspiciousAttendances?.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.suspiciousAttendances.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <div className="font-medium text-white">{record.userId?.name}</div>
                        <div className="text-xs text-slate-400">{record.userId?.email}</div>
                      </td>
                      <td className="text-slate-300">
                        {format(new Date(record.startTime), 'MMM dd, hh:mm a')}
                      </td>
                      <td>
                        <span className="text-red-500 font-bold">{Math.round(record.validationScore)}</span>
                      </td>
                      <td>
                        <span className="status-badge bg-red-600/20 text-red-400">
                          {record.status}
                        </span>
                      </td>
                      <td>
                        <button className="text-primary-500 hover:text-primary-400 font-medium text-sm">
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-400">No flagged attendances found.</div>
            )}
          </div>
        </div>

        {/* Failed Challenges List */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center">
            <svg className="w-6 h-6 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0012 18.75V19a2 2 0 11-4 0v-.25c0-1.035-.394-1.978-1.036-2.683l-.387-.387z" />
            </svg>
            Recent Failed Verification Challenges
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.failedChallenges?.length > 0 ? (
              data.failedChallenges.map((challenge) => (
                <div key={challenge._id} className="card bg-slate-800/50 border border-slate-700">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-white">{challenge.userId?.name}</p>
                      <p className="text-xs text-slate-400">{format(new Date(challenge.createdAt), 'MMM dd, hh:mm:ss a')}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${challenge.status === 'failed' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                      {challenge.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Challenge Type:</span>
                      <span className="text-white capitalize">{challenge.challengeType}</span>
                    </div>
                    {challenge.userAnswer && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">User Answer:</span>
                        <span className="text-red-400">{challenge.userAnswer}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Response Time:</span>
                      <span className="text-white">{challenge.responseTime ? `${(challenge.responseTime / 1000).toFixed(2)}s` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 card p-8 text-center text-slate-400">No recent failed challenges.</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
