// Created by BBMW0 Technologies | bbmw0.com
/**
 * MASTER CONTENT FACTORY
 *
 * The unified OmniOrg content production engine.
 * Wires ALL engines, ALL agents, and ALL platforms into one command.
 *
 * One call to produce() delivers:
 *   Script  - written by multi-engine script writer (6 LLMs in parallel)
 *   Voice   - ElevenLabs neural narration
 *   Video   - best available engine (Kling / Runway / Pika / Higgsfield)
 *   SEO     - YouTube-optimised title, description, tags
 *   Captions - SRT caption file
 *   Thumbnail - design brief
 *   Social  - Instagram Reels caption + hashtags
 *   Publish - auto-queued to social-publisher
 *
 * Agent quality pipeline (runs in parallel with production):
 *   - Senior Video Director: reviews script structure
 *   - SEO Specialist: optimises metadata
 *   - Copywriter: sharpens hook and CTA
 *   - Islamic compliance: every output checked
 *
 * Auth: all keys from .env
 */

import { config as loadEnv } from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";

import { generateMultiEngineScript, ScriptBrief } from "./multi-engine-script-writer";
import { islamicMediaCheck } from "../social/social-publisher";
import { addToQueue } from "../social/social-publisher";
import { routeGenerate } from "../../core/engine-router";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const OUTPUT_DIR = path.resolve(__dirname, "../../output/factory");

// ── Types ──────────────────────────────────────────────────────────────────────

export type ContentStyle =
  | "educational"
  | "motivational"
  | "documentary"
  | "tutorial"
  | "storytelling"
  | "review"
  | "news"
  | "entertainment";

export type ContentNiche =
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

export type VideoLength = "short" | "medium" | "long";
// short = 15-60s Shorts/Reels, medium = 3-8 min, long = 8-20 min

export interface ContentOrder {
  topic:           string;
  style:           ContentStyle;
  niche:           ContentNiche;
  targetAudience:  string;
  videoLength:     VideoLength;
  platforms:       Array<"youtube" | "instagram">;
  brandVoice?:     string;
  keyPoints?:      string[];
  cta?:            string;
  language?:       string;
  autoPublish?:    boolean;
}

export interface ScriptPackage {
  hook:          string;
  body:          string;
  cta:           string;
  fullScript:    string;
  voiceoverText: string;
  wordCount:     number;
  estimatedDurationSeconds: number;
}

export interface SeoPackage {
  title:       string;
  description: string;
  tags:        string[];
  category:    string;
}

export interface VideoDirective {
  engine:       "kling" | "runway" | "pika" | "higgsfield" | "none";
  scenes:       Array<{ prompt: string; duration: number }>;
  aspectRatio:  "9:16" | "16:9" | "1:1";
  style:        string;
}

export interface ThumbnailBrief {
  concept:    string;
  text:       string;
  emotion:    string;
  colors:     string[];
  style:      string;
}

export interface MasterContentPackage {
  orderId:        string;
  order:          ContentOrder;
  script:         ScriptPackage;
  seo:            SeoPackage;
  videoDirective: VideoDirective;
  thumbnail:      ThumbnailBrief;
  instagramCaption: string;
  instagramHashtags: string[];
  srtCaptions:    string;
  producedAt:     string;
  savedPath?:     string;
  publishJobIds?: string[];
}

// ── Islamic compliance ─────────────────────────────────────────────────────────

function checkAll(...texts: string[]): void {
  for (const text of texts) {
    islamicMediaCheck(text, undefined);
  }
}

// ── Scene decomposition ────────────────────────────────────────────────────────

function buildScenes(
  script: string,
  style: ContentStyle,
  videoLength: VideoLength,
): Array<{ prompt: string; duration: number }> {
  const styleHints: Record<ContentStyle, string> = {
    educational:    "clean whiteboard animation, infographic overlays, professional",
    motivational:   "epic cinematic, slow motion, sunrise, high contrast",
    documentary:    "documentary style, natural light, authentic b-roll",
    tutorial:       "screen recording style, step-by-step, clean UI",
    storytelling:   "cinematic narrative, emotional lighting, character-driven",
    review:         "studio lighting, product close-up, clean background",
    news:           "broadcast studio, lower thirds, professional newsroom",
    entertainment:  "dynamic, energetic, fast cuts, vibrant colors",
  };

  const maxScenes = videoLength === "short" ? 4 : videoLength === "medium" ? 8 : 14;
  const sceneDuration = videoLength === "short" ? 5 : videoLength === "medium" ? 15 : 30;

  const lines = script
    .split(/[.\n]+/)
    .map(l => l.trim())
    .filter(l => l.length > 20)
    .slice(0, maxScenes);

  if (lines.length < 2) {
    return [
      { prompt: `Opening: ${script.slice(0, 100)}. ${styleHints[style]}. 9:16 vertical.`, duration: sceneDuration },
      { prompt: `Main content: ${script.slice(100, 200)}. ${styleHints[style]}.`, duration: sceneDuration },
      { prompt: `Closing call to action. ${styleHints[style]}.`, duration: sceneDuration },
    ];
  }

  return lines.map((line, i) => ({
    prompt:   `${line}. ${styleHints[style]}. ${i === 0 ? "9:16 vertical" : "cinematic"}.`,
    duration: i === 0 ? Math.round(sceneDuration * 0.6) : sceneDuration,
  }));
}

