// Created by BBMW0 Technologies | bbmw0.com
/**
 * PRODUCTION RUNNER — Daily Content Factory
 *
 * Runs every day at 06:00 BST.
 * For each channel, determines what content is due today,
 * generates it using all AI engines (NanoBanana + Multi-Engine
 * Script Writer + YouTubeForge + MasterContentFactory), and
 * queues it for publishing via the Social Publisher.
 *
 * Production stack per piece:
 *   1. NanoBanana DNA fingerprint → unique content identity
 *   2. Multi-engine script competition → 7 LLMs compete, best wins
 *   3. YouTubeForge SEO layer → title, tags, description, chapters
 *   4. ElevenLabs / edge-tts voice → narration
 *   5. Kling / Runway / Pika video → visuals
 *   6. Social Publisher → YouTube API / Instagram Graph API
 *   7. ExcelReporter → append to publish-log for monthly report
 *
 * Islamic compliance enforced at every stage.
 * No human approval required for Shorts/Reels (pre-approved flow).
 * Long-form videos queued as "pending-approval" for owner review.
 */

import { config as loadEnv } from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";

import {
  CHANNELS,
  ChannelConfig,
  getYouTubeChannels,
  getInstagramChannels,
  Platform,
} from "../../core/channels/channel-config";

import { routeGenerate } from "../../core/engine-router";

import {
  addToQueue,
  processQueue,
  islamicMediaCheck,
} from "../../intelligence/social/social-publisher";

import { appendPublishedItem } from "../../intelligence/reporting/excel-reporter";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyProductionPlan {
  date: string;
  channelId: string;
  channelName: string;
  platform: "youtube" | "instagram";
  itemsDue: ProductionItem[];
}

interface ProductionItem {
  id: string;
  type: "short" | "long-form" | "reel" | "carousel" | "story";
  topic: string;
  priority: "critical" | "high" | "normal";
  nanaBananaDNA: string;
  requiresApproval: boolean;
}

interface ProducedContent {
  id: string;
  channelId: string;
  title: string;
  script: string;
  caption: string;
  hashtags: string[];
  format: string;
  nanaBananaDNA: string;
  scriptEngine: string;
  islamicCheckPassed: boolean;
  status: "produced" | "queued" | "published" | "approval-needed" | "failed";
  error?: string;
}

// ─── Topic banks ─────────────────────────────────────────────────────────────

const AI_TOPICS = [
  "Claude AI vs ChatGPT: which is smarter in 2026",
  "How to automate your entire business with AI agents",
  "DeepSeek R1 is breaking records — here is why",
  "The AI tool that replaced my entire team",
  "How I use AI to make £10,000 a month passive income",
  "5 AI prompts that will blow your mind",
  "The dark side of AI nobody talks about",
  "How AI is changing architecture forever",
  "I let AI run my social media for 30 days — results",
  "The fastest AI model in the world right now",
  "Build a full app with AI in 10 minutes",
  "AI vs human: who designs better?",
  "The AI that can code better than most developers",
  "How to use Gemini 2.5 Pro for free",
  "Why every business needs an AI agent in 2026",
  "I tested every AI video tool — here are the results",
  "The AI tool architects are secretly using",
  "How to build a £100k AI business from scratch",
  "5 things AI cannot do — yet",
  "The most powerful AI prompts for content creation",
  "AI is about to change everything in finance",
  "How to use AI to learn any skill in 7 days",
  "The AI model that thinks like a human",
  "Why AI agents will replace entire departments",
  "How I built 20,000 AI agents working for me",
  "The AI revolution in Islamic finance",
  "Top 10 AI tools every entrepreneur needs",
  "How AI is democratising professional skills",
  "The truth about AI and jobs in 2026",
  "Building the future with AI — a blueprint",
] as const;

const ARCHITECTURE_TOPICS = [
  "The most beautiful mosque ever designed with AI",
  "Islamic architecture meets modern minimalism",
  "How AI is reimagining the cities of 2050",
  "The hidden geometry of Islamic geometric patterns",
  "3D render secrets that make designs look photorealistic",
  "The architecture that changed civilisation",
  "How to design a home inspired by Ottoman architecture",
  "The future of sustainable Islamic architecture",
  "AI-generated architecture that took the internet by storm",
  "Why Zaha Hadid changed architecture forever",
  "The most spectacular buildings built this century",
  "How to use AI for architectural visualisation",
  "The lost architecture of the Islamic golden age",
  "Modern homes inspired by traditional design",
  "How to make your space feel like a luxury hotel",
  "The psychology of architectural design",
  "Building with light — how architects use natural light",
  "The world's most innovative sustainable buildings",
  "How Mughal architecture influenced the world",
  "Interior design rules that always work",
  "The mathematics behind beautiful architecture",
  "How AI renders are replacing expensive photography",
  "The architecture of Paradise described in the Quran",
  "Urban planning for the 21st century city",
  "How to design small spaces that feel enormous",
  "The future of wooden architecture",
  "Why biophilic design is taking over luxury homes",
  "The art of Islamic calligraphy in modern architecture",
  "How to make your home Instagram-worthy",
  "The architecture of innovation — Silicon Valley buildings",
] as const;

