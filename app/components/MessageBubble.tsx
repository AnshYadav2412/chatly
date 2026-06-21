"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  text: string;
  isUser: boolean;
};

export default function MessageBubble({ text, isUser }: Props) {
  if (isUser) {
    return (
      <div className="msg-in flex justify-center px-4 py-1">
        <div style={{ maxWidth: "48rem", width: "100%" }} className="flex justify-end">
          <div
            style={{
              background: "#3a3a3a",
              borderRadius: "1.5rem",
              padding: "0.65rem 1.1rem",
              maxWidth: "70%",
              fontSize: "0.9rem",
              lineHeight: "1.6",
              color: "#fff",
            }}
          >
            {text}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-in flex justify-center px-4 py-3">
      <div style={{ maxWidth: "48rem", width: "100%", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
        {/* Avatar */}
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "2px",
          }}
        >
          <svg viewBox="0 0 41 41" style={{ width: "16px", height: "16px", fill: "#000" }}>
            <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.214-2.833 10.079 10.079 0 0 0-9.415 6.977 9.967 9.967 0 0 0-6.659 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.214 2.032 10.079 10.079 0 0 0 9.414-6.977 9.967 9.967 0 0 0 6.66-4.834 10.079 10.079 0 0 0-1.24-11.817z" />
          </svg>
        </div>

        {/* Content */}
        <div className="md-body" style={{ flex: 1, fontSize: "0.9rem", lineHeight: "1.6", color: "#ececec" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}