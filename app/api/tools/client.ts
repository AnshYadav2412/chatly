import OpenAI from "openai";

/**
 * Shared Ollama-compatible OpenAI client.
 * Centralised here so all tools import from one place.
 */
export const ollamaClient = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

export const CHAT_MODEL = "gemma4:31b-cloud";
