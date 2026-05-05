// Created by BBMW0 Technologies | bbmw0.com
/**
 * MULTI-ENGINE SCRIPT WRITER
 *
 * Runs ALL available LLM engines simultaneously and picks the best script.
 *
 * Engines fired in parallel:
 *   - Anthropic Claude Opus  (best creative quality)
 *   - DeepSeek R1            (reasoning trace for structured scripts)
 *   - DeepSeek V3            (fast high-quality chat)
 *   - Groq Llama3-70B        (ultra-fast, good for short-form)
 *   - GLM-4-Plus             (excellent for bilingual / global content)
 *   - Gemini Pro             (multimodal context awareness)
 *   - OpenAI GPT-4o          (backup)
 *
 * Scoring criteria:
 *   - Hook quality (first 3 sentences)
 *   - Structure (hook / body / CTA present)
 *   - Word count match
 *   - Islamic compliance
 *
 * The highest-scoring script wins. If a tie, Claude Opus wins.
 * Returns a ready-to-use ScriptPackage.
 */

import { config as loadEnv } from "dotenv";
import * as path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

// ── Types ──────────────────────────────────────────────────────────────────────

export type ScriptStyle =
  | "educational"
  | "motivational"
  | "documentary"
  | "tutorial"
  | "storytelling"
  | "review"
  | "news"
  | "entertainment";

export type ScriptNiche =
  | "ai-tech"
  | "business"
  | "finance"
  | "health"
  | "fitness"
  | "education"
  | "gaming"
  | "travel"
  | "food"
  | "architecture"
  | "fashion"
  | "general";

export interface ScriptBrief {
  topic:          string;
  style:          ScriptStyle;
  niche:          ScriptNiche;
  targetAudience: string;
  videoLength:    "short" | "medium" | "long";
  keyPoints?:     string[];
  cta?:           string;
  brandVoice?:    string;
  language?:      string;
}

export interface ScriptPackage {
  hook:          string;
  body:          string;
  cta:           string;
  fullScript:    string;
  voiceoverText: string;
  wordCount:     number;
  estimatedDurationSeconds: number;
  winnerEngine:  string;
  scoreDetails?: Record<string, number>;
}

interface EngineAttempt {
  engine:  string;
  text:    string;
  score:   number;
  error?:  string;
}

// ── Islamic compliance check ──────────────────────────────────────────────────

const HARAM_PATTERNS = [
  /\b(music|song|lyrics|playlist|album|band|concert|festival|rave|dj)\b/i,
  /\b(gambling|casino|bet|lottery|poker|roulette|jackpot|wager)\b/i,
  /\b(alcohol|beer|wine|whiskey|vodka|cocktail|drunk|booze|spirits)\b/i,
  /\b(nude|naked|explicit|adult content|nsfw|xxx|erotic|porn)\b/i,
  /\b(hookup|tinder|grindr|one night stand|casual sex)\b/i,
];

function islamicCheck(text: string): boolean {
  return !HARAM_PATTERNS.some(p => p.test(text));
}

// ── Prompt builder ─────────────────────────────────────────────────────────────

function buildPrompt(brief: ScriptBrief): string {
  const targetWords = brief.videoLength === "short"
    ? "100-150 words"
    : brief.videoLength === "medium"
    ? "400-600 words"
    : "800-1200 words";

  const sections = [
    `Write a ${brief.style} video script for ${brief.targetAudience}.`,
    `Topic: ${brief.topic}`,
    `Niche: ${brief.niche}`,
    `Target length: ${targetWords}`,
    brief.keyPoints ? `Key points: ${brief.keyPoints.join(", ")}` : "",
    brief.cta ? `Call to action: ${brief.cta}` : "",
    brief.brandVoice ? `Brand voice: ${brief.brandVoice}` : "",
    "",
    "Format EXACTLY as:",
    "[HOOK]",
    "First 3 sentences that grab attention instantly.",
    "",
    "[BODY]",
    "Main content.",
    "",
    "[CTA]",
    "Clear call to action.",
    "",
    "Rules: no em dashes, no music references, Islamic-compliant content only.",
  ].filter(Boolean);

  return sections.join("\n");
}

// ── Engine runners ─────────────────────────────────────────────────────────────

async function tryAnthropic(prompt: string): Promise<EngineAttempt> {
  try {
    const m  = await import("../ai-engines/anthropic-engine");
    const text = await m.ask(prompt, undefined, undefined, 3000);
    return { engine: "anthropic-opus", text, score: 0 };
  } catch (err) {
    return { engine: "anthropic-opus", text: "", score: -1, error: String(err) };
  }
}

async function tryDeepSeekR1(prompt: string): Promise<EngineAttempt> {
  try {
    const m      = await import("../ai-engines/deepseek-engine");
    const result = await m.reason(prompt);
    return { engine: "deepseek-r1", text: result.answer, score: 0 };
  } catch (err) {
    return { engine: "deepseek-r1", text: "", score: -1, error: String(err) };
  }
}

async function tryDeepSeekV3(prompt: string): Promise<EngineAttempt> {
  try {
    const m      = await import("../ai-engines/deepseek-engine");
    const result = await m.ask(prompt);
    return { engine: "deepseek-v3", text: result.text, score: 0 };
  } catch (err) {
    return { engine: "deepseek-v3", text: "", score: -1, error: String(err) };
  }
}

async function tryGroq(prompt: string): Promise<EngineAttempt> {
  try {
    const m    = await import("../ai-engines/groq-engine");
    const text = await m.ask(prompt);
    return { engine: "groq-llama3", text, score: 0 };
  } catch (err) {
    return { engine: "groq-llama3", text: "", score: -1, error: String(err) };
  }
}

