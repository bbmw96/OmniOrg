// Created by BBMW0 Technologies | bbmw0.com
/**
 * GROQ+ ENGINE
 *
 * OmniOrg-native Groq Cloud speed benchmark engine.
 * Replaces: Groq Cloud subscriptions with owned API key access.
 *
 * Groq is the fastest LLM inference available: ~500 tok/s vs OpenAI's ~80 tok/s.
 * Powered by LPU (Language Processing Unit) hardware - not GPU clusters.
 *
 * Models available:
 *   llama3-70b-8192   - Llama 3 70B (best quality on Groq)
 *   llama3-8b-8192    - Llama 3 8B (fastest, great for classification)
 *   mixtral-8x7b-32768 - Mixtral 8x7B (long context, strong reasoning)
 *   gemma2-9b-it       - Google Gemma 2 9B (instruction-tuned)
 *
 * Capabilities used here:
 *   - Text generation (ask)
 *   - Multi-turn chat with history
 *   - Latency benchmarking: measures real tok/s via Groq usage headers
 *
 * Auth: GROQ_API_KEY in .env
 * Base URL: https://api.groq.com/openai/v1 (OpenAI-compatible)
 * HTTP: proxyFetch (raw REST - no groq npm package)
 */

import { proxyFetch } from "../../core/proxy-fetch";
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY  = process.env.GROQ_API_KEY ?? "";
const BASE_URL = "https://api.groq.com/openai/v1";

// ── Model constants ────────────────────────────────────────────────────────────

export const LLAMA3_70B = "llama3-70b-8192";
export const LLAMA3_8B  = "llama3-8b-8192";
export const MIXTRAL    = "mixtral-8x7b-32768";
export const GEMMA2_9B  = "gemma2-9b-it";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GroqMessage {
  role:    "system" | "user" | "assistant";
  content: string;
}

export interface GroqResponse {
  text:          string;
  model:         string;
  inputTokens?:  number;
  outputTokens?: number;
}

export interface GroqBenchmarkResult {
  text:             string;
  latencyMs:        number;
  tokensPerSecond:  number;
}

// Internal shape of the Groq chat completions response (OpenAI-compatible)
type GroqChatResp = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  model?:  string;
  usage?:  { prompt_tokens?: number; completion_tokens?: number };
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function requireKey(): string {
  if (!API_KEY) throw new Error("[Groq+] GROQ_API_KEY not set in .env");
  return API_KEY;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${requireKey()}`,
  };
}

async function chatCompletions(
  messages:  unknown[],
  model:     string,
  maxTokens: number,
): Promise<GroqResponse> {
  const resp = await proxyFetch(`${BASE_URL}/chat/completions`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[Groq+] API error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as GroqChatResp;
  const text = data.choices?.[0]?.message?.content ?? "";

  return {
    text,
    model:        data.model ?? model,
    inputTokens:  data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * One-shot text generation. Returns the reply string.
 */
export async function ask(
  prompt:       string,
  model         = LLAMA3_70B,
  systemPrompt?: string,
  maxTokens     = 4096,
): Promise<string> {
  const messages: GroqMessage[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const result = await chatCompletions(messages, model, maxTokens);
  return result.text;
}

/**
 * Multi-turn chat. Appends userMessage to history, returns reply + updated history.
 */
export async function chat(
  history:     GroqMessage[],
  userMessage: string,
  model        = LLAMA3_70B,
): Promise<{ reply: string; history: GroqMessage[] }> {
  const messages: GroqMessage[] = [...history, { role: "user", content: userMessage }];
  const result = await chatCompletions(messages, model, 4096);

  const updated: GroqMessage[] = [
    ...messages,
    { role: "assistant", content: result.text },
  ];
  return { reply: result.text, history: updated };
}

/**
 * Benchmark Groq inference speed.
 * Runs ask() and measures wall-clock latency + tokens per second.
 * Groq's LPU typically delivers ~500 tok/s vs ~80 tok/s on OpenAI GPU inference.
 */
export async function benchmark(
  prompt: string,
  model   = LLAMA3_70B,
): Promise<GroqBenchmarkResult> {
  const messages: GroqMessage[] = [{ role: "user", content: prompt }];

  const start = Date.now();

  const resp = await proxyFetch(`${BASE_URL}/chat/completions`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({ model, messages, max_tokens: 512 }),
  });

  const latencyMs = Date.now() - start;

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[Groq+] Benchmark API error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as GroqChatResp;
  const text         = data.choices?.[0]?.message?.content ?? "";
  const outputTokens = data.usage?.completion_tokens ?? 0;
  const tokensPerSecond = outputTokens > 0 && latencyMs > 0
    ? Math.round((outputTokens / latencyMs) * 1000)
    : 0;

  return { text, latencyMs, tokensPerSecond };
}
