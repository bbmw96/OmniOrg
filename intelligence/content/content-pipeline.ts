// Created by BBMW0 Technologies | bbmw0.com
/**
 * CONTENT PIPELINE: Unified Content Generation Orchestrator
 *
 * Orchestrates the full content creation workflow:
 *   brief -> research -> draft -> variants -> publish-ready package
 *
 * Islamic compliance is enforced on every generated output.
 * All AI calls use Anthropic Claude models via the official SDK.
 */

import path from "path";
import { mkdirSync, writeFileSync } from "fs";
import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const OUTPUT_DIR = path.resolve(__dirname, "../../output/content");

// ── Types ────────────────────────────────────────────────────────────────────

export type ContentFormat =
  | "blog_post"
  | "linkedin"
  | "twitter_thread"
  | "instagram_caption"
  | "youtube_script"
  | "email"
  | "ad_copy"
  | "product_description";

export type ContentTone =
  | "professional"
  | "conversational"
  | "educational"
  | "persuasive"
  | "storytelling"
  | "urgent";

export interface ContentBrief {
  topic:          string;
  format:         ContentFormat;
  tone:           ContentTone;
  targetAudience: string;
  keyPoints?:     string[];
  cta?:           string;          // Call to action
  wordCount?:     number;
  keywords?:      string[];
  brandVoice?:    string;          // e.g. "formal Islamic business tone, no slang"
}

export interface ContentVariant {
  variantId:         string;
  content:           string;
  headline?:         string;
  hook?:             string;
  tags:              string[];
  wordCount:         number;
  estimatedReadTime: number;  // minutes
}

export interface ContentPackage {
  brief:      ContentBrief;
  variants:   ContentVariant[];
  repurposed: Partial<Record<ContentFormat, string>>;  // cross-format repurposing
  createdAt:  string;
  savedPath?: string;
}

// ── Islamic compliance ────────────────────────────────────────────────────────

const FORBIDDEN_TERMS: string[] = [
  "alcohol",
  "gambling",
  "interest rate",
  "riba",
  "pork",
  "haram food",
  "nude",
  "dating app",
  "casino",
];

export function islamicContentCheck(content: string): void {
  const lower = content.toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    if (lower.includes(term)) {
      throw new Error(
        `[Content] Islamic compliance check failed: content contains forbidden term '${term}'`
      );
    }
  }
}

// ── Repurposing map ───────────────────────────────────────────────────────────

const REPURPOSE_MAP: Partial<Record<ContentFormat, ContentFormat[]>> = {
  blog_post:     ["linkedin", "twitter_thread"],
  youtube_script: ["instagram_caption", "email"],
  linkedin:      ["twitter_thread", "email"],
  twitter_thread: ["linkedin", "instagram_caption"],
  email:         ["linkedin", "blog_post"],
  ad_copy:       ["instagram_caption", "twitter_thread"],
  product_description: ["ad_copy", "email"],
  instagram_caption:   ["twitter_thread", "linkedin"],
};

// ── Core generation ───────────────────────────────────────────────────────────

export async function generateVariant(
  brief: ContentBrief,
  variantNumber: number
): Promise<ContentVariant> {
  const brandVoiceInstruction = brief.brandVoice
    ? ` Brand voice: ${brief.brandVoice}.`
    : "";

  const systemPrompt =
    `You are a world-class content creator. ` +
    `You write for ${brief.targetAudience}. ` +
    `Tone: ${brief.tone}.` +
    brandVoiceInstruction +
    ` Never use em dashes.`;

  const userLines: string[] = [
    `Write a ${brief.format.replace(/_/g, " ")} about: ${brief.topic}.`,
  ];

  if (brief.keyPoints && brief.keyPoints.length > 0) {
    userLines.push(`Key points to cover: ${brief.keyPoints.join(", ")}.`);
  }
  if (brief.keywords && brief.keywords.length > 0) {
    userLines.push(`Include these keywords naturally: ${brief.keywords.join(", ")}.`);
  }
  if (brief.wordCount) {
    userLines.push(`Target length: approximately ${brief.wordCount} words.`);
  }
  if (brief.cta) {
    userLines.push(`Call to action: ${brief.cta}`);
  }
  if (variantNumber > 1) {
    userLines.push(
      `This is variant ${variantNumber} - use a distinct angle or structure from a previous attempt.`
    );
  }

  const response = await anthropic.messages.create({
    model:      "claude-opus-4-7",
    max_tokens: 2048,
    system:     systemPrompt,
    messages:   [{ role: "user", content: userLines.join(" ") }],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract headline - first line if it starts with # or **
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  let headline: string | undefined;
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.startsWith("#") || firstLine.startsWith("**")) {
      headline = firstLine.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
    }
  }

  // Extract hook - first non-heading paragraph
  let hook: string | undefined;
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.length > 0 &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("**")
    ) {
      hook = trimmed;
      break;
    }
  }

  // Extract tags from keywords or generate from topic words
  const tags: string[] = brief.keywords
    ? brief.keywords.map((k) => k.toLowerCase().replace(/\s+/g, "_"))
    : brief.topic
        .toLowerCase()
        .split(" ")
        .slice(0, 5)
        .map((w) => w.replace(/[^a-z0-9]/g, ""));

  const wordCount = raw.split(/\s+/).filter((w) => w.length > 0).length;
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200));

  islamicContentCheck(raw);

  return {
    variantId:         randomUUID(),
    content:           raw,
    headline,
    hook,
    tags,
    wordCount,
    estimatedReadTime,
  };
}

export async function repurposeContent(
  original:     string,
  targetFormat: ContentFormat,
  brief:        ContentBrief
): Promise<string> {
  const sourceFormat = brief.format.replace(/_/g, " ");
  const target      = targetFormat.replace(/_/g, " ");

  const prompt =
    `Repurpose the following ${sourceFormat} for ${target}. ` +
    `Maintain ${brief.tone} tone. ` +
    `Target audience: ${brief.targetAudience}. ` +
    `Keep key messages. Never use em dashes.\n\n` +
    original;

  const response = await anthropic.messages.create({
    model:     "claude-haiku-4-5",
    max_tokens: 1024,
    messages:  [{ role: "user", content: prompt }],
  });

  const result =
    response.content[0].type === "text" ? response.content[0].text : "";

  islamicContentCheck(result);
  return result;
}

export function savePackage(pkg: ContentPackage): string {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const slug    = pkg.brief.topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const outPath = path.join(OUTPUT_DIR, `${slug}-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(pkg, null, 2), "utf-8");
  return outPath;
}

export async function generateContent(
  brief:        ContentBrief,
  variantCount: number = 3
): Promise<ContentPackage> {
  // Generate all variants in parallel
  const variantPromises = Array.from({ length: variantCount }, (_, i) =>
    generateVariant(brief, i + 1)
  );
  const variants = await Promise.all(variantPromises);

  // Auto-repurpose the best variant (first) to related formats
  const bestContent    = variants[0].content;
  const targetFormats  = REPURPOSE_MAP[brief.format] ?? [];
  const repurposed: Partial<Record<ContentFormat, string>> = {};

  for (const fmt of targetFormats) {
    repurposed[fmt] = await repurposeContent(bestContent, fmt, brief);
  }

  const pkg: ContentPackage = {
    brief,
    variants,
    repurposed,
    createdAt: new Date().toISOString(),
  };

  const savedPath = savePackage(pkg);
  pkg.savedPath   = savedPath;

  return pkg;
}
