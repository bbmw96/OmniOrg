// Created by BBMW0 Technologies | bbmw0.com
/**
 * SOCIAL PUBLISHER - OmniOrg Social Media Auto-Publishing Engine
 *
 * Integrates YouTube Data API v3 + Instagram Graph API + any platform via Composio.
 * All outbound requests route through proxy-fetch for IP protection.
 * Islamic compliance check runs on every caption and title before publishing.
 */

import { proxyFetch } from "../../core/proxy-fetch";
import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

// ── TYPES ──────────────────────────────────────────────────────────────────────

export type Platform = "youtube" | "instagram" | "twitter" | "linkedin" | "tiktok";
export type PublishStatus = "pending" | "uploading" | "processing" | "published" | "failed";

export interface PublishJob {
  id:            string;
  platform:      Platform;
  videoPath?:    string;
  imagePath?:    string;
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
  videoPath:    string;
  title:        string;
  description:  string;
  tags?:        string[];
  categoryId?:  string;
  privacy?:     "public" | "private" | "unlisted";
}

export interface InstagramPostRequest {
  imagePath?:  string;
  videoPath?:  string;
  caption:     string;
  hashtags?:   string[];
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────────

const QUEUE_FILE = "output/social/publish-queue.json";

const HARAM_PATTERNS: RegExp[] = [
  /\b(music|song|lyrics|playlist|album|band|concert|festival|rave|dj set)\b/i,
  /\b(gambling|casino|bet|lottery|poker|roulette|jackpot|wager)\b/i,
  /\b(alcohol|beer|wine|whiskey|vodka|cocktail|drunk|booze|spirits)\b/i,
  /\b(nude|naked|explicit|adult content|nsfw|xxx|erotic|porn)\b/i,
  /\b(hookup|dating app|tinder|grindr|one night stand|casual sex)\b/i,
  /\b(podcast.*music|background music|lo-fi|chill beats)\b/i,
];

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── ISLAMIC COMPLIANCE CHECK ───────────────────────────────────────────────────

export function islamicMediaCheck(caption: string, title?: string): void {
  const combined = [caption, title ?? ""].join(" ");

  for (const pattern of HARAM_PATTERNS) {
    if (pattern.test(combined)) {
      throw new Error(
        `[IslamicCompliance] BLOCKED - content matches haram pattern: ${pattern.toString()}. ` +
        `Review and revise before publishing.`
      );
    }
  }

  console.log("[IslamicCompliance] Check passed - content is compliant.");
}

// ── CAPTION OPTIMIZER ─────────────────────────────────────────────────────────

export async function optimizeCaption(
  rawCaption: string,
  platform: Platform,
  tone?: string
): Promise<string> {
  const platformInstructions: Record<Platform, string> = {
    instagram: "Add 5 relevant hashtags, make engaging, max 2200 chars",
    youtube:   "Make compelling, SEO-optimized, include call to action",
    twitter:   "Max 280 chars, punchy, include 2-3 hashtags",
    linkedin:  "Professional tone, thought leadership, 1300 chars max",
    tiktok:    "Energetic, trend-aware, add 3-5 trending hashtags, max 2200 chars",
  };

  const toneInstruction = tone ? `Tone: ${tone}.` : "";

  const message = await anthropic.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 512,
    messages: [
      {
        role:    "user",
        content: `Optimize this caption for ${platform}. ${platformInstructions[platform]}. ${toneInstruction} Return ONLY the optimized caption text, no explanation.\n\nCaption:\n${rawCaption}`,
      },
    ],
  });

  const optimized = (message.content[0] as { type: string; text: string }).text.trim();

  islamicMediaCheck(optimized);

  return optimized;
}

// ── YOUTUBE UPLOAD ─────────────────────────────────────────────────────────────

export async function uploadToYouTube(req: YouTubeUploadRequest): Promise<string> {
  const accessToken = process.env.YOUTUBE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("[YouTube] YOUTUBE_ACCESS_TOKEN not set in .env");
  }

  islamicMediaCheck(req.description, req.title);

  const videoBuffer = fs.readFileSync(req.videoPath);

  const metadata = {
    snippet: {
      title:       req.title,
      description: req.description,
      tags:        req.tags ?? [],
      categoryId:  req.categoryId ?? "22",
    },
    status: {
      privacyStatus: req.privacy ?? "public",
    },
  };

  const boundary = `omniorg_yt_${Date.now()}`;
  const metaJson = JSON.stringify(metadata);

  const bodyParts: Buffer[] = [
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaJson}\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`
    ),
    videoBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ];

  const body = Buffer.concat(bodyParts);

  const response = await proxyFetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
    {
      method:  "POST",
      headers: {
        Authorization:   `Bearer ${accessToken}`,
        "Content-Type":  `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.length),
      },
      body,
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`[YouTube] Upload failed (${response.status}): ${err}`);
  }

  const data = (await response.json()) as { id?: string };

  if (!data.id) {
    throw new Error("[YouTube] Upload succeeded but no video ID returned.");
  }

  const url = `https://youtu.be/${data.id}`;
  console.log(`[YouTube] Published: ${url}`);
  return url;
}

