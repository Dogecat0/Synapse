// src/types/agents.ts
import { Activity } from './models'; // Reuse our core model type

// For Search Agent
export interface SummarySection {
    title: string;
    content: string;
}

export interface TimeSpent {
    totalMinutes?: number;
    breakdown?: string;
}

export interface Summary {
    mainSummary: string;
    sections?: SummarySection[];
    timeSpent?: TimeSpent;
}

export interface SearchResult {
    summary: Summary;
    activities: Activity[];
    keywords: string[];
}

// For Report Agent
export interface WeeklyReportContent { /* ... */ }