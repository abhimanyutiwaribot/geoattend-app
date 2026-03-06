import { useState } from 'react';
import { api } from '../api/client';
import Layout from '../components/layout/Layout';
import { format } from 'date-fns';

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [options, setOptions] = useState({
    type: 'daily_attendance',
    startDate: format(new Date().setDate(new Date().getDate() - 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const response = await api.generateReport(options);
      setReport(response.data.data.report);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please check the dates and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!report || !report.data) return;

    const headers = Object.keys(report.data[0] || {}).join(',');
    const rows = report.data.map(item => Object.values(item).join(',')).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${report.type}_${report.dateRange.startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-primary)' }}>Reports & Analytics</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Generate and export system-wide data extracts.</p>
          </div>
        </div>

        {/* Configuration Card */}
        <div className="v-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Report Type</label>
              <select
                value={options.type}
                onChange={(e) => setOptions(prev => ({ ...prev, type: e.target.value }))}
                style={{
                  width: '100%', padding: '0.625rem', background: 'var(--bg-base)', border: '1px solid var(--border)',
                  borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none'
                }}
              >
                <option value="daily_attendance">Daily Attendance Summary</option>
                <option value="suspicious_activity">Suspicious Activity Report</option>
                <option value="user_analytics">User Performance Analytics</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Start Date</label>
              <input
                type="date"
                value={options.startDate}
                onChange={(e) => setOptions(prev => ({ ...prev, startDate: e.target.value }))}
                style={{
                  width: '100%', padding: '0.625rem', background: 'var(--bg-base)', border: '1px solid var(--border)',
                  borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', colorScheme: 'dark'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>End Date</label>
              <input
                type="date"
                value={options.endDate}
                onChange={(e) => setOptions(prev => ({ ...prev, endDate: e.target.value }))}
                style={{
                  width: '100%', padding: '0.625rem', background: 'var(--bg-base)', border: '1px solid var(--border)',
                  borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', colorScheme: 'dark'
                }}
              />
            </div>
          </div>
          <div>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="v-btn v-btn-primary"
              style={{ background: '#fff', color: '#000', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Report Display */}
        {report && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.25rem 0', textTransform: 'capitalize' }}>
                  {report.type.replace(/_/g, ' ')}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Range: {format(new Date(report.dateRange.startDate), 'MMM dd, yyyy')} - {format(new Date(report.dateRange.endDate), 'MMM dd, yyyy')}
                </p>
              </div>
              <button onClick={handleDownloadCSV} className="v-btn">
                Download CSV
              </button>
            </div>

            <div className="v-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="v-table">
                  <thead>
                    <tr>
                      {report.data.length > 0 && Object.keys(report.data[0]).map(key => (
                        <th key={key} style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.map((row, idx) => (
                      <tr key={idx}>
                        {Object.entries(row).map(([key, value], vIdx) => (
                          <td key={vIdx} style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                            {typeof value === 'number' && key.toLowerCase().includes('rate')
                              ? `${(value * 100).toFixed(1)}%`
                              : typeof value === 'number' && key.toLowerCase().includes('duration')
                                ? `${Math.round(value)}m`
                                : typeof value === 'object' && value !== null ? JSON.stringify(value)
                                  : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {report.data.length === 0 && (
                <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  No data points found for this report and date range.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
