// Created by BBMW0 Technologies | bbmw0.com
/**
 * VIDEO PRODUCTION AGENT: OmniOrg → Python Pipeline Bridge
 *
 * Converts a ScheduledPost into a finished MP4 ready for the
 * YouTube Shorts engine to upload at 08:00 UK time.
 *
 * Production stages (all automated, zero manual steps):
 *   1. Build content package JSON from ScheduledPost + channel theme
 *   2. Invoke produce-video.py (Kling AI → ElevenLabs → FFmpeg)
 *   3. Read back manifest JSON and return video path + metadata
 *
 * Theme routing:
 *   bbmw0-main   → "default" / "tech" / "motivational" (niche-aware)
 *   bbmw0-games  → "games"
 *
 * Video backgrounds: generated locally via FFmpeg geq filter (zero cost).
 * Voiceover: Microsoft edge-tts neural TTS, British English (zero cost).
 * No paid APIs required.
 */

import * as fs             from "fs";
import * as path           from "path";
import * as cp             from "child_process";
import type { ScheduledPost } from "./content-scheduler";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const PRODUCE_SCRIPT    = path.join(__dirname, "../../scripts/produce-video.py");
const OUTPUT_FOLDER     = "C:\\Users\\BBMW0\\OneDrive\\Documents\\.YouTube Project";
const PYTHON_CMD        = "python";    // python3 on Linux/Mac, python on Windows
const TIMEOUT_MS        = 10 * 60 * 1000;  // 10 min max per video

// ── TYPES ─────────────────────────────────────────────────────────────────────

export type VideoTheme = "default" | "games" | "tech" | "motivational";

export interface ContentPackage {
  id:            string;
  title:         string;
  hook:          string;
  platform:      "youtube" | "instagram";
  theme:         VideoTheme;
  tenantId:      string;
  scenes:        SceneSpec[];
  voiceover:     string;     // full narration script
  captions:      string[];   // per-scene caption lines
  hashtags:      string[];
}

export interface SceneSpec {
  index:         number;
  prompt:        string;    // Kling AI text-to-video prompt
  duration:      number;    // target seconds (3-5)
  caption:       string;
}

export interface VideoManifest {
  id:            string;
  title:         string;
  videoPath:     string;
  thumbnailPath: string;
  srtPath:       string;
  duration:      number;
  theme:         VideoTheme;
  producedAt:    string;
  gpuEncoded:    boolean;
  klingUsed:     boolean;
  elevenLabsUsed: boolean;
}

export interface VideoProductionResult {
  success:       boolean;
  videoPath?:    string;
  manifest?:     VideoManifest;
  error?:        string;
  durationSec?:  number;
}

// ── THEME SELECTION ────────────────────────────────────────────────────────────

function selectTheme(post: ScheduledPost): VideoTheme {
  if (post.tenantId === "bbmw0-games") return "games";
  const topic = (post.topic + " " + (post.caption ?? "")).toLowerCase();
  if (/motivat|mindset|grind|hustle|success/.test(topic)) return "motivational";
  if (/ai|tech|code|software|machine|neural/.test(topic))  return "tech";
  return "default";
}

// ── SCENE DECOMPOSITION ────────────────────────────────────────────────────────

function buildScenes(post: ScheduledPost, theme: VideoTheme): SceneSpec[] {
  // Use the videoScript if the orchestrator wrote one; otherwise synthesise from topic + caption
  const rawScript = post.videoScript ?? post.caption ?? post.topic;
  const lines     = rawScript
    .split(/[.\n]+/)
    .map(l => l.trim())
    .filter(l => l.length > 15)
    .slice(0, 6);   // max 6 scenes for a Short

  // If we have no usable lines, create 3 generic scenes
  const safeLines = lines.length >= 2 ? lines : [
    `Hook: ${post.topic}`,
    `Main: ${post.caption?.slice(0, 120) ?? post.topic}`,
    `CTA: Follow for more`,
  ];

  const themeModifiers: Record<VideoTheme, string> = {
    default:      "professional, cinematic, clean background",
    games:        "game UI overlay, neon glow, dynamic camera movement",
    tech:         "holographic displays, code rain, futuristic interface",
    motivational: "epic sunrise, slow-motion, high contrast, energetic",
  };

  return safeLines.map((line, i) => ({
    index:    i,
    prompt:   `${line}. ${themeModifiers[theme]}. 9:16 vertical, 1080x1920, cinematic.`,
    duration: i === 0 ? 3 : 5,   // hook scene shorter
    caption:  line,
  }));
}

