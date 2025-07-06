// src/app/search/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { SearchResult, Summary } from '../../types/agents';


// --- Helper Components ---
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full">
        <div className="flex items-center gap-3 text-slate-600">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-lg">Analyzing your journal...</span>
        </div>
    </div>
);

const SummaryRenderer = ({ summary }: { summary: Summary }) => {
    return (
        <div className="prose prose-slate max-w-none">
            <ReactMarkdown>{summary.mainSummary}</ReactMarkdown>
            
            {summary.sections && summary.sections.length > 0 && (
                summary.sections.map((section, index) => (
                    <div key={index} className="mt-4">
                        <h2>{section.title}</h2>
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                ))
            )}

            {summary.timeSpent && (
                <div className="mt-4">
                    <h2>Time Analysis</h2>
                    {summary.timeSpent.totalMinutes !== undefined && (
                        <p>
                            <strong>Total Time:</strong>{' '}
                            {Math.floor(summary.timeSpent.totalMinutes / 60)}h{' '}
                            {summary.timeSpent.totalMinutes % 60}m
                        </p>
                    )}
                    {summary.timeSpent.breakdown && (
                        <ReactMarkdown>{summary.timeSpent.breakdown}</ReactMarkdown>
                    )}
                </div>
            )}
        </div>
    );
};

const SearchPage = () => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<SearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/journal/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch search results.');
            }

            const data: SearchResult = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Navigation Header */}
                <nav className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                    <Link href="/" className="nav-link">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        <span>Back to Home</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                        <h1 className="text-2xl font-bold text-slate-900">Semantic Search</h1>
                    </div>
                </nav>

                {/* Search Form */}
                <form onSubmit={handleSearch} className="mb-8">
                    <div className="tech-card p-6 flex flex-col md:flex-row gap-4 items-center">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., How much time did I spend on the API refactor?"
                            className="tech-input flex-grow"
                            disabled={isLoading}
                        />
                        <button type="submit" className="tech-button-primary w-full md:w-auto" disabled={isLoading || !query.trim()}>
                            {isLoading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </form>

                {/* Results Area */}
                <div className="space-y-8">
                    {isLoading && <LoadingSpinner />}
                    {error && (
                        <div className="tech-card p-6 border-l-4 border-red-500 bg-red-50">
                            <p className="text-red-800 font-medium">{error}</p>
                        </div>
                    )}
                    
                    {!isLoading && !result && !error && (
                         <div className="tech-card p-12 text-center">
                             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                             </div>
                             <h3 className="text-xl font-semibold text-slate-900 mb-2">Ask a question about your journal</h3>
                             <p className="text-slate-600">Get AI-powered summaries of your progress, time allocation, and more.</p>
                         </div>
                    )}

                    {result && (
                        <>
                            {/* AI Summary */}
                            <div className="tech-card p-6">
                                <h2 className="text-xl font-semibold text-slate-900 mb-4">AI Summary</h2>
                                <SummaryRenderer summary={result.summary} />
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                     <p className="text-sm text-slate-500">
                                        <strong>Keywords used:</strong> {result.keywords.join(', ')}
                                     </p>
                                </div>
                            </div>

                            {/* Source Activities */}
                            <div className="tech-card p-6">
                                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                                    Source Activities ({result.activities.length})
                                </h2>
                                <div className="space-y-4">
                                    {result.activities.length > 0 ? result.activities.map(activity => (
                                        <div key={activity.id} className={`activity-item border-l-4`} style={{ borderLeftColor: activity.category.color }}>
                                            <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                                                <h4 className="font-semibold text-slate-900">{activity.description}</h4>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="text-slate-500">{formatDate(activity.journalEntry.date.toString())}</span>
                                                    {activity.duration && (
                                                        <div className={`activity-item border-l-4`} style={{ borderLeftColor: activity.category.color }}>
                                                            {activity.duration}m
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {activity.notes && <p className="text-slate-700 mb-3">{activity.notes}</p>}
                                            {activity.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {activity.tags.map(tag => (
                                                        <span key={tag.name} className={`activity-item border-l-4`} style={{ borderLeftColor: activity.category.color }}>
                                                            #{tag.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )) : <p className="text-slate-500 italic">No activities found for the generated keywords.</p>}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchPage;