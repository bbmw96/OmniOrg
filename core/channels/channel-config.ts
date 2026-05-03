// Created by BBMW0 Technologies | bbmw0.com
/**
 * CHANNEL CONFIG — Single source of truth for all BBMW0 channels
 *
 * Two YouTube channels + Two Instagram accounts, each with unique
 * niche, target audience, posting schedule, and NanoBanana recipe preferences.
 *
 * To add your channel IDs/handles: fill in the CHANNEL_ID and HANDLE fields
 * from your YouTube Studio and Instagram profile URLs.
 */

import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

// ─── Types ───────────────────────────────────────────────────────────────────

export type Platform = "youtube" | "instagram";

export type ContentNiche =
  | "ai-technology"
  | "islamic-lifestyle"
  | "business-finance"
  | "tech-education"
  | "motivational"
  | "architecture-design";

export interface PostingWindow {
  dayOfWeek: number[]; // 0=Sun, 1=Mon...6=Sat
  timeUtc: string;     // "HH:MM"
  timeBst: string;     // "HH:MM"
  label: string;       // "Morning peak", "Evening peak" etc
}

export interface ChannelConfig {
  id: string;
  platform: Platform;
  displayName: string;
  handle: string;               // @handle — fill from env or hardcode
  channelId: string;            // YouTube channel ID / Instagram account ID
  niche: ContentNiche;
  subNiches: string[];          // 3-5 specific topics within the niche
  targetAudience: string;
  contentLanguage: "en-GB" | "ar" | "both";

  // Volume per month
  shortsPerMonth: number;       // YouTube Shorts or Instagram Reels
  longFormPerMonth: number;     // YouTube long-form (Instagram: carousel posts)
  storiesPerMonth: number;      // Instagram stories only (0 for YouTube)

  // NanoBanana preferences
  preferredHookArchetypes: string[];  // top 3 from NanoBanana HOOK_ARCHETYPES
  preferredVisualStyles: string[];    // top 3 from NanoBanana VISUAL_STYLES
  brandColours: string[];             // hex colours
  brandFonts: string[];               // font names

  // Posting schedule
  postingWindows: PostingWindow[];

  // Islamic compliance
  islamicComplianceRequired: boolean; // always true for this project

  // Monetisation
  adSenseEnabled: boolean;
  affiliateCategoriesAllowed: string[];

  channelIndex: number;          // 1-based index for publisher routing (1 = primary, 2 = secondary)

  // Env-driven overrides
  accessTokenEnvKey: string;    // e.g. "YOUTUBE_ACCESS_TOKEN_CH1"
  pageIdEnvKey: string;         // e.g. "INSTAGRAM_PAGE_ID_CH1"

  // Growth targets this month (May 2026)
  targetSubscribersGain: number;
  targetViewsThisMonth: number;
  targetEngagementRate: number; // percentage
}

// ─── Channel Definitions ─────────────────────────────────────────────────────

