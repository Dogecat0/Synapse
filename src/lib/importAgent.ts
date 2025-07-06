// src/lib/importAgent.ts

import { OpenAI } from 'openai';
import * as z from 'zod/v4';
import { PrismaClient } from '@prisma/client';
import { Category } from '../types/models';

// Instantiate Prisma client here for direct database access
const prisma = new PrismaClient();

const openai = new OpenAI({
    // IMPORTANT: This now correctly runs only on the server.
    baseURL: process.env.LLM_API_URL,
    apiKey: 'ollama',
});

// Zod schemas remain the same
const ProcessedActivitySchema = z.object({
  description: z.string().describe("A concise summary of the activity."),
  duration: z.number().nullable().describe("Duration in minutes. Convert 'h' to minutes. Null if not specified."),
  notes: z.string().nullable().describe("Any additional details or context."),
  tags: z.string().describe("Comma-separated string of relevant keywords or tags."),
  categoryId: z.string().describe("The ID of the category this activity belongs to."),
});

const JournalImportSchema = z.object({
  activities: z.array(ProcessedActivitySchema),
});

function createImportPrompt(rawText: string, categories: Category[], schema: any): string {
    const categoryContext = categories.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description
    }));

    return `You are an expert data extraction and classification assistant. Your task is to analyze a user's journal entry and convert it into a structured JSON object containing an array of activities.

For each activity found in the text, you must perform the following:
1.  **Extract**: Pull out the description, duration, notes, and tags.
    - Convert durations in hours (e.g., 1.5h) or days (e.g. 1d) to minutes (e.g., 90). If no duration is specified, use null.
2.  **Classify**: Assign the activity to one of the provided categories. Use the category's \`name\` and \`description\` to make the most accurate choice.
3.  **Assign ID**: You MUST use the exact \`id\` of the chosen category for the \`categoryId\` field in your JSON output.

Here are the available categories you MUST use for classification:
\`\`\`json
${JSON.stringify(categoryContext, null, 2)}
\`\`\`

Your final output MUST be a single JSON object that strictly conforms to the following JSON Schema. The root of the object must have an "activities" key, which is an array.
\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

Here is the journal entry to process:
<journal_entry>
${rawText}
</journal_entry>

Your JSON response:`;
}

