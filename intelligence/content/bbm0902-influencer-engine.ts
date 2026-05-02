// Created by BBMW0 Technologies | bbmw0.com

import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { geminiClient, InfluencerResearch, ShortsScript } from "./gemini-client";
import { composioPublisher } from "./composio-publisher";
import { affiliateEngine } from "./affiliate-engine";
import { agentSecurity } from "../security/agent-security-engine";
import type { SecurityAuditReport } from "../security/agent-security-engine";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface InfluencerProfile {
  name: string;
  platform: string;
  handle: string;
  contentNiche: string;
  approximateSubscribers: string;
}

export interface PostTimeSlot {
  label: string;
  timeUtc: string;
  timeBst: string;
  reason: string;
}

export interface InfluencerShortPackage {
  contentId: string;
  influencer: InfluencerProfile;
  geminiResearch: InfluencerResearch;
  claudeEnhancement: string;
  script: ShortsScript;
  composioPlan: object[];
  securityReport: SecurityAuditReport;
  estimatedViews: number;
  bestPostTime: string;
  approvedForPosting: boolean;
}

// ---------------------------------------------------------------------------
// Influencer pool (30 creators)
// ---------------------------------------------------------------------------

const INFLUENCER_POOL: InfluencerProfile[] = [
  // Tech / Gaming
  {
    name: "MrBeast",
    platform: "YouTube",
    handle: "@MrBeast",
    contentNiche: "Entertainment & Philanthropy",
    approximateSubscribers: "300M+",
  },
  {
    name: "Marques Brownlee",
    platform: "YouTube",
    handle: "@MKBHD",
    contentNiche: "Tech Reviews",
    approximateSubscribers: "18M+",
  },
  {
    name: "Linus Sebastian",
    platform: "YouTube",
    handle: "@LinusTechTips",
    contentNiche: "Tech Education",
    approximateSubscribers: "15M+",
  },
  {
    name: "Mark Rober",
    platform: "YouTube",
    handle: "@MarkRober",
    contentNiche: "Science & Engineering",
    approximateSubscribers: "50M+",
  },
  {
    name: "Veritasium",
    platform: "YouTube",
    handle: "@veritasium",
    contentNiche: "Science Education",
    approximateSubscribers: "15M+",
  },
  {
    name: "Kurzgesagt",
    platform: "YouTube",
    handle: "@kurzgesagt",
    contentNiche: "Science Animation",
    approximateSubscribers: "22M+",
  },
  {
    name: "3Blue1Brown",
    platform: "YouTube",
    handle: "@3blue1brown",
    contentNiche: "Mathematics Education",
    approximateSubscribers: "6M+",
  },
  {
    name: "Tom Scott",
    platform: "YouTube",
    handle: "@TomScottGo",
    contentNiche: "Geography & Science",
    approximateSubscribers: "6M+",
  },
  {
    name: "CGP Grey",
    platform: "YouTube",
    handle: "@CGPGrey",
    contentNiche: "Education & Politics",
    approximateSubscribers: "5M+",
  },
  {
    name: "Fireship",
    platform: "YouTube",
    handle: "@Fireship",
    contentNiche: "Programming & Tech",
    approximateSubscribers: "3M+",
  },
  // AI / Tech
  {
    name: "Two Minute Papers",
    platform: "YouTube",
    handle: "@TwoMinutePapers",
    contentNiche: "AI Research",
    approximateSubscribers: "1.4M+",
  },
  {
    name: "Lex Fridman",
    platform: "YouTube",
    handle: "@lexfridman",
    contentNiche: "AI & Deep Conversations",
    approximateSubscribers: "4M+",
  },
  {
    name: "Andrej Karpathy",
    platform: "YouTube",
    handle: "@AndrejKarpathy",
    contentNiche: "AI & Machine Learning",
    approximateSubscribers: "800K+",
  },
  {
    name: "Sam Altman",
    platform: "YouTube",
    handle: "@sama",
    contentNiche: "AI & Entrepreneurship",
    approximateSubscribers: "500K+",
  },
  {
    name: "Greg Brockman",
    platform: "YouTube",
    handle: "@gbrockman",
    contentNiche: "AI & Engineering",
    approximateSubscribers: "300K+",
  },
  {
    name: "Demis Hassabis",
    platform: "YouTube",
    handle: "@DemisHassabis",
    contentNiche: "AI & Science",
    approximateSubscribers: "200K+",
  },
  // Motivation / Business
  {
    name: "Ali Abdaal",
    platform: "YouTube",
    handle: "@aliabdaal",
    contentNiche: "Productivity & Lifestyle",
    approximateSubscribers: "5M+",
  },
  {
    name: "Thomas Frank",
    platform: "YouTube",
    handle: "@ThomasFrank",
    contentNiche: "Productivity & Study",
    approximateSubscribers: "3M+",
  },
  {
    name: "Matt D'Avella",
    platform: "YouTube",
    handle: "@mattdavella",
    contentNiche: "Minimalism & Lifestyle",
    approximateSubscribers: "4M+",
  },
  {
    name: "Andrew Huberman",
    platform: "YouTube",
    handle: "@hubermanlab",
    contentNiche: "Neuroscience & Health",
    approximateSubscribers: "6M+",
  },
  {
    name: "Naval Ravikant",
    platform: "YouTube",
    handle: "@naval",
    contentNiche: "Philosophy & Business",
    approximateSubscribers: "500K+",
  },
  {
    name: "Sahil Bloom",
    platform: "YouTube",
    handle: "@SahilBloom",
    contentNiche: "Business & Finance",
    approximateSubscribers: "400K+",
  },
  // Video Editing / Creative
  {
    name: "Peter McKinnon",
    platform: "YouTube",
    handle: "@PeterMcKinnon",
    contentNiche: "Photography & Film",
    approximateSubscribers: "5M+",
  },
  {
    name: "Corridor Crew",
    platform: "YouTube",
    handle: "@CorridorCrew",
    contentNiche: "VFX & Film Analysis",
    approximateSubscribers: "6M+",
  },
  {
    name: "Film Riot",
    platform: "YouTube",
    handle: "@FilmRiot",
    contentNiche: "Filmmaking Education",
    approximateSubscribers: "1M+",
  },
  {
    name: "Casey Neistat",
    platform: "YouTube",
    handle: "@CaseyNeistat",
    contentNiche: "Vlogging & Storytelling",
    approximateSubscribers: "12M+",
  },
  {
    name: "Yes Theory",
    platform: "YouTube",
    handle: "@YesTheory",
    contentNiche: "Adventure & Personal Growth",
    approximateSubscribers: "9M+",
  },
  // Extra to fill 30
  {
    name: "Vsauce",
    platform: "YouTube",
    handle: "@Vsauce",
    contentNiche: "Science & Philosophy",
    approximateSubscribers: "18M+",
  },
  {
    name: "Wendover Productions",
    platform: "YouTube",
    handle: "@Wendover",
    contentNiche: "Geopolitics & Economics",
    approximateSubscribers: "4M+",
  },
  {
    name: "Johnny Harris",
    platform: "YouTube",
    handle: "@johnnyharris",
    contentNiche: "Geopolitics & Journalism",
    approximateSubscribers: "5M+",
  },
];

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class Bbm0902InfluencerEngine {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  pickDailyInfluencer(seed?: string): InfluencerProfile {
    let index: number;
    if (seed) {
      // Simple deterministic hash from seed string
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
      }
      index = hash % INFLUENCER_POOL.length;
    } else {
      // Use day of year as rotation index
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now.getTime() - start.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      index = dayOfYear % INFLUENCER_POOL.length;
    }
    return INFLUENCER_POOL[index];
  }

  async generateInfluencerShort(
    influencerName?: string
  ): Promise<InfluencerShortPackage> {
    const contentId = uuidv4();
    const profile = influencerName
      ? INFLUENCER_POOL.find(
          (p) => p.name.toLowerCase() === influencerName.toLowerCase()
        ) ?? this.pickDailyInfluencer(influencerName)
      : this.pickDailyInfluencer();

    // Step 1: Security audit
    const securityCtx = {
      agentId: "bbm0902-influencer-engine",
      tenantId: "bbm0902",
      operation: "generate-influencer-short",
      timestamp: new Date().toISOString(),
    };
    const securityReport = await agentSecurity.runFullSecurityAudit(securityCtx);

    // Step 2: Gemini Pro — research the influencer
    let geminiResearch: InfluencerResearch;
    try {
      geminiResearch = await geminiClient.researchInfluencer(profile.name);
    } catch (geminiErr) {
      console.error(
        "[Bbm0902InfluencerEngine] Gemini research failed, falling back to Claude-only:",
        geminiErr
      );
      geminiResearch = {
        name: profile.name,
        platform: profile.platform,
        subscribers: profile.approximateSubscribers,
        niche: profile.contentNiche,
        top3Achievements: [
          "Built an incredible community",
          "Created viral content that inspired millions",
          "Consistently delivered high-quality work for years",
        ],
        personalityTraits: ["Authentic", "Creative", "Passionate"],
        contentStyle: "Engaging and educational",
        recentHighlight: "Continues to push boundaries in their niche",
        whyPeopleLoveThm:
          "Their genuine passion and the incredible value they bring to every video",
      };
    }

    // Step 3: Claude — enhance the research
    let claudeEnhancement: string;
    try {
      const claudeResponse = await this.anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        system:
          "You are a viral Shorts scriptwriter. Make content exciting, positive, and shareable. Always focus on what makes people LOVE this creator.",
        messages: [
          {
            role: "user",
            content:
              JSON.stringify(geminiResearch) +
              "\n\nEnhance this with 2 surprising facts and a viral hook idea.",
          },
        ],
      });
      const firstBlock = claudeResponse.content[0];
      claudeEnhancement =
        firstBlock.type === "text"
          ? firstBlock.text
          : JSON.stringify(firstBlock);
    } catch (claudeErr) {
      console.error(
        "[Bbm0902InfluencerEngine] Claude enhancement failed:",
        claudeErr
      );
      claudeEnhancement =
        "Enhancement unavailable — proceeding with Gemini research only.";
    }

    // Build enhanced research object by merging Claude insight
    const enhancedResearch: InfluencerResearch = {
      ...geminiResearch,
      whyPeopleLoveThm:
        geminiResearch.whyPeopleLoveThm +
        " (Claude insight: " +
        claudeEnhancement.slice(0, 200) +
        "...)",
    };

    // Step 4: Generate Shorts script via Gemini
    let script: ShortsScript;
    try {
      script = await geminiClient.generateShortsScript(
        enhancedResearch,
        "positive highlights"
      );
    } catch (scriptErr) {
      console.error(
        "[Bbm0902InfluencerEngine] Script generation failed, using fallback:",
        scriptErr
      );
      script = {
        hook:
          "This creator is changing the world — you need to know about " +
          profile.name +
          "!",
        mainContent: {
          point1:
            profile.name + " has " + profile.approximateSubscribers + " subscribers for a reason",
          point2: "Their content in " + profile.contentNiche + " is unmatched",
          point3:
            "Millions of people's lives have been improved by their work",
        },
        cta: "Follow @bbm0902 for daily creator spotlights!",
        captionText:
          "Celebrating " +
          profile.name +
          " — one of the greatest creators of our time! #Shorts",
        hashtags: [
          "#Shorts",
          "#" + profile.name.replace(/\s+/g, ""),
          "#Creator",
          "#Inspiration",
          "#YouTube",
          "#ContentCreator",
          "#bbm0902",
        ],
      };
    }

    // Step 5: Inject affiliate links
    let affiliateResult: { enhancedDescription: string };
    try {
      affiliateResult = await affiliateEngine.injectIntoDescription(
        script.captionText,
        script.hashtags,
        profile.name
      );
    } catch (affErr) {
      console.error(
        "[Bbm0902InfluencerEngine] Affiliate injection failed:",
        affErr
      );
      affiliateResult = { enhancedDescription: script.captionText };
    }

    // Step 6: Build Composio plan
    let composioPlan: object[] = [];
    try {
      composioPlan = await composioPublisher.getBbm0902ShortPlan({
        contentId,
        videoS3Key: "RECORD_AND_UPLOAD",
        title: script.hook,
        description: affiliateResult.enhancedDescription,
        tags: script.hashtags,
        categoryId: "24",
        privacyStatus: "public",
        approvedBy: "bbm0902-engine",
      });
    } catch (composioErr) {
      console.error(
        "[Bbm0902InfluencerEngine] Composio plan failed:",
        composioErr
      );
      composioPlan = [];
    }

    // Step 7: Build and return the package
    const postSlots = this.getOptimalPostSchedule();
    const bestPostTime =
      postSlots.length > 0 ? postSlots[0].timeBst : "8:00 AM BST";

    const estimatedViews = this.estimateViews(profile);

    const pkg: InfluencerShortPackage = {
      contentId,
      influencer: profile,
      geminiResearch,
      claudeEnhancement,
      script,
      composioPlan,
      securityReport,
      estimatedViews,
      bestPostTime,
      approvedForPosting: false,
    };

    return pkg;
  }

  async generateWeeklyBatch(): Promise<InfluencerShortPackage[]> {
    const days = [0, 1, 2, 3, 4, 5, 6];
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const baseDayOfYear = Math.floor(diff / oneDay);

    const tasks = days.map((offset) => {
      const idx = (baseDayOfYear + offset) % INFLUENCER_POOL.length;
      const influencer = INFLUENCER_POOL[idx];
      return this.generateInfluencerShort(influencer.name);
    });

    const results = await Promise.all(tasks);
    return results;
  }

  getOptimalPostSchedule(): PostTimeSlot[] {
    return [
      {
        label: "Morning Peak",
        timeUtc: "07:00 UTC",
        timeBst: "8:00 AM BST",
        reason:
          "Commuters checking phones before work — highest early engagement window for UK and European audience",
      },
      {
        label: "Afternoon Surge",
        timeUtc: "13:00 UTC",
        timeBst: "2:00 PM BST",
        reason:
          "Lunch break browsing peaks — strong engagement from UK, EU, and overlap with US East Coast morning",
      },
      {
        label: "Evening Prime",
        timeUtc: "19:00 UTC",
        timeBst: "8:00 PM BST",
        reason:
          "Post-dinner relaxation window — maximum cross-timezone reach including full US audience; YouTube Shorts algorithm amplification highest",
      },
    ];
  }

  private estimateViews(profile: InfluencerProfile): number {
    const subsStr = profile.approximateSubscribers.replace(/[^0-9.KMB]/gi, "");
    let multiplier = 1;
    if (subsStr.includes("B") || subsStr.toUpperCase().includes("B")) {
      multiplier = 1_000_000_000;
    } else if (subsStr.includes("M") || subsStr.toUpperCase().includes("M")) {
      multiplier = 1_000_000;
    } else if (subsStr.includes("K") || subsStr.toUpperCase().includes("K")) {
      multiplier = 1_000;
    }
    const base = parseFloat(subsStr.replace(/[KMB]/gi, "")) || 1;
    const totalSubs = base * multiplier;
    // Shorts typically get 0.5-2% of subscriber base as initial views
    return Math.round(totalSubs * 0.01);
  }
}

export const bbm0902Engine = new Bbm0902InfluencerEngine();
export default bbm0902Engine;