export const CHANNELS: ChannelConfig[] = [
  // ── Channel 1: YouTube — BBMW0 AI Empire ──────────────────────────────────
  {
    id: "yt-ai-empire",
    platform: "youtube",
    displayName: "BBMW0 AI Empire",
    handle: process.env["YT_HANDLE_CH1"] ?? "@BBMw0AIEmpire",
    channelId: process.env["YT_CHANNEL_ID_CH1"] ?? "UC5O9s1vte7UiLICKP1pHiIQ",
    niche: "ai-technology",
    subNiches: [
      "AI tools tutorials",
      "ChatGPT & Claude deep dives",
      "AI for business",
      "AI automation",
      "Future of AI",
    ],
    targetAudience:
      "Tech-savvy professionals 25-45 who want to leverage AI to scale income",
    contentLanguage: "en-GB",

    shortsPerMonth: 90,
    longFormPerMonth: 16,
    storiesPerMonth: 0,

    preferredHookArchetypes: ["shock-stat", "bold-claim", "tutorial-preview"],
    preferredVisualStyles: ["cinematic", "screen-dominant", "clean-minimal"],
    brandColours: ["#0A0A0A", "#00D4FF", "#FFFFFF"],
    brandFonts: ["Inter", "Space Grotesk", "JetBrains Mono"],

    postingWindows: [
      {
        dayOfWeek: [1, 3, 5], // Mon, Wed, Fri
        timeUtc: "18:00",
        timeBst: "19:00",
        label: "Evening peak — long-form",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6], // daily
        timeUtc: "07:00",
        timeBst: "08:00",
        label: "Morning Shorts",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "12:00",
        timeBst: "13:00",
        label: "Midday Shorts",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "19:00",
        timeBst: "20:00",
        label: "Evening Shorts",
      },
    ],

    islamicComplianceRequired: true,
    adSenseEnabled: true, // pending YPP
    affiliateCategoriesAllowed: [
      "software",
      "AI tools",
      "productivity",
      "tech hardware",
    ],

    channelIndex: 1,
    accessTokenEnvKey: "YOUTUBE_ACCESS_TOKEN",
    pageIdEnvKey: "",

    targetSubscribersGain: 500,
    targetViewsThisMonth: 50000,
    targetEngagementRate: 4.5,
  },

  // ── Channel 2: YouTube — BBMW0 Architect ──────────────────────────────────
  {
    id: "yt-architect",
    platform: "youtube",
    displayName: "BBMW0 Architect",
    handle: process.env["YT_HANDLE_CH2"] ?? "@BBMw0Architect",
    channelId: process.env["YT_CHANNEL_ID_CH2"] ?? "UCSRkqZ0PckW8ae-cnZcN1hw",
    niche: "architecture-design",
    subNiches: [
      "Modern Islamic architecture",
      "3D architectural visualisation",
      "Urban design",
      "Interior design AI",
      "Sustainable architecture",
    ],
    targetAudience:
      "Architects, designers, students, and property enthusiasts 20-50",
    contentLanguage: "en-GB",

    shortsPerMonth: 90,
    longFormPerMonth: 16,
    storiesPerMonth: 0,

    preferredHookArchetypes: ["curiosity-gap", "transformation", "case-study"],
    preferredVisualStyles: ["cinematic", "documentary", "animation-driven"],
    brandColours: ["#1A1A2E", "#C9A84C", "#F5F5F0"],
    brandFonts: ["Playfair Display", "Raleway", "Montserrat"],

    postingWindows: [
      {
        dayOfWeek: [2, 4, 6], // Tue, Thu, Sat
        timeUtc: "17:00",
        timeBst: "18:00",
        label: "Evening peak — long-form",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "08:00",
        timeBst: "09:00",
        label: "Morning Shorts",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "13:00",
        timeBst: "14:00",
        label: "Midday Shorts",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "20:00",
        timeBst: "21:00",
        label: "Evening Shorts",
      },
    ],

    islamicComplianceRequired: true,
    adSenseEnabled: true,
    affiliateCategoriesAllowed: [
      "architecture software",
      "design tools",
      "books",
      "courses",
    ],

    channelIndex: 2,
    accessTokenEnvKey: "YOUTUBE_ACCESS_TOKEN_CH2",
    pageIdEnvKey: "",

    targetSubscribersGain: 300,
    targetViewsThisMonth: 30000,
    targetEngagementRate: 5.0,
  },

  // ── Channel 3: Instagram — bbmw0_ai ───────────────────────────────────────
  {
    id: "ig-ai",
    platform: "instagram",
    displayName: "bbmw0_ai",
    handle: process.env["IG_HANDLE_CH1"] ?? "@bbmw0_ai",
    channelId: process.env["INSTAGRAM_PAGE_ID"] ?? "26759002047072119",
    niche: "ai-technology",
    subNiches: [
      "AI tool demos",
      "Prompt engineering tips",
      "AI art",
      "Tech news",
      "AI business hacks",
    ],
    targetAudience:
      "Millennial and Gen-Z tech enthusiasts, founders, creators 18-40",
    contentLanguage: "en-GB",

    shortsPerMonth: 90,   // Reels
    longFormPerMonth: 20, // carousels
    storiesPerMonth: 60,

    preferredHookArchetypes: ["direct-question", "shock-stat", "fomo"],
    preferredVisualStyles: [
      "energetic-fast-cut",
      "clean-minimal",
      "animation-driven",
    ],
    brandColours: ["#0A0A0A", "#00D4FF", "#7B2FBE"],
    brandFonts: ["Inter", "Clash Display", "Plus Jakarta Sans"],

    postingWindows: [
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "08:00",
        timeBst: "09:00",
        label: "Morning Reels",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "12:00",
        timeBst: "13:00",
        label: "Midday Reels",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "19:00",
        timeBst: "20:00",
        label: "Evening Reels",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "09:00",
        timeBst: "10:00",
        label: "Morning Stories",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "21:00",
        timeBst: "22:00",
        label: "Evening Stories",
      },
    ],

    islamicComplianceRequired: true,
    adSenseEnabled: false,
    affiliateCategoriesAllowed: ["software", "AI tools", "online courses"],

    channelIndex: 1,
    accessTokenEnvKey: "INSTAGRAM_ACCESS_TOKEN",
    pageIdEnvKey: "INSTAGRAM_PAGE_ID",

    targetSubscribersGain: 1000, // followers
    targetViewsThisMonth: 200000,
    targetEngagementRate: 6.0,
  },

  // ── Channel 4: Instagram — bbmw0_architect ────────────────────────────────
  {
    id: "ig-architect",
    platform: "instagram",
    displayName: "bbmw0_architect",
    handle: process.env["IG_HANDLE_CH2"] ?? "@bbmw0_architect",
    channelId: process.env["INSTAGRAM_PAGE_ID_CH2"] ?? "26759002047072119",
    niche: "architecture-design",
    subNiches: [
      "Islamic architecture",
      "Interior design",
      "3D renders",
      "Architecture AI",
      "Travel & buildings",
    ],
    targetAudience:
      "Architecture students, professionals, design lovers, property investors 22-55",
    contentLanguage: "en-GB",

    shortsPerMonth: 60,   // Reels
    longFormPerMonth: 20, // carousels
    storiesPerMonth: 60,

    preferredHookArchetypes: ["curiosity-gap", "transformation", "bold-claim"],
    preferredVisualStyles: ["cinematic", "clean-minimal", "documentary"],
    brandColours: ["#1A1A2E", "#C9A84C", "#E8E4DC"],
    brandFonts: ["Playfair Display", "Raleway", "Cormorant Garamond"],

    postingWindows: [
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "09:00",
        timeBst: "10:00",
        label: "Morning Reels",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "14:00",
        timeBst: "15:00",
        label: "Afternoon Reels",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "20:00",
        timeBst: "21:00",
        label: "Evening Reels",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "10:00",
        timeBst: "11:00",
        label: "Morning Stories",
      },
      {
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeUtc: "22:00",
        timeBst: "23:00",
        label: "Evening Stories",
      },
    ],

    islamicComplianceRequired: true,
    adSenseEnabled: false,
    affiliateCategoriesAllowed: [
      "architecture tools",
      "design books",
      "courses",
      "property",
    ],

    channelIndex: 2,
    accessTokenEnvKey: "INSTAGRAM_ACCESS_TOKEN_CH2",
    pageIdEnvKey: "INSTAGRAM_PAGE_ID_CH2",

    targetSubscribersGain: 800,
    targetViewsThisMonth: 150000,
    targetEngagementRate: 7.0,
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getChannel(id: string): ChannelConfig | undefined {
  return CHANNELS.find((c) => c.id === id);
}

export function getChannelsByPlatform(platform: Platform): ChannelConfig[] {
  return CHANNELS.filter((c) => c.platform === platform);
}

export function getYouTubeChannels(): ChannelConfig[] {
  return getChannelsByPlatform("youtube");
}

export function getInstagramChannels(): ChannelConfig[] {
  return getChannelsByPlatform("instagram");
}

export function getTotalMonthlyVolume(): {
  shorts: number;
  longForm: number;
  stories: number;
  total: number;
} {
  const shorts = CHANNELS.reduce((sum, c) => sum + c.shortsPerMonth, 0);
  const longForm = CHANNELS.reduce((sum, c) => sum + c.longFormPerMonth, 0);
  const stories = CHANNELS.reduce((sum, c) => sum + c.storiesPerMonth, 0);
  return { shorts, longForm, stories, total: shorts + longForm + stories };
}
