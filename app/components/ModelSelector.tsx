"use client";

import React, { useState, useEffect } from "react";

type ModelSelectorProps = {
  selectedModel: string;
  onChange: (model: string) => void;
  selectedEmbeddingModel: string;
  onEmbeddingChange: (model: string) => void;
};

export default function ModelSelector({
  selectedModel,
  onChange,
  selectedEmbeddingModel,
  onEmbeddingChange,
}: ModelSelectorProps) {
  const [chatModels, setChatModels] = useState<string[]>([]);
  const [embeddingModels, setEmbeddingModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/models");
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        const chats = data.chatModels ?? [];
        const embeddings = data.embeddingModels ?? [];
        
        setChatModels(chats);
        setEmbeddingModels(embeddings);
        
        // Handle defaults and check for mismatch
        if (chats.length > 0) {
          if (!selectedModel || !chats.includes(selectedModel)) {
            const defaultChat = chats.includes("gemma4:31b-cloud")
              ? "gemma4:31b-cloud"
              : chats[0];
            onChange(defaultChat);
          }
        }
        
        if (embeddings.length > 0) {
          if (!selectedEmbeddingModel || !embeddings.includes(selectedEmbeddingModel)) {
            const defaultEmbed = embeddings.includes("nomic-embed-text:latest")
              ? "nomic-embed-text:latest"
              : embeddings.includes("nomic-embed-text")
              ? "nomic-embed-text"
              : embeddings[0];
            onEmbeddingChange(defaultEmbed);
          }
        }
      } catch {
        console.error("Failed to load models");
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, [onChange, onEmbeddingChange, selectedModel, selectedEmbeddingModel]);

  return (
    <div
      style={{
        marginTop: "10px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* ── Chat Model Selector ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: "0.02em",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            style={{ width: 13, height: 13, color: "#34d399" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Chat Model
        </label>
        
        {loading ? (
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>Loading...</span>
        ) : (
          <select
            value={selectedModel}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: "100%",
              background: "#1e1e1e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#fff",
              padding: "5px 8px",
              fontSize: "0.78rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {chatModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Embedding Model Selector ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: "0.02em",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            style={{ width: 13, height: 13, color: "#60a5fa" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11.5a13.96 13.96 0 00-2.317-7.67l-.024-.04c1.196-1.042 2.52-1.787 3.98-2.185m4.73 17.511a14.07 14.07 0 002.317-7.67c0-2.872-.86-5.543-2.336-7.777m-4.73 7.777h7.5m-15 0h3M12 3v1m0 16v1" />
          </svg>
          Embedding Model
        </label>
        
        {loading ? (
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>Loading...</span>
        ) : (
          <select
            value={selectedEmbeddingModel}
            onChange={(e) => onEmbeddingChange(e.target.value)}
            style={{
              width: "100%",
              background: "#1e1e1e",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#fff",
              padding: "5px 8px",
              fontSize: "0.78rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {embeddingModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

