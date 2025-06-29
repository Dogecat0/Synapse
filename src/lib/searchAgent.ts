// src/lib/searchAgent.ts

import { OpenAI } from 'openai';

// --- LLM Configuration ---
const LLM_API_URL = 'http://localhost:11434/v1/';
const LLM_MODEL = 'gemma3n:latest';

const openai = new OpenAI({
    baseURL: LLM_API_URL,
    apiKey: 'ollama',
});

// --- Helper Types ---
interface Activity {
    description: string;
    duration: number | null;
    notes: string | null;
    category: string;
    journalEntry: {
        date: Date;
    };
    tags: { name: string }[];
}


// --- Query Planner (Existing Function) ---

function createPlannerPrompt(query: string): string {
    return `You are a search query planning assistant for a personal journal. Your task is to analyze a user's natural language query and convert it into a JSON object containing an array of precise keywords. These keywords will be used for a database full-text search.

Rules:
- You MUST return ONLY a valid JSON object with a single key "keywords" which is an array of strings.
- Generate between 3 and 7 relevant keywords.
- Include synonyms, related technical terms, and root words to broaden the search scope.
- Exclude conversational words (e.g., "my", "about", "what is", "show me").
- Focus on nouns, verbs, and unique identifiers mentioned in the query.

User Query: "${query}"

Your JSON Output:
`;
}

export async function generateSearchTerms(query: string): Promise<string[]> {
    const prompt = createPlannerPrompt(query);

    try {
        console.log(`[SearchAgent] Generating search terms for query: "${query}"`);

        const completion = await Promise.race([
            openai.chat.completions.create({
                model: LLM_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.0,
                response_format: { type: 'json_object' },
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('LLM request timed out after 30 seconds')), 30000)
            )
        ]) as OpenAI.Chat.Completions.ChatCompletion;

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error('LLM returned an empty response.');
        }

        console.log(`[SearchAgent] LLM raw response: ${content}`);
        const parsedJson = JSON.parse(content);

        if (!parsedJson.keywords || !Array.isArray(parsedJson.keywords)) {
            throw new Error('LLM response did not contain a "keywords" array.');
        }

        const keywords: string[] = parsedJson.keywords.filter((k: any) => typeof k === 'string' && k.trim() !== '');
        
        console.log(`[SearchAgent] Generated keywords:`, keywords);
        return keywords;

    } catch (error) {
        console.error('[SearchAgent] Error generating search terms:', error);
        return query.split(' ').filter(word => word.length > 2);
    }
}


// --- NEW: Synthesizer Agent ---

/**
 * Creates a prompt for the LLM to synthesize a summary from a list of activities.
 * @param query The original user query.
 * @param activities A list of relevant activities retrieved from the database.
 * @returns The structured prompt for the LLM.
 */
function createSynthesizerPrompt(query: string, activities: Activity[]): string {
    const activityContext = activities.map(act => {
        const date = new Date(act.journalEntry.date).toISOString().split('T')[0];
        const duration = act.duration ? `${act.duration}min` : 'N/A';
        const tags = act.tags.map(t => `#${t.name}`).join(' ');
        return `
---
Date: ${date}
Category: ${act.category}
Duration: ${duration}
Tags: ${tags}
Description: ${act.description}
Notes: ${act.notes || 'No notes.'}
---
        `;
    }).join('');

    return `You are a helpful journal analysis assistant. Your task is to synthesize a concise summary based on a user's query and a set of relevant journal entries provided as context.

Answer the user's query directly and professionally. Use a helpful, insightful tone.

Rules:
- Base your entire answer on the provided context. Do not make up information.
- If the context does not contain enough information to answer, state that clearly.
- Structure your answer in markdown format. Use bullet points for key findings or timelines.
- Refer to specific details like duration, dates, and project names from the context.
- Keep the summary focused and under 150 words.

User Query: "${query}"

Context from Journal Entries:
${activityContext}

Your Summary:
`;
}

/**
 * Uses an LLM to generate a natural language summary based on a query and retrieved activities.
 * @param query The original user query.
 * @param activities The list of activities retrieved from the database.
 * @returns A promise that resolves to the AI-generated summary string.
 */
export async function generateSummary(query: string, activities: Activity[]): Promise<string> {
    if (activities.length === 0) {
        return "I couldn't find any activities related to your query. Please try different search terms.";
    }

    const prompt = createSynthesizerPrompt(query, activities);
    
    try {
        console.log('[SearchAgent] Generating summary...');
        const completion = await Promise.race([
            openai.chat.completions.create({
                model: LLM_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('LLM summary request timed out after 45 seconds')), 45000)
            )
        ]) as OpenAI.Chat.Completions.ChatCompletion;

        const summary = completion.choices[0].message.content;
        if (!summary) {
            throw new Error('LLM returned an empty summary.');
        }
        
        console.log('[SearchAgent] Generated summary received.');
        return summary;

    } catch (error) {
        console.error('[SearchAgent] Error generating summary:', error);
        return "I encountered an error while trying to summarize the results. Please try again.";
    }
}