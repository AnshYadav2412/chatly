import { ollamaClient, CHAT_MODEL } from "./client";

/**
 * The recommendation the router returns to the orchestrator.
 *
 * - "model"  → The LLM can answer from training data alone; skip all retrieval.
 * - "rag"    → Use only the document knowledge base.
 * - "web"    → Fetch live web results (RAG context is insufficient or the
 *               question requires real-time information).
 * - "rag+web"→ Combine both: documents give partial context but live data is
 *               also needed.
 */
export type RouterRecommendation = {
  tool: "model" | "rag" | "web" | "rag+web";
  reason: string;
};

/**
 * Asks the LLM which retrieval tool(s) should be used to answer this query.
 *
 * The router is intentionally permissive — it errs on the side of recommending
 * a tool rather than blocking. The orchestrator remains free to ignore or
 * override the recommendation (e.g. when web search is disabled by the user).
 *
 * Falls back to { tool: "model", reason: "router unavailable" } on any error
 * so a broken router never blocks the chat.
 */
export async function routeSearch(
  query: string,
  ragContext: string,
  modelOverride?: string
): Promise<RouterRecommendation> {
  const contextSummary = ragContext
    ? `Document context retrieved from the user's knowledge base (first 1200 chars):\n"""\n${ragContext.slice(0, 1200)}\n"""`
    : "No document context available.";

  const routerPrompt = `You are a routing assistant deciding which tools to use to answer a user question.

${contextSummary}

Tools available:
- MODEL   : The language model answers from its own training data (good for general knowledge, history, science, math, coding, writing, explanations).
- RAG     : Use the document context retrieved above (good when the context clearly answers the question).
- WEB     : Search the internet for real-time or recent information (good for current events, live prices, today's news, recent software releases, sports scores, weather, anything that changes frequently).
- RAG_WEB : Use both documents AND a web search (good when documents give partial context but real-time data is also needed).

Instructions:
1. If the document context above sufficiently answers the question → reply RAG.
2. If the question needs real-time/current data the model cannot reliably know → reply WEB.
3. If both documents AND real-time data are needed → reply RAG_WEB.
4. Otherwise (general knowledge the model knows) → reply MODEL.

Reply with ONLY one of: MODEL, RAG, WEB, RAG_WEB
No explanation. No punctuation. Just the one keyword.

User question: ${query}`;

  try {
    const res = await ollamaClient.chat.completions.create({
      model: modelOverride || CHAT_MODEL,
      messages: [{ role: "user", content: routerPrompt }],
      max_tokens: 10,
      temperature: 0,
    });

    const raw = (res.choices[0]?.message?.content ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z_+]/g, "");

    if (raw.includes("RAG_WEB") || raw.includes("RAG+WEB")) {
      return { tool: "rag+web", reason: "Documents give partial context; real-time data also needed" };
    }
    if (raw.startsWith("WEB")) {
      return { tool: "web", reason: "Question requires real-time information not in documents" };
    }
    if (raw.startsWith("RAG")) {
      return { tool: "rag", reason: "Document context is sufficient" };
    }
    return { tool: "model", reason: "General knowledge question; no retrieval needed" };
  } catch {
    return { tool: "model", reason: "Router unavailable — falling back to model" };
  }
}
