"use client";

import React, { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import SourcePanel from "./SourcePanel";
import TokenStatsPanel from "./TokenStatsPanel";
import ThinkingBlock from "./ThinkingBlock";
import WebSearchToggle from "./WebSearchToggle";
import ExecutionMonitor from "./ExecutionMonitor";
import ModelSelector from "./ModelSelector";
import { Message, SessionStats, TokenUsage, ToolUsed, ThinkingStep, WebResult } from "../types";

const SUGGESTIONS = [
  "Explain quantum computing simply",
  "Write a Python quicksort function",
  "Differences between REST and GraphQL",
  "Help me write a cover letter",
];

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasContext, setHasContext] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemma4:31b-cloud");
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState("nomic-embed-text:latest");
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    messageCount: 0,
  });
  const [lastUsage, setLastUsage] = useState<TokenUsage | null>(null);
  const [lastModel, setLastModel] = useState<string | null>(null);

  // Agent execution monitor states
  const [activeTool, setActiveTool] = useState<"check_rag_context" | "check_web_search" | "use_own_knowledge" | "idle" | null>(null);
  const [streamingSteps, setStreamingSteps] = useState<ThinkingStep[]>([]);
  const [agentStatus, setAgentStatus] = useState<"idle" | "routing" | "retrieving" | "reasoning">("idle");

  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [input]);

  const addMessage = (
    text: string,
    isUser: boolean,
    tokenUsage?: TokenUsage,
    model?: string,
    webResults?: WebResult[],
    webSearched?: boolean,
    toolUsed?: ToolUsed,
    thinkingSteps?: ThinkingStep[],
  ) =>
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, text, isUser, tokenUsage, model, webResults, webSearched, toolUsed, thinkingSteps },
    ]);

  const sendMessage = async (message: string) => {
    setIsLoading(true);
    setStreamingSteps([]);
    setAgentStatus("routing");
    setActiveTool("idle");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: message,
          webSearch: webSearchEnabled,
          model: selectedModel,
          embeddingModel: selectedEmbeddingModel,
        }),
      });

      if (!res.body) {
        throw new Error("ReadableStream is not supported or missing in response.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          let data;
          try {
            data = JSON.parse(line);
          } catch (err) {
            console.error("Failed to parse JSON stream line", line, err);
            continue;
          }

          if (data.type === "step") {
            const stepObj: ThinkingStep = data.step;
            setStreamingSteps((prev) => [...prev, stepObj]);

            // Update active tool and status dynamically based on step content
            if (stepObj.step === "action") {
              if (stepObj.content.includes("check_rag_context")) {
                setActiveTool("check_rag_context");
                setAgentStatus("retrieving");
              } else if (stepObj.content.includes("check_web_search") || stepObj.content.includes("webSearch")) {
                setActiveTool("check_web_search");
                setAgentStatus("retrieving");
              } else if (stepObj.content.includes("use_own_knowledge")) {
                setActiveTool("use_own_knowledge");
                setAgentStatus("reasoning");
              }
            } else if (stepObj.step === "plan") {
              if (stepObj.content.includes("local knowledge base") || stepObj.content.includes("document context") || stepObj.content.includes("RAG")) {
                setActiveTool("check_rag_context");
                setAgentStatus("routing");
              } else if (stepObj.content.includes("web search") || stepObj.content.includes("check_web_search")) {
                setActiveTool("check_web_search");
                setAgentStatus("routing");
              } else if (stepObj.content.includes("reasoning") || stepObj.content.includes("Plan")) {
                setAgentStatus("reasoning");
              }
            } else if (stepObj.step === "observe") {
              if (stepObj.content.includes("use_own_knowledge")) {
                setActiveTool("use_own_knowledge");
                setAgentStatus("reasoning");
              }
            }
          } else if (data.type === "result") {
            const usage: TokenUsage | undefined = data.usage ?? undefined;
            const model: string | undefined = data.model ?? undefined;
            const webResults: WebResult[] | undefined = data.webResults ?? undefined;
            const webSearched: boolean = data.webSearched ?? false;
            const toolUsed: ToolUsed = data.toolUsed ?? (webSearched ? "web" : data.hasContext ? "rag" : "model");
            const thinkingSteps: ThinkingStep[] | undefined = data.thinkingSteps ?? undefined;

            addMessage(
              data.response ?? "Sorry, something went wrong.",
              false,
              usage,
              model,
              webResults,
              webSearched,
              toolUsed,
              thinkingSteps,
            );

            if (data.hasContext) setHasContext(true);

            if (usage) {
              setLastUsage(usage);
              setLastModel(model ?? null);
              setSessionStats((prev) => ({
                totalPromptTokens: prev.totalPromptTokens + usage.promptTokens,
                totalCompletionTokens: prev.totalCompletionTokens + usage.completionTokens,
                totalTokens: prev.totalTokens + usage.totalTokens,
                messageCount: prev.messageCount + 1,
              }));
            }

            setAgentStatus("idle");
            setActiveTool(null);
          } else if (data.type === "error") {
            addMessage(`⚠️ Error: ${data.message}`, false);
            setAgentStatus("idle");
            setActiveTool(null);
          }
        }
      }
    } catch {
      addMessage("⚠️ Could not reach the server or parse the stream. Is Ollama running?", false);
      setAgentStatus("idle");
      setActiveTool(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    addMessage(trimmed, true);
    setInput("");
    sendMessage(trimmed);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim().length > 0 && !isLoading;

  const handleNewChat = () => {
    setMessages([]);
    setHasContext(false);
    setLastUsage(null);
    setLastModel(null);
    setSessionStats({
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      messageCount: 0,
    });
    setStreamingSteps([]);
    setAgentStatus("idle");
    setActiveTool(null);
  };

  const inputBorderColor = hasContext
    ? "rgba(34,197,94,0.3)"
    : webSearchEnabled
    ? "rgba(59,130,246,0.4)"
    : "rgba(255,255,255,0.08)";

  return (
    <div style={{ display: "flex", height: "100vh", background: "#212121", color: "#fff", fontFamily: "inherit", overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: "260px", flexShrink: 0,
        background: "#171717",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
        padding: "12px 8px",
        overflowY: "auto",
      }}>
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", marginBottom: "4px" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 41 41" style={{ width: 16, height: 16, fill: "#000" }}>
              <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.214-2.833 10.079 10.079 0 0 0-9.415 6.977 9.967 9.967 0 0 0-6.659 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.214 2.032 10.079 10.079 0 0 0 9.414-6.977 9.967 9.967 0 0 0 6.66-4.834 10.079 10.079 0 0 0-1.24-11.817z" />
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Chatly</span>
        </div>

        {/* New chat */}
        <button
          onClick={handleNewChat}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "9px 10px", borderRadius: "8px", border: "none",
            background: "transparent", color: "rgba(255,255,255,0.75)",
            fontSize: "0.875rem", cursor: "pointer", width: "100%", textAlign: "left",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", margin: "10px 0" }} />

        {/* Source Panel */}
        <SourcePanel onIngested={() => setHasContext(true)} embeddingModel={selectedEmbeddingModel} />

        {/* Web Search Toggle */}
        <WebSearchToggle enabled={webSearchEnabled} onChange={setWebSearchEnabled} />

        {/* Model Selector */}
        <ModelSelector
          selectedModel={selectedModel}
          onChange={setSelectedModel}
          selectedEmbeddingModel={selectedEmbeddingModel}
          onEmbeddingChange={setSelectedEmbeddingModel}
        />

        {/* Token Stats Panel */}
        <TokenStatsPanel
          stats={sessionStats}
          lastUsage={lastUsage}
          model={lastModel}
        />

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User row */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "8px 10px", borderRadius: "8px", cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{
            width: 28, height: 28, borderRadius: "50%", background: "#7c5cbf",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
          }}>U</div>
          <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>User</span>
        </div>
      </aside>

      {/* ── Main panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", paddingTop: "8px", paddingBottom: "8px" }}>
          {messages.length === 0 ? (
            /* Welcome screen */
            <div style={{
              height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", padding: "0 1rem", gap: "1.5rem",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 16px rgba(0,0,0,0.4)",
              }}>
                <svg viewBox="0 0 41 41" style={{ width: 28, height: 28, fill: "#000" }}>
                  <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.214-2.833 10.079 10.079 0 0 0-9.415 6.977 9.967 9.967 0 0 0-6.659 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.214 2.032 10.079 10.079 0 0 0 9.414-6.977 9.967 9.967 0 0 0 6.66-4.834 10.079 10.079 0 0 0-1.24-11.817z" />
                </svg>
              </div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>How can I help you today?</h1>
              {hasContext && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "5px 12px", borderRadius: "999px",
                  background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)",
                  fontSize: "0.78rem", color: "#4ade80",
                }}>
                  📄 Knowledge base active — ask anything about your documents
                </div>
              )}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "10px", width: "100%", maxWidth: "640px",
              }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    style={{
                      textAlign: "left", padding: "12px 14px",
                      borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)",
                      background: "#2f2f2f", color: "rgba(255,255,255,0.75)",
                      fontSize: "0.82rem", lineHeight: "1.4", cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#383838")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#2f2f2f")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id}>
                  {/* Chain-of-thought thinking block — shown above AI replies */}
                  {!msg.isUser && msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                    <ThinkingBlock steps={msg.thinkingSteps} />
                  )}

                  <MessageBubble text={msg.text} isUser={msg.isUser} />

                  {!msg.isUser && (msg.tokenUsage || msg.webSearched || msg.toolUsed) && (
                    <div
                      className="token-badge"
                      style={{ display: "flex", justifyContent: "center", padding: "0 16px 6px" }}
                    >
                      <div style={{ maxWidth: "48rem", width: "100%", paddingLeft: "40px", display: "flex", flexDirection: "column", gap: "6px" }}>

                        {msg.tokenUsage && (
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: "8px",
                            padding: "3px 10px", borderRadius: "999px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            fontSize: "0.68rem", color: "rgba(255,255,255,0.35)",
                            letterSpacing: "0.01em", width: "fit-content",
                          }}>
                            {[
                              { label: "in", value: msg.tokenUsage.promptTokens, color: "#60a5fa" },
                              { label: "out", value: msg.tokenUsage.completionTokens, color: "#a78bfa" },
                              { label: "total", value: msg.tokenUsage.totalTokens, color: "#34d399" },
                            ].map(({ label, value, color }, i) => (
                              <React.Fragment key={label}>
                                {i > 0 && <span style={{ opacity: 0.3 }}>·</span>}
                                <span>
                                  <span style={{ color, fontWeight: 600 }}>{value.toLocaleString()}</span>{" "}
                                  <span>{label}</span>
                                </span>
                              </React.Fragment>
                            ))}
                            {msg.model && (
                              <><span style={{ opacity: 0.3 }}>·</span><span style={{ opacity: 0.5 }}>{msg.model}</span></>
                            )}
                          </div>
                        )}

                        {/* Web sources strip */}
                        {msg.webSearched && msg.webResults && msg.webResults.length > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              fontSize: "0.65rem", color: "#63b3ed",
                              fontWeight: 600, letterSpacing: "0.04em", flexShrink: 0,
                            }}>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 10, height: 10 }}>
                                <circle cx="12" cy="12" r="10" />
                                <path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                              </svg>
                              Sources
                            </span>
                            {msg.webResults.map((r, i) => (
                              <a
                                key={i}
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={r.title}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: "4px",
                                  padding: "2px 8px", borderRadius: "999px",
                                  background: "rgba(99,179,237,0.08)",
                                  border: "1px solid rgba(99,179,237,0.2)",
                                  fontSize: "0.65rem", color: "#63b3ed",
                                  textDecoration: "none", maxWidth: "140px",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,179,237,0.15)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,179,237,0.08)")}
                              >
                                {new URL(r.url).hostname.replace("www.", "")}
                              </a>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div style={{ display: "flex", justifyContent: "center", padding: "8px 16px" }}>
                  <div style={{ maxWidth: "48rem", width: "100%", display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", background: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <svg viewBox="0 0 41 41" style={{ width: 16, height: 16, fill: "#000" }}>
                        <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.214-2.833 10.079 10.079 0 0 0-9.415 6.977 9.967 9.967 0 0 0-6.659 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.214 2.032 10.079 10.079 0 0 0 9.414-6.977 9.967 9.967 0 0 0 6.66-4.834 10.079 10.079 0 0 0-1.24-11.817z" />
                      </svg>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>Reasoning…</span>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.4)", display: "inline-block" }} />
                        <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.4)", display: "inline-block" }} />
                        <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.4)", display: "inline-block" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* ── Input bar ── */}
        <div style={{ padding: "12px 16px 20px", flexShrink: 0 }}>
          <div style={{ maxWidth: "48rem", margin: "0 auto" }}>

            {/* Context active badge */}
            {hasContext && (
              <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                marginBottom: "8px", fontSize: "0.75rem",
                color: "#4ade80",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                Responding from your knowledge base
              </div>
            )}

            <div style={{
              display: "flex", alignItems: "flex-end", gap: "10px",
              background: "#2f2f2f", borderRadius: "16px",
              border: `1px solid ${inputBorderColor}`,
              padding: "10px 12px",
              transition: "border-color 0.2s",
            }}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={hasContext ? "Ask about your documents…" : "Message Chatly"}
                style={{
                  flex: 1, background: "transparent", border: "none",
                  outline: "none", resize: "none", color: "#fff",
                  fontSize: "0.9rem", lineHeight: "1.5",
                  maxHeight: "180px", overflowY: "auto",
                  fontFamily: "inherit",
                }}
              />

              {/* ── Mode indicator pills ── */}
              <div style={{ display: "flex", gap: "5px", alignItems: "center", flexShrink: 0 }}>
                {/* RAG pill */}
                <div
                  title={hasContext ? "Document knowledge base active" : "No documents ingested"}
                  className={isLoading && hasContext ? "mode-pill-pulse" : ""}
                  style={{
                    width: 26, height: 26, borderRadius: "7px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: hasContext ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${hasContext ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.07)"}`,
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={hasContext ? "#4ade80" : "rgba(255,255,255,0.2)"} strokeWidth={2} style={{ width: 13, height: 13 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                {/* Web search pill */}
                <div
                  title={webSearchEnabled ? "Web search enabled" : "Web search disabled"}
                  className={isLoading && webSearchEnabled ? "mode-pill-pulse" : ""}
                  style={{
                    width: 26, height: 26, borderRadius: "7px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: webSearchEnabled ? "rgba(99,179,237,0.12)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${webSearchEnabled ? "rgba(99,179,237,0.3)" : "rgba(255,255,255,0.07)"}`,
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={webSearchEnabled ? "#63b3ed" : "rgba(255,255,255,0.2)"} strokeWidth={2} style={{ width: 13, height: 13 }}>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!canSend}
                style={{
                  width: 32, height: 32, borderRadius: "8px", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: canSend ? "#fff" : "rgba(255,255,255,0.1)",
                  color: canSend ? "#000" : "rgba(255,255,255,0.2)",
                  cursor: canSend ? "pointer" : "not-allowed",
                  flexShrink: 0, transition: "background 0.15s",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4l8 8h-5v8h-6v-8H4l8-8z" />
                </svg>
              </button>
            </div>

            <p style={{ textAlign: "center", fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", marginTop: "8px" }}>
              Chatly can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>

      {/* ── Agent Monitor Sidebar ── */}
      <ExecutionMonitor
        activeTool={activeTool}
        agentStatus={agentStatus}
        streamingSteps={streamingSteps}
      />
    </div>
  );
}
