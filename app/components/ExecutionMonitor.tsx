"use client";

import React from "react";
import { ThinkingStep } from "../types";

type ExecutionMonitorProps = {
  activeTool: "check_rag_context" | "check_web_search" | "use_own_knowledge" | "idle" | null;
  agentStatus: "idle" | "routing" | "retrieving" | "reasoning";
  streamingSteps: ThinkingStep[];
};

export default function ExecutionMonitor({ activeTool, agentStatus, streamingSteps }: ExecutionMonitorProps) {
  return (
    <aside style={{
      width: "320px",
      flexShrink: 0,
      background: "#171717",
      borderLeft: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      flexDirection: "column",
      padding: "16px",
      overflowY: "auto",
      fontFamily: "inherit",
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseGlow {
          0% { transform: scale(0.97); opacity: 0.8; box-shadow: 0 0 10px rgba(16, 185, 129, 0.2); }
          50% { transform: scale(1.03); opacity: 1; box-shadow: 0 0 25px rgba(16, 185, 129, 0.5); }
          100% { transform: scale(0.97); opacity: 0.8; box-shadow: 0 0 10px rgba(16, 185, 129, 0.2); }
        }
        @keyframes pulseGlowBlue {
          0% { transform: scale(0.97); opacity: 0.8; box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); }
          50% { transform: scale(1.03); opacity: 1; box-shadow: 0 0 25px rgba(59, 130, 246, 0.5); }
          100% { transform: scale(0.97); opacity: 0.8; box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); }
        }
        @keyframes pulseGlowPurple {
          0% { transform: scale(0.97); opacity: 0.8; box-shadow: 0 0 10px rgba(139, 92, 246, 0.2); }
          50% { transform: scale(1.03); opacity: 1; box-shadow: 0 0 25px rgba(139, 92, 246, 0.5); }
          100% { transform: scale(0.97); opacity: 0.8; box-shadow: 0 0 10px rgba(139, 92, 246, 0.2); }
        }
        @keyframes scanLine {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes neuralPulse {
          0% { transform: scale(0.95); filter: brightness(0.9); }
          50% { transform: scale(1.05); filter: brightness(1.2); }
          100% { transform: scale(0.95); filter: brightness(0.9); }
        }
        @keyframes orbitSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes orbitSpinRev {
          0% { transform: translate(-50%, -50%) rotate(360deg); }
          100% { transform: translate(-50%, -50%) rotate(0deg); }
        }
        @keyframes dotPulse {
          0% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.3; transform: scale(0.8); }
        }
      `}} />

      {/* Status Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.05em", color: "rgba(255,255,255,0.5)" }}>EXECUTION MONITOR</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          padding: "3px 8px", borderRadius: "999px",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: agentStatus === "idle" ? "rgba(255,255,255,0.25)" : agentStatus === "routing" ? "#fbbf24" : agentStatus === "retrieving" ? "#3b82f6" : "#a78bfa",
            display: "inline-block",
            animation: agentStatus !== "idle" ? "dotPulse 1.5s infinite ease-in-out" : "none"
          }} />
          <span style={{
            fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
            color: agentStatus === "idle" ? "rgba(255,255,255,0.4)" : agentStatus === "routing" ? "#fbbf24" : agentStatus === "retrieving" ? "#60a5fa" : "#a78bfa"
          }}>
            {agentStatus}
          </span>
        </div>
      </div>

      {/* Visual Animation Area */}
      <div style={{
        height: "180px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        marginBottom: "20px",
        transition: "all 0.3s ease",
      }}>
        {/* RAG Context Scanner */}
        {activeTool === "check_rag_context" && (
          <div style={{
            width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            animation: "pulseGlow 2.5s infinite ease-in-out", background: "rgba(16, 185, 129, 0.02)"
          }}>
            <div style={{
              position: "absolute", left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #10b981, transparent)",
              animation: "scanLine 3s infinite ease-in-out", pointerEvents: "none", zIndex: 10
            }} />
            <div style={{ position: "relative", width: "50px", height: "60px", background: "rgba(16, 185, 129, 0.1)", border: "2px solid #10b981", borderRadius: "6px", display: "flex", flexDirection: "column", gap: "6px", padding: "8px", justifyContent: "center" }}>
              <div style={{ height: "3px", width: "80%", background: "rgba(16, 185, 129, 0.5)", borderRadius: "2px" }} />
              <div style={{ height: "3px", width: "60%", background: "rgba(16, 185, 129, 0.5)", borderRadius: "2px" }} />
              <div style={{ height: "3px", width: "70%", background: "rgba(16, 185, 129, 0.5)", borderRadius: "2px" }} />
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#10b981", marginTop: "12px", letterSpacing: "0.05em" }}>SCANNING KNOWLEDGE BASE</span>
          </div>
        )}

        {/* Web Search Orbit */}
        {activeTool === "check_web_search" && (
          <div style={{
            width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            animation: "pulseGlowBlue 2.5s infinite ease-in-out", background: "rgba(59, 130, 246, 0.02)"
          }}>
            <div style={{ position: "relative", width: "80px", height: "80px" }}>
              {/* Outer Orbit */}
              <div style={{
                position: "absolute", top: "50%", left: "50%", width: "70px", height: "70px", border: "1px dashed rgba(59, 130, 246, 0.4)", borderRadius: "50%",
                animation: "orbitSpin 6s linear infinite"
              }}>
                <div style={{ position: "absolute", top: "-3px", left: "50%", width: "6px", height: "6px", background: "#3b82f6", borderRadius: "50%", boxShadow: "0 0 8px #3b82f6" }} />
              </div>
              {/* Inner Orbit */}
              <div style={{
                position: "absolute", top: "50%", left: "50%", width: "45px", height: "45px", border: "1px dashed rgba(96, 165, 250, 0.6)", borderRadius: "50%",
                animation: "orbitSpinRev 4s linear infinite"
              }}>
                <div style={{ position: "absolute", bottom: "-3px", left: "50%", width: "6px", height: "6px", background: "#60a5fa", borderRadius: "50%", boxShadow: "0 0 8px #60a5fa" }} />
              </div>
              {/* Center Globe */}
              <div style={{
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "24px", height: "24px", background: "#3b82f6", borderRadius: "50%",
                boxShadow: "0 0 16px rgba(59, 130, 246, 0.8)", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} style={{ width: 12, height: 12 }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#3b82f6", marginTop: "12px", letterSpacing: "0.05em" }}>WEB SEARCH RETRIEVAL</span>
          </div>
        )}

        {/* Neural Model Knowledge */}
        {activeTool === "use_own_knowledge" && (
          <div style={{
            width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            animation: "pulseGlowPurple 2.5s infinite ease-in-out", background: "rgba(139, 92, 246, 0.02)"
          }}>
            <div style={{
              width: "50px", height: "50px", borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 25px rgba(139, 92, 246, 0.6)",
              animation: "neuralPulse 2s infinite ease-in-out"
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} style={{ width: 22, height: 22 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 2.47a9 9 0 0 1 4.94 0M15 7.5c0-.828-.336-1.578-.879-2.121M9 7.5c0-.828.336-1.578.879-2.121M12 12v9m0 0H9m3 0h3M3 12a9 9 0 0 0 7.364 8.82M21 12a9 9 0 0 1-7.364 8.82" />
              </svg>
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#a78bfa", marginTop: "12px", letterSpacing: "0.05em" }}>MODEL KNOWLEDGE ENGINE</span>
          </div>
        )}

        {/* Idle / Standby */}
        {(activeTool === null || activeTool === "idle") && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.25)",
              boxShadow: "0 0 15px rgba(255,255,255,0.02)",
            }}>
              <svg viewBox="0 0 41 41" style={{ width: 16, height: 16, fill: "currentColor" }}>
                <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.214-2.833 10.079 10.079 0 0 0-9.415 6.977 9.967 9.967 0 0 0-6.659 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.214 2.032 10.079 10.079 0 0 0 9.414-6.977 9.967 9.967 0 0 0 6.66-4.834 10.079 10.079 0 0 0-1.24-11.817z" />
              </svg>
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "rgba(255,255,255,0.25)", marginTop: "12px", letterSpacing: "0.03em" }}>MONITOR STANDBY</span>
          </div>
        )}
      </div>

      {/* Live Reasoning Log Feed */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em", marginBottom: "8px", textTransform: "uppercase" }}>Execution Log Stream</span>
        <div style={{
          flex: 1,
          background: "rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "12px",
          padding: "12px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          fontFamily: "monospace",
          fontSize: "0.72rem",
          lineHeight: "1.4",
          color: "rgba(255,255,255,0.45)",
        }}>
          {streamingSteps.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.15)", fontStyle: "italic" }}>
              No active query execution log. Stream will appear here when you send a message.
            </div>
          ) : (
            streamingSteps.map((step, idx) => {
              const stepStyles = {
                plan: { color: "rgba(255,255,255,0.7)", prefix: "[PLAN] " },
                action: { color: "#fbbf24", prefix: "[ACT ] " },
                observe: { color: "#60a5fa", prefix: "[OBS ] " },
              }[step.step] || { color: "rgba(255,255,255,0.4)", prefix: "[LOG ] " };

              return (
                <div key={idx} style={{ wordBreak: "break-word" }}>
                  <span style={{ color: stepStyles.color, fontWeight: "bold" }}>{stepStyles.prefix}</span>
                  <span>{step.content}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
