// Created by BBMW0 Technologies | bbmw0.com
/**
 * GEMINI+ ENGINE
 *
 * OmniOrg-native Google Gemini Pro/Flash integration.
 * Replaces: Google AI Studio subscriptions with owned API key access.
 *
 * Models available:
 *   gemini-2.5-pro-preview-05-06  - Most capable (text, vision, code, reasoning)
 *   gemini-2.5-flash-preview-05-20 - Fast/cheap, great for summaries
 *   gemini-2.0-flash               - Stable fast model
 *   gemini-1.5-pro                  - Vision + long context (2M tokens)
 *
 * Capabilities used here:
 *   - Text generation and chat (streaming + non-streaming)
 *   - Vision: analyse images (base64 or URL)
 *   - Document analysis: long PDFs / docs via large context window
 *   - JSON mode: structured output for pipelines
 *   - Multimodal: text + image in same prompt
 *
 * Auth: GEMINI_API_KEY in .env
 * Base URL: https://generativelanguage.googleapis.com/v1beta
 */

import { proxyFetch } from "../../core/proxy-fetch";
import { config as loadEnv } from "dotenv";
import path from "path";
import { readFileSync } from "fs";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY  = process.env.GEMINI_API_KEY ?? "";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Default models
export const GEMINI_FAST    = "gemini-2.5-flash-preview-05-20";
export const GEMINI_PRO     = "gemini-2.5-pro-preview-05-06";
export const GEMINI_VISION  = "gemini-1.5-pro";  // Best for document/vision tasks

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeminiRole = "user" | "model";

export interface GeminiMessage {
  role:    GeminiRole;
  content: string;
}

export interface GeminiImagePart {
  imageBase64?: string;   // Base64 encoded image (provide one of these)
  imageUrl?:    string;   // Public URL to image
  mimeType?:    string;   // default: "image/jpeg"
}

export interface GeminiRequest {
  prompt:       string;
  model?:       string;
  maxTokens?:   number;
  temperature?: number;
  jsonMode?:    boolean;    // Forces structured JSON output
  image?:       GeminiImagePart;
  history?:     GeminiMessage[];
}

export interface GeminiResponse {
  text:       string;
  model:      string;
  inputTokens?:  number;
  outputTokens?: number;
}

// ── Core API call ─────────────────────────────────────────────────────────────

function requireKey(): string {
  if (!API_KEY) throw new Error("[Gemini+] GEMINI_API_KEY not set in .env");
  return API_KEY;
}

function buildParts(prompt: string, image?: GeminiImagePart): unknown[] {
  const parts: unknown[] = [{ text: prompt }];

  if (image) {
    if (image.imageBase64) {
      parts.unshift({
        inline_data: {
          mime_type: image.mimeType ?? "image/jpeg",
          data:      image.imageBase64,
        },
      });
    } else if (image.imageUrl) {
      parts.unshift({ file_data: { file_uri: image.imageUrl } });
    }
  }

  return parts;
}

/**
 * Call Gemini with a prompt (and optional image).
 * Returns the full text response.
 */
export async function ask(req: GeminiRequest): Promise<GeminiResponse> {
  const key   = requireKey();
  const model = req.model ?? GEMINI_FAST;
  const url   = `${BASE_URL}/models/${model}:generateContent?key=${key}`;

  const contents: unknown[] = [];

  // Include conversation history if provided
  if (req.history) {
    for (const msg of req.history) {
      contents.push({ role: msg.role, parts: [{ text: msg.content }] });
    }
  }

  // Add current user message
  contents.push({ role: "user", parts: buildParts(req.prompt, req.image) });

  const body = {
    contents,
    generationConfig: {
      maxOutputTokens:  req.maxTokens  ?? 4096,
      temperature:      req.temperature ?? 0.7,
      ...(req.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  const resp = await proxyFetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[Gemini+] API error ${resp.status}: ${err}`);
  }

  type GeminiAPIResp = {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const data = await resp.json() as GeminiAPIResp;
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("") ?? "";

  return {
    text,
    model,
    inputTokens:  data.usageMetadata?.promptTokenCount,
    outputTokens: data.usageMetadata?.candidatesTokenCount,
  };
}

// ── Convenience helpers ───────────────────────────────────────────────────────

/**
 * Simple one-liner text generation.
 */
export async function generate(prompt: string, model = GEMINI_FAST): Promise<string> {
  const result = await ask({ prompt, model });
  return result.text;
}

/**
 * Structured JSON output - returns parsed object.
 */
export async function generateJson<T = Record<string, unknown>>(
  prompt: string,
  model = GEMINI_FAST,
): Promise<T> {
  const result = await ask({ prompt, model, jsonMode: true });
  try {
    return JSON.parse(result.text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)?.[0] ?? result.text) as T;
  } catch {
    throw new Error(`[Gemini+] JSON parse failed. Raw: ${result.text.slice(0, 200)}`);
  }
}

/**
 * Analyse a local image file (vision mode).
 */
export async function analyseImage(imagePath: string, prompt: string): Promise<string> {
  const imageBase64 = readFileSync(imagePath).toString("base64");
  const ext = path.extname(imagePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
  };
  const mimeType = mimeMap[ext] ?? "image/jpeg";

  const result = await ask({
    prompt,
    model: GEMINI_VISION,
    image: { imageBase64, mimeType },
  });
  return result.text;
}

/**
 * Multi-turn chat (returns assistant reply + updated history).
 */
export async function chat(
  history: GeminiMessage[],
  userMessage: string,
  model = GEMINI_PRO,
): Promise<{ reply: string; history: GeminiMessage[] }> {
  const result = await ask({ prompt: userMessage, model, history });
  const updatedHistory: GeminiMessage[] = [
    ...history,
    { role: "user",  content: userMessage },
    { role: "model", content: result.text },
  ];
  return { reply: result.text, history: updatedHistory };
}

/**
 * Long document analysis using Gemini's 2M token context window.
 * Pass the full document text - Gemini handles it natively.
 */
export async function analyseDocument(documentText: string, question: string): Promise<string> {
  return generate(
    `Document:\n${documentText}\n\nQuestion: ${question}`,
    GEMINI_VISION,  // 1.5 Pro for long context
  );
}
