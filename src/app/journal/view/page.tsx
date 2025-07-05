'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { JournalEntry, Activity, Category } from '../../../types/journal';

export default function ViewJournalEntries() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const handleDeleteEntry = async (entryId: string) => {
        const entryToDelete = entries.find(entry => entry.id === entryId);
        if (!entryToDelete) return;

        const confirmMessage = `Are you sure you want to delete the journal entry for ${formatDate(entryToDelete.date)}? This action cannot be undone.`;
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/journal/${entryId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete entry');
            }

            // Remove the deleted entry from state
            const updatedEntries = entries.filter(entry => entry.id !== entryId);
            setEntries(updatedEntries);

            // If the deleted entry was selected, select another one or clear selection
            if (selectedEntry?.id === entryId) {
                setSelectedEntry(updatedEntries.length > 0 ? updatedEntries[0] : null);
            }

            // Show success message (you could replace this with a toast notification)
            alert('Journal entry deleted successfully!');

        } catch (error: any) {
            console.error('Error deleting entry:', error);
            alert(`Failed to delete entry: ${error.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Helper function to group activities by category
    const getActivitiesByCategory = (activities: Activity[], categoryName: string) => {
        return activities.filter(activity => activity.category?.name === categoryName);
    };

    // Helper function to get category color
    const getCategoryColor = (category: Category) => {
        return category?.color || '#6B7280';
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
                                            className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${selectedEntry?.id === entry.id
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
                                            <div className="flex items-center gap-4 flex-wrap">
                                                {/* Dynamic category stats */}
                                                {Array.from(new Set(selectedEntry.activities.map(a => a.category?.name))).map(categoryName => {
                                                    const categoryActivities = getActivitiesByCategory(selectedEntry.activities, categoryName);
                                                    const category = categoryActivities[0]?.category;
                                                    return (
                                                        <div key={categoryName} className="flex items-center gap-2 text-sm text-slate-600">
                                                            <div 
                                                                className="w-2 h-2 rounded-full"
                                                                style={{ backgroundColor: getCategoryColor(category) }}
                                                            />
                                                            <span>{categoryActivities.length} {categoryName?.toLowerCase()}</span>
                                                        </div>
                                                    );
                                                })}
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/journal/new?date=${new Date(selectedEntry.date).toISOString().slice(0, 10)}`}
                                                        className="tech-button-secondary flex items-center gap-2 text-sm !py-2 !px-3"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteEntry(selectedEntry.id)}
                                                        disabled={isDeleting}
                                                        className="flex items-center gap-2 text-sm py-2 px-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {isDeleting ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                Deleting...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                                Delete
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Activities by Category */}
                                    {Array.from(new Set(selectedEntry.activities.map(a => a.category?.name))).map(categoryName => {
                                        const categoryActivities = getActivitiesByCategory(selectedEntry.activities, categoryName);
                                        const category = categoryActivities[0]?.category;
                                        return (
                                            <div key={categoryName} className="tech-card p-6">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div 
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: getCategoryColor(category) }}
                                                    />
                                                    <h3 className="text-xl font-semibold text-slate-900 capitalize">
                                                        {categoryName}
                                                    </h3>
                                                    <div 
                                                        className="tech-badge"
                                                        style={{ 
                                                            backgroundColor: `${getCategoryColor(category)}20`,
                                                            color: getCategoryColor(category)
                                                        }}
                                                    >
                                                        {categoryActivities.length} activities
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    {categoryActivities.map((activity) => (
                                                        <div 
                                                            key={activity.id} 
                                                            className="p-4 bg-slate-50 rounded-lg border-l-4"
                                                            style={{ borderLeftColor: getCategoryColor(category) }}
                                                        >
                                                            <div className="flex items-start justify-between mb-2">
                                                                <h4 className="font-semibold text-slate-900">{activity.description}</h4>
                                                                {activity.duration && (
                                                                    <div 
                                                                        className="tech-badge"
                                                                        style={{ 
                                                                            backgroundColor: `${getCategoryColor(category)}20`,
                                                                            color: getCategoryColor(category)
                                                                        }}
                                                                    >
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
                                                                        <span 
                                                                            key={tag.id} 
                                                                            className="tech-badge"
                                                                            style={{ 
                                                                                backgroundColor: `${getCategoryColor(category)}20`,
                                                                                color: getCategoryColor(category)
                                                                            }}
                                                                        >
                                                                            #{tag.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
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