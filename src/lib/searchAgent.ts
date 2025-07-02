// src/lib/searchAgent.ts

import { OpenAI } from 'openai';
import * as z from 'zod/v4';

// --- LLM Configuration ---
const LLM_API_URL = 'http://localhost:11434/v1/';
const LLM_MODEL = 'gemma3n:latest';

const openai = new OpenAI({
    baseURL: LLM_API_URL,
    apiKey: 'ollama',
});

// --- Zod Schemas ---
const SearchTermsSchema = z.object({
    keywords: z.array(z.string().describe("A single search keyword. Should be a noun, verb, or specific identifier. Avoid generic words."))
        .min(3)
        .max(7)
        .describe("An array of 3 to 7 relevant keywords for a database search. Include synonyms and technical terms."),
});

const SummarySchema = z.object({
    mainSummary: z.string().describe("A concise overview that directly answers the user's query in a helpful, professional tone"),
    sections: z.array(z.object({
        title: z.string().describe("Section title (e.g., 'Progress', 'Blockers', 'Time Spent')"),
        content: z.string().describe("Markdown-formatted content for this section")
    })).optional().describe("Optional structured sections of the summary with additional details"),
    timeSpent: z.object({
        totalMinutes: z.number().optional().describe("The total time spent on this topic in minutes, if calculable from the entries"),
        breakdown: z.string().optional().describe("A brief breakdown of how time was spent across different activities")
    }).optional().describe("Information about time allocation, if relevant to the query")
});

// --- Helper Types ---
interface Activity {
    id: string;
    description: string;
    duration: number | null;
    notes: string | null;
    category: string;
    journalEntry: {
        date: Date;
    };
    tags: { name: string }[];
}


// --- Query Planner Agent---

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

        const validationResult = SearchTermsSchema.safeParse(parsedJson);

        if (!validationResult.success) {
            console.error('[SearchAgent] LLM response failed Zod validation:', validationResult.error);
            throw new Error('LLM response did not match expected schema.');
        }

        const keywords = validationResult.data.keywords.filter((k: any) => typeof k === 'string' && k.trim() !== '');
        
        console.log(`[SearchAgent] Generated keywords:`, keywords);
        return keywords;

    } catch (error) {
        console.error('[SearchAgent] Error generating search terms:', error);
        return query.split(' ').filter(word => word.length > 2);
    }
}

// --- Reranker Agent ---

const RerankSchema = z.object({
    ranked_ids: z.array(z.string()).describe("An array of activity IDs, sorted from most to least relevant to the user's query. Return an empty array if no activities are relevant.")
}).required();

function createRerankerPrompt(query: string, activities: Activity[]): string {
    const activityContext = activities.map(act => ({
        id: act.id,
        description: act.description,
        notes: act.notes ? act.notes.substring(0, 200) + '...' : 'No notes.'
    }));

    return `You are a relevance ranking assistant. Your task is to analyze a list of journal activities and rank them based on their relevance to a user's query.

Your output must be a JSON object that strictly conforms to the provided JSON Schema. The output should be an array of the original activity IDs, sorted from most to least relevant.

User Query: "${query}"

Candidate Activities (JSON with IDs):
${JSON.stringify(activityContext, null, 2)}

Your JSON Output:
`;
}

