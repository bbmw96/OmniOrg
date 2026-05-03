// Created by BBMW0 Technologies | bbmw0.com
/**
 * DEEPSEEK+ ENGINE
 *
 * OmniOrg-native DeepSeek integration via OpenAI-compatible API.
 * Replaces: DeepSeek API subscriptions with owned API key access.
 *
 * Models available:
 *   deepseek-chat      - DeepSeek-V3, general purpose text and code
 *   deepseek-reasoner  - R1, chain-of-thought reasoning (exposes reasoning_content)
 *
 * Capabilities used here:
 *   - Text generation and chat (multi-turn)
 *   - Chain-of-thought reasoning (R1 model exposes reasoning steps)
 *   - Code generation with coder system prompt
 *   - Batch generation with concurrency cap
 *
 * Auth: DEEPSEEK_API_KEY in .env
 * Base URL: https://api.deepseek.com/v1
 */

import { proxyFetch } from "../../core/proxy-fetch";
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY  = process.env.DEEPSEEK_API_KEY ?? "";
const BASE_URL = "https://api.deepseek.com/v1";

// Default models
export const DEEPSEEK_CHAT     = "deepseek-chat";      // DeepSeek-V3, general purpose
export const DEEPSEEK_REASONER = "deepseek-reasoner";  // R1, chain-of-thought reasoning
export const DEEPSEEK_CODER    = "deepseek-chat";      // Alias - coder system prompt applied

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeepSeekMessage {
  role:    "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekResponse {
  text:          string;
  model:         string;
  reasoning?:    string;
  inputTokens?:  number;
  outputTokens?: number;
}

// Internal shape of the OpenAI-compatible chat completions response
type ChatResp = {
  choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
  usage?:   { prompt_tokens?: number; completion_tokens?: number };
  model?:   string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireKey(): string {
  if (!API_KEY) throw new Error("[DeepSeek+] DEEPSEEK_API_KEY not set in .env");
  return API_KEY;
}

// ── Core API call ─────────────────────────────────────────────────────────────

/**
 * Send a messages array to /chat/completions and return a DeepSeekResponse.
 * Captures reasoning_content from R1 when present.
 */
async function callChat(
  messages:  DeepSeekMessage[],
  model:     string,
  maxTokens: number,
): Promise<DeepSeekResponse> {
  const key = requireKey();
  const url = `${BASE_URL}/chat/completions`;

  const body = {
    model,
    messages,
    max_tokens: maxTokens,
  };

  const resp = await proxyFetch(url, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[DeepSeek+] API error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as ChatResp;
  const message  = data.choices?.[0]?.message;
  const text      = message?.content ?? "";
  const reasoning = message?.reasoning_content;

  const result: DeepSeekResponse = {
    text,
    model:        data.model ?? model,
    inputTokens:  data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  };

  if (reasoning) result.reasoning = reasoning;

  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Ask DeepSeek with a prompt.
 * For deepseek-reasoner, reasoning steps are captured in response.reasoning.
 */
export async function ask(
  prompt:       string,
  model         = DEEPSEEK_CHAT,
  systemPrompt?: string,
  maxTokens     = 4096,
): Promise<DeepSeekResponse> {
  const messages: DeepSeekMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  return callChat(messages, model, maxTokens);
}

/**
 * Simple one-liner text generation. Returns just the text string.
 */
export async function generate(
  prompt: string,
  model  = DEEPSEEK_CHAT,
): Promise<string> {
  const result = await ask(prompt, model);
  return result.text;
}

/**
 * Chain-of-thought reasoning using DeepSeek-R1.
 * Best for maths, logic, and step-by-step analysis.
 * Returns both the final answer and the full reasoning trace.
 */
export async function reason(
  problem:  string,
  context?: string,
): Promise<{ answer: string; reasoning: string }> {
  const prompt = context ? `Context:\n${context}\n\nProblem:\n${problem}` : problem;
  const result = await ask(prompt, DEEPSEEK_REASONER);
  return {
    answer:    result.text,
    reasoning: result.reasoning ?? "",
  };
}

/**
 * Code generation using DeepSeek-V3 with a coder system prompt.
 * Returns just the code string.
 */
export async function generateCode(
  prompt:    string,
  language?: string,
): Promise<string> {
  const langHint     = language ? ` Write in ${language}.` : "";
  const systemPrompt =
    `You are an expert software engineer.${langHint} Output only the code, no explanations or markdown fences.`;

  const result = await ask(prompt, DEEPSEEK_CODER, systemPrompt);
  return result.text;
}

/**
 * Multi-turn chat. Returns the assistant reply and the updated history.
 */
export async function chat(
  history:     DeepSeekMessage[],
  userMessage: string,
  model        = DEEPSEEK_CHAT,
): Promise<{ reply: string; history: DeepSeekMessage[] }> {
  const messages: DeepSeekMessage[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  const result = await callChat(messages, model, 4096);

  const updatedHistory: DeepSeekMessage[] = [
    ...messages,
    { role: "assistant", content: result.text },
  ];

  return { reply: result.text, history: updatedHistory };
}

/**
 * Parallel generation of multiple prompts with a concurrency cap.
 * Returns an array of text strings in the same order as the input prompts.
 */
export async function batchGenerate(
  prompts:     string[],
  model        = DEEPSEEK_CHAT,
  concurrency  = 3,
): Promise<string[]> {
  const results: string[] = new Array(prompts.length);

  for (let i = 0; i < prompts.length; i += concurrency) {
    const slice = prompts.slice(i, i + concurrency);
    const batch = await Promise.all(
      slice.map((p) => generate(p, model)),
    );
    for (let j = 0; j < batch.length; j++) {
      results[i + j] = batch[j];
    }
  }

  return results;
}
