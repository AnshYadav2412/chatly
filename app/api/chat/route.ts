import {
  getRagContext,
  searchWeb,
  formatWebResults,
  routeSearch,
  runReasoner,
  quickModelAnswer,
  getResolvedModel,
  getResolvedEmbeddingModel,
  type WebResult,
} from "../tools";

type HistoryMessage = { role: "user" | "assistant"; content: string };

const DOC_KEYWORDS = /doc|upload|file|knowledge|database|document|pdf/i;
const SIMPLE_QUERY_MAX_WORDS = 5;

function isShortSimpleQuery(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/);
  return words.length <= SIMPLE_QUERY_MAX_WORDS && !DOC_KEYWORDS.test(trimmed);
}

export async function POST(request: Request) {
  const { input, messages: rawMessages = [], webSearch = false, model: modelOverride } = await request.json() as {
    input: string;
    messages?: HistoryMessage[];
    webSearch?: boolean;
    model?: string;
  };
  const resolvedModel = await getResolvedModel(modelOverride);
  const resolvedEmbeddingModel = await getResolvedEmbeddingModel();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      try {
        // Fast path: short simple queries skip RAG and routing entirely
        if (isShortSimpleQuery(input)) {
          send({
            type: "step",
            step: { step: "plan", content: "Answering..." }
          });

          const { answer, usage } = await quickModelAnswer(input, rawMessages, resolvedModel);

          send({
            type: "result",
            response: answer,
            thinkingSteps: [],
            hasContext: false,
            webSearched: false,
            webResults: [],
            toolUsed: "model",
            usage,
            model: resolvedModel,
          });
          return;
        }

        // 1. RAG retrieval
        send({
          type: "step",
          step: { step: "plan", content: "Querying local knowledge base..." }
        });
        const ragContext = await getRagContext(input, resolvedEmbeddingModel);

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

        // 2. Route the query
        send({
          type: "step",
          step: { step: "plan", content: "Determining query type..." }
        });
        const { tool: routeTool, usage: routeUsage } = await routeSearch(input, ragContext, resolvedModel);

        // 3. MODEL path: single-shot answer
        if (routeTool === "model") {
          send({
            type: "step",
            step: { step: "action", content: "Using tool: use_own_knowledge — answering from training data" }
          });
          send({
            type: "step",
            step: { step: "observe", content: "Generating direct answer..." }
          });

          const { answer, usage } = await quickModelAnswer(input, rawMessages, resolvedModel);

          send({
            type: "result",
            response: answer,
            thinkingSteps: [],
            hasContext: !!ragContext,
            webSearched: false,
            webResults: [],
            toolUsed: "model",
            usage,
            routerUsage: routeUsage,
            model: resolvedModel,
          });
          return;
        }

        // 4. Web search (for WEB / RAG+WEB)
        let webResults: WebResult[] = [];

        if (webSearch && (routeTool === "web" || routeTool === "rag+web")) {
          send({
            type: "step",
            step: { step: "action", content: `Using tool: check_web_search — searching for "${input}"` }
          });
          webResults = await searchWeb(input);
          send({
            type: "step",
            step: { step: "observe", content: `Web search returned ${webResults.length} results.` }
          });
        } else if (webSearch) {
          send({
            type: "step",
            step: { step: "observe", content: "Web search not needed for this query." }
          });
        }

        const webContext = formatWebResults(webResults);

        // 5. Reasoning loop for RAG / WEB queries
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
          },
          resolvedModel,
          rawMessages,
        );

        send({
          type: "result",
          response: answer,
          thinkingSteps,
          hasContext: !!ragContext,
          webSearched: webResults.length > 0,
          webResults: webResults.slice(0, 5),
          toolUsed,
          usage,
          routerUsage: routeUsage,
          model: resolvedModel,
        });

      } catch (err: unknown) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "An unexpected reasoning loop error occurred."
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
