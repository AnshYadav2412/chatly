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

function isEmbeddingModel(modelName: string, family?: string, families?: string[]): boolean {
  const nameLower = modelName.toLowerCase();
  const fams = [family, ...(families ?? [])].filter(Boolean).map(f => f!.toLowerCase());
  
  if (
    nameLower.includes("embed") ||
    nameLower.includes("bge") ||
    nameLower.includes("minilm") ||
    nameLower.includes("mxbai")
  ) {
    return true;
  }
  
  for (const f of fams) {
    if (f.includes("bert") || f.includes("embed")) {
      return true;
    }
  }
  
  return false;
}

export async function getResolvedModel(modelOverride?: string): Promise<string> {
  if (modelOverride) return modelOverride;
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    if (res.ok) {
      const data = await res.json();
      const rawModels = data.models ?? [];
      const chatModels: string[] = [];
      for (const m of rawModels) {
        const name = m.name;
        const details = m.details ?? {};
        if (!isEmbeddingModel(name, details.family, details.families)) {
          chatModels.push(name);
        }
      }
      if (chatModels.length > 0) {
        return chatModels.includes(CHAT_MODEL) ? CHAT_MODEL : chatModels[0];
      }
    }
  } catch {
    // Ignore
  }
  return CHAT_MODEL;
}

export async function getResolvedEmbeddingModel(modelOverride?: string): Promise<string> {
  if (modelOverride) return modelOverride;
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    if (res.ok) {
      const data = await res.json();
      const rawModels = data.models ?? [];
      const embeddingModels: string[] = [];
      for (const m of rawModels) {
        const name = m.name;
        const details = m.details ?? {};
        if (isEmbeddingModel(name, details.family, details.families)) {
          embeddingModels.push(name);
        }
      }
      if (embeddingModels.length > 0) {
        return embeddingModels.includes("nomic-embed-text:latest")
          ? "nomic-embed-text:latest"
          : embeddingModels.includes("nomic-embed-text")
          ? "nomic-embed-text"
          : embeddingModels[0];
      }
    }
  } catch {
    // Ignore
  }
  return "nomic-embed-text:latest";
}
