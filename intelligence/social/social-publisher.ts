// Created by BBMW0 Technologies | bbmw0.com
/**
 * SOCIAL PUBLISHER - OmniOrg Social Media Auto-Publishing Engine
 *
 * Uses Composio (already connected) for all YouTube and Instagram publishing.
 * No separate OAuth tokens needed  -  Composio handles auth via connected accounts.
 *
 * Connected accounts (from composio.dev dashboard):
 *   YouTube Ch1:  youtube_tao-juang  (BBM0 / @bbm0902)
 *   YouTube Ch2:  youtube_boris-stasis  (@bbmw.0 / Mohammed)
 *   Instagram:    instagram_stays-moo  (@ai_game_odyssey)
 *
 * Flow:
 *   YouTube   -  stage file → YOUTUBE_MULTIPART_UPLOAD_VIDEO via Composio
 *   Instagram  -  video_url (CDN) → INSTAGRAM_POST_IG_USER_MEDIA → PUBLISH
 *
 * Islamic compliance check runs on every caption and title before publishing.
 */

import { proxyFetch } from "../../core/proxy-fetch";
import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

// ── Types ──────────────────────────────────────────────────────────────────────

export type Platform = "youtube" | "instagram" | "twitter" | "linkedin" | "tiktok";
export type PublishStatus = "pending" | "uploading" | "processing" | "published" | "failed";

export interface PublishJob {
  id:            string;
  platform:      Platform;
  channelIndex?: number;      // 1 = primary channel, 2 = secondary channel
  videoPath?:    string;      // local file path or CDN URL
  imagePath?:    string;      // local file path or CDN URL
  caption:       string;
  title?:        string;
  description?:  string;
  tags?:         string[];
  scheduledAt?:  string;
  status:        PublishStatus;
  publishedUrl?: string;
  error?:        string;
  createdAt:     string;
}

export interface YouTubeUploadRequest {
  videoPath:    string;       // local path or CDN URL
  title:        string;
  description:  string;
  tags?:        string[];
  categoryId?:  string;
  privacy?:     "public" | "private" | "unlisted";
  channelIndex?: number;
}