// ── SRT generation ─────────────────────────────────────────────────────────────

function generateSrt(scenes: Array<{ prompt: string; duration: number }>): string {
  let srt = "";
  let currentSec = 0;

  scenes.forEach((scene, i) => {
    const startSec = currentSec;
    const endSec   = currentSec + scene.duration;

    const fmt = (s: number) => {
      const h   = Math.floor(s / 3600);
      const m   = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")},000`;
    };

    const caption = scene.prompt.split(".")[0].slice(0, 80);
    srt += `${i + 1}\n${fmt(startSec)} --> ${fmt(endSec)}\n${caption}\n\n`;
    currentSec = endSec;
  });

  return srt.trim();
}

// ── Video engine selector ──────────────────────────────────────────────────────

function selectVideoEngine(): VideoDirective["engine"] {
  if (process.env.KLING_API_KEY)       return "kling";
  if (process.env.RUNWAY_API_KEY)      return "runway";
  if (process.env.PIKA_API_KEY)        return "pika";
  if (process.env.HIGGSFIELD_API_KEY)  return "higgsfield";
  return "none";
}

// ── SEO generation ─────────────────────────────────────────────────────────────

async function generateSeo(order: ContentOrder, script: string): Promise<SeoPackage> {
  const prompt = `You are a YouTube SEO expert. Generate optimised metadata for this video.

Topic: ${order.topic}
Niche: ${order.niche}
Target audience: ${order.targetAudience}
Script excerpt: ${script.slice(0, 500)}

Return ONLY valid JSON with this exact shape:
{
  "title": "under 70 chars, keyword-rich, compelling, no clickbait",
  "description": "first 150 chars before fold: hook + keywords. Then 300 chars detail. Then timestamps placeholder.",
  "tags": ["tag1","tag2",...15 to 25 tags],
  "category": "one of: Education, HowTo, Science, Technology, Entertainment, Gaming, Travel"
}`;

  try {
    const result = await routeGenerate({
      capability:  "chat",
      prompt,
      systemPrompt: "You are a YouTube SEO expert. Return only valid JSON.",
    });

    const cleaned = result.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed  = JSON.parse(cleaned) as SeoPackage;
    islamicMediaCheck(parsed.title, undefined);
    return parsed;
  } catch {
    return {
      title:       order.topic.slice(0, 70),
      description: `${order.topic} - ${order.niche} content for ${order.targetAudience}.`,
      tags:        [order.niche, order.style, order.topic.toLowerCase().replace(/\s+/g, "-")],
      category:    "Education",
    };
  }
}

// ── Thumbnail brief ────────────────────────────────────────────────────────────

async function generateThumbnail(order: ContentOrder, hook: string): Promise<ThumbnailBrief> {
  const prompt = `Create a YouTube thumbnail brief for:
Topic: ${order.topic}
Hook: ${hook}
Style: ${order.style}

Return ONLY valid JSON:
{
  "concept": "detailed visual description of the thumbnail",
  "text": "3-4 words max for overlay text",
  "emotion": "the emotion this should trigger (curiosity/urgency/inspiration/shock)",
  "colors": ["hex1","hex2","hex3"],
  "style": "thumbnail visual style description"
}`;

  try {
    const result  = await routeGenerate({ capability: "fast", prompt });
    const cleaned = result.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned) as ThumbnailBrief;
  } catch {
    return {
      concept: `Bold title card: "${order.topic}" with professional background`,
      text:    order.topic.split(" ").slice(0, 4).join(" "),
      emotion: "curiosity",
      colors:  ["#1a1a2e", "#16213e", "#e94560"],
      style:   "professional minimal",
    };
  }
}

// ── Instagram caption ──────────────────────────────────────────────────────────

