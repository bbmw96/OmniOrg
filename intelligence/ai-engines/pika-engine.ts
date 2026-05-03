// Created by BBMW0 Technologies | bbmw0.com
/**
 * PIKA+ ENGINE
 *
 * OmniOrg-native Pika Art video generation engine.
 * Replaces: pika.art subscriptions with owned API access.
 *
 * Capabilities:
 *   - Text-to-video generation via Pika Art API
 *   - Async submit - poll - download pattern
 *   - Configurable aspect ratio, duration, and frame rate
 *   - Islamic compliance: prompt filtering blocks human/animal depictions
 *
 * Auth: Authorization: Bearer {PIKA_API_KEY}
 * Base URL: https://api.pika.art/v1
 */

import { proxyFetch } from "../../core/proxy-fetch";
import { config as loadEnv } from "dotenv";
import path from "path";
import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY  = process.env.PIKA_API_KEY ?? "";
const BASE_URL = "https://api.pika.art/v1";
const OUT_DIR  = path.resolve(__dirname, "../../output/pika");

mkdirSync(OUT_DIR, { recursive: true });

// ── Types ─────────────────────────────────────────────────────────────────────

export type PikaStatus = "pending" | "processing" | "completed" | "failed";

export interface PikaRequest {
  prompt:          string;
  negativePrompt?: string;
  aspectRatio?:    "16:9" | "9:16" | "1:1";
  duration?:       number;
  frameRate?:      24 | 30;
  style?:          string;
}

export interface PikaResult {
  jobId:      string;
  status:     PikaStatus;
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
        `[Pika+] Islamic tasweer policy: prompt contains "${term}". ` +
        "Remove all references to living beings (humans, animals, faces)."
      );
    }
  }
}

// ── API helpers ───────────────────────────────────────────────────────────────

function headers(): Record<string, string> {
  if (!API_KEY) {
    throw new Error("[Pika+] PIKA_API_KEY must be set in .env");
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
  if (!resp.ok) throw new Error(`[Pika+] POST ${urlPath} failed: ${resp.status} ${await resp.text()}`);
  return resp.json() as Promise<T>;
}

async function get<T>(urlPath: string): Promise<T> {
  const resp = await proxyFetch(`${BASE_URL}/${urlPath.replace(/^\//, "")}`, { headers: headers() });
  if (!resp.ok) throw new Error(`[Pika+] GET ${urlPath} failed: ${resp.status} ${await resp.text()}`);
  return resp.json() as Promise<T>;
}

// ── Job submission ────────────────────────────────────────────────────────────

/**
 * Submit a video generation job to Pika.
 * Islamic policy is enforced on the prompt before submission.
 * Returns the job id for polling.
 */
export async function submitVideo(req: PikaRequest): Promise<string> {
  enforceIslamicPolicy(req.prompt);

  const body: Record<string, unknown> = {
    prompt:          req.prompt,
    negative_prompt: req.negativePrompt ?? "faces, humans, animals, living beings",
    options: {
      aspectRatio: req.aspectRatio ?? "16:9",
      duration:    req.duration    ?? 4,
      frameRate:   req.frameRate   ?? 24,
    },
  };

  if (req.style) {
    (body["options"] as Record<string, unknown>)["style"] = req.style;
  }

  const data = await post<{ job?: { id?: string }; id?: string }>("/generate", body);
  const jobId = data.job?.id ?? data.id;
  if (!jobId) throw new Error("[Pika+] No job id in response: " + JSON.stringify(data));

  console.log(`[Pika+] Job submitted: ${jobId}`);
  return jobId;
}

// ── Polling ───────────────────────────────────────────────────────────────────

/**
 * Poll a job until completed, failed, or timeout.
 */
export async function pollJob(
  jobId: string,
  opts?: { intervalMs?: number; timeoutMs?: number },
): Promise<PikaResult> {
  const interval = opts?.intervalMs ?? 6_000;
  const timeout  = opts?.timeoutMs  ?? 15 * 60 * 1_000;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    type JobResp = {
      status:     PikaStatus;
      video_url?: string;
      url?:       string;
      error?:     string;
    };
    const data = await get<JobResp>(`/jobs/${jobId}`);

    if (data.status === "completed") {
      return {
        jobId,
        status:   "completed",
        videoUrl: data.video_url ?? data.url,
      };
    }

    if (data.status === "failed") {
      throw new Error(`[Pika+] Job ${jobId} failed${data.error ? ": " + data.error : ""}`);
    }

    console.log(`[Pika+] Job ${jobId} - ${data.status} - waiting...`);
    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error(`[Pika+] Job ${jobId} timed out after ${timeout / 1000}s`);
}

// ── Download ──────────────────────────────────────────────────────────────────

/**
 * Download a completed video to local disk.
 * Returns the local file path.
 */
export async function downloadVideo(result: PikaResult): Promise<string> {
  if (!result.videoUrl) throw new Error("[Pika+] No videoUrl to download");

  const filename = `pika-${result.jobId}-${Date.now()}.mp4`;
  const outPath  = path.join(OUT_DIR, filename);

  const resp = await proxyFetch(result.videoUrl);
  if (!resp.ok || !resp.body) throw new Error(`[Pika+] Download failed: ${resp.status}`);

  await pipeline(
    resp.body as unknown as NodeJS.ReadableStream,
    createWriteStream(outPath)
  );

  console.log(`[Pika+] Downloaded: ${outPath}`);
  return outPath;
}

// ── High-level helper ─────────────────────────────────────────────────────────

/**
 * One-shot: submit, poll, download, return local path.
 *
 * Usage:
 *   const mp4 = await generateVideo({
 *     prompt:      "Time-lapse of clouds moving over desert dunes",
 *     aspectRatio: "16:9",
 *     duration:    4,
 *   });
 */
export async function generateVideo(req: PikaRequest): Promise<string> {
  const jobId  = await submitVideo(req);
  const result = await pollJob(jobId);
  result.localPath = await downloadVideo(result);
  return result.localPath;
}

export { OUT_DIR as PIKA_OUTPUT_DIR };
