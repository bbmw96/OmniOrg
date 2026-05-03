// Created by BBMW0 Technologies | bbmw0.com
/**
 * ENGINE ROUTER - OmniOrg Inter-Engine Communication Mesh
 *
 * Single dispatch layer for all AI text generation across OmniOrg.
 * Any module can call routeGenerate() without knowing which engine is active.
 *
 * Features:
 *   - Capability-based routing (chat, code, reasoning, batch, fast)
 *   - Automatic fallback chains per capability
 *   - Runtime engine availability check via env keys
 *   - Zero tight coupling between callers and specific engines
 *
 * Fallback order per capability:
 *   chat      : anthropic -> openai -> deepseek -> groq -> glm -> ollama
 *   code      : deepseek  -> anthropic -> openai -> groq -> glm -> ollama
 *   reasoning : deepseek  -> anthropic -> openai -> glm
 *   batch     : groq      -> deepseek  -> glm    -> ollama -> anthropic
 *   fast      : groq      -> deepseek  -> glm    -> ollama
 *   chinese   : glm       -> deepseek  -> anthropic -> openai
 */

import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../.env") });

// ── Types ──────────────────────────────────────────────────────────────────────

export type RouteCapability = "chat" | "code" | "reasoning" | "batch" | "fast" | "chinese";

export type EngineId =
  | "anthropic"
  | "openai"
  | "groq"
  | "deepseek"
  | "glm"
  | "gemini"
  | "ollama";

export interface RouteRequest {
  capability:   RouteCapability;
  prompt:       string;
  systemPrompt?: string;
  maxTokens?:   number;
  context?:     string;
}

export interface RouteResult {
  text:     string;
  engine:   EngineId;
  fallback: boolean;
}

// ── Engine availability ────────────────────────────────────────────────────────

const ENV_KEYS: Record<EngineId, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai:    "OPENAI_API_KEY",
  groq:      "GROQ_API_KEY",
  deepseek:  "DEEPSEEK_API_KEY",
  glm:       "ZHIPUAI_API_KEY",
  gemini:    "GEMINI_API_KEY",
  ollama:    "",
};

function isAvailable(engine: EngineId): boolean {
  const key = ENV_KEYS[engine];
  if (!key) return true;
  const val = process.env[key];
  return val !== undefined && val.trim() !== "";
}

// ── Fallback chains ────────────────────────────────────────────────────────────

const CHAINS: Record<RouteCapability, EngineId[]> = {
  chat:      ["anthropic", "openai", "gemini",  "deepseek", "groq", "glm", "ollama"],
  code:      ["deepseek",  "anthropic", "openai", "gemini", "groq", "glm", "ollama"],
  reasoning: ["deepseek",  "anthropic", "openai", "gemini", "glm"],
  batch:     ["groq",      "deepseek",  "glm",    "ollama", "anthropic"],
  fast:      ["groq",      "gemini",    "deepseek", "glm",  "ollama"],
  chinese:   ["glm",       "deepseek",  "anthropic", "openai"],
};

// ── Engine dispatch ────────────────────────────────────────────────────────────

async function dispatchToEngine(
  engine:      EngineId,
  capability:  RouteCapability,
  req:         RouteRequest,
): Promise<string> {
  switch (engine) {
    case "anthropic": {
      const m = await import("../intelligence/ai-engines/anthropic-engine");
      return m.ask(req.prompt, undefined, req.systemPrompt, req.maxTokens);
    }
    case "openai": {
      const m = await import("../intelligence/ai-engines/openai-engine");
      return m.ask(req.prompt, undefined, req.systemPrompt, req.maxTokens);
    }
    case "groq": {
      const m = await import("../intelligence/ai-engines/groq-engine");
      return m.ask(req.prompt, undefined, req.systemPrompt, req.maxTokens);
    }
    case "deepseek": {
      const m = await import("../intelligence/ai-engines/deepseek-engine");
      if (capability === "reasoning") {
        const result = await m.reason(req.prompt, req.context);
        return result.answer;
      }
      if (capability === "code") {
        return m.generateCode(req.prompt, undefined);
      }
      const result = await m.ask(req.prompt, undefined, req.systemPrompt, req.maxTokens);
      return result.text;
    }
    case "glm": {
      const m = await import("../intelligence/ai-engines/glm-engine");
      return m.ask(req.prompt, undefined, req.systemPrompt, req.maxTokens);
    }
    case "gemini": {
      const m = await import("../intelligence/ai-engines/gemini-engine");
      const res = await m.ask({ prompt: req.prompt, maxTokens: req.maxTokens });
      return res.text;
    }
    case "ollama": {
      const m = await import("../intelligence/ai-engines/ollama-engine");
      return m.ask(req.prompt, req.systemPrompt);
    }
    default: {
      throw new Error(`[EngineRouter] Unknown engine: ${engine as string}`);
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Route a generation request to the best available engine for the capability.
 * Walks the fallback chain until one engine succeeds.
 * Throws only if every engine in the chain fails.
 */
export async function routeGenerate(req: RouteRequest): Promise<RouteResult> {
  const chain = CHAINS[req.capability];
  const available = chain.filter(isAvailable);

  if (available.length === 0) {
    throw new Error(`[EngineRouter] No engines available for capability: ${req.capability}`);
  }

  const primary = available[0];
  const rest    = available.slice(1);
  const errors: string[] = [];

  for (const engine of [primary, ...rest]) {
    try {
      const text = await dispatchToEngine(engine, req.capability, req);
      return {
        text,
        engine,
        fallback: engine !== primary,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${engine}: ${msg}`);
      console.warn(`[EngineRouter] ${engine} failed for ${req.capability}, trying next. Error: ${msg}`);
    }
  }

  throw new Error(
    `[EngineRouter] All engines failed for capability "${req.capability}":\n${errors.join("\n")}`
  );
}

/**
 * List which engines are available in the current environment.
 */
export function listAvailableEngines(): EngineId[] {
  return (Object.keys(ENV_KEYS) as EngineId[]).filter(isAvailable);
}

/**
 * Get the preferred engine for a capability given current env.
 * Returns undefined if no engine is available.
 */
export function preferredEngine(capability: RouteCapability): EngineId | undefined {
  return CHAINS[capability].find(isAvailable);
}