export interface InstagramPostRequest {
  imagePath?:   string;       // local path or CDN URL
  videoPath?:   string;       // local path or CDN URL
  caption:      string;
  hashtags?:    string[];
  channelIndex?: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const QUEUE_FILE    = "output/social/publish-queue.json";
const TMP_DIR       = path.resolve(__dirname, "../../output/tmp");
const COMPOSIO_BASE = "https://backend.composio.dev/api/v2";

const YT_ACCOUNTS: Record<number, string> = {
  1: process.env.COMPOSIO_YT_ACCOUNT_CH1  ?? "youtube_tao-juang",
  2: process.env.COMPOSIO_YT_ACCOUNT_CH2  ?? "youtube_boris-stasis",
};

const IG_ACCOUNTS: Record<number, string> = {
  1: process.env.COMPOSIO_IG_ACCOUNT_CH1  ?? "instagram_stays-moo",
  2: process.env.COMPOSIO_IG_ACCOUNT_CH2  ?? "instagram_stays-moo",
};

const IG_USER_IDS: Record<number, string> = {
  1: process.env.INSTAGRAM_IG_USER_ID_CH1 ?? "26759002047072119",
  2: process.env.INSTAGRAM_IG_USER_ID_CH2 ?? "26759002047072119",
};

const HARAM_PATTERNS: RegExp[] = [
  /\b(music|song|lyrics|playlist|album|band|concert|festival|rave|dj set)\b/i,
  /\b(gambling|casino|bet|lottery|poker|roulette|jackpot|wager)\b/i,
  /\b(alcohol|beer|wine|whiskey|vodka|cocktail|drunk|booze|spirits)\b/i,
  /\b(nude|naked|explicit|adult content|nsfw|xxx|erotic|porn)\b/i,
  /\b(hookup|dating app|tinder|grindr|one night stand|casual sex)\b/i,
  /\b(podcast.*music|background music|lo-fi|chill beats)\b/i,
];

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Islamic compliance check ───────────────────────────────────────────────────

export function islamicMediaCheck(caption: string, title?: string): void {
  const combined = [caption, title ?? ""].join(" ");
  for (const pattern of HARAM_PATTERNS) {
    if (pattern.test(combined)) {
      throw new Error(
        `[IslamicCompliance] BLOCKED - content matches haram pattern: ${pattern.toString()}. ` +
        "Review and revise before publishing."
      );
    }
  }
  console.log("[IslamicCompliance] Check passed - content is compliant.");
}

// ── Caption optimizer ─────────────────────────────────────────────────────────

export async function optimizeCaption(
  rawCaption: string,
  platform: Platform,
  tone?: string
): Promise<string> {
  const platformInstructions: Record<Platform, string> = {
    instagram: "Add 5 relevant hashtags, make engaging, max 2200 chars",
    youtube:   "Make compelling, SEO-optimised, include call to action",
    twitter:   "Max 280 chars, punchy, include 2-3 hashtags",
    linkedin:  "Professional tone, thought leadership, 1300 chars max",
    tiktok:    "Energetic, trend-aware, add 3-5 trending hashtags, max 2200 chars",
  };

  const toneInstruction = tone ? `Tone: ${tone}.` : "";

  const message = await anthropic.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 512,
    messages: [{
      role:    "user",
      content: `Optimise this caption for ${platform}. ${platformInstructions[platform]}. ${toneInstruction} Return ONLY the optimised caption text, no explanation.\n\nCaption:\n${rawCaption}`,
    }],
  });

  const optimized = (message.content[0] as { type: string; text: string }).text.trim();
  islamicMediaCheck(optimized);
  return optimized;
}

// ── Composio REST API helpers ──────────────────────────────────────────────────

