// Created by BBMW0 Technologies | bbmw0.com
/**
 * RAG ENGINE - Local Retrieval-Augmented Generation
 *
 * Zero-cost semantic search over any document collection.
 * Stores embeddings in JSON on disk - no external vector DB required.
 * Uses nomic-embed-text via Ollama for embeddings, Claude Haiku for answers.
 */

import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { embed, LLAMA_EMBED } from "../../intelligence/ai-engines/ollama-engine";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentChunk {
  id:         string;
  sourceFile: string;
  chunkIndex: number;
  text:       string;
  embedding:  number[];
  metadata?:  Record<string, string>;
}

export interface KnowledgeBase {
  name:      string;
  createdAt: string;
  updatedAt: string;
  chunks:    DocumentChunk[];
}

export interface RetrievedContext {
  chunks:  DocumentChunk[];
  scores:  number[];
  query:   string;
  topK:    number;
}

export interface RagAnswer {
  answer:     string;
  sources:    string[];
  confidence: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const KB_DIR = path.resolve(__dirname, "../../output/knowledge");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Math helpers ──────────────────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot  += (a[i] ?? 0) * (b[i] ?? 0);
    magA += (a[i] ?? 0) * (a[i] ?? 0);
    magB += (b[i] ?? 0) * (b[i] ?? 0);
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Text chunking ─────────────────────────────────────────────────────────────

export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.slice(start, end);
    if (chunk.length >= 50) {
      chunks.push(chunk);
    }
    if (end >= text.length) break;
    start = end - overlap;
  }
  return chunks;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function kbPath(name: string): string {
  return path.join(KB_DIR, `${name}.rag.json`);
}

export function loadKnowledgeBase(name: string): KnowledgeBase {
  const filePath = kbPath(name);
  if (!fs.existsSync(filePath)) {
    return {
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chunks:    [],
    };
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as KnowledgeBase;
}

export function saveKnowledgeBase(kb: KnowledgeBase): void {
  fs.mkdirSync(KB_DIR, { recursive: true });
  fs.writeFileSync(kbPath(kb.name), JSON.stringify(kb, null, 2), "utf-8");
}

// ── Ingestion ─────────────────────────────────────────────────────────────────

export async function ingestText(
  kbName:     string,
  text:       string,
  sourceFile: string,
  metadata?:  Record<string, string>,
): Promise<number> {
  const kb = loadKnowledgeBase(kbName);
  const existingIds = new Set(kb.chunks.map(c => c.id));
  const rawChunks = chunkText(text);
  let added = 0;

  for (let i = 0; i < rawChunks.length; i++) {
    const chunkText_ = rawChunks[i] ?? "";
    const id = crypto.createHash("sha256").update(chunkText_).digest("hex");

    if (existingIds.has(id)) continue;

    const embedding = await embed(chunkText_, LLAMA_EMBED);
    const chunk: DocumentChunk = {
      id,
      sourceFile,
      chunkIndex: i,
      text:       chunkText_,
      embedding,
      metadata,
    };
    kb.chunks.push(chunk);
    existingIds.add(id);
    added++;

    if (added % 10 === 0) {
      console.log(`[RAG] Ingested ${added} new chunks from ${sourceFile}...`);
    }
  }

  if (added > 0) {
    kb.updatedAt = new Date().toISOString();
    saveKnowledgeBase(kb);
    console.log(`[RAG] Added ${added} chunks from "${sourceFile}" to KB "${kbName}".`);
  } else {
    console.log(`[RAG] No new chunks from "${sourceFile}" - all already indexed.`);
  }

  return added;
}

export async function ingestFile(kbName: string, filePath: string): Promise<number> {
  const raw = fs.readFileSync(filePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();
  const text = ext === ".json" ? JSON.stringify(JSON.parse(raw), null, 2) : raw;
  const sourceFile = path.basename(filePath);
  return ingestText(kbName, text, sourceFile);
}

// ── Retrieval ─────────────────────────────────────────────────────────────────

export async function retrieve(
  kbName: string,
  query:  string,
  topK = 5,
): Promise<RetrievedContext> {
  const kb = loadKnowledgeBase(kbName);
  const queryEmbedding = await embed(query, LLAMA_EMBED);

  const scored = kb.chunks.map(chunk => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK);

  return {
    chunks: top.map(s => s.chunk),
    scores: top.map(s => s.score),
    query,
    topK,
  };
}

// ── RAG query ─────────────────────────────────────────────────────────────────

export async function ragQuery(
  kbName: string,
  query:  string,
  opts?:  { topK?: number; model?: string },
): Promise<RagAnswer> {
  const topK  = opts?.topK  ?? 5;
  const model = opts?.model ?? "claude-haiku-4-5-20251001";

  const context = await retrieve(kbName, query, topK);

  if (context.chunks.length === 0) {
    return {
      answer:     "No relevant documents found in the knowledge base.",
      sources:    [],
      confidence: 0,
    };
  }

  const contextStr = context.chunks
    .map(c => `[Source: ${c.sourceFile}]\n${c.text}`)
    .join("\n\n---\n\n");

  const message = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: "Answer based ONLY on the provided context. If the answer is not in the context, say so.",
    messages: [
      {
        role:    "user",
        content: `Context:\n${contextStr}\n\nQuestion: ${query}`,
      },
    ],
  });

  const answerBlock = message.content[0];
  const answer = answerBlock?.type === "text" ? answerBlock.text : "";

  const sources = [...new Set(context.chunks.map(c => c.sourceFile))];
  const confidence =
    context.scores.length > 0
      ? context.scores.reduce((sum, s) => sum + s, 0) / context.scores.length
      : 0;

  return { answer, sources, confidence };
}

// ── Management ────────────────────────────────────────────────────────────────

export async function listKnowledgeBases(): Promise<string[]> {
  if (!fs.existsSync(KB_DIR)) return [];
  return fs
    .readdirSync(KB_DIR)
    .filter(f => f.endsWith(".rag.json"))
    .map(f => f.replace(/\.rag\.json$/, ""));
}

export function deleteKnowledgeBase(name: string): void {
  const filePath = kbPath(name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[RAG] Deleted knowledge base "${name}".`);
  }
}