// ── CONTENT PACKAGE BUILDER ────────────────────────────────────────────────────

function buildContentPackage(post: ScheduledPost): ContentPackage {
  const theme  = selectTheme(post);
  const scenes = buildScenes(post, theme);

  // Hook: first punchy line from caption, or the topic itself
  const hook = (() => {
    const firstLine = (post.caption ?? post.topic).split(/[.\n]/)[0].trim();
    return firstLine.length > 10 ? firstLine : post.topic;
  })();

  // Voiceover: full narration from videoScript or synthetic fallback
  const voiceover = post.videoScript
    ?? `${post.topic}. ${post.caption ?? ""}`.trim().slice(0, 500);

  return {
    id:        post.postId,
    title:     post.title ?? post.topic,
    hook,
    platform:  post.platform,
    theme,
    tenantId:  post.tenantId,
    scenes,
    voiceover,
    captions:  scenes.map(s => s.caption),
    hashtags:  post.hashtags ?? [],
  };
}

// ── PYTHON INVOCATION ─────────────────────────────────────────────────────────

export class VideoProductionAgent {

  async produce(post: ScheduledPost, dryRun = false): Promise<VideoProductionResult> {
    const pkg = buildContentPackage(post);

    // Write content package to a temp JSON file
    const tmpDir  = path.join(path.dirname(PRODUCE_SCRIPT), "..", "results", "video-tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    const pkgPath = path.join(tmpDir, `${pkg.id}-package.json`);
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    const args = [
      PRODUCE_SCRIPT,
      "--input",  pkgPath,
      "--output", OUTPUT_FOLDER,
      ...(dryRun ? ["--dry-run"] : []),
    ];

    console.log(`[VideoAgent] Producing video for: ${pkg.title} (theme: ${pkg.theme})`);

    try {
      const stdout = cp.execFileSync(PYTHON_CMD, args, {
        encoding: "utf8",
        timeout:  TIMEOUT_MS,
        env:      { ...process.env },
      });

      // produce-video.py writes a manifest path on the last line
      const lines      = stdout.trim().split("\n");
      const manifestLine = lines.find(l => l.startsWith("MANIFEST:"));
      if (!manifestLine) {
        return { success: false, error: `No MANIFEST: line in output.\n${stdout.slice(-500)}` };
      }

      const manifestPath = manifestLine.replace("MANIFEST:", "").trim();
      if (!fs.existsSync(manifestPath)) {
        return { success: false, error: `Manifest file not found at ${manifestPath}` };
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as VideoManifest;

      console.log(`[VideoAgent] Done: ${manifest.videoPath} (${manifest.duration}s)`);
      return {
        success:     true,
        videoPath:   manifest.videoPath,
        manifest,
        durationSec: manifest.duration,
      };

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // execFileSync throws with stderr in the message on non-zero exit
      return { success: false, error: msg.slice(0, 1000) };
    } finally {
      // Clean up temp package file
      try { fs.unlinkSync(pkgPath); } catch { /* ok */ }
    }
  }

  /** Produce videos for a batch of posts, sequentially (Kling API has rate limits). */
  async produceBatch(
    posts: ScheduledPost[],
    dryRun = false
  ): Promise<Map<string, VideoProductionResult>> {
    const results = new Map<string, VideoProductionResult>();
    for (const post of posts) {
      results.set(post.postId, await this.produce(post, dryRun));
    }
    return results;
  }
}

export const videoProductionAgent = new VideoProductionAgent();
export default videoProductionAgent;
