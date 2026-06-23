import { NextResponse } from "next/server";

function isEmbeddingModel(modelName: string, family?: string, families?: string[]): boolean {
  const nameLower = modelName.toLowerCase();
  const fams = [family, ...(families ?? [])].filter(Boolean).map(f => f!.toLowerCase());
  
  if (
    nameLower.includes("embed") ||
    nameLower.includes("bge") ||
    nameLower.includes("minilm") ||
    nameLower.includes("mxbai")
  ) {
    return true;
  }
  
  for (const f of fams) {
    if (f.includes("bert") || f.includes("embed")) {
      return true;
    }
  }
  
  return false;
}

export async function GET() {
  const defaultChatModels = [
    "gpt-oss:120b-cloud",
    "glm-5.1:cloud",
    "minimax-m3:cloud",
    "qwen3.5:cloud",
    "qwen3-vl:235b-cloud",
    "qwen3-coder:480b-cloud",
    "nemotron-3-ultra:cloud",
    "deepseek-v3.1:671b-cloud",
    "gemma4:31b-cloud"
  ];
  
  const defaultEmbeddingModels = [
    "nomic-embed-text:latest",
    "mxbai-embed-large:latest",
    "all-minilm:latest",
    "bge-large:latest"
  ];

  try {
    const res = await fetch("http://localhost:11434/api/tags");
    if (!res.ok) {
      throw new Error("Failed to query Ollama tags API");
    }
    const data = await res.json();
    const rawModels = data.models ?? [];
    
    const chatModels: string[] = [];
    const embeddingModels: string[] = [];
    
    for (const m of rawModels) {
      const name = m.name;
      const details = m.details ?? {};
      if (isEmbeddingModel(name, details.family, details.families)) {
        embeddingModels.push(name);
      } else if (name.toLowerCase().includes("cloud")) {
        chatModels.push(name);
      }
    }
    
    return NextResponse.json({
      chatModels: Array.from(new Set([...chatModels, ...defaultChatModels])),
      embeddingModels: Array.from(new Set([...embeddingModels, ...defaultEmbeddingModels]))
    });
  } catch {
    return NextResponse.json({
      chatModels: defaultChatModels,
      embeddingModels: defaultEmbeddingModels
    });
  }
}

