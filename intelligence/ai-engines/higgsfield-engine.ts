// Created by BBMW0 Technologies | bbmw0.com
/**
 * HIGGSFIELD+ ENGINE
 *
 * OmniOrg-native Higgsfield AI video generation engine.
 * Replaces: platform.higgsfield.ai subscriptions with owned API access.
 *
 * Capabilities:
 *   - Access to 100+ video AI models via one API (Kling, Wan, Higgsfield native, etc.)
 *   - Text-to-video and image-to-video generation
 *   - Async submit -> poll -> download pattern
 *   - Webhook support (append ?hf_webhook=url on submit)
 *   - Job cancellation (queued jobs only)
 *   - Islamic compliance: prompt filtering blocks human/animal depictions
 *
 * Auth: Authorization: Key {api_key}:{api_key_secret}
 * Base URL: https://platform.higgsfield.ai
 *
 * Model slugs (examples - full list at platform.higgsfield.ai/models):
 *   higgsfield-ai/dop/standard        - cinematic motion
 *   kling-video/v2.1/pro/text-to-video
 *   kling-video/v2.1/pro/image-to-video
 *   wan/2.1/t2v-turbo
 *   wan/2.1/i2v-turbo
 *   minimax/video-01
 *   runway/gen-4/turbo
 */

import { proxyFetch } from "../../core/proxy-fetch";
import { config as loadEnv } from "dotenv";
import path from "path";
import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY    = process.env.HIGGSFIELD_API_KEY    ?? "";
const API_SECRET = process.env.HIGGSFIELD_API_SECRET ?? "";
const BASE_URL   = "https://platform.higgsfield.ai";
const OUT_DIR    = path.resolve(__dirname, "../../output/higgsfield");

mkdirSync(OUT_DIR, { recursive: true });

// ── Types ─────────────────────────────────────────────────────────────────────

export type HiggsfieldStatus = "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "cancelled";

export interface HiggsfieldTextToVideoRequest {
  modelId:       string;    // e.g. "kling-video/v2.1/pro/text-to-video"
  prompt:        string;
  negativePrompt?: string;
  duration?:     number;   // Seconds (model-dependent max)
  aspectRatio?:  string;   // "16:9" | "9:16" | "1:1"
  fps?:          number;
  webhookUrl?:   string;
  extra?:        Record<string, unknown>;  // Model-specific params
}

export interface HiggsfieldImageToVideoRequest {
  modelId:       string;   // e.g. "kling-video/v2.1/pro/image-to-video"
  imageUrl:      string;   // Starting frame image URL
  prompt?:       string;
  duration?:     number;
  aspectRatio?:  string;
  fps?:          number;
  webhookUrl?:   string;
  extra?:        Record<string, unknown>;
}

export interface HiggsfieldJobResult {
  requestId:   string;
  status:      HiggsfieldStatus;
  videoUrl?:   string;
  thumbnailUrl?: string;
  duration?:   number;
  localPath?:  string;
}

// ── Islamic policy enforcement ────────────────────────────────────────────────

const FORBIDDEN_VISUAL_TERMS = [
  "face", "faces", "person", "people", "human", "man", "woman", "boy", "girl",
  "animal", "dog", "cat", "bird", "anime", "cartoon character", "avatar",
  "portrait", "selfie", "figure",
];

/**
 * Scans the prompt for forbidden visual terms (tasweer compliance).
 * Throws on any match.
 */
function enforceIslamicPolicy(prompt: string): void {
  const lower = prompt.toLowerCase();
  for (const term of FORBIDDEN_VISUAL_TERMS) {
    if (lower.includes(term)) {
      throw new Error(
        `[Higgsfield+] Islamic tasweer policy: prompt contains "${term}". ` +
        "Remove all references to living beings (humans, animals, faces)."
      );
    }
  }
}

// ── API helpers ───────────────────────────────────────────────────────────────

function authHeader(): string {
  if (!API_KEY || !API_SECRET) {
    throw new Error("[Higgsfield+] HIGGSFIELD_API_KEY and HIGGSFIELD_API_SECRET must be set in .env");
  }
  return `Key ${API_KEY}:${API_SECRET}`;
}

function headers(): Record<string, string> {
  return {
    "Authorization": authHeader(),
    "Content-Type":  "application/json",
  };
}

