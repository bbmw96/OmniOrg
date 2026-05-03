// Created by BBMW0 Technologies | bbmw0.com
/**
 * RUNWAY+ ENGINE
 *
 * OmniOrg-native Runway ML Gen-4 video generation engine.
 * Replaces: runwayml.com subscriptions with owned API access.
 *
 * Capabilities:
 *   - Gen-4 Turbo text-to-video generation
 *   - Async submit - poll - download pattern
 *   - Webhook support
 *   - Islamic compliance: prompt filtering blocks human/animal depictions
 *
 * Auth: Authorization: Bearer {RUNWAY_API_KEY}
 * Base URL: https://api.runwayml.com/v1
 */

import { proxyFetch } from "../../core/proxy-fetch";
import { config as loadEnv } from "dotenv";
import path from "path";
import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY  = process.env.RUNWAY_API_KEY ?? "";
const BASE_URL = "https://api.runwayml.com/v1";
const OUT_DIR  = path.resolve(__dirname, "../../output/runway");

mkdirSync(OUT_DIR, { recursive: true });

// ── Types ─────────────────────────────────────────────────────────────────────

export type RunwayStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface RunwayRequest {
  promptText:    string;
  promptImage?:  string;
  model?:        string;
  duration?:     5 | 10;
  ratio?:        "1280:768" | "768:1280" | "1104:832";
  webhookUrl?:   string;
}

export interface RunwayResult {
  taskId:     string;
  status:     RunwayStatus;
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
        `[Runway+] Islamic tasweer policy: prompt contains "${term}". ` +
        "Remove all references to living beings (humans, animals, faces)."
      );
    }
  }
}

// ── API helpers ───────────────────────────────────────────────────────────────

function headers(): Record<string, string> {
  if (!API_KEY) {
    throw new Error("[Runway+] RUNWAY_API_KEY must be set in .env");
  }
  return {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type":  "application/json",
    "X-Runway-Version": "2024-11-06",
  };
}

async function post<T>(urlPath: string, body: unknown): Promise<T> {
  const url  = `${BASE_URL}/${urlPath.replace(/^\//, "")}`;
  const resp = await proxyFetch(url, {
    method:  "POST",
    headers: headers(),
    body:    JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`[Runway+] POST ${urlPath} failed: ${resp.status} ${await resp.text()}`);
  return resp.json() as Promise<T>;
}

async function get<T>(urlPath: string): Promise<T> {
  const resp = await proxyFetch(`${BASE_URL}/${urlPath.replace(/^\//, "")}`, { headers: headers() });
  if (!resp.ok) throw new Error(`[Runway+] GET ${urlPath} failed: ${resp.status} ${await resp.text()}`);
  return resp.json() as Promise<T>;
}

// ── Job submission ────────────────────────────────────────────────────────────

/**
 * Submit a Gen-4 Turbo generation task.
 * Islamic policy is enforced on promptText before submission.
 * Returns task_id for polling.
 */
export async function submitGeneration(req: RunwayRequest): Promise<string> {
  enforceIslamicPolicy(req.promptText);

  const body: Record<string, unknown> = {
    taskType: "gen4_turbo",
    internal: {},
    options: {
      promptText:   req.promptText,
      duration:     req.duration   ?? 5,
      ratio:        req.ratio      ?? "1280:768",
      seed:         Math.floor(Math.random() * 2_147_483_647),
    },
  };

  if (req.promptImage) {
    (body["options"] as Record<string, unknown>)["promptImage"] = req.promptImage;
  }
  if (req.model) {
    body["model"] = req.model;
  }
  if (req.webhookUrl) {
    body["webhookUrl"] = req.webhookUrl;
  }

  const data = await post<{ id?: string; task_id?: string }>("/tasks", body);
  const taskId = data.id ?? data.task_id;
  if (!taskId) throw new Error("[Runway+] No task id in response: " + JSON.stringify(data));

  console.log(`[Runway+] Task submitted: ${taskId}`);
  return taskId;
}

// ── Polling ───────────────────────────────────────────────────────────────────

/**
 * Poll a task until SUCCEEDED, FAILED, or timeout.
 */
export async function pollTask(
  taskId: string,
  opts?: { intervalMs?: number; timeoutMs?: number },
): Promise<RunwayResult> {
  const interval = opts?.intervalMs ?? 6_000;
  const timeout  = opts?.timeoutMs  ?? 15 * 60 * 1_000;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    type TaskResp = {
      status:   RunwayStatus;
      output?:  Array<{ url: string }>;
      error?:   string;
    };
    const data = await get<TaskResp>(`/tasks/${taskId}`);

    if (data.status === "SUCCEEDED") {
      return {
        taskId,
        status:   "SUCCEEDED",
        videoUrl: data.output?.[0]?.url,
      };
    }

    if (data.status === "FAILED" || data.status === "CANCELLED") {
      throw new Error(`[Runway+] Task ${taskId} ended with status: ${data.status}${data.error ? " - " + data.error : ""}`);
    }

    console.log(`[Runway+] Task ${taskId} - ${data.status} - waiting...`);
    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error(`[Runway+] Task ${taskId} timed out after ${timeout / 1000}s`);
}

// ── Download ──────────────────────────────────────────────────────────────────

/**
 * Download a completed video to local disk.
 * Returns the local file path.
 */
export async function downloadVideo(result: RunwayResult): Promise<string> {
  if (!result.videoUrl) throw new Error("[Runway+] No videoUrl to download");

  const filename = `runway-${result.taskId}-${Date.now()}.mp4`;
  const outPath  = path.join(OUT_DIR, filename);

  const resp = await proxyFetch(result.videoUrl);
  if (!resp.ok || !resp.body) throw new Error(`[Runway+] Download failed: ${resp.status}`);

  await pipeline(
    resp.body as unknown as NodeJS.ReadableStream,
    createWriteStream(outPath)
  );

  console.log(`[Runway+] Downloaded: ${outPath}`);
  return outPath;
}

// ── High-level helper ─────────────────────────────────────────────────────────

/**
 * One-shot: submit, poll, download, return local path.
 *
 * Usage:
 *   const mp4 = await generateVideo({
 *     promptText: "Aerial drone shot over mountain peaks at golden hour",
 *     duration:   5,
 *     ratio:      "1280:768",
 *   });
 */
export async function generateVideo(req: RunwayRequest): Promise<string> {
  const taskId = await submitGeneration(req);
  const result = await pollTask(taskId);
  result.localPath = await downloadVideo(result);
  return result.localPath;
}

export { OUT_DIR as RUNWAY_OUTPUT_DIR };
