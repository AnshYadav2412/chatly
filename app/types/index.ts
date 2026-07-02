export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type WebResult = {
  title: string;
  url: string;
  content: string;
};

export type ToolUsed = "model" | "rag" | "web" | "rag+web";

export type ThinkingStep = {
  step: "plan" | "action" | "observe";
  content: string;
};

export type Message = {
  id: number;
  text: string;
  isUser: boolean;
  tokenUsage?: TokenUsage;
  routerUsage?: TokenUsage;
  model?: string;
  webResults?: WebResult[];
  webSearched?: boolean;
  toolUsed?: ToolUsed;
  thinkingSteps?: ThinkingStep[];
};

export type SessionStats = {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  messageCount: number;
  routerTotalTokens?: number;
};
