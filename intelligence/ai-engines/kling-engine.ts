// Created by BBMW0 Technologies | bbmw0.com
/**
 * KLING+ ENGINE (Direct API)
 *
 * OmniOrg-native Kling AI video generation engine - direct API access.
 * Replaces: klingai.com subscriptions with owned API access.
 * Note: This connects directly to api.klingai.com, separate from the
 *       Higgsfield-proxied Kling route.
 *
 * Capabilities:
 *   - Text-to-video (Kling v2 Master, v1.5)
 *   - Image-to-video
 *   - Standard and Pro quality modes
 *   - Async submit - poll - download pattern
 *   - Islamic compliance: prompt filtering blocks human/animal depictions
 *
 * Auth: Authorization: Bearer {KLING_API_KEY}
 * Base URL: https://api.klingai.com/v1
 */

import { proxyFetch } from "../../core/proxy-fetch";
import { config as loadEnv } from "dotenv";
import path from "path";
import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY  = process.env.KLING_API_KEY ?? "";
const BASE_URL = "https://api.klingai.com/v1";
const OUT_DIR  = path.resolve(__dirname, "../../output/kling");

mkdirSync(OUT_DIR, { recursive: true });

// ── Types ─────────────────────────────────────────────────────────────────────

export type KlingStatus = "submitted" | "processing" | "succeed" | "failed";

export interface KlingT2VRequest {
  prompt:          string;
  negativePrompt?: string;
  model?:          "kling-v2-master" | "kling-v1-5";
  mode?:           "std" | "pro";
  duration?:       "5" | "10";
  aspectRatio?:    "16:9" | "9:16" | "1:1";
}

export interface KlingI2VRequest {
  imageUrl:   string;
  prompt?:    string;
  model?:     string;
  duration?:  "5" | "10";
}

export interface KlingResult {
  taskId:     string;
  status:     KlingStatus;
  videoUrl?:  string;
  localPath?: string;
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
        `[Kling+] Islamic tasweer policy: prompt contains "${term}". ` +
        "Remove all references to living beings (humans, animals, faces)."
      );
    }
  }
}

// ── API helpers ───────────────────────────────────────────────────────────────

function headers(): Record<string, string> {
  if (!API_KEY) {
    throw new Error("[Kling+] KLING_API_KEY must be set in .env");
  }
  return {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type":  "application/json",
  };
}