async function extractAndClassifyActivities(
    entryText: string, 
    categories: Category[], 
    enqueue: (message: string) => void,
    date?: string
): Promise<z.infer<typeof JournalImportSchema> | null> {
    const jsonSchema = z.toJSONSchema(JournalImportSchema);
    const prompt = createImportPrompt(entryText, categories, jsonSchema);

    const datePrefix = date ? `[${date}] ` : '';
    
    try {
        enqueue(`${datePrefix}🤖 Sending entry to LLM for processing...`);
        
        const startTime = Date.now();
        const completion = await openai.chat.completions.create({
            model: process.env.LLM_MODEL || 'gemma2',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.0,
            response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: 'classified_activities',
                        schema: jsonSchema,
                        strict: true,
                    },
                },
        });
        const processingTime = Date.now() - startTime;

        const content = completion.choices[0].message.content;
        if (!content) {
            enqueue(`${datePrefix}❌ LLM returned empty response`);
            throw new Error("LLM returned an empty response.");
        }

        enqueue(`${datePrefix}✅ LLM processing completed in ${processingTime}ms`);
        enqueue(`${datePrefix}🔍 Validating LLM response structure...`);

        const parsedData = JSON.parse(content);
        const validationResult = JournalImportSchema.safeParse(parsedData);

        if (!validationResult.success) {
            enqueue(`${datePrefix}❌ LLM response validation failed:`);
            const errors = validationResult.error.flatten();
            enqueue(`${datePrefix}   Field errors: ${JSON.stringify(errors.fieldErrors, null, 2)}`);
            enqueue(`${datePrefix}   Form errors: ${JSON.stringify(errors.formErrors, null, 2)}`);
            console.error('LLM response failed Zod validation:', errors);
            throw new Error("LLM response did not match the required schema.");
        }

        // Validate category IDs
        const validCategoryIds = new Set(categories.map(c => c.id));
        const invalidCategories: string[] = [];
        
        for (const activity of validationResult.data.activities) {
            if (!validCategoryIds.has(activity.categoryId)) {
                invalidCategories.push(activity.categoryId);
            }
        }

        if (invalidCategories.length > 0) {
            enqueue(`${datePrefix}❌ LLM used invalid category IDs: ${invalidCategories.join(', ')}`);
            enqueue(`${datePrefix}   Valid categories: ${Array.from(validCategoryIds).join(', ')}`);
            throw new Error(`LLM hallucinated invalid categoryIds: ${invalidCategories.join(', ')}`);
        }

        const activityCount = validationResult.data.activities.length;
        enqueue(`${datePrefix}✅ Successfully extracted ${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`);
        
        // Log activity details for debugging
        validationResult.data.activities.forEach((activity, index) => {
            const categoryName = categories.find(c => c.id === activity.categoryId)?.name || 'Unknown';
            const duration = activity.duration ? `${activity.duration}m` : 'no duration';
            enqueue(`${datePrefix}   ${index + 1}. "${activity.description}" (${categoryName}, ${duration})`);
        });

        return validationResult.data;

    } catch (error: any) {
        enqueue(`${datePrefix}❌ LLM processing error: ${error.message}`);
        console.error(`[${date || 'Unknown'}] LLM processing error:`, error);
        
        // Log additional context for debugging
        if (error.message.includes('JSON')) {
            enqueue(`${datePrefix}   This might be a JSON parsing error. Check LLM response format.`);
        }
        if (error.message.includes('network') || error.message.includes('connection')) {
            enqueue(`${datePrefix}   Network error. Check LLM server connectivity.`);
        }
        
        return null;
    }
}

/**
 * Main function to orchestrate the journal import process.
 * @param journalText The full text of the journal to import.
 * @param enqueue Callback to push progress updates to the client stream.
 */
