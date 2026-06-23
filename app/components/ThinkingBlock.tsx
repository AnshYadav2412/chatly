"use client";

import React, { useState } from "react";
import { ThinkingStep } from "../types";

type ThinkingBlockProps = {
  steps: ThinkingStep[];
};

const STEP_META = {
  plan:    { icon: "💭", label: "Plan",    color: "rgba(255,255,255,0.35)" },
  action:  { icon: "⚡", label: "Action",  color: "rgba(251,191,36,0.6)"  },
  observe: { icon: "👁",  label: "Observe", color: "rgba(99,179,237,0.6)"  },
} as const;

export default function ThinkingBlock({ steps }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);
  if (!steps.length) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "4px 16px 2px" }}>
      <div style={{ maxWidth: "48rem", width: "100%", paddingLeft: "40px" }}>
        {/* Header button */}
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "transparent", border: "none", cursor: "pointer",
            padding: "3px 0", color: "rgba(255,255,255,0.3)",
            fontSize: "0.72rem", letterSpacing: "0.02em",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >
          {/* Brain icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={1.5} style={{ width: 12, height: 12 }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9.53 2.47a9 9 0 0 1 4.94 0M15 7.5c0-.828-.336-1.578-.879-2.121M9 7.5c0-.828.336-1.578.879-2.121M12 12v9m0 0H9m3 0h3M3 12a9 9 0 0 0 7.364 8.82M21 12a9 9 0 0 1-7.364 8.82" />
          </svg>
          <span>Thought for {steps.length} step{steps.length !== 1 ? "s" : ""}</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2}
            style={{ width: 10, height: 10, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded steps */}
        {expanded && (
          <div style={{
            marginTop: "6px",
            padding: "10px 14px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column", gap: "8px",
          }}>
            {steps.map((s, i) => {
              const meta = STEP_META[s.step];
              return (
                <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.68rem", flexShrink: 0, paddingTop: "1px", opacity: 0.7 }}>
                    {meta.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase",
                      letterSpacing: "0.08em", color: meta.color, marginRight: "6px",
                    }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
                      {s.content}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