// ── INSTAGRAM PUBLISH ─────────────────────────────────────────────────────────

export async function publishToInstagram(req: InstagramPostRequest): Promise<string> {
  const pageId      = process.env.INSTAGRAM_PAGE_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    throw new Error("[Instagram] INSTAGRAM_PAGE_ID or INSTAGRAM_ACCESS_TOKEN not set in .env");
  }

  const fullCaption = req.hashtags
    ? `${req.caption}\n\n${req.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
    : req.caption;

  islamicMediaCheck(fullCaption);

  const baseUrl = `https://graph.instagram.com/v18.0/${pageId}`;

  let containerPayload: Record<string, string>;

  if (req.videoPath) {
    const videoUrl = req.videoPath;
    containerPayload = {
      media_type: "REELS",
      video_url:  videoUrl,
      caption:    fullCaption,
    };
  } else if (req.imagePath) {
    containerPayload = {
      image_url: req.imagePath,
      caption:   fullCaption,
    };
  } else {
    throw new Error("[Instagram] Either imagePath or videoPath must be provided.");
  }

  const containerRes = await proxyFetch(`${baseUrl}/media`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ ...containerPayload, access_token: accessToken }),
  });

  if (!containerRes.ok) {
    const err = await containerRes.text();
    throw new Error(`[Instagram] Container creation failed (${containerRes.status}): ${err}`);
  }

  const containerData = (await containerRes.json()) as { id?: string };
  if (!containerData.id) {
    throw new Error("[Instagram] No container ID returned.");
  }

  const publishRes = await proxyFetch(`${baseUrl}/media_publish`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
  });

  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`[Instagram] Publish failed (${publishRes.status}): ${err}`);
  }

  const publishData = (await publishRes.json()) as { id?: string };
  if (!publishData.id) {
    throw new Error("[Instagram] Publish succeeded but no media ID returned.");
  }

  const url = `https://www.instagram.com/p/${publishData.id}`;
  console.log(`[Instagram] Published: ${url}`);
  return url;
}

// ── QUEUE HELPERS ─────────────────────────────────────────────────────────────

function ensureQueueDir(): void {
  const dir = path.dirname(QUEUE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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

// ── QUEUE SYSTEM ──────────────────────────────────────────────────────────────

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

  console.log(`[Queue] Added job ${newJob.id} for ${newJob.platform}`);
  return newJob;
}

export async function processQueue(): Promise<void> {
  const jobs = loadQueue();

  for (const job of jobs) {
    if (job.status !== "pending") continue;

    console.log(`[Queue] Processing job ${job.id} (${job.platform})`);

    job.status = "uploading";

    try {
      if (job.platform === "youtube") {
        if (!job.videoPath || !job.title) {
          throw new Error("YouTube jobs require videoPath and title.");
        }
        job.publishedUrl = await uploadToYouTube({
          videoPath:   job.videoPath,
          title:       job.title,
          description: job.description ?? job.caption,
          tags:        job.tags,
          privacy:     "public",
        });
      } else if (job.platform === "instagram") {
        job.publishedUrl = await publishToInstagram({
          imagePath: job.imagePath,
          videoPath: job.videoPath,
          caption:   job.caption,
          hashtags:  job.tags,
        });
      } else {
        throw new Error(`Platform "${job.platform}" is not yet implemented natively. Use Composio.`);
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

// ── ONE-SHOT HELPER ───────────────────────────────────────────────────────────

export async function publishVideo(
  platform:  Platform,
  videoPath: string,
  title:     string,
  caption:   string,
  tags?:     string[]
): Promise<PublishJob> {
  const optimized = await optimizeCaption(caption, platform);

  const job = addToQueue({
    platform,
    videoPath,
    title,
    description: optimized,
    caption:     optimized,
    tags,
  });

  await processQueue();

  const updated = loadQueue().find((j) => j.id === job.id);
  return updated ?? job;
}
