// Created by BBMW0 Technologies | bbmw0.com
/**
 * OLLAMA+ ENGINE - Local Llama / Mistral / Qwen / Phi
 *
 * Run any open-source LLM locally on this machine via Ollama.
 * Replaces: paying for Llama API, Groq, Together AI, etc.
 * 100% private - no internet required for inference.
 *
 * Prerequisites:
 *   1. Install Ollama: ollama.com/download (Windows installer)
 *   2. Pull a model: ollama pull llama3.3
 *   3. Ollama runs at http://localhost:11434 by default
 *
 * Recommended models (all free, pull once):
 *   llama3.3         - Best general purpose 70B (needs ~40GB RAM)
 *   llama3.2:3b      - Fast/lightweight (2GB RAM)
 *   mistral          - Strong reasoning, fast
 *   qwen2.5:14b      - Best coding model
 *   phi4             - Microsoft's compact but powerful model
 *   deepseek-r1:8b   - Reasoning model
 *   gemma3:27b       - Google's open model
 *   nomic-embed-text - Embeddings for RAG (NOT generation)
 *
 * Pull any model: ollama pull <model-name>
 * List installed:  ollama list
 */

import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

// Default models - user can override per call
export const LLAMA_FAST    = "llama3.2:3b";
export const LLAMA_PRO     = "llama3.3";
export const LLAMA_CODE    = "qwen2.5:14b";
export const LLAMA_REASON  = "deepseek-r1:8b";
export const LLAMA_EMBED   = "nomic-embed-text";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OllamaMessage {
  role:    "user" | "assistant" | "system";
  content: string;
}

export interface OllamaRequest {
  prompt:         string;
  model?:         string;
  systemPrompt?:  string;
  history?:       OllamaMessage[];
  temperature?:   number;
  maxTokens?:     number;
  stream?:        boolean;
}

export interface OllamaResponse {
  text:        string;
  model:       string;
  done:        boolean;
  totalTokens?: number;
  durationMs?:  number;
}

export interface OllamaModel {
  name:      string;
  size:      number;   // Bytes
  modified:  string;
  family?:   string;
}

// ── Ollama API helpers ────────────────────────────────────────────────────────

async function ollamaFetch<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const resp = await fetch(`${OLLAMA_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body:    body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`[Ollama+] ${method} ${path} failed ${resp.status}: ${text}`);
  }

  return resp.json() as Promise<T>;
}

// ── Health check ──────────────────────────────────────────────────────────────

/**
 * Returns true if Ollama is running locally.
 */
export async function isOllamaRunning(): Promise<boolean> {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`);
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * List all locally installed models.
 */
export async function listModels(): Promise<OllamaModel[]> {
  type TagsResp = { models?: Array<{ name: string; size: number; modified_at: string; details?: { family?: string } }> };
  const data = await ollamaFetch<TagsResp>("/api/tags", undefined, "GET");
  return (data.models ?? []).map(m => ({
    name:     m.name,
    size:     m.size,
    modified: m.modified_at,
    family:   m.details?.family,
  }));
}

/**
 * Pull a model from ollama.com registry (equivalent to `ollama pull`).
 * Streams progress to console - returns when complete.
 */
export async function pullModel(modelName: string): Promise<void> {
  console.log(`[Ollama+] Pulling model: ${modelName}...`);
  const resp = await fetch(`${OLLAMA_BASE}/api/pull`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ name: modelName, stream: true }),
  });

  if (!resp.ok || !resp.body) throw new Error(`[Ollama+] Pull failed: ${resp.status}`);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as { status?: string; completed?: number; total?: number };
        if (event.status === "success") {
          console.log(`[Ollama+] Model ${modelName} ready.`);
        } else if (event.total && event.completed) {
          const pct = Math.round((event.completed / event.total) * 100);
          process.stdout.write(`\r[Ollama+] Downloading ${modelName}: ${pct}%`);
        }
      } catch { /* skip malformed lines */ }
    }
  }
}

// ── Text generation ───────────────────────────────────────────────────────────

/**
 * Generate text using a local Ollama model.
 * Automatically checks if the model is available and suggests pull if not.
 */
export async function generate(req: OllamaRequest): Promise<OllamaResponse> {
  const model = req.model ?? LLAMA_FAST;

  const messages: OllamaMessage[] = [];

  if (req.systemPrompt) {
    messages.push({ role: "system", content: req.systemPrompt });
  }

  if (req.history) {
    messages.push(...req.history);
  }

  messages.push({ role: "user", content: req.prompt });

  type GenerateResp = {
    message?: { content: string };
    model:    string;
    done:     boolean;
    eval_count?: number;
    total_duration?: number;
  };

  try {
    const data = await ollamaFetch<GenerateResp>("/api/chat", {
      model,
      messages,
      stream: false,
      options: {
        temperature: req.temperature ?? 0.7,
        num_predict: req.maxTokens  ?? 2048,
      },
    });

    return {
      text:        data.message?.content ?? "",
      model:       data.model,
      done:        data.done,
      totalTokens: data.eval_count,
      durationMs:  data.total_duration ? Math.round(data.total_duration / 1_000_000) : undefined,
    };
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes("model") && msg.includes("not found")) {
      throw new Error(
        `[Ollama+] Model "${model}" not installed. Run: ollama pull ${model}\n` +
        `Available models: llama3.2:3b, llama3.3, mistral, qwen2.5:14b, phi4, deepseek-r1:8b`
      );
    }
    throw err;
  }
}

/**
 * Simple one-liner - returns just the text.
 */
export async function ask(prompt: string, model = LLAMA_FAST): Promise<string> {
  const result = await generate({ prompt, model });
  return result.text;
}

/**
 * Code generation - uses the best available code model.
 */
export async function generateCode(prompt: string, language = "typescript"): Promise<string> {
  return ask(
    `Write ${language} code for: ${prompt}\nReturn ONLY the code, no explanation.`,
    LLAMA_CODE,
  );
}

// ── Embeddings ────────────────────────────────────────────────────────────────

/**
 * Generate embeddings for text (for semantic search / RAG).
 * Requires nomic-embed-text model: ollama pull nomic-embed-text
 */
export async function embed(text: string, model = LLAMA_EMBED): Promise<number[]> {
  type EmbedResp = { embedding: number[] };
  const data = await ollamaFetch<EmbedResp>("/api/embeddings", { model, prompt: text });
  return data.embedding;
}

/**
 * Semantic similarity: returns cosine similarity [0,1] between two texts.
 */
export async function similarity(textA: string, textB: string): Promise<number> {
  const [embA, embB] = await Promise.all([embed(textA), embed(textB)]);
  const dot  = embA.reduce((sum, a, i) => sum + a * (embB[i] ?? 0), 0);
  const magA = Math.sqrt(embA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(embB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

// ── Multi-turn chat ───────────────────────────────────────────────────────────

/**
 * Continue a conversation. Returns reply + updated history.
 */
export async function chat(
  history: OllamaMessage[],
  userMessage: string,
  model = LLAMA_PRO,
): Promise<{ reply: string; history: OllamaMessage[] }> {
  const result = await generate({ prompt: userMessage, model, history });
  const updated: OllamaMessage[] = [
    ...history,
    { role: "user",      content: userMessage },
    { role: "assistant", content: result.text },
  ];
  return { reply: result.text, history: updated };
}
