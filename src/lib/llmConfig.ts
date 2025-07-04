import { OpenAI } from 'openai';

// Read from environment variables with sensible defaults
export const LLM_API_URL = process.env.LLM_API_URL
export const LLM_MODEL = process.env.LLM_MODEL

// Export a single, pre-configured OpenAI client instance
export const openai = new OpenAI({
    baseURL: LLM_API_URL,
    apiKey: 'ollama', // Required but not used for local Ollama
});
