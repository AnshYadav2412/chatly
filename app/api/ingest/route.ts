import { NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings } from "@langchain/ollama";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { createRequire } from "module";

// pdf-parse@1.1.1 is pure CJS — use createRequire so Next.js ESM can load it reliably
const _require = createRequire(import.meta.url);
const pdfParse = _require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;


const QDRANT_URL = "http://localhost:6333";
const COLLECTION_NAME = "chatly-docs";

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: "http://localhost:11434",
});

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

/** Delete the collection so we always start fresh (replace mode) */
async function deleteCollection() {
  try {
    await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      method: "DELETE",
    });
  } catch {
    // Collection may not exist yet — that's fine
  }
}

/** Check if Qdrant is reachable */
async function checkQdrant(): Promise<boolean> {
  try {
    const res = await fetch(`${QDRANT_URL}/healthz`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // 1. Verify Qdrant is online before doing anything
  const qdrantOnline = await checkQdrant();
  if (!qdrantOnline) {
    return NextResponse.json(
      { error: "Qdrant is offline. Please start Qdrant at http://localhost:6333 and try again." },
      { status: 503 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  let docs: Document[] = [];

  try {
    // ── PDF upload ────────────────────────────────────────────────────────────
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await pdfParse(buffer);

      // pdf-parse separates pages with \f (form feed)
      const pages = parsed.text.split("\f");
      docs = pages
        .map((text: string, i: number) =>
          new Document({
            pageContent: text.trim(),
            metadata: { page: i + 1, source: file.name },
          })
        )
        .filter((d: Document) => d.pageContent.length > 0);

    // ── URL fetch ─────────────────────────────────────────────────────────────
    } else {
      const body = await request.json();

      if (body.type === "url") {
        if (!body.url) return NextResponse.json({ error: "url is required" }, { status: 400 });

        let html: string;
        try {
          html = await fetch(body.url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; Chatly/1.0)" },
            signal: AbortSignal.timeout(10000),
          }).then((r) => r.text());
        } catch {
          return NextResponse.json({ error: `Could not fetch URL: ${body.url}` }, { status: 400 });
        }

        // Strip scripts, styles, and HTML tags to get readable text
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/gi, " ")
          .replace(/&amp;/gi, "&")
          .replace(/&lt;/gi, "<")
          .replace(/&gt;/gi, ">")
          .replace(/\s{2,}/g, " ")
          .trim();

        docs = [new Document({ pageContent: text, metadata: { source: body.url } })];

      // ── Plain text ────────────────────────────────────────────────────────────
      } else if (body.type === "text") {
        if (!body.text?.trim()) return NextResponse.json({ error: "text is required" }, { status: 400 });

        docs = [
          new Document({
            pageContent: body.text.trim(),
            metadata: { source: body.title?.trim() || "manual-input" },
          }),
        ];
      } else {
        return NextResponse.json({ error: 'type must be "url" or "text"' }, { status: 400 });
      }
    }

    // 2. Split into chunks (same params as your Python script)
    const splitDocs = await splitter.splitDocuments(docs);
    if (splitDocs.length === 0) {
      return NextResponse.json({ error: "No content found to ingest" }, { status: 400 });
    }

    // 3. Delete existing collection (replace mode)
    await deleteCollection();

    // 4. Embed and store in Qdrant
    await QdrantVectorStore.fromDocuments(splitDocs, embeddings, {
      url: QDRANT_URL,
      collectionName: COLLECTION_NAME,
    });

    return NextResponse.json({ ok: true, chunks: splitDocs.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
