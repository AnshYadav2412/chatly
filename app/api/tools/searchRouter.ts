import { ollamaClient, CHAT_MODEL } from "./client";

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type RouterRecommendation = {
  tool: "model" | "rag" | "web" | "rag+web";
  reason: string;
  usage: TokenUsage | null;
};

export async function routeSearch(
  query: string,
  ragContext: string,
  modelOverride?: string
): Promise<RouterRecommendation> {
  const contextSummary = ragContext
    ? `Docs (first 600 chars):\n"""\n${ragContext.slice(0, 600)}\n"""`
    : "No docs available.";

  const routerPrompt = `Route this question: "${query}"

${contextSummary}

Reply: MODEL (general knowledge), RAG (docs answer it), WEB (needs live data), or RAG_WEB (both).
Just one word.`;

  try {
    const res = await ollamaClient.chat.completions.create({
      model: modelOverride || CHAT_MODEL,
      messages: [{ role: "user", content: routerPrompt }],
      max_tokens: 3,
      temperature: 0,
    });

    const usage: TokenUsage | null = res.usage
      ? {
          promptTokens: res.usage.prompt_tokens ?? 0,
          completionTokens: res.usage.completion_tokens ?? 0,
          totalTokens: (res.usage.prompt_tokens ?? 0) + (res.usage.completion_tokens ?? 0),
        }
      : null;

    const raw = (res.choices[0]?.message?.content ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z_+]/g, "");

    if (raw.includes("RAG_WEB") || raw.includes("RAG+WEB")) {
      return { tool: "rag+web", reason: "Documents give partial context; real-time data also needed", usage };
    }
    if (raw.startsWith("WEB")) {
      return { tool: "web", reason: "Question requires real-time information", usage };
    }
    if (raw.startsWith("RAG")) {
      return { tool: "rag", reason: "Document context is sufficient", usage };
    }
    return { tool: "model", reason: "General knowledge question", usage };
  } catch {
    return { tool: "model", reason: "Router unavailable", usage: null };
  }
}
