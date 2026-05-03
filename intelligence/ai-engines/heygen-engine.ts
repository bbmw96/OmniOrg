// Created by BBMW0 Technologies | bbmw0.com
/**
 * HEYGEN+ ENGINE
 *
 * OmniOrg-native HeyGen video generation engine.
 * Replaces: heygen.com ($29-$89+/mo) with full code ownership.
 *
 * Capabilities:
 *   - Avatar video creation (talking head + background)
 *   - Text-to-video prompt-driven generation (agent mode)
 *   - Voice synthesis selection (list + pick from HeyGen voice library)
 *   - Async submit -> poll -> download pattern
 *   - Islamic compliance: NO face/avatar generation by default (use text mode)
 *   - Webhook support for long-running renders
 *
 * Auth: X-Api-Key header (HEYGEN_API_KEY env var)
 * Base URL: https://api.heygen.com
 *
 * NOTE: Avatar mode (real human faces) violates Islamic tasweer rules.
 *   Use agent/prompt mode (text animations, kinetic typography, motion graphics only).
 *   enforceIslamicPolicy() blocks avatar requests at the engine level.
 */

import { proxyFetch } from "../../core/proxy-fetch";
import { config as loadEnv } from "dotenv";
import path from "path";
import { createWriteStream } from "fs";
import { mkdirSync } from "fs";
import { pipeline } from "stream/promises";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY  = process.env.HEYGEN_API_KEY ?? "";
const BASE_URL = "https://api.heygen.com";
const OUT_DIR  = path.resolve(__dirname, "../../output/heygen");

mkdirSync(OUT_DIR, { recursive: true });

// ── Types ─────────────────────────────────────────────────────────────────────

export type HeyGenResolution = "360p" | "480p" | "720p" | "1080p";
export type HeyGenAspectRatio = "16:9" | "9:16" | "1:1";
export type HeyGenVideoStatus = "pending" | "processing" | "completed" | "failed";

export interface HeyGenTextVideoRequest {
  prompt:        string;               // Free-text prompt for agent mode (no avatar)
  resolution?:   HeyGenResolution;
  aspectRatio?:  HeyGenAspectRatio;
  webhookUrl?:   string;              // Optional: receive completion callback
}

export interface HeyGenVideoResult {
  videoId:       string;
  status:        HeyGenVideoStatus;
  videoUrl?:     string;             // Available when status === "completed"
  thumbnailUrl?: string;
  duration?:     number;             // Seconds
  localPath?:    string;             // Set after download
  createdAt:     string;
}

export interface HeyGenVoice {
  voiceId:     string;
  name:        string;
  language:    string;
  gender:      string;
  previewUrl?: string;
}

// ── Islamic policy enforcement ────────────────────────────────────────────────

/**
 * Blocks avatar/face-based video generation.
 * Throws if the request would produce living-being imagery (tasweer prohibition).
 */
function enforceIslamicPolicy(hasAvatarId: boolean): void {
  if (hasAvatarId) {
    throw new Error(
      "[HeyGen+] Islamic tasweer policy: avatar_id requests are blocked. " +
      "Use prompt-based text/motion generation only (no human faces or figures)."
    );
  }
}

// ── API helpers ───────────────────────────────────────────────────────────────

function heygenHeaders(): Record<string, string> {
  if (!API_KEY) throw new Error("[HeyGen+] HEYGEN_API_KEY not set in .env");
  return {
    "X-Api-Key":    API_KEY,
    "Content-Type": "application/json",
  };
}

async function heygenGet<T>(path: string): Promise<T> {
  const resp = await proxyFetch(`${BASE_URL}${path}`, {
    headers: heygenHeaders(),
  });
  if (!resp.ok) throw new Error(`[HeyGen+] GET ${path} failed: ${resp.status} ${await resp.text()}`);
  return resp.json() as Promise<T>;
}

