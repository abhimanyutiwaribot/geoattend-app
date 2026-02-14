import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Layout from '../components/layout/Layout';

export default function PresenceDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchDashboard = async () => {
    try {
      const response = await apiClient.get('/api/v1/admin/presence/dashboard');
      setDashboardData(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchDashboard();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Get confidence badge classes
  const getConfidenceBadge = (confidence) => {
    const badges = {
      present: 'bg-green-500/20 text-green-400 border-green-500/30',
      uncertain: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      absent: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return badges[confidence] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  // Get risk badge classes
  const getRiskBadge = (risk) => {
    const badges = {
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return badges[risk] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  // Get score color classes
  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (score >= 50) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">🎯 Presence Monitoring</h2>
            <p className="text-slate-400 mt-1">Real-time employee presence verification</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`btn ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
            >
              {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
            </button>
            <button onClick={fetchDashboard} className="btn btn-primary">
              🔄 Refresh Now
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card !p-4">
            <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Total Users</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-white">{dashboardData?.stats?.totalUsers || 0}</p>
              <div className="text-slate-500 text-xl">👥</div>
            </div>
          </div>

          <div className="card !p-4 border-l-4 border-l-green-500">
            <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Present</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-green-400">{dashboardData?.stats?.totalActive || 0}</p>
              <div className="text-green-500/50 text-xl">🏠</div>
            </div>
          </div>

          <div className="card !p-4 border-l-4 border-l-blue-500">
            <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">On Leave</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-blue-400">{dashboardData?.stats?.totalOnLeave || 0}</p>
              <div className="text-blue-500/50 text-xl">🏖️</div>
            </div>
          </div>

          <div className="card !p-4 border-l-4 border-l-slate-500">
            <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Absent</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-slate-300">{dashboardData?.stats?.totalAbsent || 0}</p>
              <div className="text-slate-500 text-xl">❓</div>
            </div>
          </div>

          <div className="card !p-4 border-l-4 border-l-yellow-500">
            <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Uncertain</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-yellow-400">
                {dashboardData?.sessions.filter(s => s.presenceScore?.confidence === 'uncertain').length || 0}
              </p>
              <div className="text-yellow-500/50 text-xl">⚠️</div>
            </div>
          </div>

          <div className="card !p-4 border-l-4 border-l-red-500">
            <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">High Risk</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-red-400">
                {dashboardData?.sessions.filter(s => s.presenceScore?.riskLevel === 'high').length || 0}
              </p>
              <div className="text-red-500/50 text-xl">🚨</div>
            </div>
          </div>
        </div>

        {/* Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Sessions Table */}
          <div className="card lg:col-span-2">
            <h3 className="text-xl font-semibold text-white mb-4">🏠 Active Sessions</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Employee</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Check-in</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Score</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Signals</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData?.sessions?.length > 0 ? dashboardData.sessions.map((session) => (
                    <tr
                      key={session.attendanceId}
                      className={`border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors ${session.presenceScore?.riskLevel === 'high' ? 'bg-red-500/5' : ''
                        }`}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-white font-medium">{session.user?.name || 'Unknown'}</p>
                          <p className="text-slate-400 text-xs">{session.user?.employeeId || 'No ID'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300 text-sm">
                        {session.startTime ? new Date(session.startTime).toLocaleTimeString() : '-'}
                      </td>
                      <td className="py-4 px-4">
                        {session.presenceScore ? (
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 rounded border text-xs font-bold w-fit ${getScoreColor(session.presenceScore.totalScore)}`}>
                              {session.presenceScore.totalScore}%
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase">{session.presenceScore.confidence}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">Syncing...</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {session.presenceScore?.signals && (
                          <div className="flex gap-1">
                            {['geofence', 'locationConsistency', 'deviceActivity', 'motionPattern', 'faceIdentity'].map((sig, i) => {
                              const score = session.presenceScore.signals[sig];
                              const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500', 'bg-teal-500'];
                              return (
                                <div key={sig} className="w-1.5 h-6 bg-slate-700 rounded-full overflow-hidden" title={sig}>
                                  <div
                                    className={`w-full ${colors[i]} transition-all`}
                                    style={{ height: `${score}%`, marginTop: `${100 - score}%` }}
                                  ></div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <button className="text-primary-400 hover:text-primary-300 text-xs font-semibold">
                          Analyze
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">No active sessions</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* On Leave List */}
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-4">🏖️ On Leave Today</h3>
            <div className="space-y-4">
              {dashboardData?.onLeave?.length > 0 ? dashboardData.onLeave.map((leave, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-medium">{leave.user?.name}</p>
                      <p className="text-slate-400 text-xs lowercase">{leave.type} leave</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase">
                      Until {new Date(leave.until).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs italic line-clamp-2">"{leave.reason}"</p>
                </div>
              )) : (
                <div className="py-8 text-center text-slate-500 text-sm">
                  Nobody is on leave today.
                </div>
              )}
            </div>

            {/* Absent List */}
            <div className="mt-8 pt-6 border-t border-slate-700">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">❓ Other Absences ({dashboardData?.stats?.totalAbsent || 0})</h4>
              <div className="space-y-2">
                {dashboardData?.absent?.length > 0 ? dashboardData.absent.map((user, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-slate-800/30 transition-colors">
                    <span className="text-slate-300 text-sm font-medium">{user.name}</span>
                    <span className="text-[10px] text-slate-500">{user.employeeId || 'No ID'}</span>
                  </div>
                )) : (
                  <p className="text-xs text-slate-500 italic text-center py-4">
                    Zero unauthorized absences today.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm">
          Last updated: {dashboardData?.timestamp ? new Date(dashboardData.timestamp).toLocaleString() : '-'}
        </div>
      </div>
    </Layout>
  );
}
