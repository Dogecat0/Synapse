// src/components/ReportViewer.tsx

import ReactMarkdown from 'react-markdown';
import { WeeklyReportContent } from '../lib/reportAgent';

interface ReportViewerProps {
    reportContent: WeeklyReportContent;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ reportContent }) => {

    const { title, summary, timeAnalysis, keyActivities, tagAnalysis, insightsAndTrends } = reportContent;
    const professionalPercent = timeAnalysis.totalMinutes > 0 ? (timeAnalysis.professionalMinutes / timeAnalysis.totalMinutes) * 100 : 0;
    const projectPercent = timeAnalysis.totalMinutes > 0 ? (timeAnalysis.projectMinutes / timeAnalysis.totalMinutes) * 100 : 0;

    return (
        <div className="tech-card p-6 md:p-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="pb-4 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            </div>

            {/* AI Summary */}
            <div className="prose prose-slate max-w-none">
                <ReactMarkdown>{summary}</ReactMarkdown>
            </div>

            {/* Time Analysis */}
            <section>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Time Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-slate-900">{Math.floor(timeAnalysis.totalMinutes / 60)}h {timeAnalysis.totalMinutes % 60}m</div>
                        <div className="text-sm text-slate-500">Total Time</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-800">{Math.floor(timeAnalysis.professionalMinutes / 60)}h {timeAnalysis.professionalMinutes % 60}m</div>
                        <div className="text-sm text-blue-600">Professional Time</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-800">{Math.floor(timeAnalysis.projectMinutes / 60)}h {timeAnalysis.projectMinutes % 60}m</div>
                        <div className="text-sm text-purple-600">Project Time</div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-800">{Math.floor(timeAnalysis.lifeMinutes / 60)}h {timeAnalysis.lifeMinutes % 60}m</div>
                        <div className="text-sm text-emerald-600">Life Time</div>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="text-sm font-medium text-slate-600 mb-2 text-center">{timeAnalysis.breakdownRatio}</div>
                    <div className="w-full bg-emerald-200 rounded-full h-2.5 flex">
                        <div className="bg-blue-500 h-2.5 rounded-l-full" style={{ width: `${professionalPercent}%` }}></div>
                        <div className="bg-purple-500 h-2.5" style={{ width: `${projectPercent}%` }}></div>
                    </div>
                </div>
            </section>
            
            {/* Key Activities */}
            <section>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Key Activities</h3>
                <div className="space-y-3">
                    {keyActivities.map((activity, index) => (
                        <div key={index} className={`p-3 rounded-lg border-l-4 ${
                            activity.category === 'PROFESSIONAL' ? 'bg-blue-50 border-blue-400' : 
                            activity.category === 'PROJECT' ? 'bg-purple-50 border-purple-400' : 
                            'bg-emerald-50 border-emerald-400'
                        }`}>
                            <p className="font-medium text-slate-800">{activity.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tag Analysis */}
            <section>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Tag Analysis</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs text-slate-700 uppercase">
                            <tr>
                                <th className="px-4 py-2">Tag</th>
                                <th className="px-4 py-2 text-right">Time Spent</th>
                                <th className="px-4 py-2 text-right">Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tagAnalysis.map((tag, index) => (
                                <tr key={index} className="border-b border-slate-200">
                                    <td className="px-4 py-2 font-medium">#{tag.tag}</td>
                                    <td className="px-4 py-2 text-right">{Math.floor(tag.minutes / 60)}h {tag.minutes % 60}m</td>
                                    <td className="px-4 py-2 text-right">{tag.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Insights and Trends */}
            <section>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Insights & Trends</h3>
                <div className="prose prose-slate max-w-none p-4 bg-slate-50 rounded-lg">
                    <ReactMarkdown>{insightsAndTrends}</ReactMarkdown>
                </div>
            </section>
        </div>
    );
};

export default ReportViewer;