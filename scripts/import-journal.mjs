// scripts/import-journal.mjs
import fs from 'fs';
import path from 'path';
import * as z from "zod/v4";
import { ca } from 'zod/v4/locales';

// --- Configuration ---
const API_URL = 'http://localhost:3000/api/journal';
const JOURNAL_FILE_PATH = path.join(process.cwd(), 'scripts', 'journal-history-p.txt');

// --- LLM Configuration ---
// Configure this to point to your local LLM's API endpoint (e.g., Ollama, llama-cpp-python)
const LLM_API_URL = 'http://localhost:11434/v1/'; // Example for Ollama
const LLM_MODEL = 'gemma3n:latest'; // The model you have downloaded and are serving

/**
 * Creates a prompt for the LLM to extract journal data from raw text.
 * @param {string} rawText - The raw text of a single journal entry.
 * @returns {string} The system prompt for the LLM.
 */
function createLLMPrompt(rawText, jsonSchema) {
    return `You are a data extraction assistant. Your task is to analyze a user's journal entry and convert it into a structured JSON format that matches the application's database schema.

The journal entry contains activities categorized under "WORK:" and "LIFE:".

For each activity, you must extract:
- description: A very short, concise summary of the activity, ideally one sentence. For example, if the entry is "Worked on fixing bug #123 related to user authentication", the description should be "Fixed authentication bug #123".
- duration: The time spent in minutes. The text might specify hours (h) or minutes (min). You must convert hours to minutes (e.g., 1.5h becomes 90). For "WORK" activities, if no duration is specified, default to 120. For "LIFE" activities, if no duration is specified, use null.
- notes: All other details from the activity entry. This includes the full original text, any bullet points, file paths, or other context. Structure the content with bullet points with newlines (\\n).
- tags: A comma-separated string of relevant keywords or tags based on the description and notes. If no tags are obvious, leave it as an empty string.

IMPORTANT: If there are no activities for a particular category (WORK or LIFE), you must return an empty array for that category. Do NOT create activities if none exist in the entry, and do NOT categorize LIFE activities as WORK or vice versa.

The final JSON output be compliant with the following JSON Schema:
{
  ${jsonSchema}
}

Here is the journal entry:
---
${rawText}
---

Please provide only the raw JSON output.`;
}

// Define Zod schema for activity
const ActivitySchema = z.object({
  description: z.string().min(1, "Description is required"),
  duration: z.number().nullable(),
  notes: z.string().nullable(),
  tags: z.string()
});

// Define schema for the entire response
const JournalDataSchema = z.object({
  workActivities: z.array(ActivitySchema),
  lifeActivities: z.array(ActivitySchema)
}).required()

/**
 * Uses an LLM to transform raw journal text into structured JSON data.
 * @param {string} entryText - The text for a single journal entry.
 * @returns {Promise<object | null>} - The structured data or null on failure.
 */
async function transformTextWithLLM(entryText) {
    const schema = z.toJSONSchema(JournalDataSchema)    
    // schema.type = "json_object";
    const prompt = createLLMPrompt(entryText, schema);

    try {
        console.log('Sending text to LLM for processing...');
        console.log(schema);
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({
            baseURL: LLM_API_URL,
            apiKey: 'local-api-key' // placeholder for local LLM
        });

        const completion = await Promise.race([
            openai.chat.completions.create({
                model: LLM_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: 'journal_data',
                        schema: schema,
                        strict: true,
                    },
                },
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('LLM request timed out after 60 seconds')), 60000)
            )
        ]);

        if (completion.choices[0].finish_reason === "length") {
            // Handle the case where the model did not return a complete response
            throw new Error("Incomplete response");
        }

        const responseMessage = completion.choices[0].message;
        let content;
        
        if (responseMessage.refusal) {
            console.log(responseMessage.refusal);
            throw new Error("LLM refused to process the request");
        } else if (responseMessage.content) {
            console.log(responseMessage.content);
            content = responseMessage.content;
        } else {
            throw new Error("No response content");
        }

        const parsedData = JSON.parse(content);
        console.log(parsedData);

        // Validate with Zod schema
        const validationResult = JournalDataSchema.safeParse(parsedData);
        
        if (!validationResult.success) {
            console.error('LLM response failed Zod validation:', validationResult.error);
            console.log('Invalid data structure received:', parsedData);
            return null;
        }

        return validationResult.data;
    } catch (error) {
        console.error('An error occurred while transforming text with LLM:', error);
        return null;
    }
}


/**
 * Main function to run the import process.
 */
async function main() {
    console.log('Starting journal import with LLM...');

    try {
        const journalText = fs.readFileSync(JOURNAL_FILE_PATH, 'utf-8');

        // Split the entire file into entries based on the date headers.
        const entries = journalText.split(/\n(?=\d{4}-\d{2}-\d{2})/).map(e => e.trim());

        console.log(`Found ${entries.length} entries to process.`);

        for (const entryText of entries) {
            if (!entryText) continue;

            const lines = entryText.split('\n');
            const date = lines[0].trim();
            const resp_content = lines.slice(1).join('\n');

            // Use LLM to process the resp_content
            const structuredData = await transformTextWithLLM(resp_content);
            console.log(structuredData);

            if (!structuredData) {
                console.warn(`⚠️ Failed to process entry for ${date}. Using empty activities.`);
            }

            // The API expects duration to be a string, so we format it correctly.
            const formatActivities = (activities) => {
                if (!activities) return [];
                return activities.map(a => ({
                    ...a,
                    duration: a.duration !== null && a.duration !== undefined ? String(a.duration) : '',
                }));
            };

            const payload = {
                date,
                workActivities: structuredData ? formatActivities(structuredData.workActivities) : [],
                lifeActivities: structuredData ? formatActivities(structuredData.lifeActivities) : [],
                force: true, // Overwrite existing entries for the same date
            };

            console.log(`\nSending data for ${date}...`);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'resp_content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                console.log(`✅ Successfully saved entry for ${date}.`);
            } else {
                const errorData = await response.json();
                console.error(`❌ Failed to save entry for ${date}. Status: ${response.status}`, errorData);
            }

            // Add a small delay to avoid overwhelming the servers
            await new Promise(res => setTimeout(res, 500));
        }

        console.log('\n✨ Journal import finished! ✨');

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`Error: The journal file was not found at ${JOURNAL_FILE_PATH}`);
        } else {
            console.error('An unexpected error occurred:', error);
        }
    }
}

main();