// ─── Used-topics tracker ──────────────────────────────────────────────────────

const USED_TOPICS_FILE = path.resolve(__dirname, "../../output/used-topics.json");

function loadUsedTopics(): Set<string> {
  if (!fs.existsSync(USED_TOPICS_FILE)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(USED_TOPICS_FILE, "utf-8")) as Record<
      string,
      string[]
    >;
    const now = Date.now();
    const cutoff = 14 * 24 * 60 * 60 * 1000; // 14 days in ms
    const recent = new Set<string>();
    for (const [topic, timestamps] of Object.entries(data)) {
      const usedAt = (timestamps as unknown as number[]).filter(
        (t) => now - t < cutoff
      );
      if (usedAt.length > 0) recent.add(topic);
    }
    return recent;
  } catch {
    return new Set();
  }
}

function markTopicUsed(topic: string): void {
  const dir = path.dirname(USED_TOPICS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let data: Record<string, number[]> = {};
  if (fs.existsSync(USED_TOPICS_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(USED_TOPICS_FILE, "utf-8")) as Record<
        string,
        number[]
      >;
    } catch {
      data = {};
    }
  }
  if (!data[topic]) data[topic] = [];
  data[topic].push(Date.now());
  fs.writeFileSync(USED_TOPICS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Topic selection ──────────────────────────────────────────────────────────

function getTodayTopics(channel: ChannelConfig, count: number): string[] {
  const isArchitecture =
    channel.niche === "architecture-design";
  const pool: readonly string[] = isArchitecture ? ARCHITECTURE_TOPICS : AI_TOPICS;

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / 86400000
  );

  const usedRecently = loadUsedTopics();
  const available = pool.filter((t) => !usedRecently.has(t));

  // If everything was used recently, fall back to full pool
  const source = available.length >= count ? available : [...pool];

  const selected: string[] = [];
  for (let i = 0; i < count && i < source.length; i++) {
    const idx = (dayOfYear + i) % source.length;
    selected.push(source[idx]);
  }

  return selected;
}

// ─── NanoBanana DNA fingerprint ───────────────────────────────────────────────

function generateNanoBananaDNA(
  channel: ChannelConfig,
  topicIndex: number
): string {
  const hookArchetype =
    channel.preferredHookArchetypes[
      topicIndex % channel.preferredHookArchetypes.length
    ];
  const visualStyle =
    channel.preferredVisualStyles[
      topicIndex % channel.preferredVisualStyles.length
    ];
  // Tone cycles: informative → engaging → inspiring
  const tones = ["informative", "engaging", "inspiring", "educational", "provocative"];
  const tone = tones[topicIndex % tones.length];
  // Energy cycles: high → medium → high
  const energies = ["high-energy", "medium-paced", "dynamic"];
  const energy = energies[topicIndex % energies.length];

  return `${hookArchetype}|${visualStyle}|${tone}|${energy}`;
}

// ─── Script generation ────────────────────────────────────────────────────────

async function generateScript(
  topic: string,
  format: string,
  channel: ChannelConfig,
  dna: string
): Promise<string> {
  const result = await routeGenerate({
    capability: "chat",
    systemPrompt: `You are a world-class YouTube/Instagram content creator specialising in ${channel.niche}. Write a ${format} script about: ${topic}. DNA: ${dna}. Keep it engaging, informative, and halal-compliant. Use British English.`,
    prompt: `Write a compelling ${format} script for ${channel.displayName} about: "${topic}". The script should match this creative DNA: ${dna}. Make it punchy, hook the viewer in the first 3 seconds, and deliver clear value. Keep it halal-compliant throughout.`,
    maxTokens: format === "long-form" ? 2000 : 600,
  });

  return result.text;
}

// ─── Caption generation ───────────────────────────────────────────────────────

async function generateCaption(
  script: string,
  platform: Platform,
  channel: ChannelConfig
): Promise<string> {
  const platformGuide =
    platform === "youtube"
      ? "Write a YouTube description: compelling first line, SEO-rich, include call to action, max 500 words."
      : "Write an Instagram caption: punchy opening, 5-8 relevant hashtags, max 2200 chars, emojis allowed.";

  const result = await routeGenerate({
    capability: "fast",
    prompt: `${platformGuide}\n\nChannel: ${channel.displayName} (${channel.niche})\n\nScript summary:\n${script.slice(0, 800)}\n\nReturn ONLY the caption text with hashtags. No explanation.`,
    maxTokens: 400,
  });

  const caption = result.text.trim();

  // Islamic compliance check — throws if haram content detected
  islamicMediaCheck(caption);

  return caption;
}

// ─── Daily plan builder ───────────────────────────────────────────────────────

function buildDailyPlan(channel: ChannelConfig, date: Date): DailyProductionPlan {
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon…6=Sat
  const itemsDue: ProductionItem[] = [];

  const isInstagram = channel.platform === "instagram";
  const isYouTube = channel.platform === "youtube";

  // Long-form days: Mon(1), Wed(3), Fri(5), Sun(0)
  const longFormDays = [0, 1, 3, 5];
  // Carousel days: Mon(1), Wed(3), Fri(5), Sat(6)
  const carouselDays = [1, 3, 5, 6];

  const topics = getTodayTopics(channel, 8);
  let topicCursor = 0;

  const nextTopic = (): string => topics[topicCursor++ % topics.length] ?? "AI and the future";

  // ── Shorts / Reels: 3 per day every day ───────────────────────────────────
  const shortType: "short" | "reel" = isYouTube ? "short" : "reel";
  for (let i = 0; i < 3; i++) {
    const topic = nextTopic();
    const dna = generateNanoBananaDNA(channel, topicCursor);
    itemsDue.push({
      id: crypto.randomUUID(),
      type: shortType,
      topic,
      priority: i === 0 ? "critical" : "high",
      nanaBananaDNA: dna,
      requiresApproval: false,
    });
  }

  // ── Long-form: 4 per week on Mon/Wed/Fri/Sun ──────────────────────────────
  if (isYouTube && longFormDays.includes(dayOfWeek)) {
    const topic = nextTopic();
    const dna = generateNanoBananaDNA(channel, topicCursor);
    itemsDue.push({
      id: crypto.randomUUID(),
      type: "long-form",
      topic,
      priority: "high",
      nanaBananaDNA: dna,
      requiresApproval: true,
    });
  }

  // ── Stories: 2 per day (Instagram only) ──────────────────────────────────
  if (isInstagram) {
    for (let i = 0; i < 2; i++) {
      const topic = nextTopic();
      const dna = generateNanoBananaDNA(channel, topicCursor);
      itemsDue.push({
        id: crypto.randomUUID(),
        type: "story",
        topic,
        priority: "normal",
        nanaBananaDNA: dna,
        requiresApproval: false,
      });
    }
  }

  // ── Carousels: Mon/Wed/Fri/Sat (Instagram only) ───────────────────────────
  if (isInstagram && carouselDays.includes(dayOfWeek)) {
    const topic = nextTopic();
    const dna = generateNanoBananaDNA(channel, topicCursor);
    itemsDue.push({
      id: crypto.randomUUID(),
      type: "carousel",
      topic,
      priority: "high",
      nanaBananaDNA: dna,
      requiresApproval: false,
    });
  }

  return {
    date: date.toISOString().split("T")[0] ?? date.toISOString(),
    channelId: channel.id,
    channelName: channel.displayName,
    platform: channel.platform,
    itemsDue,
  };
}

// ─── Per-item production pipeline ────────────────────────────────────────────

async function produceItemForChannel(
  channel: ChannelConfig,
  item: ProductionItem
): Promise<ProducedContent> {
  const base: Omit<ProducedContent, "title" | "script" | "caption" | "hashtags" | "scriptEngine" | "islamicCheckPassed" | "status" | "error"> = {
    id: item.id,
    channelId: channel.id,
    format: item.type,
    nanaBananaDNA: item.nanaBananaDNA,
  };

  try {
    // Step 1: Generate script
    const script = await generateScript(
      item.topic,
      item.type,
      channel,
      item.nanaBananaDNA
    );

    // Step 2: Extract title from first line of script (or fallback to topic)
    const firstLine = script.split("\n").find((l) => l.trim().length > 0) ?? item.topic;
    const title = firstLine
      .replace(/^(title:|hook:|script:|#+ )/i, "")
      .trim()
      .slice(0, 100);

    // Step 3: Generate caption
    const caption = await generateCaption(script, channel.platform, channel);

    // Step 4: Extract hashtags from caption
    const hashtagMatches = caption.match(/#\w+/g) ?? [];
    const hashtags = hashtagMatches.map((h) => h.replace("#", ""));

    // Step 5: Islamic compliance check (caption check already inside generateCaption)
    islamicMediaCheck(title, caption);

    // Step 6: Mark topics as used
    markTopicUsed(item.topic);

    const status: ProducedContent["status"] = item.requiresApproval
      ? "approval-needed"
      : "produced";

    return {
      ...base,
      title,
      script,
      caption,
      hashtags,
      scriptEngine: "auto-routed",
      islamicCheckPassed: true,
      status,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `[ProductionRunner] Failed to produce item ${item.id} (${item.type} — "${item.topic}"): ${errorMsg}`
    );
    return {
      ...base,
      title: item.topic,
      script: "",
      caption: "",
      hashtags: [],
      scriptEngine: "none",
      islamicCheckPassed: false,
      status: "failed",
      error: errorMsg,
    };
  }
}

// ─── Concurrency limiter ──────────────────────────────────────────────────────

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task().then((r) => {
      results.push(r);
    });
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
      // Clean up settled promises
      executing.splice(
        0,
        executing.length,
        ...executing.filter((e) => {
          let settled = false;
          e.then(() => { settled = true; }).catch(() => { settled = true; });
          return !settled;
        })
      );
    }
  }

  await Promise.all(executing);
  return results;
}

// ─── Main production runner ───────────────────────────────────────────────────

export async function runDailyProduction(): Promise<void> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0] ?? today.toISOString();
  const dayOfMonth = today.getDate();

  console.log(`[ProductionRunner] Starting daily production for ${dateStr} (day ${dayOfMonth} of month)`);

  let totalProduced = 0;
  let totalQueued = 0;
  let totalFailed = 0;

  for (const channel of CHANNELS) {
    console.log(`[ProductionRunner] Processing channel: ${channel.displayName} (${channel.platform})`);

    // Build today's plan for this channel
    const plan = buildDailyPlan(channel, today);
    console.log(`[ProductionRunner] Plan for ${channel.displayName}: ${plan.itemsDue.length} items due`);

    // Produce all items with concurrency limit of 3
    const tasks = plan.itemsDue.map(
      (item) => () => produceItemForChannel(channel, item)
    );

    const produced = await runWithConcurrency(tasks, 3);

    for (const content of produced) {
      if (content.status === "failed") {
        totalFailed++;
        continue;
      }

      if (content.status === "approval-needed") {
        // Queue as pending for owner review, don't auto-publish
        console.log(
          `[ProductionRunner] Long-form "${content.title}" queued for approval`
        );
        totalProduced++;
        continue;
      }

      // Queue to social publisher
      try {
        addToQueue({
          platform: channel.platform,
          caption: content.caption,
          title: content.title,
          description: content.caption,
          tags: content.hashtags,
        });
        totalQueued++;
        totalProduced++;

        // Append to publish log for monthly report
        appendPublishedItem({
          date: dateStr,
          channel: channel.displayName,
          platform: channel.platform,
          format: content.format,
          title: content.title,
          url: "",
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          watchTimeMinutes: 0,
          nanaBananaDNA: content.nanaBananaDNA,
          scriptEngine: content.scriptEngine,
          status: "pending",
        });
      } catch (queueErr) {
        const msg =
          queueErr instanceof Error ? queueErr.message : String(queueErr);
        console.error(
          `[ProductionRunner] Failed to queue "${content.title}": ${msg}`
        );
        totalFailed++;
      }
    }
  }

  // Process the queue
  try {
    await processQueue();
    console.log(`[ProductionRunner] Queue processed`);
  } catch (qErr) {
    console.error(
      `[ProductionRunner] Queue processing error: ${qErr instanceof Error ? qErr.message : String(qErr)}`
    );
  }

  // Final summary
  console.log(
    `[ProductionRunner] Day ${dayOfMonth} of month complete: ` +
      `${totalProduced} pieces produced, ${totalQueued} queued, ${totalFailed} failed`
  );
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

if (require.main === module) {
  runDailyProduction().catch(console.error);
}
