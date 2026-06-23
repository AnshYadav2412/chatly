"use client";

import { useState, useRef } from "react";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; chunks: number }
  | { type: "error"; message: string };

type Tab = "pdf" | "url" | "text";

interface Props {
  onIngested: () => void;
  embeddingModel: string;
}

export default function SourcePanel({ onIngested, embeddingModel }: Props) {
  const [tab, setTab] = useState<Tab>("pdf");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isLoading = status.type === "loading";

  const reset = () => setStatus({ type: "idle" });

  // ── Shared ingest ──────────────────────────────────────────────────────────
  async function ingest(init: RequestInit) {
    setStatus({ type: "loading" });
    try {
      const res = await fetch("/api/ingest", init);
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus({ type: "error", message: data.error ?? "Ingest failed" });
      } else {
        setStatus({ type: "success", chunks: data.chunks });
        onIngested();
      }
    } catch {
      setStatus({ type: "error", message: "Network error — is the dev server running?" });
    }
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus({ type: "error", message: "Only PDF files are supported." });
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("embeddingModel", embeddingModel);
    await ingest({ method: "POST", body: fd });
  }

  // ── URL ───────────────────────────────────────────────────────────────────
  async function handleUrl() {
    if (!url.trim()) return;
    await ingest({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url", url: url.trim(), embeddingModel }),
    });
  }

  // ── Text ──────────────────────────────────────────────────────────────────
  async function handleText() {
    if (!text.trim()) return;
    await ingest({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "text", text: text.trim(), title: textTitle.trim(), embeddingModel }),
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  const s = (base: object, extra?: object) => ({ ...base, ...(extra ?? {}) } as React.CSSProperties);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "5px 0", fontSize: "0.75rem", fontWeight: 500,
    border: "none", borderRadius: "6px", cursor: "pointer",
    background: active ? "#3a3a3a" : "transparent",
    color: active ? "#fff" : "rgba(255,255,255,0.45)",
    transition: "background 0.15s, color 0.15s",
  });

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "7px 10px",
    background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px", color: "#fff", fontSize: "0.8rem",
    outline: "none", fontFamily: "inherit",
  };

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: "100%", padding: "7px 0", borderRadius: "8px", border: "none",
    background: disabled ? "rgba(255,255,255,0.08)" : "#fff",
    color: disabled ? "rgba(255,255,255,0.25)" : "#000",
    fontSize: "0.8rem", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    transition: "background 0.15s",
  });

  return (
    <div style={{ padding: "10px 8px 0" }}>
      {/* Header */}
      <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 4px", marginBottom: "8px" }}>
        Knowledge Base
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "3px", background: "#1e1e1e", padding: "3px", borderRadius: "8px", marginBottom: "10px" }}>
        {(["pdf", "url", "text"] as Tab[]).map((t) => (
          <button key={t} style={tabStyle(tab === t)} onClick={() => { setTab(t); reset(); }}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── PDF Tab ── */}
      {tab === "pdf" && (
        <div>
          <div
            onClick={() => !isLoading && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            style={{
              border: `1.5px dashed ${dragOver ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}`,
              borderRadius: "10px", padding: "20px 10px", textAlign: "center",
              cursor: isLoading ? "not-allowed" : "pointer",
              background: dragOver ? "rgba(255,255,255,0.05)" : "transparent",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <div style={{ fontSize: "1.4rem", marginBottom: "6px" }}>📄</div>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
              Drop a PDF here<br />or click to browse
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {/* ── URL Tab ── */}
      {tab === "url" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input
            style={inputStyle}
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleUrl()}
          />
          <button style={btnStyle(isLoading || !url.trim())} disabled={isLoading || !url.trim()} onClick={handleUrl}>
            {isLoading ? "Loading…" : "Fetch & Ingest"}
          </button>
        </div>
      )}

      {/* ── Text Tab ── */}
      {tab === "text" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input
            style={inputStyle}
            placeholder="Source title (optional)"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
          />
          <textarea
            style={s(inputStyle, { resize: "none", height: "90px", lineHeight: 1.5 })}
            placeholder="Paste any text to use as context…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button style={btnStyle(isLoading || !text.trim())} disabled={isLoading || !text.trim()} onClick={handleText}>
            {isLoading ? "Ingesting…" : "Ingest Text"}
          </button>
        </div>
      )}

      {/* ── Status badge ── */}
      {status.type !== "idle" && (
        <div style={{
          marginTop: "10px", padding: "7px 10px", borderRadius: "8px", fontSize: "0.75rem",
          background: status.type === "success"
            ? "rgba(34,197,94,0.1)"
            : status.type === "error"
            ? "rgba(239,68,68,0.12)"
            : "rgba(255,255,255,0.05)",
          border: `1px solid ${status.type === "success" ? "rgba(34,197,94,0.25)" : status.type === "error" ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)"}`,
          color: status.type === "success" ? "#4ade80" : status.type === "error" ? "#f87171" : "rgba(255,255,255,0.55)",
          lineHeight: 1.5,
        }}>
          {status.type === "loading" && "⏳ Processing…"}
          {status.type === "success" && `✅ Done — ${status.chunks} chunks stored in Qdrant`}
          {status.type === "error" && `❌ ${status.message}`}
        </div>
      )}
    </div>
  );
}
