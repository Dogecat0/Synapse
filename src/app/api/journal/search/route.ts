// src/app/api/journal/search/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateSearchTerms, generateSummary } from '../../../../lib/searchAgent';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { query } = body;

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ error: 'Query is required and must be a string' }, { status: 400 });
        }

        // 1. Agentic Step: Use LLM to generate search terms
        const keywords = await generateSearchTerms(query);

        if (!keywords || keywords.length === 0) {
            return NextResponse.json({
                summary: "I couldn't determine any specific keywords from your query. Please try being more descriptive.",
                activities: [],
                keywords: []
            });
        }

        // 2. Retrieval Step: Query database using generated keywords
        const searchFilters = keywords.flatMap(term => [
            { description: { contains: term, mode: 'insensitive' as const } },
            { notes: { contains: term, mode: 'insensitive' as const } },
        ]);

        const relevantActivities = await prisma.activity.findMany({
            where: {
                OR: searchFilters,
            },
            include: {
                journalEntry: {
                    select: { date: true },
                },
                tags: true,
            },
            orderBy: {
                journalEntry: {
                    date: 'desc',
                },
            },
            take: 20,
        });
        
        // 3. Synthesis Step: Use LLM to generate a summary from the results
        const summary = await generateSummary(query, relevantActivities);

        return NextResponse.json({ summary, activities: relevantActivities, keywords });

    } catch (error) {
        console.error('[Search API] Error processing search:', error);
        return NextResponse.json({ error: 'An internal error occurred while processing your search' }, { status: 500 });
    }
}