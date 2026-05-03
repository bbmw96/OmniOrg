// Created by BBMW0 Technologies | bbmw0.com
/**
 * GLM+ ENGINE
 *
 * OmniOrg-native ZhipuAI GLM-4 engine.
 * Replaces: ZhipuAI/GLM subscriptions with owned API key access.
 *
 * GLM-4-Plus outperforms GPT-4o on Chinese benchmarks.
 * GLM-4-Flash is ultra-cheap (near free) for high-volume tasks.
 * GLM-4-Long supports a 1M token context window.
 *
 * Models:
 *   glm-4-plus   - Best quality (comparable to GPT-4o)
 *   glm-4-flash  - Ultra-low cost, high throughput
 *   glm-4-long   - 1M context window for document analysis
 *   glm-4v-plus  - Multimodal vision variant
 *
 * Auth: ZHIPUAI_API_KEY in .env (format: "id.secret")
 *   ZhipuAI uses HS256 JWT generated from the split key.
 *   generateJwt() builds this without any npm package.
 * Base URL: https://open.bigmodel.cn/api/paas/v4
 * HTTP: proxyFetch (raw REST)
 */

import { proxyFetch } from "../../core/proxy-fetch";
import { config as loadEnv } from "dotenv";
import * as crypto from "crypto";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY  = process.env.ZHIPUAI_API_KEY ?? "";
const BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

// ── Model constants ────────────────────────────────────────────────────────────

export const GLM_PLUS   = "glm-4-plus";
export const GLM_FLASH  = "glm-4-flash";
export const GLM_LONG   = "glm-4-long";
export const GLM_VISION = "glm-4v-plus";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GlmMessage {
  role:    "system" | "user" | "assistant";
  content: string;
}

export interface GlmResponse {
  text:          string;
  model:         string;
  inputTokens?:  number;
  outputTokens?: number;
}

type GlmChatResp = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  model?:  string;
  usage?:  { prompt_tokens?: number; completion_tokens?: number };
};

// ── JWT Auth (HS256, no npm required) ─────────────────────────────────────────

function b64url(input: Buffer | string): string {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return b.toString("base64url");
}

function generateJwt(rawApiKey: string): string {
  const dotIndex = rawApiKey.lastIndexOf(".");
  if (dotIndex === -1) {
    throw new Error("[GLM+] ZHIPUAI_API_KEY must be in format id.secret");
  }

  const keyId  = rawApiKey.slice(0, dotIndex);
  const secret = rawApiKey.slice(dotIndex + 1);
  const now    = Date.now();

  const header  = b64url(JSON.stringify({ alg: "HS256", sign_type: "SIGN" }));
  const payload = b64url(JSON.stringify({
    api_key:   keyId,
    timestamp: now,
    exp:       now + 3_600_000,
  }));

  const sigInput = `${header}.${payload}`;
  const sig = crypto.createHmac("sha256", secret).update(sigInput).digest();

  return `${sigInput}.${b64url(sig)}`;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function requireKey(): string {
  if (!API_KEY) throw new Error("[GLM+] ZHIPUAI_API_KEY not set in .env");
  return API_KEY;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${generateJwt(requireKey())}`,
  };
}

async function chatCompletions(
  messages:  unknown[],
  model:     string,
  maxTokens: number,
): Promise<GlmChatResp> {
  const resp = await proxyFetch(`${BASE_URL}/chat/completions`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[GLM+] API error ${resp.status}: ${err}`);
  }

  return resp.json() as Promise<GlmChatResp>;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function ask(
  prompt:       string,
  model         = GLM_PLUS,
  systemPrompt?: string,
  maxTokens     = 4096,
): Promise<string> {
  const messages: GlmMessage[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const data = await chatCompletions(messages, model, maxTokens);
  return data.choices?.[0]?.message?.content ?? "";
}

export async function generate(
  prompt:       string,
  model         = GLM_PLUS,
  systemPrompt?: string,
  maxTokens     = 4096,
): Promise<string> {
  return ask(prompt, model, systemPrompt, maxTokens);
}

export async function generateJson<T>(
  prompt:       string,
  model         = GLM_PLUS,
  systemPrompt?: string,
): Promise<T> {
  const jsonSystem = ((systemPrompt ?? "") +
    " Respond ONLY with valid JSON. No markdown, no explanation.").trim();

  const text    = await ask(prompt, model, jsonSystem, 4096);
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`[GLM+] Failed to parse JSON response: ${cleaned.slice(0, 200)}`);
  }
}

export async function chat(
  history:     GlmMessage[],
  userMessage: string,
  model        = GLM_PLUS,
  maxTokens    = 4096,
): Promise<{ reply: string; history: GlmMessage[] }> {
  const messages: GlmMessage[] = [...history, { role: "user", content: userMessage }];
  const data   = await chatCompletions(messages, model, maxTokens);
  const reply  = data.choices?.[0]?.message?.content ?? "";

  const updated: GlmMessage[] = [
    ...messages,
    { role: "assistant", content: reply },
  ];
  return { reply, history: updated };
}

export async function batchGenerate(
  prompts:      string[],
  model         = GLM_FLASH,
  systemPrompt?: string,
  maxTokens     = 2048,
): Promise<Array<{ prompt: string; text: string; error?: string }>> {
  const tasks = prompts.map(async (prompt) => {
    try {
      const text = await ask(prompt, model, systemPrompt, maxTokens);
      return { prompt, text };
    } catch (err) {
      return { prompt, text: "", error: err instanceof Error ? err.message : String(err) };
    }
  });

  return Promise.all(tasks);
}
