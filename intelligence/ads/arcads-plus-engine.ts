// Created by BBMW0 Technologies | bbmw0.com
/**
 * ARCADS+ ENGINE
 *
 * Islamic-compliant UGC-style ad video production engine.
 * Equivalent to Arcads.ai — but fully owned, zero SaaS fees, no AI faces.
 *
 * Islamic compliance: ZERO faces, figures, or living beings in any output.
 * All visuals are abstract motion graphics + text-on-screen over voiceover.
 * This is not a limitation — it is a clean, professional differentiator.
 *
 * Capabilities:
 *   - Ad script generation from product/service description (Claude)
 *   - Multi-variant batch production (A/B testing at scale)
 *   - Multi-language voiceover (edge-tts, 30+ languages)
 *   - Islamic content policy enforcement (mandatory, cannot be disabled)
 *   - Integration with OmniOrg video pipeline (produce-video.py)
 *   - Composio S3 staging + dispatch to YouTube/Instagram
 */

import path from "path";
import { execSync, spawn } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PRODUCE_SCRIPT = path.resolve(__dirname, "../../scripts/produce-video.py");
const ADS_OUTPUT_DIR = path.resolve(__dirname, "../../output/ads");

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdBrief {
  productName:    string;
  productUrl?:    string;
  description:    string;
  targetAudience: string;
  platform:       "youtube" | "instagram" | "tiktok" | "facebook";
  duration:       15 | 30 | 60;
  tone:           "energetic" | "calm" | "authoritative" | "friendly" | "urgency";
  language?:      string;
  callToAction:   string;
}

export interface AdVariant {
  variantId:   string;
  brief:       AdBrief;
  script:      string;
  hook:        string;
  scenes:      AdScene[];
  language:    string;
  videoPath?:  string;
}

export interface AdScene {
  index:       number;
  visual:      string;   // Abstract visual description — NO faces
  narration:   string;   // Voiceover text for this scene
  duration:    number;   // Seconds
  textOverlay: string;   // On-screen text/caption
}

export interface BatchAdResult {
  productName: string;
  variants:    AdVariant[];
  errors:      string[];
}

// ── Islamic content policy ────────────────────────────────────────────────────

const FORBIDDEN_VISUAL_TERMS = [
  "face", "person", "people", "human", "man", "woman", "boy", "girl", "child",
  "portrait", "selfie", "character", "anime", "cartoon", "mascot", "avatar",
  "figure", "silhouette", "body", "head", "smile", "eyes", "lips", "hands",
  "animal", "dog", "cat", "bird", "creature", "monster", "beast",
  "emoji", "sticker", "actor", "model", "influencer",
];

function enforceIslamicPolicy(scene: AdScene): AdScene {
  const lower = scene.visual.toLowerCase();
  for (const term of FORBIDDEN_VISUAL_TERMS) {
    if (lower.includes(term)) {
      console.warn(`[Arcads+] Scene ${scene.index} visual blocked (contains '${term}') — replaced with abstract.`);
      scene.visual = "abstract geometric light pattern, data particles, premium product showcase, no living beings";
    }
  }
  return scene;
}

// ── Script generation ─────────────────────────────────────────────────────────

async function generateAdScript(brief: AdBrief, variantIndex: number): Promise<{ script: string; hook: string; scenes: AdScene[] }> {
  const toneGuide: Record<AdBrief["tone"], string> = {
    energetic:    "high energy, fast-paced, exciting, action words",
    calm:         "measured, reassuring, trust-building, clear",
    authoritative: "expert, confident, factual, data-driven",
    friendly:     "warm, conversational, relatable, inclusive",
    urgency:      "time-sensitive, scarcity, strong CTA, FOMO",
  };

  const sceneCount = brief.duration === 15 ? 3 : brief.duration === 30 ? 5 : 8;

  const system = `You are an expert performance marketing copywriter.
You create video ad scripts for ${brief.platform} ads.
All visual descriptions MUST be abstract, geometric, typographic, or product-focused.
NEVER describe faces, people, animals, anime, cartoons, or any living being in visuals.
Islamic content compliance is MANDATORY — only abstract/geometric/product visuals.`;

  const prompt = `Create ad variant #${variantIndex + 1} for:
Product: ${brief.productName}
${brief.productUrl ? `URL: ${brief.productUrl}` : ""}
Description: ${brief.description}
Target audience: ${brief.targetAudience}
Tone: ${brief.tone} — ${toneGuide[brief.tone]}
CTA: ${brief.callToAction}
Duration: ${brief.duration}s (${sceneCount} scenes)
Language: ${brief.language ?? "English (UK)"}

Return valid JSON matching this schema exactly:
{
  "hook": "first 3-second hook line (spoken)",
  "script": "full narration script as one continuous paragraph",
  "scenes": [
    {
      "index": 0,
      "visual": "abstract/geometric/product visual description — NO faces/people/animals",
      "narration": "spoken text for this scene",
      "duration": 5,
      "textOverlay": "bold on-screen text line"
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model:      "claude-opus-4-7",
    max_tokens: 2000,
    messages:   [{ role: "user", content: prompt }],
    system,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in Claude response for variant ${variantIndex}`);

  const parsed = JSON.parse(jsonMatch[0]) as { hook: string; script: string; scenes: AdScene[] };

  // Enforce Islamic policy on every scene
  parsed.scenes = parsed.scenes.map(enforceIslamicPolicy);

  return parsed;
}

