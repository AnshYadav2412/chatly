"use client";

import React from "react";

type WebSearchToggleProps = {
  enabled: boolean;
  onChange: (v: boolean) => void;
};

export default function WebSearchToggle({ enabled, onChange }: WebSearchToggleProps) {
  return (
    <div
      style={{
        marginTop: "10px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${enabled ? "rgba(99,179,237,0.3)" : "rgba(255,255,255,0.07)"}`,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      <button
        onClick={() => onChange(!enabled)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: enabled ? "#63b3ed" : "rgba(255,255,255,0.65)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.02em" }}>
          {/* Globe icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          Web Search
        </span>
        {/* Toggle pill */}
        <div style={{
          width: 32, height: 18, borderRadius: "999px",
          background: enabled ? "#3b82f6" : "rgba(255,255,255,0.12)",
          position: "relative", transition: "background 0.2s", flexShrink: 0,
        }}>
          <div style={{
            position: "absolute", top: 2, left: enabled ? 16 : 2,
            width: 14, height: 14, borderRadius: "50%",
            background: "#fff", transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }} />
        </div>
      </button>
      {enabled && (
        <div style={{ padding: "0 12px 10px", fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
          Tavily will search the web for each message. Results are injected into context.
        </div>
      )}
    </div>
  );
}
