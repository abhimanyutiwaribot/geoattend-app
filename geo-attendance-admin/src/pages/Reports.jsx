import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Layout from '../components/layout/Layout';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────
const fmt = (iso) => iso ? format(new Date(iso), 'hh:mm a') : '—';
const fmtDate = (iso) => iso ? format(new Date(iso), 'MMM dd, yyyy') : '—';
const fmtDuration = (min) => {
  if (min === null || min === undefined) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const STATUS_STYLE = {
  confirmed: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  completed: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  flagged:   { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  tentative: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
};

const toYMD = (date) => format(date, 'yyyy-MM-dd');

// ─── Quick-Period Presets ──────────── ──────────────────────
const PERIODS = [
  {
    label: 'Today',
    range: () => ({ start: toYMD(startOfDay(new Date())), end: toYMD(new Date()) }),
  },
  {
    label: 'This Week',
    range: () => ({ start: toYMD(startOfWeek(new Date(), { weekStartsOn: 1 })), end: toYMD(endOfWeek(new Date(), { weekStartsOn: 1 })) }),
  },
  {
    label: 'This Month',
    range: () => ({ start: toYMD(startOfMonth(new Date())), end: toYMD(endOfMonth(new Date())) }),
  },
];

// ─── CSV Export ────────────────────────────────────────────
function exportCSV(rows, dateRange) {
  const headers = ['Employee Name', 'Email', 'Date', 'In Time', 'Out Time', 'Duration (min)', 'Status', 'Validation Score'];
  const csvRows = rows.map(r => [
    r.employeeName,
    r.employeeEmail,
    r.date,
    r.inTime ? format(new Date(r.inTime), 'hh:mm a') : '',
    r.outTime ? format(new Date(r.outTime), 'hh:mm a') : '',
    r.duration ?? '',
    r.status,
    r.validationScore ?? '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...csvRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Component ─────────────────────────────────────────────
export default function Reports() {
  const [loading, setLoading]   = useState(false);
  const [report, setReport]     = useState(null);
  const [employees, setEmployees] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);

  const [options, setOptions] = useState({
    startDate: toYMD(startOfWeek(new Date(), { weekStartsOn: 1 })),
    endDate: toYMD(endOfWeek(new Date(), { weekStartsOn: 1 })),
    userId: '',
  });

  // Load employee list on mount
  useEffect(() => {
    api.getEmployees()
      .then(res => setEmployees(res.data.data.employees || []))
      .catch(() => {});
  }, []);

  const applyPeriod = (period, idx) => {
    const { start, end } = period.range();
    setOptions(prev => ({ ...prev, startDate: start, endDate: end }));
    setActivePeriod(idx);
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setReport(null);
      const response = await api.generateReport({
        startDate: options.startDate,
        endDate: options.endDate,
        userId: options.userId || undefined,
      });
      setReport(response.data.data.report);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please check the dates and try again.');
    } finally {
      setLoading(false);
    }
  };

  const rows = report?.rows || [];
  const summary = report?.summary || {};

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-primary)' }}>
              Attendance Reports
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Generate and export session-level attendance records.
            </p>
          </div>
        </div>

        {/* Config Card */}
        <div className="v-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Quick Period Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              QUICK SELECT
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {PERIODS.map((p, i) => (
                <button
                  key={p.label}
                  className="v-btn"
                  onClick={() => applyPeriod(p, i)}
                  style={{
                    fontWeight: activePeriod === i ? 700 : 400,
                    borderColor: activePeriod === i ? 'var(--text-primary)' : 'var(--border)',
                    color: activePeriod === i ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Start Date</label>
              <input
                type="date"
                value={options.startDate}
                onChange={e => { setOptions(p => ({ ...p, startDate: e.target.value })); setActivePeriod(null); }}
                style={{ width: '100%', padding: '0.625rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', colorScheme: 'dark' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>End Date</label>
              <input
                type="date"
                value={options.endDate}
                onChange={e => { setOptions(p => ({ ...p, endDate: e.target.value })); setActivePeriod(null); }}
                style={{ width: '100%', padding: '0.625rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', colorScheme: 'dark' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Employee</label>
              <select
                value={options.userId}
                onChange={e => setOptions(p => ({ ...p, userId: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="v-btn v-btn-primary"
              style={{ background: '#fff', color: '#000', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
            {report && (
              <button
                onClick={() => exportCSV(rows, report.dateRange)}
                className="v-btn"
              >
                ↓ Export CSV
              </button>
            )}
          </div>

        </div>

        {/* Results */}
        {report && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div className="v-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL SESSIONS</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{summary.totalSessions ?? rows.length}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {fmtDate(report.dateRange.startDate)} – {fmtDate(report.dateRange.endDate)}
                </span>
              </div>
              <div className="v-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>AVG DURATION</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{fmtDuration(summary.avgDuration)}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Per completed session</span>
              </div>
              <div className="v-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '1rem', borderLeft: '3px solid var(--geist-error)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>FLAGGED</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: summary.flaggedCount > 0 ? 'var(--geist-error)' : 'var(--text-primary)' }}>
                  {summary.flaggedCount ?? 0}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Suspicious sessions</span>
              </div>
            </div>

            {/* Table */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
                Session Records
                <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                  ({rows.length} {rows.length === 1 ? 'record' : 'records'})
                </span>
              </h2>
            </div>

            <div className="v-card" style={{ padding: 0, overflow: 'hidden' }}>
              {rows.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="v-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Date</th>
                        <th>In Time</th>
                        <th>Out Time</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const st = STATUS_STYLE[row.status] || { bg: 'var(--accents-1)', color: 'var(--text-secondary)' };
                        return (
                          <tr key={idx}>
                            <td>
                              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.employeeName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.employeeEmail}</div>
                            </td>
                            <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(row.date)}</td>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{fmt(row.inTime)}</td>
                            <td style={{ whiteSpace: 'nowrap', color: row.outTime ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {fmt(row.outTime)}
                            </td>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{fmtDuration(row.duration)}</td>
                            <td>
                              <span style={{
                                display: 'inline-block', padding: '2px 9px', borderRadius: '99px',
                                fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
                                background: st.bg, color: st.color
                              }}>
                                {row.status}
                              </span>
                            </td>
                            <td>
                              {row.validationScore !== null && row.validationScore !== undefined ? (
                                <span style={{
                                  fontWeight: 700,
                                  color: row.validationScore >= 80 ? '#22c55e'
                                    : row.validationScore >= 50 ? '#f59e0b'
                                    : '#ef4444'
                                }}>
                                  {row.validationScore}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  No attendance sessions found for this period.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