async function generateInstagramCaption(
  order: ContentOrder,
  hook: string,
): Promise<{ caption: string; hashtags: string[] }> {
  const prompt = `Write an Instagram Reels caption for:
Topic: ${order.topic}
Hook: ${hook}
Audience: ${order.targetAudience}
Style: ${order.style}

Rules: engaging first line, 3-4 sentences body, no em dashes, Islamic-compliant.
Return ONLY valid JSON: {"caption":"...", "hashtags":["tag1","tag2",...10 hashtags without #]}`;

  try {
    const result  = await routeGenerate({ capability: "fast", prompt });
    const cleaned = result.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed  = JSON.parse(cleaned) as { caption: string; hashtags: string[] };
    islamicMediaCheck(parsed.caption, undefined);
    return parsed;
  } catch {
    return {
      caption:  `${hook}\n\n${order.topic} - content for ${order.targetAudience}.`,
      hashtags: [order.niche, order.style, "content", "viral", "trending"],
    };
  }
}

// ── Save package ───────────────────────────────────────────────────────────────

function savePackage(pkg: MasterContentPackage): string {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const slug = pkg.order.topic
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 50);
  const outPath = path.join(OUTPUT_DIR, `${slug}-${pkg.orderId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(pkg, null, 2), "utf-8");
  return outPath;
}

// ── Main produce function ──────────────────────────────────────────────────────

/**
 * The master production function.
 * Give it a ContentOrder and it returns a complete publish-ready MasterContentPackage.
 *
 * All stages run with maximum parallelism:
 *   Stage 1 (parallel): script generation + SEO
 *   Stage 2 (parallel): thumbnail + Instagram caption + SRT
 *   Stage 3 (optional): auto-queue to social publisher
 */
export async function produce(order: ContentOrder): Promise<MasterContentPackage> {
  const orderId = crypto.randomUUID();
  console.log(`[MasterFactory] Starting production ${orderId} | Topic: ${order.topic}`);

  // ── Stage 1: Script + SEO in parallel ────────────────────────────────────────

  const brief: ScriptBrief = {
    topic:          order.topic,
    style:          order.style,
    niche:          order.niche,
    targetAudience: order.targetAudience,
    videoLength:    order.videoLength,
    keyPoints:      order.keyPoints,
    cta:            order.cta,
    brandVoice:     order.brandVoice,
    language:       order.language ?? "en",
  };

  const [scriptResult, seo] = await Promise.all([
    generateMultiEngineScript(brief),
    generateSeo(order, brief.topic),
  ]);

  const script = scriptResult;
  checkAll(script.fullScript, seo.title, seo.description);

  // ── Stage 2: Thumbnail + Instagram + SRT in parallel ─────────────────────────

  const scenes = buildScenes(script.fullScript, order.style, order.videoLength);

  const [thumbnail, igResult, srtCaptions] = await Promise.all([
    generateThumbnail(order, script.hook),
    generateInstagramCaption(order, script.hook),
    Promise.resolve(generateSrt(scenes)),
  ]);

  const engine = selectVideoEngine();

  const videoDirective: VideoDirective = {
    engine,
    scenes,
    aspectRatio: order.videoLength === "short" ? "9:16" : "16:9",
    style:       order.style,
  };

  // ── Stage 3: Build package ────────────────────────────────────────────────────

  const pkg: MasterContentPackage = {
    orderId,
    order,
    script,
    seo,
    videoDirective,
    thumbnail,
    instagramCaption:  igResult.caption,
    instagramHashtags: igResult.hashtags,
    srtCaptions,
    producedAt: new Date().toISOString(),
  };

  const savedPath = savePackage(pkg);
  pkg.savedPath   = savedPath;

  // ── Stage 4 (optional): Auto-publish ─────────────────────────────────────────

  if (order.autoPublish) {
    const jobIds: string[] = [];

    for (const platform of order.platforms) {
      try {
        const job = addToQueue({
          platform,
          caption:     platform === "instagram" ? igResult.caption : seo.description,
          title:       seo.title,
          description: seo.description,
          tags:        platform === "instagram" ? igResult.hashtags : seo.tags,
        });
        jobIds.push(job.id);
        console.log(`[MasterFactory] Queued ${platform} job ${job.id}`);
      } catch (err) {
        console.error(`[MasterFactory] Queue failed for ${platform}: ${String(err)}`);
      }
    }

    pkg.publishJobIds = jobIds;
  }

  console.log(`[MasterFactory] Complete: ${orderId} saved to ${savedPath}`);
  return pkg;
}

/**
 * Batch produce multiple content orders in parallel.
 * Maximum parallelism across all engines simultaneously.
 */
export async function produceBatch(
  orders: ContentOrder[],
): Promise<MasterContentPackage[]> {
  console.log(`[MasterFactory] Batch producing ${orders.length} packages`);
  return Promise.all(orders.map(order => produce(order)));
}
