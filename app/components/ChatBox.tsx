"use client";

import React, { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import SourcePanel from "./SourcePanel";

type Message = {
  id: number;
  text: string;
  isUser: boolean;
};

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

  const addMessage = (text: string, isUser: boolean) =>
    setMessages((prev) => [...prev, { id: nextId.current++, text, isUser }]);

  const sendMessage = async (message: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: message }),
      });
      const data = await res.json();
      addMessage(data.response ?? "Sorry, something went wrong.", false);
      // If the server found context, keep the badge lit
      if (data.hasContext) setHasContext(true);
    } catch {
      addMessage("⚠️ Could not reach the server. Is Ollama running?", false);
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

  return (
    <div style={{ display: "flex", height: "100vh", background: "#212121", color: "#fff", fontFamily: "inherit" }}>

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
          onClick={() => { setMessages([]); setHasContext(false); }}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "9px 10px", borderRadius: "8px", border: "none",
            background: "transparent", color: "rgba(255,255,255,0.75)",
            fontSize: "0.875rem", cursor: "pointer", width: "100%", textAlign: "left",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", margin: "10px 0" }} />

        {/* Source Panel */}
        <SourcePanel onIngested={() => setHasContext(true)} />

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User row */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "8px 10px", borderRadius: "8px", cursor: "pointer",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
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
                    onMouseEnter={e => (e.currentTarget.style.background = "#383838")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#2f2f2f")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} text={msg.text} isUser={msg.isUser} />
              ))}

              {/* Bouncing dots loader */}
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
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.4)", display: "inline-block" }} />
                      <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.4)", display: "inline-block" }} />
                      <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.4)", display: "inline-block" }} />
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
              border: `1px solid ${hasContext ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
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
    </div>
  );
}
