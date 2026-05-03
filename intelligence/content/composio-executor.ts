// Created by BBMW0 Technologies | bbmw0.com
/**
 * COMPOSIO EXECUTOR
 *
 * Official @composio/core SDK wrapper for all OmniOrg Composio calls.
 *
 * Single user ID (user_6rlt9a) routes to all connected accounts:
 *   instagram_stays-moo, youtube_boris-stasis, youtube_crag-macies, etc.
 * Composio resolves the right OAuth token automatically per toolkit.
 *
 * 300 ms floor between calls avoids rate-limit spikes.
 */

import { config as loadEnv } from "dotenv";
import * as path from "path";
import { Composio } from "@composio/core";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const API_KEY  = process.env.COMPOSIO_API_KEY ?? "";
const USER_ID  = process.env.COMPOSIO_USER_ID ?? "user_6rlt9a";
const CALL_FLOOR_MS = 300;

let lastCallAt = 0;

async function rateFloor(): Promise<void> {
  const wait = CALL_FLOOR_MS - (Date.now() - lastCallAt);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCallAt = Date.now();
}

// Lazy singleton  -  avoids re-initialising across multiple imports
let _client: Composio | null = null;
function getClient(): Composio {
  if (!API_KEY) {
    throw new Error(
      "COMPOSIO_API_KEY is not set. Add it to .env (get from composio.dev/app/settings)"
    );
  }
  if (!_client) _client = new Composio({ apiKey: API_KEY });
  return _client;
}

export class ComposioExecutionError extends Error {
  constructor(
    public readonly actionId: string,
    public readonly cause: unknown,
  ) {
    super(`Composio action ${actionId} failed: ${String(cause)}`);
    this.name = "ComposioExecutionError";
  }
}

/**
 * Execute a single Composio action and return the raw result data.
 *
 * @param actionId  - e.g. "YOUTUBE_COMMENT_THREADS_LIST"
 * @param args      - tool input parameters (varies per action)
 * @param userId    - Composio user ID (defaults to COMPOSIO_USER_ID from env)
 */
export async function executeComposioAction(
  actionId: string,
  args: Record<string, unknown>,
  userId: string = USER_ID,
): Promise<unknown> {
  await rateFloor();

  const composio = getClient();
  try {
    const result = await composio.tools.execute(actionId, {
      userId,
      arguments: args,
    });
    return result;
  } catch (err) {
    throw new ComposioExecutionError(actionId, err);
  }
}

/**
 * Execute a multi-step Composio plan sequentially.
 * Supports {{placeholder}} substitution between steps (Composio native chaining).
 */
export async function executeComposioPlan(
  steps: Array<{
    tool:     string;
    params:   Record<string, unknown>;
    storeAs?: string;
    extract?: string;
  }>,
  _defaultAccountId: string,   // kept for API compat, userId-based routing ignores this
): Promise<{ results: unknown[]; stored: Record<string, string> }> {
  const stored:  Record<string, string> = {};
  const results: unknown[]              = [];

  for (const step of steps) {
    const resolvedParams = JSON.parse(
      JSON.stringify(step.params).replace(/\{\{(\w+)\}\}/g, (_, key) => stored[key] ?? ""),
    ) as Record<string, unknown>;

    const result = await executeComposioAction(step.tool, resolvedParams);

    if (step.storeAs && step.extract) {
      const extracted = getNestedValue(result, step.extract);
      if (typeof extracted === "string") {
        stored[step.storeAs] = extracted;
      }
    }

    results.push(result);
    console.log(
      `[Composio] ${step.tool} → OK${step.storeAs ? ` (stored ${step.storeAs}=${stored[step.storeAs]})` : ""}`
    );
  }

  return { results, stored };
}

/**
 * Upload a local video file to Composio S3 staging and return the s3key.
 * The s3key is then passed to YOUTUBE_MULTIPART_UPLOAD_VIDEO or
 * INSTAGRAM_POST_IG_USER_MEDIA as videoFile.s3key / video_file.s3key.
 *
 * @param localPath - Absolute path to the local MP4 file
 * @param toolkitSlug - "youtube" or "instagram"  -  tells Composio which toolkit will consume this file
 */
export async function stageVideoFile(
  localPath: string,
  toolkitSlug: "youtube" | "instagram" = "youtube",
): Promise<string> {
  const composio = getClient();
  const uploadData = await composio.files.upload({
    file:        localPath,
    toolSlug:    toolkitSlug === "youtube" ? "YOUTUBE_MULTIPART_UPLOAD_VIDEO" : "INSTAGRAM_POST_IG_USER_MEDIA",
    toolkitSlug,
  });
  return uploadData.s3key;
}

function getNestedValue(obj: unknown, dotPath: string): unknown {
  return dotPath.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