async function post<T>(urlPath: string, body: unknown, webhookUrl?: string): Promise<T> {
  const url  = `${BASE_URL}/${urlPath.replace(/^\//, "")}${webhookUrl ? `?hf_webhook=${encodeURIComponent(webhookUrl)}` : ""}`;
  const resp = await proxyFetch(url, {
    method:  "POST",
    headers: headers(),
    body:    JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`[Higgsfield+] POST ${urlPath} failed: ${resp.status} ${await resp.text()}`);
  return resp.json() as Promise<T>;
}

async function get<T>(urlPath: string): Promise<T> {
  const resp = await proxyFetch(`${BASE_URL}/${urlPath.replace(/^\//, "")}`, { headers: headers() });
  if (!resp.ok) throw new Error(`[Higgsfield+] GET ${urlPath} failed: ${resp.status} ${await resp.text()}`);
  return resp.json() as Promise<T>;
}

// ── Job submission ────────────────────────────────────────────────────────────

/**
 * Submit a text-to-video job.
 * Islamic policy is enforced on the prompt before submission.
 * Returns the request_id for polling.
 */
export async function submitTextToVideo(req: HiggsfieldTextToVideoRequest): Promise<string> {
  enforceIslamicPolicy(req.prompt);

  const body = {
    prompt:          req.prompt,
    negative_prompt: req.negativePrompt ?? "faces, humans, animals, living beings",
    duration:        req.duration ?? 5,
    aspect_ratio:    req.aspectRatio ?? "16:9",
    fps:             req.fps ?? 24,
    ...req.extra,
  };

  const data = await post<{ request_id?: string; id?: string }>(
    req.modelId,
    body,
    req.webhookUrl,
  );

  const requestId = data.request_id ?? data.id;
  if (!requestId) throw new Error("[Higgsfield+] No request_id in response: " + JSON.stringify(data));

  console.log(`[Higgsfield+] Job submitted: ${requestId} (model: ${req.modelId})`);
  return requestId;
}

/**
 * Submit an image-to-video job.
 * Returns the request_id for polling.
 */
export async function submitImageToVideo(req: HiggsfieldImageToVideoRequest): Promise<string> {
  if (req.prompt) enforceIslamicPolicy(req.prompt);

  const body = {
    image_url:       req.imageUrl,
    prompt:          req.prompt ?? "",
    negative_prompt: "faces, humans, animals, living beings",
    duration:        req.duration ?? 5,
    aspect_ratio:    req.aspectRatio ?? "16:9",
    fps:             req.fps ?? 24,
    ...req.extra,
  };

  const data = await post<{ request_id?: string; id?: string }>(
    req.modelId,
    body,
    req.webhookUrl,
  );

  const requestId = data.request_id ?? data.id;
  if (!requestId) throw new Error("[Higgsfield+] No request_id in response: " + JSON.stringify(data));

  console.log(`[Higgsfield+] Image-to-video job submitted: ${requestId}`);
  return requestId;
}

// ── Polling ───────────────────────────────────────────────────────────────────

/**
 * Poll a job until completed, failed, or timeout.
 */
export async function pollJob(
  requestId: string,
  opts?: { intervalMs?: number; timeoutMs?: number },
): Promise<HiggsfieldJobResult> {
  const interval = opts?.intervalMs ?? 6_000;
  const timeout  = opts?.timeoutMs  ?? 15 * 60 * 1_000;   // 15 minutes
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    type StatusResp = {
      status:      HiggsfieldStatus;
      video_url?:  string;
      thumbnail?:  string;
      duration?:   number;
    };
    const data = await get<StatusResp>(`/requests/${requestId}/status`);

    if (data.status === "completed") {
      return {
        requestId,
        status:       "completed",
        videoUrl:     data.video_url,
        thumbnailUrl: data.thumbnail,
        duration:     data.duration,
      };
    }

    if (data.status === "failed" || data.status === "nsfw") {
      throw new Error(`[Higgsfield+] Job ${requestId} ended with status: ${data.status}`);
    }

    console.log(`[Higgsfield+] Job ${requestId} - ${data.status} - waiting...`);
    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error(`[Higgsfield+] Job ${requestId} timed out after ${timeout / 1000}s`);
}

/**
 * Cancel a queued job (cannot cancel in-progress jobs).
 */
export async function cancelJob(requestId: string): Promise<void> {
  await post(`/requests/${requestId}/cancel`, {});
  console.log(`[Higgsfield+] Job ${requestId} cancelled.`);
}

// ── Download ──────────────────────────────────────────────────────────────────

/**
 * Download a completed video to local disk.
 */
export async function downloadJob(result: HiggsfieldJobResult): Promise<string> {
  if (!result.videoUrl) throw new Error("[Higgsfield+] No videoUrl to download");

  const filename = `higgsfield-${result.requestId}-${Date.now()}.mp4`;
  const outPath  = path.join(OUT_DIR, filename);

  const resp = await proxyFetch(result.videoUrl);
  if (!resp.ok || !resp.body) throw new Error(`[Higgsfield+] Download failed: ${resp.status}`);

  await pipeline(
    resp.body as unknown as NodeJS.ReadableStream,
    createWriteStream(outPath)
  );

  console.log(`[Higgsfield+] Downloaded: ${outPath}`);
  return outPath;
}

// ── High-level helper ─────────────────────────────────────────────────────────

/**
 * One-shot text-to-video: submit, wait, download, return local path.
 *
 * Usage:
 *   const mp4 = await generateTextVideo({
 *     modelId:     "kling-video/v2.1/pro/text-to-video",
 *     prompt:      "Aerial drone shot over mountain peaks at golden hour",
 *     aspectRatio: "9:16",
 *     duration:    8,
 *   });
 */
export async function generateTextVideo(req: HiggsfieldTextToVideoRequest): Promise<string> {
  const requestId = await submitTextToVideo(req);
  const result    = await pollJob(requestId);
  return downloadJob(result);
}

/**
 * One-shot image-to-video: submit, wait, download, return local path.
 */
export async function generateImageVideo(req: HiggsfieldImageToVideoRequest): Promise<string> {
  const requestId = await submitImageToVideo(req);
  const result    = await pollJob(requestId);
  return downloadJob(result);
}

export { OUT_DIR as HIGGSFIELD_OUTPUT_DIR };
