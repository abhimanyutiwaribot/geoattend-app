import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Layout from '../components/layout/Layout';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.getDashboard();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Users"
            value={stats?.overview?.totalUsers || 0}
            icon={<UsersIcon />}
            color="bg-blue-600"
          />
          <StatsCard
            title="Active Sessions"
            value={stats?.overview?.activeSessions || 0}
            icon={<ActiveIcon />}
            color="bg-green-600"
          />
          <StatsCard
            title="Today's Attendance"
            value={stats?.overview?.todayAttendances || 0}
            icon={<CalendarIcon />}
            color="bg-purple-600"
          />
          <StatsCard
            title="Suspicious Activities"
            value={stats?.overview?.suspiciousActivities || 0}
            icon={<AlertIcon />}
            color="bg-red-600"
          />
        </div>

        {/* Weekly Trend */}
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-4">Weekly Attendance Trend</h3>
          {stats?.weeklyTrend && stats.weeklyTrend.length > 0 ? (
            <div className="space-y-3">
              {stats.weeklyTrend.map((day) => (
                <div key={day._id} className="flex items-center">
                  <span className="text-slate-400 w-32">{day._id}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-primary-600 h-full flex items-center justify-end px-3"
                      style={{ width: `${Math.min((day.count / 50) * 100, 100)}%` }}
                    >
                      <span className="text-white text-sm font-medium">{day.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">No data available</p>
          )}
        </div>

        {/* Recent Challenges */}
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-2">
            <ActivityItem
              title="Recent Challenges"
              value={stats?.overview?.recentChallenges || 0}
              description="Cognitive challenges in last 24 hours"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatsCard({ title, value, icon, color }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ title, value, description }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
      <div>
        <p className="text-white font-medium">{title}</p>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>
      <span className="text-2xl font-bold text-primary-600">{value}</span>
    </div>
  );
}

// Icons
function UsersIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ActiveIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
