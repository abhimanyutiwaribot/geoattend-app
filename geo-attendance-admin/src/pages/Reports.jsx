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

    // Simple CSV generator
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
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Reports & Analytics</h2>

        {/* Configuration Card */}
        <div className="card space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Report Type</label>
              <select
                className="input"
                value={options.type}
                onChange={(e) => setOptions(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="daily_attendance">Daily Attendance Summary</option>
                <option value="suspicious_activity">Suspicious Activity Report</option>
                <option value="user_analytics">User Performance Analytics</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Start Date</label>
              <input
                type="date"
                className="input"
                value={options.startDate}
                onChange={(e) => setOptions(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">End Date</label>
              <input
                type="date"
                className="input"
                value={options.endDate}
                onChange={(e) => setOptions(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="btn btn-primary w-full md:w-auto px-12"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {/* Report Display */}
        {report && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white capitalize">
                  {report.type.replace(/_/g, ' ')}
                </h3>
                <p className="text-slate-400">
                  Range: {format(new Date(report.dateRange.startDate), 'MMM dd, yyyy')} - {format(new Date(report.dateRange.endDate), 'MMM dd, yyyy')}
                </p>
              </div>
              <button onClick={handleDownloadCSV} className="btn btn-secondary text-sm">
                Download CSV
              </button>
            </div>

            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      {report.data.length > 0 && Object.keys(report.data[0]).map(key => (
                        <th key={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.map((row, idx) => (
                      <tr key={idx}>
                        {Object.entries(row).map(([key, value], vIdx) => (
                          <td key={vIdx} className="text-slate-300">
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
                <div className="p-12 text-center text-slate-400">
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
