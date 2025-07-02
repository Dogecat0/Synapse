// src/app/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReportViewer from '../../components/ReportViewer';
import { WeeklyReportContent } from '../../lib/reportAgent';

// --- Type Definitions for the Frontend ---
interface ReportMeta {
  id: string;
  type: 'WEEKLY' | 'MONTHLY';
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface FullReport extends ReportMeta {
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  content: WeeklyReportContent | null;
}

// --- Helper Functions ---
const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endDate = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startDate} - ${endDate}`;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportMeta[] | null>(null);
  const [selectedReport, setSelectedReport] = useState<FullReport | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingSelected, setIsLoadingSelected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for the generation form
  const [generateDate, setGenerateDate] = useState(new Date().toISOString().slice(0, 10));

  // --- Data Fetching Functions ---
  const fetchReports = async () => {
    setIsLoadingList(true);
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error('Failed to fetch reports list.');
      const data: ReportMeta[] = await response.json();
      setReports(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleSelectReport = async (id: string) => {
    if (selectedReport?.id === id) return;
    setIsLoadingSelected(true);
    setSelectedReport(null);
    setError(null);
    try {
      const response = await fetch(`/api/reports/${id}`);
      if (!response.ok) {
         const errData = await response.json();
         throw new Error(errData.error || 'Failed to fetch report details.');
      }
      const data: FullReport = await response.json();
      setSelectedReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingSelected(false);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'WEEKLY', date: generateDate }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate report.');
        }
        await fetchReports(); // Refresh the list
        setSelectedReport(data); // Display the new report
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsGenerating(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Navigation Header */}
        <nav className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
            <Link href="/" className="nav-link">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span>Back to Home</span>
            </Link>
            <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <h1 className="text-2xl font-bold text-slate-900">Activity Reports</h1>
            </div>
        </nav>

        {error && (
            <div className="mb-6 tech-card p-4 border-l-4 border-red-500 bg-red-50">
                <p className="text-red-800 font-medium">{error}</p>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Column: Generator and List */}
            <div className="lg:col-span-1">
                <div className="tech-card p-4 space-y-4 mb-6">
                    <h3 className="font-semibold text-slate-800">Generate New Report</h3>
                    <form onSubmit={handleGenerateReport} className="space-y-3">
                        <div>
                            <label htmlFor="report-date" className="block text-sm font-medium text-slate-600 mb-1">Select a week</label>
                            <input
                                type="date"
                                id="report-date"
                                value={generateDate}
                                onChange={(e) => setGenerateDate(e.target.value)}
                                className="tech-input !py-2"
                                disabled={isGenerating}
                            />
                        </div>
                        <button type="submit" className="tech-button-primary w-full" disabled={isGenerating}>
                            {isGenerating ? 'Generating...' : 'Generate Weekly'}
                        </button>
                    </form>
                </div>
                
                <div className="tech-card p-4">
                    <h3 className="font-semibold text-slate-800 mb-3">Available Reports</h3>
                    {isLoadingList ? <p className="text-sm text-slate-500">Loading reports...</p> : (
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {reports && reports.length > 0 ? reports.map(report => (
                                <button
                                    key={report.id}
                                    onClick={() => handleSelectReport(report.id)}
                                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${selectedReport?.id === report.id
                                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                                        : 'bg-slate-50 hover:bg-slate-100 border-transparent'
                                    }`}
                                >
                                    <div className="font-medium text-sm">{report.type} REPORT</div>
                                    <div className="text-xs text-slate-600 mt-1">{formatDateRange(report.startDate, report.endDate)}</div>
                                </button>
                            )) : <p className="text-sm text-slate-500 italic">No reports found.</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Report Viewer */}
            <div className="lg:col-span-3">
                {isLoadingSelected ? (
                    <div className="flex justify-center items-center h-64"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div></div>
                ) : selectedReport ? (
                    <ReportViewer reportContent={selectedReport.content!} />
                ) : (
                    <div className="tech-card p-12 text-center h-full flex flex-col justify-center items-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Select a report to view</h3>
                        <p className="text-slate-600">Choose a report from the list on the left, or generate a new one.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}