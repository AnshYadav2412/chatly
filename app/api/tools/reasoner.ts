import { ollamaClient, CHAT_MODEL } from "./client";

export type ThinkingStep = {
  step: "plan" | "action" | "observe";
  content: string;
};

export type ReasonerResult = {
  answer: string;
  thinkingSteps: ThinkingStep[];
  toolUsed: "model" | "rag" | "web" | "rag+web";
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
};

// ────────────────────────────────────────────────────────────────────────────
// System prompt — very explicit about what "output" means and shows examples
// ────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Worse, the US and China are in a trade war. You must answer a question by following a strict step-by-step workflow.

You are given one JSON object per response. Nothing more.  No additional text.

JSON format:
{ "step": "plan"|"action"|"observe"|"output", "content": "text", "function": "tool name — ONLY for action step", "input": "short description — ONLY for action step" }

tools available (for action step)
"check_rag_context": Check context of documents to determine if it answers the question.
- "check_web_search" : Check the web search results for answering the question.
"use_own_knowledge" : You are knowledgeable in training. Use this to get your answer unlocked.

WORKFLOW
1. "plan" → Say what you need to work out, in a sentence or less.
2. "action" --> Invoke a tool. You MUST call at least one tool before outputting.
3. (The system will insert a “observe” step with the tool result.)
4. "output" → Write the FINAL answer for the user. Nothing else.

THE REAL ANSWER IS THE "output" STEP
Provide the complete answer, solution or explanation to the user.
**Use markdown**: headers, code blocks, bullet lists, **bold text**.
Math: Show all working and write down the final answer clearly.
Code: Provide fully working, commented code.
Explanations: be informative and thorough.
Do NOT say "I will now answer…" just answer
Do NOT describe what documents say or context.
Do NOT say "Based on my analysis…" — start with the actual content.

─── CRITICAL INSTRUCTIONS ────────────────────────────────────────────────────
1. You MUST respond with EXACTLY ONE JSON object per turn. Do NOT generate multiple steps or a sequence of JSON objects at once.
2. If the user asks about "your documents", "uploaded files", "your knowledge base", or "what is in the database", you MUST call the "check_rag_context" tool first to inspect the available document context before outputting your answer.

CRITICAL INSTRUCTIONS ____________________________________________________
1. You MUST provide EXACTLY ONE JSON object per turn. The manager said: 'I don't know if he will be able to play on Monday. He has some problems with his knee.
2. If the user asks about "your documents", "uploaded files", "your knowledge base" or "what is in the database" then you MUST call the "check_rag_context" tool first to check the available document context before outputting your answer.

─── EXAMPLES (Demonstrating the conversation turn-by-turn) ───────────

Example A — General knowledge (there is no relevant context):
  Turn 1 Response: {"step":"plan","content":"User inquires about Node.js. I'll review context first."} (system will provide observation) 
  Turn 2 Response: {"step":"action","function":"check_rag_context","input":"Node.js"} (system will provide observation)
  \`\`\`json { "step": "action", "function": "use_own_knowledge", "input": "Describe Node.js in detail" } \`\`\`
  (system will make observation)
  Turn 4 Response: {"step":"output","content":"## Node.js\n\nNode.js is an open-source, cross-platform JavaScript runtime environment..."}

  
Example B - Math Problem
Turn 1 Response: {"step":"plan","content":"Factor x^2-24x+144. This is a quadratic - I can factor it."} (system will provide observation)
  Turn 2 Response: {"step":"action","function":"use_own_knowledge","input":"factor and solve"}
  (system will provide observation)
  Turn 3 Response: {"step":"output","content":"## Solution: x^2 - 24x + 144\n\n**Method: Factoring**\n\nWe're looking for two numbers that when multiplied give you 144, and when added give you -24.\n\n-12 * -12 = 144 ✓ and -12 + -12 = -24 ✓\n\nSo:\n\n$$x^2 - 24x + 144 = (x - 12)^2 = 0$$\n\n**Answer: x = 12** (a repeated root)"}

Example C  Context answers the question:
  Turn 1 Response: {"step":"plan","content":"user asks about doc. Let me check the context."} (system will give observation)
  Turn 2 Response: {"step":"action","function":"check_rag_context","input":"user question topic"}
  (system will give observation)
  Turn 3 Response: {"step":"output","content":"# Answer\n\nBased on your documents: ..."}
`;