async function composioExecute(
  actionName: string,
  connectedAccountId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error("[Composio] COMPOSIO_API_KEY not set in .env");

  const res = await proxyFetch(`${COMPOSIO_BASE}/actions/${actionName}/execute`, {
    method: "POST",
    headers: {
      "x-api-key":    apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ connectedAccountId, input }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Composio] ${actionName} failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  if (data.successful === false || data.successfull === false) {
    throw new Error(`[Composio] ${actionName} returned error: ${JSON.stringify(data.error ?? data)}`);
  }

  return (data.data ?? {}) as Record<string, unknown>;
}

async function stageFileToComposio(localPath: string, mimeType = "video/mp4"): Promise<string> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error("[Composio] COMPOSIO_API_KEY not set in .env");

  const fileBuffer  = fs.readFileSync(localPath);
  const filename    = path.basename(localPath);
  const boundary    = `omniorg_${Date.now()}`;

  const bodyParts: Buffer[] = [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ];

  const res = await proxyFetch("https://backend.composio.dev/api/v1/toolset/upload", {
    method: "POST",
    headers: {
      "x-api-key":    apiKey,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: Buffer.concat(bodyParts),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Composio] File staging failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { s3key?: string };
  if (!data.s3key) throw new Error("[Composio] File staging returned no s3key");
  return data.s3key;
}

async function downloadUrlToTemp(url: string, ext = ".mp4"): Promise<string> {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const localPath = path.join(TMP_DIR, `${crypto.randomUUID()}${ext}`);

  const res = await proxyFetch(url);
  if (!res.ok) throw new Error(`[Download] Failed to fetch ${url} (${res.status})`);

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(localPath, buf);
  return localPath;
}

// ── YouTube upload via Composio ────────────────────────────────────────────────

export async function uploadToYouTube(req: YouTubeUploadRequest): Promise<string> {
  islamicMediaCheck(req.description, req.title);

  const chIdx             = req.channelIndex ?? 1;
  const connectedAccount  = YT_ACCOUNTS[chIdx] ?? YT_ACCOUNTS[1];

  // Resolve video path  -  download from URL to temp if needed
  let localPath = req.videoPath;
  let isTemp    = false;

  if (req.videoPath.startsWith("http")) {
    console.log(`[YouTube] Downloading video from CDN: ${req.videoPath}`);
    localPath = await downloadUrlToTemp(req.videoPath);
    isTemp    = true;
  }

  console.log(`[YouTube] Staging video to Composio: ${localPath}`);
  const s3key = await stageFileToComposio(localPath, "video/mp4");

  if (isTemp) {
    try { fs.unlinkSync(localPath); } catch { /* ignore cleanup errors */ }
  }

  console.log(`[YouTube] Uploading via Composio account: ${connectedAccount}`);
  const result = await composioExecute(
    "YOUTUBE_MULTIPART_UPLOAD_VIDEO",
    connectedAccount,
    {
      title:         req.title,
      description:   req.description,
      tags:          req.tags ?? [],
      categoryId:    req.categoryId ?? "28",    // 28 = Science & Technology
      privacyStatus: req.privacy ?? "public",
      videoFile: {
        name:     path.basename(localPath),
        mimetype: "video/mp4",
        s3key,
      },
    }
  );

  const videoId = (result.id ?? result.videoId) as string | undefined;
  if (!videoId) throw new Error("[YouTube] No video ID in Composio response");

  const url = `https://youtu.be/${videoId}`;
  console.log(`[YouTube] Published: ${url}`);
  return url;
}

// ── Instagram publish via Composio ────────────────────────────────────────────

export async function publishToInstagram(req: InstagramPostRequest): Promise<string> {
  const fullCaption = req.hashtags
    ? `${req.caption}\n\n${req.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
    : req.caption;

  islamicMediaCheck(fullCaption);

  const chIdx            = req.channelIndex ?? 1;
  const connectedAccount = IG_ACCOUNTS[chIdx] ?? IG_ACCOUNTS[1];
  const igUserId         = IG_USER_IDS[chIdx] ?? IG_USER_IDS[1];

  let mediaInput: Record<string, unknown>;

  if (req.videoPath) {
    if (req.videoPath.startsWith("http")) {
      // CDN URL: pass directly  -  Instagram fetches it (no signing, no query params)
      mediaInput = {
        ig_user_id:  igUserId,
        video_url:   req.videoPath,
        caption:     fullCaption,
        media_type:  "REELS",
      };
    } else {
      // Local file: stage to Composio
      const s3key = await stageFileToComposio(req.videoPath, "video/mp4");
      mediaInput = {
        ig_user_id: igUserId,
        video_file: { name: path.basename(req.videoPath), mimetype: "video/mp4", s3key },
        caption:    fullCaption,
        media_type: "REELS",
      };
    }
  } else if (req.imagePath) {
    if (req.imagePath.startsWith("http")) {
      mediaInput = { ig_user_id: igUserId, image_url: req.imagePath, caption: fullCaption };
    } else {
      const s3key = await stageFileToComposio(req.imagePath, "image/jpeg");
      mediaInput = {
        ig_user_id:  igUserId,
        image_file:  { name: path.basename(req.imagePath), mimetype: "image/jpeg", s3key },
        caption:     fullCaption,
      };
    }
  } else {
    throw new Error("[Instagram] Either videoPath or imagePath must be provided.");
  }

  console.log(`[Instagram] Creating media container via Composio account: ${connectedAccount}`);
  const container   = await composioExecute("INSTAGRAM_POST_IG_USER_MEDIA", connectedAccount, mediaInput);
  const creationId  = container.id as string | undefined;
  if (!creationId) throw new Error("[Instagram] No container ID returned from INSTAGRAM_POST_IG_USER_MEDIA");

  console.log(`[Instagram] Publishing container ${creationId}...`);
  const published = await composioExecute(
    "INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH",
    connectedAccount,
    {
      ig_user_id:           igUserId,
      creation_id:          creationId,
      max_wait_seconds:     120,
      poll_interval_seconds: 5,
    }
  );

  const mediaId = published.id as string | undefined;
  const url     = mediaId ? `https://www.instagram.com/p/${mediaId}` : "https://www.instagram.com";
  console.log(`[Instagram] Published: ${url}`);
  return url;
}

// ── Queue helpers ──────────────────────────────────────────────────────────────

function ensureQueueDir(): void {
  const dir = path.dirname(QUEUE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadQueue(): PublishJob[] {
  ensureQueueDir();
  if (!fs.existsSync(QUEUE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, "utf-8")) as PublishJob[];
  } catch {
    return [];
  }
}

function saveQueue(jobs: PublishJob[]): void {
  ensureQueueDir();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(jobs, null, 2), "utf-8");
}

// ── Queue system ───────────────────────────────────────────────────────────────

const publishQueue: PublishJob[] = [];

export function addToQueue(job: Omit<PublishJob, "id" | "status" | "createdAt">): PublishJob {
  const newJob: PublishJob = {
    ...job,
    id:        crypto.randomUUID(),
    status:    "pending",
    createdAt: new Date().toISOString(),
  };

  publishQueue.push(newJob);

  const persisted = loadQueue();
  persisted.push(newJob);
  saveQueue(persisted);

  console.log(`[Queue] Added job ${newJob.id} for ${newJob.platform} (ch${newJob.channelIndex ?? 1})`);
  return newJob;
}

export async function processQueue(): Promise<void> {
  const jobs = loadQueue();

  for (const job of jobs) {
    if (job.status !== "pending") continue;

    console.log(`[Queue] Processing job ${job.id} (${job.platform} ch${job.channelIndex ?? 1})`);
    job.status = "uploading";

    try {
      if (job.platform === "youtube") {
        if (!job.videoPath) {
          throw new Error("[Queue] YouTube job has no videoPath  -  skipping until video is generated.");
        }
        if (!job.title) {
          throw new Error("[Queue] YouTube job requires a title.");
        }
        job.publishedUrl = await uploadToYouTube({
          videoPath:    job.videoPath,
          title:        job.title,
          description:  job.description ?? job.caption,
          tags:         job.tags,
          privacy:      "public",
          channelIndex: job.channelIndex,
        });

      } else if (job.platform === "instagram") {
        if (!job.videoPath && !job.imagePath) {
          throw new Error("[Queue] Instagram job has no videoPath or imagePath  -  skipping.");
        }
        job.publishedUrl = await publishToInstagram({
          imagePath:    job.imagePath,
          videoPath:    job.videoPath,
          caption:      job.caption,
          hashtags:     job.tags,
          channelIndex: job.channelIndex,
        });

      } else {
        throw new Error(`[Queue] Platform "${job.platform}" not implemented. Add Composio action.`);
      }

      job.status = "published";
      console.log(`[Queue] Job ${job.id} published: ${job.publishedUrl}`);

    } catch (err) {
      job.status = "failed";
      job.error  = err instanceof Error ? err.message : String(err);
      console.error(`[Queue] Job ${job.id} failed: ${job.error}`);
    }
  }

  saveQueue(jobs);
}

export function getQueueStatus(): PublishJob[] {
  return loadQueue();
}

// ── One-shot helper ────────────────────────────────────────────────────────────

export async function publishVideo(
  platform:      Platform,
  videoPath:     string,
  title:         string,
  caption:       string,
  tags?:         string[],
  channelIndex?: number
): Promise<PublishJob> {
  const optimized = await optimizeCaption(caption, platform);

  const job = addToQueue({
    platform,
    videoPath,
    title,
    description:  optimized,
    caption:      optimized,
    tags,
    channelIndex: channelIndex ?? 1,
  });

  await processQueue();

  const updated = loadQueue().find((j) => j.id === job.id);
  return updated ?? job;
}
