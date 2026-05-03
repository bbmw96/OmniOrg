// Created by BBMW0 Technologies | bbmw0.com
/**
 * OPENAI+ ENGINE
 *
 * OmniOrg-native OpenAI GPT-4o / GPT-4o-mini integration.
 * Replaces: OpenAI platform subscriptions with owned API key access.
 *
 * Models available:
 *   gpt-4o        - Most capable multimodal model (text + vision)
 *   gpt-4o-mini   - Fast/cheap, great for classification and summaries
 *   gpt-4-turbo   - Previous generation flagship, strong reasoning
 *
 * Capabilities used here:
 *   - Text generation (ask)
 *   - Multi-turn chat with history
 *   - Structured JSON output (json_object response_format)
 *   - Vision: analyse images via URL content parts
 *
 * Auth: OPENAI_API_KEY in .env
 * Base URL: https://api.openai.com/v1
 * HTTP: proxyFetch (raw REST - no openai npm package, ESM-incompatible with CJS)
 */

import { proxyFetch } from "../../core/proxy-fetch";
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY  = process.env.OPENAI_API_KEY ?? "";
const BASE_URL = "https://api.openai.com/v1";

// ── Model constants ────────────────────────────────────────────────────────────

export const GPT4O      = "gpt-4o";
export const GPT4O_MINI = "gpt-4o-mini";
export const GPT4_TURBO = "gpt-4-turbo";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OpenAIMessage {
  role:    "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIResponse {
  text:          string;
  model:         string;
  inputTokens?:  number;
  outputTokens?: number;
}

// Internal shape of the OpenAI chat completions response
type OpenAIChatResp = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  model?:  string;
  usage?:  { prompt_tokens?: number; completion_tokens?: number };
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function requireKey(): string {
  if (!API_KEY) throw new Error("[OpenAI+] OPENAI_API_KEY not set in .env");
  return API_KEY;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${requireKey()}`,
  };
}

async function chatCompletions(
  messages:        unknown[],
  model:           string,
  maxTokens:       number,
  responseFormat?: { type: string },
): Promise<OpenAIResponse> {
  const body: Record<string, unknown> = { model, messages, max_tokens: maxTokens };
  if (responseFormat) body["response_format"] = responseFormat;

  const resp = await proxyFetch(`${BASE_URL}/chat/completions`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[OpenAI+] API error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as OpenAIChatResp;
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
  model         = GPT4O_MINI,
  systemPrompt?: string,
  maxTokens     = 4096,
): Promise<string> {
  const messages: OpenAIMessage[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const result = await chatCompletions(messages, model, maxTokens);
  return result.text;
}

/**
 * Multi-turn chat. Appends userMessage to history, returns reply + updated history.
 */
export async function chat(
  history:     OpenAIMessage[],
  userMessage: string,
  model        = GPT4O,
): Promise<{ reply: string; history: OpenAIMessage[] }> {
  const messages: OpenAIMessage[] = [...history, { role: "user", content: userMessage }];
  const result = await chatCompletions(messages, model, 4096);

  const updated: OpenAIMessage[] = [
    ...messages,
    { role: "assistant", content: result.text },
  ];
  return { reply: result.text, history: updated };
}

/**
 * Structured JSON output. Uses response_format: json_object.
 * Returns the parsed object as T.
 */
export async function generateJson<T = Record<string, unknown>>(
  prompt: string,
  model   = GPT4O_MINI,
): Promise<T> {
  const messages: OpenAIMessage[] = [
    { role: "system", content: "You are a JSON API. Respond with valid JSON only." },
    { role: "user",   content: prompt },
  ];

  const result = await chatCompletions(messages, model, 4096, { type: "json_object" });

  try {
    return JSON.parse(result.text) as T;
  } catch {
    throw new Error(`[OpenAI+] JSON parse failed. Raw: ${result.text.slice(0, 200)}`);
  }
}

/**
 * Vision: analyse an image at imageUrl with a text prompt.
 * Uses content parts (image_url) - requires gpt-4o or gpt-4-turbo.
 */
export async function analyseImage(
  imageUrl: string,
  prompt:   string,
  model     = GPT4O,
): Promise<string> {
  const messages = [
    {
      role:    "user",
      content: [
        { type: "text",      text: prompt },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ];

  const resp = await proxyFetch(`${BASE_URL}/chat/completions`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({ model, messages, max_tokens: 2048 }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[OpenAI+] Vision API error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as OpenAIChatResp;
  return data.choices?.[0]?.message?.content ?? "";
}
