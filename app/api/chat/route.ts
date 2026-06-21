import OpenAI from "openai";
import { NextResponse } from "next/server";
import { OllamaEmbeddings } from "@langchain/ollama";
import { QdrantVectorStore } from "@langchain/qdrant";

const QDRANT_URL = "http://localhost:6333";
const COLLECTION_NAME = "chatly-docs";

const client = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: "http://localhost:11434",
});

/**
 * Try to retrieve relevant chunks from Qdrant for the user's query.
 * Returns an empty string silently on any failure (offline Qdrant, empty collection, etc.)
 * so the chat always falls back to plain mode gracefully.
 */
async function getContext(query: string): Promise<string> {
  try {
    const store = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: QDRANT_URL,
      collectionName: COLLECTION_NAME,
    });

    const results = await store.similaritySearch(query, 4);
    if (!results.length) return "";

    return results
      .map((doc, i) => {
        const page = doc.metadata?.page ? ` (page ${doc.metadata.page})` : "";
        const source = doc.metadata?.source ? ` [${doc.metadata.source}]` : "";
        return `[Chunk ${i + 1}${source}${page}]:\n${doc.pageContent}`;
      })
      .join("\n\n---\n\n");
  } catch {
    // Qdrant offline, collection doesn't exist, or any other error → plain chat
    return "";
  }
}

export async function POST(request: Request) {
  const { input } = await request.json();

  const context = await getContext(input);

  const systemPrompt = context
    ? `You are a helpful assistant. Answer the user in a structured, readable manner.
The following context has been retrieved from the user's documents. Base your answer on it and cite the relevant page numbers or source names when applicable.

Context:
${context}`
    : "You are a helpful assistant. Answer the user in a structured, readable manner.";

  const completion = await client.chat.completions.create({
    model: "gemma4:31b-cloud",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: input },
    ],
  });

  return NextResponse.json({
    response: completion.choices[0].message.content,
    hasContext: !!context,
  });
}