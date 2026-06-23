import { NextResponse } from "next/server";
import {
  getRagContext,
  searchWeb,
  formatWebResults,
  routeSearch,
  runReasoner,
  type WebResult,
} from "../tools";

export async function POST(request: Request) {
  const { input, webSearch = false } = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      try {
        // 1. Always run RAG first — fast, free, no side effects.
        send({
          type: "step",
          step: { step: "plan", content: "Querying local knowledge base..." }
        });
        const ragContext = await getRagContext(input);

        if (ragContext) {
          send({
            type: "step",
            step: { step: "observe", content: "Retrieved relevant content from documents." }
          });
        } else {
          send({
            type: "step",
            step: { step: "observe", content: "No relevant content found in documents." }
          });
        }

        // 2. Decide if web search is warranted and fetch results if so.
        let webResults: WebResult[] = [];

        if (webSearch) {
          send({
            type: "step",
            step: { step: "plan", content: "Checking if web search is recommended..." }
          });
          const recommendation = await routeSearch(input, ragContext);
          if (recommendation.tool === "web" || recommendation.tool === "rag+web") {
            send({
              type: "step",
              step: { step: "action", content: `Using tool: check_web_search — searching for "${input}"` }
            });
            webResults = await searchWeb(input);
            send({
              type: "step",
              step: { step: "observe", content: `Web search returned ${webResults.length} results.` }
            });
          } else {
            send({
              type: "step",
              step: { step: "observe", content: "Web search not needed for this query." }
            });
          }
        }

        const webContext = formatWebResults(webResults);

        // 3. Run the reasoning loop — Plan → Action → Observe → Output.
        send({
          type: "step",
          step: { step: "plan", content: "Initializing reasoning loop..." }
        });

        const { answer, thinkingSteps, toolUsed, usage } = await runReasoner(
          input,
          ragContext,
          webContext,
          (step) => {
            send({ type: "step", step });
          }
        );

        // 4. Send the final compiled output
        send({
          type: "result",
          response: answer,
          thinkingSteps,
          hasContext: !!ragContext,
          webSearched: webResults.length > 0,
          webResults: webResults.slice(0, 5),
          toolUsed,
          usage,
          model: CHAT_MODEL,
        });

      } catch (err: any) {
        send({
          type: "error",
          message: err?.message || "An unexpected reasoning loop error occurred."
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    }
  });
}

// Need CHAT_MODEL for the response — import it directly.
import { CHAT_MODEL } from "../tools";