export async function processJournalImport(
    journalText: string,
    enqueue: (message: string) => void
) {
    const startTime = Date.now();
    enqueue('🚀 Starting journal import process...');
    enqueue(`📊 Journal text length: ${journalText.length} characters`);

    // 1. Fetch and validate categories directly from the database
    let categories: Category[];
    try {
        enqueue('📂 Fetching categories from database...');
        const rawCategories = await prisma.category.findMany();
        categories = rawCategories.map(cat => ({
            ...cat,
            createdAt: cat.createdAt.toISOString(),
            updatedAt: cat.updatedAt.toISOString()
        }));
        enqueue(`✅ Found ${categories.length} total categories in database`);
    } catch (error: any) {
        enqueue(`❌ Database Error: Could not fetch categories. ${error.message}`);
        console.error('Database error fetching categories:', error);
        return;
    }

    // 2. Validate categories for import
    const classifiableCategories = categories.filter(c => !c.isDefault);
    enqueue(`🔍 Found ${classifiableCategories.length} custom categories for classification`);
    
    if (classifiableCategories.length === 0) {
        const message = "No custom categories found. Please create at least one custom category with a description before importing.";
        enqueue(`❌ Validation Failed: ${message}`);
        return;
    }
    
    const categoriesWithoutDescription = classifiableCategories.filter(c => !c.description?.trim());
    if (categoriesWithoutDescription.length > 0) {
        const names = categoriesWithoutDescription.map(c => `"${c.name}"`).join(', ');
        const message = `All custom categories must have a description for the AI to work. Please add descriptions for: ${names}.`;
        enqueue(`❌ Validation Failed: ${message}`);
        return;
    }
    
    enqueue(`✅ Category validation passed. Using categories:`);
    classifiableCategories.forEach(cat => {
        enqueue(`   • ${cat.name}: "${cat.description}"`);
    });

    // 3. Parse journal entries
    enqueue('📝 Parsing journal entries...');
    const entries = journalText.split(/\n(?=\d{4}-\d{2}-\d{2})/).map(e => e.trim()).filter(Boolean);
    enqueue(`✅ Found ${entries.length} daily entries to process`);

    if (entries.length === 0) {
        enqueue('❌ No valid entries found. Make sure each day starts with a date in YYYY-MM-DD format.');
        return;
    }

    // 4. Process each entry
    let successCount = 0;
    let failureCount = 0;
    let totalActivities = 0;
    
    for (let i = 0; i < entries.length; i++) {
        const entryText = entries[i];
        const lines = entryText.split('\n');
        const date = lines[0].trim();
        const content = lines.slice(1).join('\n');
        
        enqueue(`\n📅 Processing entry ${i + 1}/${entries.length}: ${date}`);
        // FIX: Corrected the template literal to properly close the quote
        enqueue(`   Content preview: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            enqueue(`⚠️ Invalid date format: "${date}". Expected YYYY-MM-DD. Skipping entry.`);
            failureCount++;
            continue;
        }

        try {
            // Extract activities using LLM
            const processedData = await extractAndClassifyActivities(content, classifiableCategories, enqueue, date);
            
            if (!processedData) {
                enqueue(`⚠️ Failed to process entry for ${date}. Skipping.`);
                failureCount++;
                continue;
            }

            const activityCount = processedData.activities.length;
            totalActivities += activityCount;

            // Save to database
            enqueue(`💾 Saving ${activityCount} activities to database...`);
            
            const journalEntry = await prisma.journalEntry.upsert({
                where: { date: new Date(date) },
                update: {},
                create: { date: new Date(date) },
                select: { id: true }
            });

            // Delete old activities if overwriting
            const deletedCount = await prisma.activity.deleteMany({ 
                where: { journalEntryId: journalEntry.id }
            });
            
            if (deletedCount.count > 0) {
                enqueue(`🗑️ Removed ${deletedCount.count} existing activities for ${date}`);
            }

            // Create new activities
            for (let j = 0; j < processedData.activities.length; j++) {
                const activity = processedData.activities[j];
                try {
                    await prisma.activity.create({
                        data: {
                            description: activity.description,
                            duration: activity.duration,
                            notes: activity.notes,
                            tags: {
                                connectOrCreate: activity.tags.split(',').map(t => t.trim()).filter(Boolean).map(name => ({
                                    where: { name },
                                    create: { name },
                                }))
                            },
                            categoryId: activity.categoryId,
                            journalEntryId: journalEntry.id,
                        }
                    });
                    enqueue(`   ✅ Saved activity ${j + 1}: "${activity.description}"`);
                } catch (activityError: any) {
                    enqueue(`   ❌ Failed to save activity ${j + 1}: ${activityError.message}`);
                    throw activityError; // Re-throw to trigger entry failure
                }
            }
            
            enqueue(`✅ Successfully saved entry for ${date} with ${activityCount} activities`);
            successCount++;
            
        } catch (error: any) {
            enqueue(`❌ Database error while saving entry for ${date}: ${error.message}`);
            console.error(`Database error for ${date}:`, error);
            failureCount++;
        }
    }

    // Final summary
    const totalTime = Date.now() - startTime;
    const minutes = Math.floor(totalTime / 60000);
    const seconds = Math.floor((totalTime % 60000) / 1000);
    
    enqueue(`\n📊 Import Summary:`);
    enqueue(`   ✅ Successfully processed: ${successCount} entries`);
    enqueue(`   ❌ Failed: ${failureCount} entries`);
    enqueue(`   📝 Total activities created: ${totalActivities}`);
    enqueue(`   ⏱️ Total processing time: ${minutes}m ${seconds}s`);
    
    if (successCount > 0) {
        enqueue(`✨ Journal import completed successfully! ✨`);
    } else {
        enqueue(`❌ Import failed - no entries were processed successfully.`);
    }
}