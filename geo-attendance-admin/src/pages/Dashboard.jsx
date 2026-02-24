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
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading Dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-10 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">System Summary</h2>
            <p className="text-slate-400 mt-1 font-medium">Daily attendance and staff overview</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">System Live</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SimpleStatCard
            title="Total Staff"
            value={stats?.overview?.totalUsers || 0}
            icon="👥"
            color="emerald"
          />
          <SimpleStatCard
            title="Checked In"
            value={stats?.overview?.activeSessions || 0}
            icon="✅"
            color="sky"
          />
          <SimpleStatCard
            title="On Leave"
            value={stats?.stats?.totalOnLeave || 0}
            icon="🏖️"
            color="indigo"
          />
          <SimpleStatCard
            title="Flagged"
            value={stats?.overview?.suspiciousActivities || 0}
            icon="🚨"
            color="rose"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Attendance */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Weekly Attendance</h3>
            {stats?.weeklyTrend && stats.weeklyTrend.length > 0 ? (
              <div className="space-y-4">
                {stats.weeklyTrend.map((day) => (
                  <div key={day._id} className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-500 w-24 uppercase tracking-tighter">{day._id}</span>
                    <div className="flex-1 h-3 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min((day.count / (stats?.overview?.totalUsers || 10)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-300 w-8">{day.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-xs font-bold text-slate-600 uppercase tracking-widest italic">No Trend Data Available</p>
            )}
          </div>

          {/* Productivity / Health Stats */}
          {/* <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Attendance Health</h3>

            <div className="space-y-4">
              <HealthItem label="Activity Score" value="94.2%" color="text-emerald-400" />
              <HealthItem label="Avg Presence" value="7.8h" color="text-sky-400" />
              <HealthItem label="Verification Rate" value="99.1%" color="text-indigo-400" />
            </div>

            <div className="pt-6 border-t border-slate-800">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
              <button className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-white rounded-2xl text-xs font-bold transition-all active:scale-95">
                Download Daily Report
              </button>
            </div>
          </div> */}
        </div>

        <div className="pt-8 text-center opacity-20">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">System Overview Dashboard</p>
        </div>
      </div>
    </Layout>
  );
}

function SimpleStatCard({ title, value, icon, color }) {
  const colors = {
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
    sky: 'border-sky-500/20 bg-sky-500/5 text-sky-400',
    indigo: 'border-indigo-500/20 bg-indigo-500/5 text-indigo-400',
    rose: 'border-rose-500/20 bg-rose-500/5 text-rose-400',
  };

  return (
    <div className={`p-6 rounded-[2.5rem] border ${colors[color]} transition-all hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
    </div>
  );
}

function HealthItem({ label, value, color }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{label}</span>
      <span className={`text-sm font-black ${color} tracking-tight`}>{value}</span>
    </div>
  );
}