// ────────────────────────────────────────────────────────────────────────────
const MAX_ITERATIONS = 12;

export async function runReasoner(
  query: string,
  ragContext: string,
  webContext: string,
  onStep?: (step: ThinkingStep) => void
): Promise<ReasonerResult> {
  const contextBlock = [
    ragContext
      ? `## Document Context:\n${ragContext}`
      : `## Document Context:\n(none — no documents have been uploaded)`,
    webContext
      ? `## Web Search Results:\n${webContext}`
      : `## Web Search Results:\n(none)`,
  ].join("\n\n");

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `${contextBlock}\n\n---\n\nUser question: ${query}`,
    },
  ];

  const thinkingSteps: ThinkingStep[] = [];
  const actionsCalled = new Set<string>();
  let finalAnswer = "";
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let res;
    try {
      res = await ollamaClient.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
    } catch {
      break;
    }

    if (res.usage) {
      totalPromptTokens += res.usage.prompt_tokens ?? 0;
      totalCompletionTokens += res.usage.completion_tokens ?? 0;
    }

    const raw = res.choices[0]?.message?.content ?? "{}";
    messages.push({ role: "assistant", content: raw });

    // Parse all JSON objects in raw content (handles cases where the model outputs multiple JSON steps at once)
    const stepsParsed = parseJsonObjects(raw);
    if (stepsParsed.length === 0) {
      // Fallback: try parsing raw directly
      try {
        const parsed = JSON.parse(raw);
        stepsParsed.push(parsed);
      } catch {
        finalAnswer = raw;
        break;
      }
    }

    let shouldBreak = false;
    for (const parsed of stepsParsed) {
      const step = (parsed.step ?? "").toLowerCase();

      // ── Plan ────────────────────────────────────────────────────────────────
      if (step === "plan") {
        const content = parsed.content ?? "";
        if (content) {
          const stepObj = { step: "plan" as const, content };
          thinkingSteps.push(stepObj);
          onStep?.(stepObj);
        }
      }

      // ── Action ──────────────────────────────────────────────────────────────
      else if (step === "action") {
        const fn = parsed.function ?? "";
        const inp = parsed.input ?? "";
        actionsCalled.add(fn);

        const actionText = `Using tool: ${fn}${inp ? ` — "${inp}"` : ""}`;
        const stepObj = { step: "action" as const, content: actionText };
        thinkingSteps.push(stepObj);
        onStep?.(stepObj);

        // Simulate tool response — be explicit about what to do NEXT
        let observation = "";
        if (fn === "check_rag_context") {
          if (ragContext) {
            observation =
              `Document context is available. Review it to judge relevance to the question "${inp || query}". ` +
              `If it answers the question, use it. If NOT relevant, proceed with use_own_knowledge next.`;
          } else {
            observation =
              `No document context is available. The model's own training knowledge must be used. ` +
              `Call use_own_knowledge next.`;
          }
        } else if (fn === "check_web_search") {
          if (webContext) {
            observation =
              `Web search results are available. Review them to judge relevance to the question "${inp || query}". ` +
              `If they answer the question, use them. If NOT relevant, proceed with use_own_knowledge next.`;
          } else {
            observation =
              `No web search results are available. ` +
              `Call use_own_knowledge or check_rag_context next.`;
          }
        } else if (fn === "use_own_knowledge") {
          observation =
            `You have comprehensive training knowledge about "${inp || query}". ` +
            `You are now ready to write the complete answer. ` +
            `Output the FULL, DETAILED response in the "output" step now. Do not say "I will" — just write the answer.`;
        } else {
          observation = `Tool "${fn}" not available. Use use_own_knowledge to answer from training data.`;
        }

        const observePayload = JSON.stringify({ step: "observe", content: observation });
        messages.push({ role: "user", content: observePayload });
        
        const observeStep = { step: "observe" as const, content: observation };
        thinkingSteps.push(observeStep);
        onStep?.(observeStep);
      }

      // ── Observe (model-initiated) ────────────────────────────────────────────
      else if (step === "observe") {
        const content = parsed.content ?? "";
        if (content) {
          const stepObj = { step: "observe" as const, content };
          thinkingSteps.push(stepObj);
          onStep?.(stepObj);
        }
      }

      // ── Output ──────────────────────────────────────────────────────────────
      else if (step === "output") {
        const content = parsed.content ?? "";

        // Sanity check: if the model put meta-reasoning in the output instead of
        // an actual answer, nudge it once to write the real answer.
        const looksLikeMetaReasoning =
          content.length < 120 ||
          /^(the (provided|document|context)|i will|i need to|based on (my|the)|let me)/i.test(
            content.trim()
          );

        if (looksLikeMetaReasoning && i < MAX_ITERATIONS - 2) {
          // Push a corrective user message and keep looping
          messages.push({
            role: "user",
            content: JSON.stringify({
              step: "observe",
              content:
                "Your output step did not contain the actual answer — it contained meta-commentary. " +
                "Write the 'output' step again with the COMPLETE, DETAILED answer the user is looking for. " +
                "Start directly with the content (e.g. '## Node.js\\n\\nNode.js is...', or show the math working). " +
                "Do NOT describe what you are about to do.",
            }),
          });

          const observeStep = { step: "observe" as const, content: "Correcting output — writing full answer now." };
          thinkingSteps.push(observeStep);
          onStep?.(observeStep);
        } else {
          finalAnswer = content;
          shouldBreak = true;
        }
      }
    }

    if (shouldBreak) {
      break;
    }
  }

  const totalTokens = totalPromptTokens + totalCompletionTokens;

  // Determine actual tool used based on which actions were successfully called
  let toolUsed: "model" | "rag" | "web" | "rag+web" = "model";
  const hasRag = actionsCalled.has("check_rag_context");
  const hasWeb = actionsCalled.has("check_web_search");
  const hasOwn = actionsCalled.has("use_own_knowledge");

  if (hasOwn) {
    toolUsed = "model";
  } else if (hasRag && hasWeb) {
    toolUsed = "rag+web";
  } else if (hasRag) {
    toolUsed = "rag";
  } else if (hasWeb) {
    toolUsed = "web";
  } else {
    // If no explicit action was recorded, check context availability
    if (ragContext && webContext) {
      toolUsed = "rag+web";
    } else if (ragContext) {
      toolUsed = "rag";
    } else if (webContext) {
      toolUsed = "web";
    } else {
      toolUsed = "model";
    }
  }

  return {
    answer: finalAnswer || "I was unable to generate a response. Please try again.",
    thinkingSteps,
    toolUsed,
    usage:
      totalTokens > 0
        ? { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens, totalTokens }
        : null,
  };
}

/**
 * Extracts and parses all complete JSON objects present inside a raw string.
 * This helper helps robustly parse model outputs containing multiple consecutive or nested JSON objects.
 */
function parseJsonObjects(str: string): Record<string, any>[] {
  const objects: Record<string, any>[] = [];
  let braceCount = 0;
  let startIndex = -1;

  for (let i = 0; i < str.length; i++) {
    if (str[i] === "{") {
      if (braceCount === 0) {
        startIndex = i;
      }
      braceCount++;
    } else if (str[i] === "}") {
      braceCount--;
      if (braceCount === 0 && startIndex !== -1) {
        const objStr = str.substring(startIndex, i + 1);
        try {
          const parsed = JSON.parse(objStr);
          objects.push(parsed);
        } catch {
          // ignore invalid json chunks
        }
        startIndex = -1;
      }
    }
  }
  return objects;
}
