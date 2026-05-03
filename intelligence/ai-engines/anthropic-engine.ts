// Created by BBMW0 Technologies | bbmw0.com
/**
 * ANTHROPIC+ ENGINE
 *
 * OmniOrg-native Anthropic Claude integration.
 * Replaces: Anthropic Console subscriptions with full code ownership.
 *
 * Models available:
 *   claude-opus-4-7           - Most capable Claude model, advanced reasoning
 *   claude-sonnet-4-6         - Balanced speed and intelligence, recommended default
 *   claude-haiku-4-5-20251001 - Fastest and most compact, ideal for simple tasks
 *
 * Capabilities used here:
 *   - One-shot text generation (ask)
 *   - Multi-turn chat with history
 *   - Server-sent event streaming (stream)
 *   - Token counting via /tokens endpoint
 *
 * Auth: x-api-key header (ANTHROPIC_API_KEY env var)
 * Base URL: https://api.anthropic.com/v1
 * HTTP: proxyFetch (raw REST - no anthropic npm package)
 */

import { proxyFetch } from "../../core/proxy-fetch";
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY  = process.env.ANTHROPIC_API_KEY ?? "";
const BASE_URL = "https://api.anthropic.com/v1";

// ── Model constants ────────────────────────────────────────────────────────────

export const CLAUDE_OPUS    = "claude-opus-4-7";
export const CLAUDE_SONNET  = "claude-sonnet-4-6";
export const CLAUDE_HAIKU   = "claude-haiku-4-5-20251001";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AnthropicMessage {
  role:    "user" | "assistant";
  content: string;
}

export interface AnthropicResponse {
  text:          string;
  model:         string;
  inputTokens?:  number;
  outputTokens?: number;
}

// Internal shape of the Anthropic messages API response
type AnthropicMessagesResp = {
  content?: Array<{ type: string; text?: string }>;
  model?:   string;
  usage?:   { input_tokens?: number; output_tokens?: number };
};

// Internal shape of the Anthropic token-count response
type AnthropicTokensResp = {
  input_tokens?: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function requireKey(): string {
  if (!API_KEY) throw new Error("[Anthropic+] ANTHROPIC_API_KEY not set in .env");
  return API_KEY;
}

function authHeaders(): Record<string, string> {
  return {
    "x-api-key":         requireKey(),
    "anthropic-version": "2023-06-01",
    "content-type":      "application/json",
  };
}

async function chatMessages(
  messages:     AnthropicMessage[],
  model:        string,
  maxTokens:    number,
  systemPrompt?: string,
): Promise<AnthropicResponse> {
  const body: Record<string, unknown> = { model, messages, max_tokens: maxTokens };
  if (systemPrompt) body["system"] = systemPrompt;

  const resp = await proxyFetch(`${BASE_URL}/messages`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[Anthropic+] API error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as AnthropicMessagesResp;
  const textBlock = (data.content ?? []).find(b => b.type === "text");
  const text = textBlock?.text ?? "";

  return {
    text,
    model:        data.model ?? model,
    inputTokens:  data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * One-shot text generation. Returns the reply string.
 */
export async function ask(
  prompt:        string,
  model          = CLAUDE_SONNET,
  systemPrompt?: string,
  maxTokens      = 4096,
): Promise<string> {
  const messages: AnthropicMessage[] = [{ role: "user", content: prompt }];
  const result = await chatMessages(messages, model, maxTokens, systemPrompt);
  return result.text;
}

/**
 * Multi-turn chat. Appends userMessage to history, returns reply + updated history.
 */
export async function chat(
  history:     AnthropicMessage[],
  userMessage: string,
  model        = CLAUDE_SONNET,
): Promise<{ reply: string; history: AnthropicMessage[] }> {
  const messages: AnthropicMessage[] = [...history, { role: "user", content: userMessage }];
  const result = await chatMessages(messages, model, 4096);

  const updated: AnthropicMessage[] = [
    ...messages,
    { role: "assistant", content: result.text },
  ];
  return { reply: result.text, history: updated };
}

/**
 * Streaming text generation via server-sent events.
 * Calls onChunk with each text delta as it arrives.
 * Returns the full concatenated text once the stream is complete.
 */
export async function stream(
  prompt:   string,
  onChunk:  (delta: string) => void,
  model     = CLAUDE_SONNET,
  maxTokens = 4096,
): Promise<string> {
  const body = {
    model,
    max_tokens: maxTokens,
    stream:     true,
    messages:   [{ role: "user", content: prompt }],
  };

  const resp = await proxyFetch(`${BASE_URL}/messages`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[Anthropic+] Stream API error ${resp.status}: ${err}`);
  }

  // Read the SSE stream line by line
  const raw = await resp.text();
  let full = "";

  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (payload === "[DONE]" || payload === "") continue;

    try {
      const event = JSON.parse(payload) as {
        type?:  string;
        delta?: { type?: string; text?: string };
      };
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
        const delta = event.delta.text ?? "";
        full += delta;
        onChunk(delta);
      }
    } catch {
      // ignore malformed SSE lines
    }
  }

  return full;
}

/**
 * Count the number of input tokens for the given text using the /tokens endpoint.
 */
export async function countTokens(
  text:  string,
  model  = CLAUDE_SONNET,
): Promise<number> {
  const body = {
    model,
    messages: [{ role: "user", content: text }],
  };

  const resp = await proxyFetch(`${BASE_URL}/messages/count_tokens`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[Anthropic+] Token count error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as AnthropicTokensResp;
  return data.input_tokens ?? 0;
}