async function tryGlm(prompt: string): Promise<EngineAttempt> {
  try {
    const m    = await import("../ai-engines/glm-engine");
    const text = await m.ask(prompt);
    return { engine: "glm-4-plus", text, score: 0 };
  } catch (err) {
    return { engine: "glm-4-plus", text: "", score: -1, error: String(err) };
  }
}

async function tryGemini(prompt: string): Promise<EngineAttempt> {
  try {
    const m      = await import("../ai-engines/gemini-engine");
    const text = await m.generate(prompt);
    return { engine: "gemini-pro", text, score: 0 };
  } catch (err) {
    return { engine: "gemini-pro", text: "", score: -1, error: String(err) };
  }
}

async function tryOpenAI(prompt: string): Promise<EngineAttempt> {
  try {
    const m    = await import("../ai-engines/openai-engine");
    const text = await m.ask(prompt);
    return { engine: "openai-gpt4o", text, score: 0 };
  } catch (err) {
    return { engine: "openai-gpt4o", text: "", score: -1, error: String(err) };
  }
}

// ── Script scorer ──────────────────────────────────────────────────────────────

function scoreScript(text: string, brief: ScriptBrief): number {
  if (!text || text.length < 50) return -1;
  if (!islamicCheck(text))       return -1;

  let score = 0;

  if (text.includes("[HOOK]"))  score += 25;
  if (text.includes("[BODY]"))  score += 25;
  if (text.includes("[CTA]"))   score += 20;

  const wordCount = text.split(/\s+/).length;
  const targetMin = brief.videoLength === "short" ? 80  : brief.videoLength === "medium" ? 300 : 700;
  const targetMax = brief.videoLength === "short" ? 200 : brief.videoLength === "medium" ? 700 : 1400;

  if (wordCount >= targetMin && wordCount <= targetMax) score += 20;
  else if (wordCount >= targetMin * 0.7)                score += 10;

  if (brief.topic && text.toLowerCase().includes(brief.topic.toLowerCase().slice(0, 15))) score += 5;
  if (brief.cta    && text.toLowerCase().includes(brief.cta.toLowerCase().slice(0, 15)))  score += 5;

  return score;
}

// ── Script parser ──────────────────────────────────────────────────────────────

function parseScript(text: string, brief: ScriptBrief): ScriptPackage {
  const hookMatch = /\[HOOK\]\s*([\s\S]*?)(?=\[BODY\]|\[CTA\]|$)/i.exec(text);
  const bodyMatch = /\[BODY\]\s*([\s\S]*?)(?=\[HOOK\]|\[CTA\]|$)/i.exec(text);
  const ctaMatch  = /\[CTA\]\s*([\s\S]*?)(?=\[HOOK\]|\[BODY\]|$)/i.exec(text);

  const hook = (hookMatch?.[1] ?? "").trim() || text.split("\n")[0];
  const body = (bodyMatch?.[1] ?? "").trim() || text;
  const cta  = (ctaMatch?.[1]  ?? "").trim() || (brief.cta ?? "Follow for more.");

  const fullScript    = `${hook}\n\n${body}\n\n${cta}`;
  const voiceoverText = fullScript.replace(/\[.*?\]/g, "").replace(/\*+/g, "").trim();
  const wordCount     = voiceoverText.split(/\s+/).length;

  const wpm = 150;
  const estimatedDurationSeconds = Math.round((wordCount / wpm) * 60);

  return {
    hook,
    body,
    cta,
    fullScript,
    voiceoverText,
    wordCount,
    estimatedDurationSeconds,
    winnerEngine: "unknown",
  };
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Fire all available LLM engines simultaneously and return the best script.
 * Always returns a valid ScriptPackage; falls back to best available attempt.
 */
export async function generateMultiEngineScript(
  brief: ScriptBrief,
): Promise<ScriptPackage> {
  const prompt = buildPrompt(brief);

  console.log(`[MultiEngineWriter] Firing all engines for: "${brief.topic}"`);

  const attempts = await Promise.all([
    tryAnthropic(prompt),
    tryDeepSeekR1(prompt),
    tryDeepSeekV3(prompt),
    tryGroq(prompt),
    tryGlm(prompt),
    tryGemini(prompt),
    tryOpenAI(prompt),
  ]);

  const scored = attempts.map(a => ({
    ...a,
    score: scoreScript(a.text, brief),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.engine === "anthropic-opus") return -1;
    if (b.engine === "anthropic-opus") return 1;
    return 0;
  });

  const winners  = scored.filter(a => a.score > 0);
  const failures = scored.filter(a => a.score <= 0).map(a => `${a.engine}(${a.error ?? "low score"})`);

  if (failures.length > 0) {
    console.log(`[MultiEngineWriter] ${failures.length} engines failed/low-scored: ${failures.join(", ")}`);
  }

  const best = winners[0] ?? scored[0];

  console.log(`[MultiEngineWriter] Winner: ${best.engine} (score: ${best.score})`);

  if (!best || !best.text) {
    throw new Error("[MultiEngineWriter] All engines failed to produce a valid script.");
  }

  const scoreDetails: Record<string, number> = {};
  scored.forEach(a => { scoreDetails[a.engine] = a.score; });

  const pkg = parseScript(best.text, brief);
  pkg.winnerEngine  = best.engine;
  pkg.scoreDetails  = scoreDetails;

  return pkg;
}