async function heygenPost<T>(path: string, body: unknown): Promise<T> {
  const resp = await proxyFetch(`${BASE_URL}${path}`, {
    method:  "POST",
    headers: heygenHeaders(),
    body:    JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`[HeyGen+] POST ${path} failed: ${resp.status} ${await resp.text()}`);
  return resp.json() as Promise<T>;
}

// ── Core API operations ───────────────────────────────────────────────────────

/**
 * Create a text/prompt-driven video (no avatar, Islamic-compliant).
 * Returns videoId immediately - call pollVideo() to wait for completion.
 */
export async function createTextVideo(req: HeyGenTextVideoRequest): Promise<string> {
  enforceIslamicPolicy(false);

  const body = {
    prompt:       req.prompt,
    resolution:   req.resolution ?? "720p",
    aspect_ratio: req.aspectRatio ?? "16:9",
    ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
  };

  const data = await heygenPost<{ data?: { video_id?: string }; video_id?: string }>(
    "/v3/video-agents",
    body
  );

  const videoId = data?.data?.video_id ?? (data as { video_id?: string }).video_id;
  if (!videoId) throw new Error("[HeyGen+] No video_id in response: " + JSON.stringify(data));

  console.log(`[HeyGen+] Video job submitted: ${videoId}`);
  return videoId;
}

/**
 * Poll a video until completed, failed, or timeout reached.
 * Returns the full result including download URL.
 */
export async function pollVideo(
  videoId: string,
  opts?: { intervalMs?: number; timeoutMs?: number },
): Promise<HeyGenVideoResult> {
  const interval = opts?.intervalMs ?? 5_000;
  const timeout  = opts?.timeoutMs  ?? 10 * 60 * 1_000;   // 10 minutes default
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    type VideoData = {
      status: HeyGenVideoStatus;
      video_url?: string;
      thumbnail_url?: string;
      duration?: number;
      created_at?: string;
    };
    type StatusResp = { data?: VideoData };
    const resp = await heygenGet<StatusResp>(`/v3/videos/${videoId}`);
    const data: VideoData | undefined = resp.data;

    if (data?.status === "completed") {
      return {
        videoId,
        status:       "completed",
        videoUrl:     data.video_url,
        thumbnailUrl: data.thumbnail_url,
        duration:     data.duration,
        createdAt:    data.created_at ?? new Date().toISOString(),
      };
    }

    if (data?.status === "failed") {
      throw new Error(`[HeyGen+] Video ${videoId} failed during render.`);
    }

    console.log(`[HeyGen+] Video ${videoId} status: ${data?.status ?? "unknown"} - waiting...`);
    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error(`[HeyGen+] Video ${videoId} timed out after ${timeout / 1000}s`);
}

/**
 * Download a completed video to local disk.
 * Returns the local file path.
 */
export async function downloadVideo(result: HeyGenVideoResult): Promise<string> {
  if (!result.videoUrl) throw new Error("[HeyGen+] No videoUrl to download");

  const filename = `heygen-${result.videoId}-${Date.now()}.mp4`;
  const outPath  = path.join(OUT_DIR, filename);

  const resp = await proxyFetch(result.videoUrl);
  if (!resp.ok || !resp.body) throw new Error(`[HeyGen+] Download failed: ${resp.status}`);

  await pipeline(
    resp.body as unknown as NodeJS.ReadableStream,
    createWriteStream(outPath)
  );

  console.log(`[HeyGen+] Downloaded: ${outPath}`);
  return outPath;
}

/**
 * List available voices for reference.
 */
export async function listVoices(languageFilter?: string): Promise<HeyGenVoice[]> {
  type VoiceResp = { data?: { voices?: Array<{ voice_id: string; name: string; language: string; gender: string; preview_audio?: string }> } };
  const resp = await heygenGet<VoiceResp>("/v3/voices");
  const voices = resp.data?.voices ?? [];
  return voices
    .filter(v => !languageFilter || v.language.toLowerCase().includes(languageFilter.toLowerCase()))
    .map(v => ({
      voiceId:    v.voice_id,
      name:       v.name,
      language:   v.language,
      gender:     v.gender,
      previewUrl: v.preview_audio,
    }));
}

// ── High-level helper ─────────────────────────────────────────────────────────

/**
 * One-shot: submit prompt, wait for completion, download, return local path.
 * Islamic policy enforced (no avatar mode).
 *
 * Usage:
 *   const mp4 = await generateVideo({
 *     prompt: "Explain the 5 pillars of Islam with kinetic typography",
 *     resolution: "1080p",
 *   });
 */
export async function generateVideo(req: HeyGenTextVideoRequest): Promise<string> {
  const videoId = await createTextVideo(req);
  const result  = await pollVideo(videoId);
  return downloadVideo(result);
}

export { OUT_DIR as HEYGEN_OUTPUT_DIR };
