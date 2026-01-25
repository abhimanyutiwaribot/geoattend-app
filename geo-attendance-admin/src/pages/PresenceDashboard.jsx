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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center text-2xl">
                👥
              </div>
              <div>
                <p className="text-slate-400 text-sm">Active Sessions</p>
                <p className="text-3xl font-bold text-white">{dashboardData?.totalActive || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <p className="text-slate-400 text-sm">Present</p>
                <p className="text-3xl font-bold text-green-400">
                  {dashboardData?.sessions.filter(s => s.presenceScore?.confidence === 'present').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div>
                <p className="text-slate-400 text-sm">Uncertain</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {dashboardData?.sessions.filter(s => s.presenceScore?.confidence === 'uncertain').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center text-2xl">
                🚨
              </div>
              <div>
                <p className="text-slate-400 text-sm">High Risk</p>
                <p className="text-3xl font-bold text-red-400">
                  {dashboardData?.sessions.filter(s => s.presenceScore?.riskLevel === 'high').length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Sessions Table */}
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-4">Active Sessions</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Employee</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Check-in</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Score</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Confidence</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Risk</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Signals</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Flags</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.sessions.map((session) => (
                  <tr
                    key={session.attendanceId}
                    className={`border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors ${session.presenceScore?.riskLevel === 'high' ? 'bg-red-500/5' : ''
                      }`}
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white font-medium">{session.user?.name}</p>
                        <p className="text-slate-400 text-sm">{session.user?.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      {new Date(session.checkInTime).toLocaleTimeString()}
                    </td>
                    <td className="py-4 px-4">
                      {session.presenceScore ? (
                        <span className={`px-3 py-1 rounded-lg border font-bold ${getScoreColor(session.presenceScore.totalScore)}`}>
                          {session.presenceScore.totalScore}
                        </span>
                      ) : (
                        <span className="text-slate-500">Calculating...</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {session.presenceScore ? (
                        <span className={`px-3 py-1 rounded-lg border text-xs font-semibold uppercase ${getConfidenceBadge(session.presenceScore.confidence)}`}>
                          {session.presenceScore.confidence}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-4 px-4">
                      {session.presenceScore ? (
                        <span className={`px-3 py-1 rounded-lg border text-xs font-semibold uppercase ${getRiskBadge(session.presenceScore.riskLevel)}`}>
                          {session.presenceScore.riskLevel}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-4 px-4">
                      {session.presenceScore?.signals && (
                        <div className="flex flex-col gap-1 w-24">
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden" title="Geofence">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                              style={{ width: `${session.presenceScore.signals.geofence}%` }}
                            ></div>
                          </div>
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden" title="Location">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                              style={{ width: `${session.presenceScore.signals.locationConsistency}%` }}
                            ></div>
                          </div>
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden" title="Activity">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all"
                              style={{ width: `${session.presenceScore.signals.deviceActivity}%` }}
                            ></div>
                          </div>
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden" title="Motion">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all"
                              style={{ width: `${session.presenceScore.signals.motionPattern}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {session.presenceScore?.flags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {session.presenceScore.flags.map((flag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                              {flag.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-green-400">✓ No flags</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <button className="btn btn-sm btn-primary">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
