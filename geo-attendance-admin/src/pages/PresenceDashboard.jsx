import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Layout from '../components/layout/Layout';

export default function PresenceDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

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

  useEffect(() => {
    fetchDashboard();
    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 flex-col gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="text-slate-500 font-medium animate-pulse">Checking Attendance Signals...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-[1400px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span className="p-2 bg-emerald-500/10 rounded-xl">�</span>
              Presence Dashboard
            </h2>
            <p className="text-slate-400 mt-1 font-medium italic">Monitoring employee presence via 5-point verification</p>
          </div>
          <div className="flex gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${autoRefresh ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}
            >
              {autoRefresh ? '📡 LIVE REFRESH ON' : '⏸️ PAUSED'}
            </button>
            <button
              onClick={fetchDashboard}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-100 font-bold text-xs hover:bg-slate-700 active:scale-95 transition-all"
            >
              REFRESH
            </button>
          </div>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <SignalStat label="Total Staff单位" value={dashboardData?.stats?.totalUsers || 0} icon="👥" color="slate" />
          <SignalStat label="Present" value={dashboardData?.stats?.totalActive || 0} icon="✅" color="emerald" />
          <SignalStat label="On Leave" value={dashboardData?.stats?.totalOnLeave || 0} icon="🏖️" color="sky" />
          <SignalStat label="Absent" value={dashboardData?.stats?.totalAbsent || 0} icon="⚠️" color="rose" />
          <SignalStat label="Uncertain" value={dashboardData?.sessions.filter(s => s.presenceScore?.confidence === 'uncertain').length || 0} icon="❓" color="amber" />
          <SignalStat label="High Risk" value={dashboardData?.sessions.filter(s => s.presenceScore?.riskLevel === 'high').length || 0} icon="🚨" color="red" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Active Status Feed */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-4 bg-slate-900 border-b border-slate-800">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Live Activity Feed</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-950/50">
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-4 py-4">Check-In</th>
                      <th className="px-4 py-4 text-center">Presence Signals</th>
                      <th className="px-6 py-4 text-right">Trust Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {dashboardData?.sessions?.length > 0 ? (
                      dashboardData.sessions.map((session) => (
                        <tr key={session.attendanceId} className="hover:bg-slate-800/20 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-400 border border-slate-700 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition-all">
                                {session.user?.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white tracking-tight">{session.user?.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter italic opacity-70">
                                  {session.user?.employeeId}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-5">
                            <span className="text-xs font-mono text-slate-400">
                              {session.startTime ? new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex justify-center gap-3">
                              <SignalMeter label="ZONE" score={session.presenceScore?.signals?.geofence} icon="📍" />
                              <SignalMeter label="PATH" score={session.presenceScore?.signals?.locationConsistency} icon="📡" />
                              <SignalMeter label="DEVICE" score={session.presenceScore?.signals?.deviceActivity} icon="📱" />
                              <SignalMeter label="MOTION" score={session.presenceScore?.signals?.motionPattern} icon="🏃" />
                              <SignalMeter label="FACE" score={session.presenceScore?.signals?.faceIdentity} icon="👤" />
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <TrustBadge score={session.presenceScore?.totalScore} status={session.presenceScore?.confidence} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-20 text-center text-slate-600 font-bold uppercase tracking-widest bg-slate-900/10">No Employees Checked In</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar lists */}
          <div className="lg:col-span-4 space-y-6">
            <SideList title="Employees on Leave" data={dashboardData?.onLeave} type="leave" />
            <SideList title="Absent Employees" data={dashboardData?.absent} type="absent" />
          </div>
        </div>

        <div className="pt-10 flex items-center justify-between opacity-30">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Attendance System V1.1</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Last Updated: {dashboardData?.timestamp ? new Date(dashboardData.timestamp).toLocaleTimeString() : '---'}
          </p>
        </div>
      </div>
    </Layout>
  );
}

function SignalStat({ label, value, icon, color }) {
  const labelClean = label === "Total Staff单位" ? "Total Staff" : label;
  const colors = {
    slate: 'bg-slate-950 border-slate-800 text-slate-400',
    emerald: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400',
    sky: 'bg-sky-500/5 border-sky-500/10 text-sky-400',
    rose: 'bg-rose-500/5 border-rose-500/10 text-rose-400',
    amber: 'bg-amber-500/5 border-amber-500/10 text-amber-400',
    red: 'bg-red-500/5 border-red-500/10 text-red-500'
  };
  return (
    <div className={`p-4 rounded-2xl border ${colors[color]} flex flex-col gap-1 transition-all hover:-translate-y-1`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest">{labelClean}</span>
        <span className="text-xs opacity-50">{icon}</span>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function SignalMeter({ label, score, icon }) {
  // Map score to 4 bars
  const bars = [1, 2, 3, 4];
  const activeCount = Math.ceil((score || 0) / 25);

  return (
    <div className="flex flex-col items-center gap-1 group/meter relative">
      <div className="flex items-end gap-[2px] h-4">
        {bars.map((bar) => {
          const isActive = bar <= activeCount;
          const height = 4 + bar * 3;
          return (
            <div
              key={bar}
              className={`w-[3px] rounded-full transition-all duration-500 ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-800'
                }`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
      <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter group-hover/meter:text-emerald-500 transition-colors">
        {label}
      </span>
      {/* Mini Tooltip */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[8px] font-bold text-white opacity-0 group-hover/meter:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
        {score || 0}%
      </div>
    </div>
  );
}

function TrustBadge({ score, status }) {
  const isHigh = score >= 80;
  const isMid = score >= 50 && score < 80;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className={`px-3 py-1 rounded-xl border-2 font-black text-[10px] tracking-widest flex items-center gap-1.5 ${isHigh ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
        isMid ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
          'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
        <div className={`h-1.5 w-1.5 rounded-full ${score >= 50 ? 'animate-pulse' : ''} bg-current`}></div>
        {Math.round(score || 0)}% CONFIDENT
      </div>
      <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter italic">
        {status === 'present' ? 'Verified Present' : status === 'uncertain' ? 'Needs Review' : 'Outdated Data'}
      </span>
    </div>
  );
}

function SideList({ title, data, type }) {
  return (
    <div className="bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm shadow-xl">
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
        <span className="text-[10px] font-black bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{data?.length || 0}</span>
      </div>
      <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
        {data?.length > 0 ? data.map((item, idx) => (
          <div key={idx} className="p-3 rounded-2xl hover:bg-slate-800/50 transition-all flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-slate-700 transition-colors uppercase">
                {type === 'leave' ? item.user?.name?.charAt(0) : item.name?.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-300 tracking-tight">{type === 'leave' ? item.user?.name : item.name}</span>
                <span className="text-[9px] font-black text-slate-600 uppercase italic">
                  {type === 'leave' ? `Until ${new Date(item.until).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : item.employeeId || 'No ID'}
                </span>
              </div>
            </div>
            {type === 'absent' && <div className="h-1.5 w-1.5 rounded-full bg-slate-700"></div>}
          </div>
        )) : (
          <p className="py-10 text-center text-[10px] font-black text-slate-700 uppercase tracking-widest italic">All Staff Present</p>
        )}
      </div>
    </div>
  );
}
