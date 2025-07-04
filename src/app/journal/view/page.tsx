'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Tag {
    id: string;
    name: string;
}

interface Activity {
    id: string;
    description: string;
    duration: number | null;
    notes: string | null;
    category: string;
    tags: Tag[];
}

interface JournalEntry {
    id: string;
    date: string;
    activities: Activity[];
}

export default function ViewJournalEntries() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

    useEffect(() => {
        async function fetchEntries() {
            try {
                const response = await fetch('/api/journal');

                if (!response.ok) {
                    throw new Error('Failed to fetch entries');
                }

                const data = await response.json();

                // Ensure tags is always an array
                const processedData = data.map(entry => ({
                    ...entry,
                    activities: entry.activities.map(activity => ({
                        ...activity,
                        tags: activity.tags || []
                    }))
                }));

                setEntries(processedData);
                if (processedData.length > 0) {
                    setSelectedEntry(processedData[0]);
                }
            } catch (err) {
                setError('Error loading journal entries');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchEntries();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Navigation Header */}
                <nav className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                    <Link href="/" className="nav-link">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>Back to Home</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h1 className="text-2xl font-bold text-slate-900">Journal Entries</h1>
                        {entries.length > 0 && (
                            <div className="tech-badge-blue">{entries.length} entries</div>
                        )}
                    </div>
                </nav>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="flex items-center gap-3 text-slate-600">
                            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                            <span className="text-lg">Loading entries...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="tech-card p-6 border-l-4 border-red-500 bg-red-50">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-red-800 font-medium">{error}</span>
                        </div>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="tech-card p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">No entries found</h3>
                        <p className="text-slate-600 mb-6">Start by creating your first journal entry to track your activities.</p>
                        <Link href="/journal/new" className="tech-button-primary">
                            Create Your First Entry
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Entries List */}
                        <div className="lg:col-span-1">
                            <div className="tech-card p-6 sticky top-8">
                                <h2 className="text-lg font-semibold text-slate-900 mb-4">Entries Timeline</h2>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {entries.map(entry => (
                                        <button
                                            key={entry.id}
                                            onClick={() => setSelectedEntry(entry)}
                                            className={`w-full text-left p-3 rounded-lg ${selectedEntry?.id === entry.id
                                                ? 'bg-blue-50 border-2 border-blue-200 text-blue-900'
                                                : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                                                }`}
                                        >
                                            <div className="font-medium text-sm">
                                                {formatDate(entry.date)}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {entry.activities.length} activities
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Entry Details */}
                        <div className="lg:col-span-3">
                            {selectedEntry ? (
                                <div className="space-y-6">
                                    {/* Entry Header */}
                                    <div className="tech-card p-6">
                                        <div className="flex items-center justify-between flex-wrap gap-4">
                                            <h2 className="text-2xl font-bold text-slate-900">
                                                {formatDate(selectedEntry.date)}
                                            </h2>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <div className="status-work"></div>
                                                    <span>{selectedEntry.activities.filter(a => a.category === 'PROFESSIONAL').length} professional</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <div className="status-indicator bg-purple-500"></div>
                                                    <span>{selectedEntry.activities.filter(a => a.category === 'PROJECT').length} project</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <div className="status-life"></div>
                                                    <span>{selectedEntry.activities.filter(a => a.category === 'LIFE').length} life</span>
                                                </div>
                                                <Link
                                                    href={`/journal/new?date=${new Date(selectedEntry.date).toISOString().slice(0, 10)}`}
                                                    className="tech-button-secondary flex items-center gap-2 text-sm !py-2 !px-3"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    <span>Edit</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Professional Activities */}
                                    <div className="tech-card p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="status-work"></div>
                                            <h3 className="text-xl font-semibold text-slate-900">Professional Activities</h3>
                                        </div>
                                        {selectedEntry.activities.filter(a => a.category === 'PROFESSIONAL').length === 0 ? (
                                            <p className="text-slate-500 italic">No professional activities recorded</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {selectedEntry.activities
                                                    .filter(activity => activity.category === 'PROFESSIONAL')
                                                    .map(activity => (
                                                        <div key={activity.id} className="activity-item border-l-4 border-blue-500">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <h4 className="font-semibold text-slate-900">{activity.description}</h4>
                                                                {activity.duration && (
                                                                    <div className="tech-badge-blue">
                                                                        {activity.duration}m
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {activity.notes && (
                                                                <p className="text-slate-700 mb-3">{activity.notes}</p>
                                                            )}
                                                            {Array.isArray(activity.tags) && activity.tags.length > 0 && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {activity.tags.map(tag => (
                                                                        <span key={tag.id} className="tech-badge-blue">
                                                                            #{tag.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Project Activities */}
                                    <div className="tech-card p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="status-indicator bg-purple-500"></div>
                                            <h3 className="text-xl font-semibold text-slate-900">Project Activities</h3>
                                        </div>
                                        {selectedEntry.activities.filter(a => a.category === 'PROJECT').length === 0 ? (
                                            <p className="text-slate-500 italic">No project activities recorded</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {selectedEntry.activities
                                                    .filter(activity => activity.category === 'PROJECT')
                                                    .map(activity => (
                                                        <div key={activity.id} className="activity-item border-l-4 border-purple-500">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <h4 className="font-semibold text-slate-900">{activity.description}</h4>
                                                                {activity.duration && (
                                                                    <div className="tech-badge bg-purple-100 text-purple-800">
                                                                        {activity.duration}m
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {activity.notes && (
                                                                <p className="text-slate-700 mb-3">{activity.notes}</p>
                                                            )}
                                                            {Array.isArray(activity.tags) && activity.tags.length > 0 && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {activity.tags.map(tag => (
                                                                        <span key={tag.id} className="tech-badge bg-purple-100 text-purple-800">
                                                                            #{tag.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Life Activities */}
                                    <div className="tech-card p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="status-life"></div>
                                            <h3 className="text-xl font-semibold text-slate-900">Life Activities</h3>
                                        </div>
                                        {selectedEntry.activities.filter(a => a.category === 'LIFE').length === 0 ? (
                                            <p className="text-slate-500 italic">No life activities recorded</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {selectedEntry.activities
                                                    .filter(activity => activity.category === 'LIFE')
                                                    .map(activity => (
                                                        <div key={activity.id} className="activity-item border-l-4 border-emerald-500">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <h4 className="font-semibold text-slate-900">{activity.description}</h4>
                                                                {activity.duration && (
                                                                    <div className="tech-badge-green">
                                                                        {activity.duration}m
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {activity.notes && (
                                                                <p className="text-slate-700 mb-3">{activity.notes}</p>
                                                            )}
                                                            {Array.isArray(activity.tags) && activity.tags.length > 0 && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {activity.tags.map(tag => (
                                                                        <span key={tag.id} className="tech-badge-green">
                                                                            #{tag.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="tech-card p-12 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Select an entry</h3>
                                    <p className="text-slate-600">Choose an entry from the timeline to view its details</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
