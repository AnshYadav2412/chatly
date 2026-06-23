import { tavily } from "@tavily/core";

export type WebResult = {
  title: string;
  url: string;
  content: string;
};

/**
 * Search the web via Tavily and return structured results.
 *
 * Returns an empty array on any failure — missing/placeholder key, network
 * error, rate-limit, etc. — so callers never need to handle exceptions.
 */
export async function searchWeb(query: string): Promise<WebResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey.startsWith("tvly-your-key")) return [];

  try {
    const tv = tavily({ apiKey });
    const result = await tv.search(query, {
      maxResults: 5,
      searchDepth: "basic",
      includeAnswer: false,
    });

    return (result.results ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      content: r.content ?? "",
    }));
  } catch {
    return [];
  }
}

/** Format web results into a context block ready to inject into a system prompt. */
export function formatWebResults(results: WebResult[]): string {
  if (!results.length) return "";
  return results
    .map(
      (r, i) =>
        `[Web Result ${i + 1}] ${r.title}\nSource: ${r.url}\n${r.content}`
    )
    .join("\n\n---\n\n");
}
