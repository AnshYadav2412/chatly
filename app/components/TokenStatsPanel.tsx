"use client";

import React, { useState } from "react";
import DonutRing from "./DonutRing";
import { SessionStats, TokenUsage } from "../types";

type TokenStatsPanelProps = {
  stats: SessionStats;
  lastUsage: TokenUsage | null;
  model: string | null;
};

export default function TokenStatsPanel({ stats, lastUsage, model }: TokenStatsPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const avgTotal =
    stats.messageCount > 0
      ? Math.round(stats.totalTokens / stats.messageCount)
      : 0;

  return (
    <div
      style={{
        marginTop: "10px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "rgba(255,255,255,0.65)",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.78rem",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          {/* token icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            style={{ width: 13, height: 13, color: "#a78bfa" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.5l1.5-9 4.5 3 3-6 3 6 4.5-3 1.5 9H3z"
            />
          </svg>
          Token Usage
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          style={{
            width: 12,
            height: 12,
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div style={{ padding: "0 12px 12px" }}>
          {/* Model badge */}
          {model && (
            <div
              style={{
                fontSize: "0.68rem",
                color: "rgba(255,255,255,0.35)",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#34d399",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {model}
            </div>
          )}

          {/* Donut rings for last message */}
          {lastUsage ? (
            <>
              <p
                style={{
                  fontSize: "0.68rem",
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "8px",
                }}
              >
                Last message
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  justifyContent: "space-around",
                  marginBottom: "12px",
                }}
              >
                {[
                  { label: "In", value: lastUsage.promptTokens, color: "#60a5fa" },
                  { label: "Out", value: lastUsage.completionTokens, color: "#a78bfa" },
                  { label: "Total", value: lastUsage.totalTokens, color: "#34d399" },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <div style={{ position: "relative", width: 36, height: 36 }}>
                      <DonutRing
                        value={value}
                        max={lastUsage.totalTokens}
                        color={color}
                      />
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          color,
                        }}
                      >
                        {value > 999 ? `${(value / 1000).toFixed(1)}k` : value}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.63rem",
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p
              style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.25)",
                textAlign: "center",
                padding: "8px 0 4px",
              }}
            >
              Send a message to see stats
            </p>
          )}

          {/* Divider */}
          {stats.messageCount > 0 && (
            <>
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.06)",
                  margin: "4px 0 10px",
                }}
              />
              {/* Session totals */}
              <p
                style={{
                  fontSize: "0.68rem",
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "8px",
                }}
              >
                Session ({stats.messageCount} msg{stats.messageCount !== 1 ? "s" : ""})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {[
                  {
                    label: "Total input",
                    value: stats.totalPromptTokens,
                    color: "#60a5fa",
                  },
                  {
                    label: "Total output",
                    value: stats.totalCompletionTokens,
                    color: "#a78bfa",
                  },
                  {
                    label: "Grand total",
                    value: stats.totalTokens,
                    color: "#34d399",
                    bold: true,
                  },
                  {
                    label: "Avg / message",
                    value: avgTotal,
                    color: "rgba(255,255,255,0.5)",
                  },
                ].map(({ label, value, color, bold }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "rgba(255,255,255,0.45)",
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: bold ? 700 : 500,
                        color,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
