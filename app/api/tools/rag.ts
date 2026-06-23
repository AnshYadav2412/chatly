import { OllamaEmbeddings } from "@langchain/ollama";
import { QdrantVectorStore } from "@langchain/qdrant";

const QDRANT_URL = "http://localhost:6333";
const COLLECTION_NAME_PREFIX = "chatly-docs";

/**
 * Retrieve the most relevant document chunks from the Qdrant vector store.
 *
 * Returns a formatted context string, or an empty string when Qdrant is
 * offline, the collection doesn't exist, or no results were found — so the
 * caller can always fall back to plain-chat mode gracefully.
 */
export async function getRagContext(query: string, embeddingModel?: string): Promise<string> {
  try {
    const model = embeddingModel || "nomic-embed-text";
    const embeddings = new OllamaEmbeddings({
      model: model,
      baseUrl: "http://localhost:11434",
    });

    // Create a sanitized collection name specific to the embedding model
    const sanitizedModel = model.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const collectionName = `${COLLECTION_NAME_PREFIX}-${sanitizedModel}`;

    const store = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: QDRANT_URL,
      collectionName: collectionName,
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
    return "";
  }
}