// ── Video production ──────────────────────────────────────────────────────────

async function produceAdVideo(variant: AdVariant): Promise<string> {
  mkdirSync(ADS_OUTPUT_DIR, { recursive: true });

  // Build a produce-video.py compatible payload
  const payload = {
    topic:    `${variant.brief.productName} — Ad Variant ${variant.variantId}`,
    platform: variant.brief.platform === "tiktok" ? "instagram" : variant.brief.platform,
    format:   variant.brief.platform === "youtube" ? "shorts" : "reels",
    language: variant.language,
    duration: variant.brief.duration,
    script:   variant.script,
    scenes:   variant.scenes.map(s => ({
      index:       s.index,
      prompt:      s.visual,
      narration:   s.narration,
      textOverlay: s.textOverlay,
      duration:    s.duration,
    })),
  };

  const payloadPath = path.join(ADS_OUTPUT_DIR, `${variant.variantId}-payload.json`);
  writeFileSync(payloadPath, JSON.stringify(payload, null, 2));

  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [PRODUCE_SCRIPT, "--payload", payloadPath, "--output-dir", ADS_OUTPUT_DIR], {
      stdio: "inherit",
    });
    proc.on("close", code => {
      if (code !== 0) return reject(new Error(`produce-video.py exited ${code}`));
      const videoPath = path.join(ADS_OUTPUT_DIR, `${variant.variantId}.mp4`);
      if (!existsSync(videoPath)) return reject(new Error(`Video not found: ${videoPath}`));
      resolve(videoPath);
    });
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a single ad variant from a brief.
 * Islamic compliance is automatically enforced.
 */
export async function generateAdVariant(brief: AdBrief, variantIndex = 0): Promise<AdVariant> {
  const variantId = `ad-${Date.now()}-v${variantIndex}`;
  console.log(`[Arcads+] Generating variant ${variantIndex + 1} for "${brief.productName}"...`);

  const { hook, script, scenes } = await generateAdScript(brief, variantIndex);

  return {
    variantId,
    brief,
    script,
    hook,
    scenes,
    language: brief.language ?? "en-GB",
  };
}

/**
 * Produce a batch of ad variants from a single brief.
 * Returns all generated variants (scripts + optionally video paths).
 *
 * @param brief     - Ad brief
 * @param count     - Number of variants to generate (default 3, like Arcads batch mode)
 * @param produce   - Whether to also render MP4 files (default false for script-only)
 * @param languages - Additional language variants (e.g. ["ar", "fr", "es"])
 */
export async function batchGenerateAds(
  brief:     AdBrief,
  count      = 3,
  produce    = false,
  languages: string[] = [],
): Promise<BatchAdResult> {
  const errors:   string[]   = [];
  const variants: AdVariant[] = [];

  // Primary language variants
  for (let i = 0; i < count; i++) {
    try {
      const variant = await generateAdVariant(brief, i);
      if (produce) {
        variant.videoPath = await produceAdVideo(variant);
        console.log(`[Arcads+] Video ready: ${variant.videoPath}`);
      }
      variants.push(variant);
    } catch (err) {
      errors.push(`Variant ${i}: ${String(err)}`);
    }
  }

  // Language variants (script-only, one per language)
  for (const lang of languages) {
    try {
      const langBrief = { ...brief, language: lang };
      const variant   = await generateAdVariant(langBrief, variants.length);
      if (produce) {
        variant.videoPath = await produceAdVideo(variant);
      }
      variants.push(variant);
    } catch (err) {
      errors.push(`Language variant (${lang}): ${String(err)}`);
    }
  }

  console.log(`[Arcads+] Batch complete: ${variants.length} variants, ${errors.length} errors`);
  return { productName: brief.productName, variants, errors };
}

/**
 * Export ad variants as JSON for review or upload to content scheduler.
 */
export function exportVariants(result: BatchAdResult, outputPath: string): void {
  writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`[Arcads+] Exported ${result.variants.length} variants to ${outputPath}`);
}
