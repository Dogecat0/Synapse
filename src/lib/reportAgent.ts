import * as z from 'zod/v4';
import { OpenAI } from 'openai';
import { Activity } from '../types/models';


const openai = new OpenAI({
    baseURL: process.env.LLM_API_URL,
    apiKey: 'ollama', // Required but not used for local Ollama
});

// --- Zod Schemas for LLM Output Validation ---
export const WeeklyReportSchema = z.object({
  title: z.string().describe("Report title, e.g., 'Weekly Report: June 10 - June 16, 2024'"),
  summary: z.string().describe("A 3-4 sentence narrative summary of the week's key activities, achievements, and work-life balance."),
  timeAnalysis: z.object({
    totalMinutes: z.number(),
    professionalMinutes: z.number(),
    projectMinutes: z.number(),
    lifeMinutes: z.number(),
    breakdownRatio: z.string().describe("e.g., '50% Professional / 20% Project / 30% Life'"),
  }).describe("Breakdown of time allocation."),
keyActivities: z.array(z.object({
    categoryName: z.string().describe("The name of the category (e.g., 'Professional', 'Project', 'Life', etc.)"),
    description: z.string(),
    timeSpent: z.number().optional()
})).min(3).max(5).describe("List of 3-5 most significant activities or accomplishments."),
  tagAnalysis: z.array(z.object({
      tag: z.string(),
      minutes: z.number(),
      count: z.number()
  })).min(3).max(7).describe("Analysis of the 3-7 most frequent tags and time spent on them."),
  insightsAndTrends: z.string().describe("Markdown-formatted insights. Identify trends or correlations, e.g., 'High meeting time correlated with reduced deep work sessions.'")
});

export type WeeklyReportContent = z.infer<typeof WeeklyReportSchema>;

// --- Prompt Engineering ---

function createWeeklyReportPrompt(activities: Activity[], schema: any): string {
    const activityContext = activities.map(act => {
        const date = new Date(act.journalEntry.date).toISOString().split('T')[0];
        const duration = act.duration ? `${act.duration}min` : 'N/A';
        const tags = act.tags.map(t => `#${t.name}`).join(' ');
        return `
Date: ${date} | Category: ${act.category} | Duration: ${duration} | Tags: ${tags}
Description: ${act.description}
Notes: ${act.notes || 'N/A'}`;
    }).join('\n------------------------\n');

    return `You are a data analyst assistant. Your task is to analyze a week of journal activities and generate a structured JSON report.

    Rules:
    1.  Your response MUST be a single JSON object that strictly conforms to the provided JSON Schema.
    2.  Base your analysis ONLY on the provided journal entries. Do not invent information.
    3.  Calculate time totals accurately from the 'duration' field.
    4.  The 'insightsAndTrends' section should contain actionable observations based on the data.
    
    JSON Schema for your response:
    ${JSON.stringify(schema, null, 2)}
    
    Weekly Activities Data:
    ${activityContext}
    
    Your structured JSON response:`;
}

// --- Agent Functions ---

export async function generateWeeklyReport(activities: Activity[]): Promise<WeeklyReportContent | null> {
    if (activities.length === 0) {
        return null;
    }
    
    const jsonSchema = z.toJSONSchema(WeeklyReportSchema);
    const prompt = createWeeklyReportPrompt(activities, jsonSchema);

    try {
        console.log('[ReportAgent] Generating weekly report...');
        const completion = await Promise.race([
            openai.chat.completions.create({
                model: process.env.LLM_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: 'weekly_report',
                        schema: jsonSchema,
                        strict: true,
                    },
                },
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('LLM report generation timed out after 180 seconds')), 180000)
            )
        ]) as OpenAI.Chat.Completions.ChatCompletion;

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error('LLM returned an empty report.');
        }

        console.log('[ReportAgent] Raw report received from LLM.');
        const parsedData = JSON.parse(content);
        const validationResult = WeeklyReportSchema.safeParse(parsedData);

        if (!validationResult.success) {
            console.error('[ReportAgent] LLM response failed Zod validation:', validationResult.error);
            throw new Error('LLM response did not match expected schema.');
        }

        console.log('[ReportAgent] Report validated successfully.');
        return validationResult.data;

    } catch (error) {
        console.error('[ReportAgent] Error generating weekly report:', error);
        return null;
    }
}