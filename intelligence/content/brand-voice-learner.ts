// Created by BBMW0 Technologies | bbmw0.com
/**
 * BRAND VOICE LEARNER
 *
 * Learns and stores a brand's voice by analysing example content.
 * Extracts tone, forbidden words, preferred phrases, and representative
 * sentences, then persists the profile for reuse across the pipeline.
 */

import path from "path";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BRAND_VOICES_DIR = path.resolve(__dirname, "../../output/brand-voices");

// ── Types ────────────────────────────────────────────────────────────────────

export interface BrandVoice {
  name:              string;
  description:       string;
  toneAttributes:    string[];   // adjectives: e.g. ["warm", "authoritative", "concise"]
  forbiddenWords:    string[];   // words/phrases to avoid
  preferredPhrases:  string[];   // phrases the brand consistently uses
  exampleSentences:  string[];   // representative sentences from the examples
  createdAt:         string;
}

// ── Brand voice learning ──────────────────────────────────────────────────────

export async function learnFromExamples(
  brandName: string,
  examples:  string[]
): Promise<BrandVoice> {
  const combinedExamples = examples
    .map((ex, i) => `--- Example ${i + 1} ---\n${ex}`)
    .join("\n\n");

  const prompt =
    `Analyse these content examples from the brand "${brandName}" and extract the brand voice. ` +
    `Return a JSON object with exactly these fields:\n` +
    `- "description": a one-sentence summary of the brand voice\n` +
    `- "toneAttributes": array of adjective strings describing the tone (e.g. ["professional", "warm"])\n` +
    `- "forbiddenWords": array of words or short phrases this brand avoids\n` +
    `- "preferredPhrases": array of phrases this brand consistently uses\n` +
    `- "exampleSentences": array of 3-5 representative sentences from the examples\n\n` +
    `Return only valid JSON. No markdown fences, no extra text.\n\n` +
    combinedExamples;

  const response = await anthropic.messages.create({
    model:      "claude-opus-4-7",
    max_tokens: 1024,
    messages:   [{ role: "user", content: prompt }],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text.trim() : "{}";

  let parsed: Omit<BrandVoice, "name" | "createdAt">;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `[BrandVoiceLearner] Failed to parse Claude response as JSON: ${raw.slice(0, 200)}`
    );
  }

  const voice: BrandVoice = {
    name:             brandName,
    description:      parsed.description      ?? "",
    toneAttributes:   parsed.toneAttributes   ?? [],
    forbiddenWords:   parsed.forbiddenWords   ?? [],
    preferredPhrases: parsed.preferredPhrases ?? [],
    exampleSentences: parsed.exampleSentences ?? [],
    createdAt:        new Date().toISOString(),
  };

  return voice;
}

export function saveBrandVoice(voice: BrandVoice): string {
  mkdirSync(BRAND_VOICES_DIR, { recursive: true });
  const safeName = voice.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const outPath  = path.join(BRAND_VOICES_DIR, `${safeName}.json`);
  writeFileSync(outPath, JSON.stringify(voice, null, 2), "utf-8");
  return outPath;
}

export function loadBrandVoice(name: string): BrandVoice {
  const safeName  = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const voicePath = path.join(BRAND_VOICES_DIR, `${safeName}.json`);
  const raw       = readFileSync(voicePath, "utf-8");
  return JSON.parse(raw) as BrandVoice;
}

export async function applyBrandVoice(
  content: string,
  voice:   BrandVoice
): Promise<string> {
  const forbidden  = voice.forbiddenWords.length > 0
    ? `Avoid these words/phrases: ${voice.forbiddenWords.join(", ")}.`
    : "";
  const preferred  = voice.preferredPhrases.length > 0
    ? `Use these preferred phrases where appropriate: ${voice.preferredPhrases.join(", ")}.`
    : "";
  const attributes = voice.toneAttributes.length > 0
    ? `Tone attributes: ${voice.toneAttributes.join(", ")}.`
    : "";

  const prompt =
    `Rewrite the following content to match the "${voice.name}" brand voice.\n` +
    `Brand description: ${voice.description}\n` +
    `${attributes}\n` +
    `${forbidden}\n` +
    `${preferred}\n` +
    `Never use em dashes. Return only the rewritten content, no commentary.\n\n` +
    content;

  const response = await anthropic.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 2048,
    messages:   [{ role: "user", content: prompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : content;
}
