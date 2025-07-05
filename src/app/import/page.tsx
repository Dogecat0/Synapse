// src/app/import/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ImportPage() {
    const [journalText, setJournalText] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [progressLog, setProgressLog] = useState<string[]>([]);
    
    const handleImport = async () => {
        if (!journalText.trim()) {
            alert('Please paste your journal text into the text area.');
            return;
        }

        setIsImporting(true);
        setProgressLog([]);

        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ journalText }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start import process.');
            }

            // Process the streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Failed to get response reader.');
            }
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                // Split by newline in case multiple messages arrive in one chunk
                const messages = chunk.split('\n').filter(Boolean);
                setProgressLog(prev => [...prev, ...messages]);
            }

        } catch (error: any) {
            setProgressLog(prev => [...prev, `❌ Client-side error: ${error.message}`]);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* ... (Your existing nav and instructions JSX) ... */}
                <nav className="flex items-center justify-between mb-8">
                    <Link href="/" className="nav-link">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        <span>Back to Home</span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Import Journal</h1>
                        <p className="text-slate-600">Use AI to parse and categorize your plain text journal.</p>
                    </div>
                </nav>
                <div className="p-4 space-y-2 p-6 mb-6 border-l-4 border-blue-400 bg-cyan-100">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Important Prerequisites
                    </h3>
                    <ol className="list-decimal list-inside text-blue-800 space-y-2 text-sm pl-2">
                        <li>
                            You must create <strong>custom categories</strong> for your activities. This can be done on the <Link href="/categories" className="font-bold underline hover:text-blue-600">Categories Page</Link>.
                        </li>
                        <li>
                            <strong>Every custom category must have a description.</strong> The AI uses these descriptions to accurately classify your journal entries. Imports will fail if any custom category is missing a description.
                        </li>
                         <li>
                            Format your journal text with each day starting on a new line with a date (e.g., `2024-07-25`).
                        </li>
                    </ol>
                </div>

                <div className="space-y-6">
                    <textarea
                        value={journalText}
                        onChange={(e) => setJournalText(e.target.value)}
                        placeholder="Paste your journal text here...

2024-07-25
WORK:
- Attended the daily standup (15m)
- Coded the new import feature for Synapse (4h)
LIFE:
- Went for a 5km run"
                        className="tech-textarea w-full h-64 font-mono text-sm"
                        disabled={isImporting}
                    />
                    <button onClick={handleImport} className="tech-button-primary w-full" disabled={isImporting}>
                        {isImporting ? 'Importing, please wait...' : 'Start Import'}
                    </button>
                    {(progressLog.length > 0) && (
                        <div className="p-4 space-y-2 bg-slate-800 text-white rounded-lg shadow">
                            <h3 className="font-semibold">Import Log</h3>
                            <div className="max-h-120 overflow-y-auto font-mono text-sm space-y-1">
                                {progressLog.map((log, index) => (
                                    <p key={index} className="whitespace-pre-wrap">{log}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}