export async function rerankActivities(query: string, activities: Activity[]): Promise<Activity[]> {
    if (activities.length === 0) {
        return [];
    }

    const BATCH_SIZE = 10;
    const allRankedIds: string[] = [];
    const schema = z.toJSONSchema(RerankSchema);

    console.log(`[SearchAgent] Starting re-ranking for ${activities.length} activities in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < activities.length; i += BATCH_SIZE) {
        const batch = activities.slice(i, i + BATCH_SIZE);
        const prompt = createRerankerPrompt(query, batch);
        
        console.log(`[SearchAgent] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

        try {
            const completion = await openai.chat.completions.create({
                model: LLM_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.0,
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: 'rerank_activities',
                        schema: schema,
                        strict: true
                    }
                },
            }) as OpenAI.Chat.Completions.ChatCompletion;

            const content = completion.choices[0].message.content;
            if (!content) {
                console.warn(`[SearchAgent] LLM returned an empty response for batch ${i}.`);
                continue;
            }

            const parsedJson = JSON.parse(content);
            const validationResult = RerankSchema.safeParse(parsedJson);
            
            if (!validationResult.success) {
                console.error(`[SearchAgent] Zod validation failed for batch ${i}:`, validationResult.error);
                continue;
            }
            
            const batchRankedIds = validationResult.data.ranked_ids;
            allRankedIds.push(...batchRankedIds);
            console.log(`[SearchAgent] Batch ${Math.floor(i / BATCH_SIZE) + 1} processed, found ${batchRankedIds.length} relevant IDs.`);

        } catch (error) {
            console.error(`[SearchAgent] Error processing batch starting at index ${i}:`, error);
            // Continue to next batch
        }
    }

    console.log(`[SearchAgent] Re-ranking complete. Total relevant IDs found: ${allRankedIds.length}.`);

    if (allRankedIds.length === 0) {
        console.warn('[SearchAgent] No relevant activities found after re-ranking. Falling back to top slice of original candidates.');
        return activities.slice(0, 15);
    }

    const activityMap = new Map(activities.map(a => [a.id, a]));
    const rankedActivities = allRankedIds
        .map(id => activityMap.get(id))
        .filter(Boolean) as Activity[];
    
    return rankedActivities;
}


// --- Synthesizer Agent ---
/**
 * Creates a prompt for the LLM to synthesize a structured summary from a list of activities.
 * @param query The original user query.
 * @param activities A list of relevant activities retrieved from the database.
 * @returns The structured prompt for the LLM.
 */
function createStructuredSynthesizerPrompt(query: string, activities: Activity[], schema: any): string {
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

    return `You are a journal analysis assistant. Your task is to synthesize a structured summary based on a user's query and relevant journal entries.

You must respond with a JSON object that strictly conforms to the provided JSON Schema.

Rules:
- Base your analysis ONLY on the provided journal entries. Do not invent information.
- If the entries are insufficient to answer the query, state this in the mainSummary.
- Keep the mainSummary concise (under 150 words).
- Only include sections and keyFindings that are relevant to the query.
- When analyzing time spent, calculate totals based on the Duration field.
- Use markdown formatting in section content for better readability.

The JSON Schema for your response is:
${JSON.stringify(schema, null, 2)}

User Query: "${query}"

Context from Journal Entries:
${activityContext}

Your structured JSON response:`;
}

/**
 * Uses an LLM to generate a natural language summary based on a query and retrieved activities.
 * @param query The original user query.
 * @param activities The list of activities retrieved from the database.
 * @returns A promise that resolves to the AI-generated summary object.
 */
export async function generateSummary(query: string, activities: Activity[]): Promise<z.infer<typeof SummarySchema>> {
    if (activities.length === 0) {
        return {
            mainSummary: "I couldn't find any activities related to your query. Please try different search terms.",
        };
    }

    // Convert the Zod schema to JSON schema for the LLM
    const schema = z.toJSONSchema(SummarySchema);
    const prompt = createStructuredSynthesizerPrompt(query, activities, schema);
    
    try {
        console.log('[SearchAgent] Generating structured summary...');
        const completion = await Promise.race([
            openai.chat.completions.create({
                model: LLM_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: 'journal_summary',
                        schema: schema,
                        strict: true,
                    },
                },
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('LLM summary request timed out after 180 seconds')), 180000)
            )
        ]) as OpenAI.Chat.Completions.ChatCompletion;

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error('LLM returned an empty summary.');
        }
        
        console.log('[SearchAgent] Raw structured summary received.');
        
        // Parse and validate the LLM's response
        const parsedData = JSON.parse(content);
        const validationResult = SummarySchema.safeParse(parsedData);
        
        if (!validationResult.success) {
            console.error('[SearchAgent] LLM response failed Zod validation:', validationResult.error);
            throw new Error('LLM response did not match expected schema.');
        }
        
        return validationResult.data;

    } catch (error) {
        console.error('[SearchAgent] Error generating summary:', error);
        return {
            mainSummary: "I encountered an error while trying to summarize the results. Please try again."
        };
    }
}