async function post<T>(urlPath: string, body: unknown): Promise<T> {
  const url  = `${BASE_URL}/${urlPath.replace(/^\//, "")}`;
  const resp = await proxyFetch(url, {
    method:  "POST",
    headers: headers(),
    body:    JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`[Kling+] POST ${urlPath} failed: ${resp.status} ${await resp.text()}`);
  return resp.json() as Promise<T>;
}

async function get<T>(urlPath: string): Promise<T> {
  const resp = await proxyFetch(`${BASE_URL}/${urlPath.replace(/^\//, "")}`, { headers: headers() });
  if (!resp.ok) throw new Error(`[Kling+] GET ${urlPath} failed: ${resp.status} ${await resp.text()}`);
  return resp.json() as Promise<T>;
}

// ── Job submission ────────────────────────────────────────────────────────────

/**
 * Submit a text-to-video task to Kling.
 * Islamic policy is enforced on the prompt before submission.
 * Returns task_id for polling.
 */
export async function submitTextToVideo(req: KlingT2VRequest): Promise<string> {
  enforceIslamicPolicy(req.prompt);

  const body: Record<string, unknown> = {
    model_name:      req.model        ?? "kling-v2-master",
    mode:            req.mode         ?? "std",
    prompt:          req.prompt,
    negative_prompt: req.negativePrompt ?? "faces, humans, animals, living beings",
    cfg_scale:       0.5,
    duration:        req.duration     ?? "5",
    aspect_ratio:    req.aspectRatio  ?? "16:9",
  };

  const data = await post<{ task_id?: string; id?: string; data?: { task_id?: string } }>(
    "/videos/text2video",
    body,
  );
  const taskId = data.task_id ?? data.id ?? data.data?.task_id;
  if (!taskId) throw new Error("[Kling+] No task_id in response: " + JSON.stringify(data));

  console.log(`[Kling+] Text-to-video task submitted: ${taskId}`);
  return taskId;
}

/**
 * Submit an image-to-video task to Kling.
 * Returns task_id for polling.
 */
export async function submitImageToVideo(req: KlingI2VRequest): Promise<string> {
  if (req.prompt) enforceIslamicPolicy(req.prompt);

  const body: Record<string, unknown> = {
    model_name:      req.model    ?? "kling-v2-master",
    image_url:       req.imageUrl,
    prompt:          req.prompt   ?? "",
    negative_prompt: "faces, humans, animals, living beings",
    cfg_scale:       0.5,
    duration:        req.duration ?? "5",
  };

  const data = await post<{ task_id?: string; id?: string; data?: { task_id?: string } }>(
    "/videos/image2video",
    body,
  );
  const taskId = data.task_id ?? data.id ?? data.data?.task_id;
  if (!taskId) throw new Error("[Kling+] No task_id in response: " + JSON.stringify(data));

  console.log(`[Kling+] Image-to-video task submitted: ${taskId}`);
  return taskId;
}

// ── Polling ───────────────────────────────────────────────────────────────────

/**
 * Poll a text-to-video task until succeed, failed, or timeout.
 */
export async function pollTask(
  taskId: string,
  opts?: { intervalMs?: number; timeoutMs?: number },
): Promise<KlingResult> {
  const interval = opts?.intervalMs ?? 6_000;
  const timeout  = opts?.timeoutMs  ?? 15 * 60 * 1_000;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    type TaskResp = {
      status?:  KlingStatus;
      data?: {
        status?:    KlingStatus;
        works?:     Array<{ video?: { url?: string } }>;
        video_url?: string;
      };
      error?: string;
    };
    const data = await get<TaskResp>(`/videos/text2video/${taskId}`);

    const status   = data.status ?? data.data?.status;
    const videoUrl = data.data?.works?.[0]?.video?.url ?? data.data?.video_url;

    if (status === "succeed") {
      return { taskId, status: "succeed", videoUrl };
    }

    if (status === "failed") {
      throw new Error(`[Kling+] Task ${taskId} failed${data.error ? ": " + data.error : ""}`);
    }

    console.log(`[Kling+] Task ${taskId} - ${status ?? "unknown"} - waiting...`);
    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error(`[Kling+] Task ${taskId} timed out after ${timeout / 1000}s`);
}

// ── Download ──────────────────────────────────────────────────────────────────

/**
 * Download a completed video to local disk.
 * Returns the local file path.
 */
export async function downloadVideo(result: KlingResult): Promise<string> {
  if (!result.videoUrl) throw new Error("[Kling+] No videoUrl to download");

  const filename = `kling-${result.taskId}-${Date.now()}.mp4`;
  const outPath  = path.join(OUT_DIR, filename);

  const resp = await proxyFetch(result.videoUrl);
  if (!resp.ok || !resp.body) throw new Error(`[Kling+] Download failed: ${resp.status}`);

  await pipeline(
    resp.body as unknown as NodeJS.ReadableStream,
    createWriteStream(outPath)
  );

  console.log(`[Kling+] Downloaded: ${outPath}`);
  return outPath;
}

// ── High-level helpers ────────────────────────────────────────────────────────

/**
 * One-shot text-to-video: submit, poll, download, return local path.
 *
 * Usage:
 *   const mp4 = await generateFromText({
 *     prompt:      "Sunset timelapse over sand dunes, cinematic 4K",
 *     model:       "kling-v2-master",
 *     mode:        "pro",
 *     duration:    "10",
 *     aspectRatio: "16:9",
 *   });
 */
export async function generateFromText(req: KlingT2VRequest): Promise<string> {
  const taskId = await submitTextToVideo(req);
  const result = await pollTask(taskId);
  result.localPath = await downloadVideo(result);
  return result.localPath;
}

/**
 * One-shot image-to-video: submit, poll, download, return local path.
 *
 * Usage:
 *   const mp4 = await generateFromImage({
 *     imageUrl: "https://example.com/landscape.jpg",
 *     prompt:   "Slow parallax pan, golden hour lighting",
 *     duration: "5",
 *   });
 */
export async function generateFromImage(req: KlingI2VRequest): Promise<string> {
  const taskId = await submitImageToVideo(req);
  const result = await pollTask(taskId);
  result.localPath = await downloadVideo(result);
  return result.localPath;
}

export { OUT_DIR as KLING_OUTPUT_DIR };
