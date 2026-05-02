// Created by BBMW0 Technologies | bbmw0.com
/**
 * YOUTUBEFORGE: YouTube Content and SEO Engine
 *
 * Generates fully optimised YouTube content packages using
 * NEUROMESH agents. Covers every layer of YouTube success:
 * discoverability, watch time, CTR, and monetisation.
 *
 * Platform policy compliance:
 *  - YouTube Community Guidelines
 *  - Advertiser-friendly content (required for monetisation)
 *  - No artificial view/subscriber inflation
 *  - No misleading metadata (clickbait with no substance)
 *  - Copyright compliance: no unlicensed music or footage
 *  - YPP (YouTube Partner Programme) eligibility maintained
 *  - All AI-generated content disclosed per YouTube policy
 *
 * Monetisation paths supported:
 *  - AdSense revenue (requires YPP: 1000 subs + 4000 watch hours)
 *  - YouTube Shorts bonus (1000 subs + 10M Shorts views)
 *  - Channel memberships
 *  - Super Thanks / Super Chat (live)
 *  - Merchandise shelf
 *  - Brand deals (integrated sponsorships)
 *  - Affiliate links in description
 */

import { mesh } from "../../core/neuromesh/mesh";
import { SynapseSignalFactory } from "../../core/synapse/protocol";
import { AGENT_REGISTRY } from "../../agents/registry/agent-registry";
import type { AgentDefinition } from "../../agents/registry/agent-registry";
import { nanaBanana } from "./nano-banana-engine";
import type { ContentDNA } from "./nano-banana-engine";

// ── YOUTUBE CONTENT TYPES ──────────────────────────────────────────────────────

export type YouTubeFormat =
  | "long-form"          // 8-20 min tutorial/essay, highest monetisation CPM
  | "short"              // Under 60s Shorts, viral potential
  | "documentary"        // 15-45 min, high watch time
  | "live-stream"        // Scheduled live, Super Chat enabled
  | "series-episode"     // Part of serialised content
  | "explainer"          // 3-8 min, educational
  | "review"             // Product/tool review, affiliate potential
  | "case-study";        // Real results, high trust signal

export type YouTubeNiche = "video-editing" | "ai-tools" | "tech" | "business" | "education" | "entertainment";

// ── YOUTUBEFORGE OUTPUT ────────────────────────────────────────────────────────

export interface YouTubeForgePackage {
  contentId: string;
  format: YouTubeFormat;
  niche: YouTubeNiche;

  // Discoverability (algorithm inputs)
  title: string;                   // 60 chars max, keyword-rich, compelling
  titleVariants: string[];         // A/B test options
  description: string;             // First 150 chars visible before fold
  tags: string[];                  // 15-30 relevant tags
  category: string;                // YouTube category
  language: string;

  // Click-through rate (CTR) layer
  thumbnailConcept: string;        // Detailed thumbnail design brief
  thumbnailText: string;           // 3-4 words max on thumbnail
  emotionalHook: string;           // The emotion thumbnail should trigger

  // Watch time (AVD) layer
  videoScript: string;             // Full structured script
  openingHook: string;             // First 30 seconds (most critical for retention)
  chapterMarkers: ChapterMarker[]; // Timestamps for YouTube chapters
  patternInterrupts: string[];     // Moments to re-engage at risk of drop-off
  endScreenCTA: string;            // Final 20 seconds call-to-action
  cardSuggestions: string[];       // Info cards to add during edit

  // Production notes
  shotList: string[];              // B-roll and main shots needed
  editingNotes: string;            // Pacing, transitions, effects
  audioNotes: string;              // Music, SFX, VO direction
  colorGrading: string;            // Grade direction

  // Monetisation
  monetisationLayer: YTMonetisationLayer;
  sponsorSegmentScript?: string;   // Mid-roll sponsor read if applicable
  affiliateProducts: AffiliateProduct[];

  // SEO
  seoKeywords: string[];           // Primary + secondary keywords
  searchVolumeTier: "high" | "medium" | "niche";
  competitorGap: string;           // What existing videos are missing

  // Policy
  contentWarnings: string[];       // Age restriction risks flagged
  aiDisclosure: string;            // Required AI content disclosure
  approvedForUpload: boolean;      // Requires human sign-off

  // Nano Banana uniqueness layer
  nanoBananaDNA: ContentDNA;       // Unique content fingerprint — guarantees no two videos are alike
}

export interface ChapterMarker {
  timestamp: string;               // e.g. "0:00", "2:15"
  title: string;
  purpose: "hook" | "context" | "main-content" | "demo" | "summary" | "cta";
}

export interface YTMonetisationLayer {
  primaryRevenue: "adsense" | "sponsorship" | "affiliate" | "membership" | "merchandise";
  adsenseEligible: boolean;
  estimatedCPM: string;            // GBP range per 1000 views
  sponsorPlacement?: "pre-roll" | "mid-roll" | "end";
  revenueEstimate: string;
}

export interface AffiliateProduct {
  name: string;
  category: string;
  descriptionLine: string;
  disclosureRequired: boolean;
}

// ── YOUTUBEFORGE ENGINE ───────────────────────────────────────────────────────

export class YouTubeForgeEngine {

  async generatePackage(options: {
    niche: YouTubeNiche;
    format: YouTubeFormat;
    topic: string;
    targetKeyword?: string;
    channelDescription?: string;
    sponsorDetails?: string;
    tenantId: string;
  }): Promise<YouTubeForgePackage> {

    const contentId = `yt-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const allAgents = AGENT_REGISTRY.getAllAgents();
    const contentTeam = this.selectContentTeam(allAgents, options.niche, options.format);

    const signal = SynapseSignalFactory.create({
      tenantId: options.tenantId,
      sessionId: `ytforge-${contentId}`,
      type: "TASK_EMIT",
      content: this.buildPrompt(options),
      sourceAgentId: "youtube-forge-engine",
      cognitiveMode: "creative",
      priority: 2,
      payload: {
        content: this.buildPrompt(options),
        language: "en",
        metadata: {
          platform: "youtube",
          format: options.format,
          niche: options.niche,
          topic: options.topic,
        },
      },
      requiredExpertise: ["YouTube", "video production", "SEO", "content strategy"],
    });

    const result = await mesh.execute(signal, new Map(contentTeam.map(a => [a.id, a])));

    return this.buildPackage(contentId, options, result.synthesis);
  }

  private buildPrompt(options: {
    niche: YouTubeNiche;
    format: YouTubeFormat;
    topic: string;
    targetKeyword?: string;
    channelDescription?: string;
    sponsorDetails?: string;
  }): string {
    return `
Generate a complete YouTube ${options.format} content package.

Topic: "${options.topic}"
Target keyword: ${options.targetKeyword ?? options.topic}
Niche: ${options.niche}
Channel: ${options.channelDescription ?? "Educational " + options.niche + " channel"}
Sponsor: ${options.sponsorDetails ?? "None"}

YOUTUBE ALGORITHM (2025) - optimise for these signals:
1. CTR (click-through rate): title + thumbnail must compel clicks
2. AVD (average view duration): structure must keep people watching
3. Engagement velocity: likes/comments in first 24 hours matter most
4. Session time: video should lead viewers to watch more
5. Subscriber conversion: end screen drives subscriptions

TITLE FORMULA: [Number/Power word] + [Keyword] + [Curiosity/Benefit]
Example: "5 Video Editing Tricks That Took Me 3 Years to Learn"

SCRIPT STRUCTURE for retention:
- Hook (0:00-0:30): Promise the outcome, show a result, ask a question
- Intro (0:30-1:30): Brief context, set expectations
- Content chunks (bulk): Each chunk ends with a mini-cliffhanger
- Pattern interrupts: every 60-90s, change camera angle/energy/subject
- CTA (last 20s): subscribe + next video + comment prompt

SEO: The description first 150 characters appear in search results.
Include target keyword in: title, first 100 chars of description, tags.

Output a complete, detailed, production-ready package.
    `.trim();
  }

  /**
   * Cleans NEUROMESH synthesis output for safe embedding in YouTube content fields.
   *
   * Returns "" for local-mode outputs (no ANTHROPIC_API_KEY) so caller fallbacks
   * (buildScriptScaffold, forged descriptions) activate automatically.
   * With a real API key, strips residual agent headers and returns the clean body.
   */
  private cleanSynthesis(synthesis: string): string {
    const isLocalMode =
      synthesis.includes("[Local mode:") ||
      /^As .+? department\), here is my analysis:/m.test(synthesis);

    if (isLocalMode) return "";   // Caller fallbacks take over

    return synthesis
      .split("\n")
      .filter(line => !/^\*\*[^*]+:\*\*/.test(line.trim()))
      .join("\n")
      .trim();
  }

  private buildPackage(
    contentId: string,
    options: { niche: YouTubeNiche; format: YouTubeFormat; topic: string; targetKeyword?: string; sponsorDetails?: string },
    synthesis: string
  ): YouTubeForgePackage {

    const keyword = options.targetKeyword ?? options.topic;
    const cleanBody = this.cleanSynthesis(synthesis);

    // Assign Nano Banana DNA — each video gets a unique fingerprint
    const recipeHint = options.format === "documentary" ? "documentary-deep-dive"
      : options.format === "case-study" ? "income-transparency"
      : options.format === "review" ? "authority-builder"
      : options.format === "short" ? "fast-tutorial"
      : options.format === "explainer" ? "shock-stat-hook"
      : options.format === "long-form" ? "social-proof-stack"
      : undefined;

    const { dna, recipe } = nanaBanana.assignDNA({
      contentId,
      platform: "youtube",
      topic:    options.topic,
      preferRecipe: recipeHint,
    });

    return {
      contentId,
      format: options.format,
      niche: options.niche,

      title:          `${options.topic}: Complete Guide (${new Date().getFullYear()})`,
      titleVariants:  [
        `How to Master ${options.topic} Step by Step`,
        `${options.topic} - Everything You Need to Know`,
        `I Tried ${options.topic} for 30 Days (Honest Results)`,
      ],
      description:    this.buildDescription(options.topic, keyword, cleanBody),
      tags:           this.generateTags(options.niche, options.topic),
      category:       this.getCategory(options.niche),
      language:       "en-GB",

      // NanaBanana-enhanced thumbnail and emotional hook
      thumbnailConcept: nanaBanana.enhanceThumbnail(options.topic, recipe),
      thumbnailText:  keyword.split(" ").slice(0, 3).join(" ").toUpperCase(),
      emotionalHook:  `${recipe.goal} — ${dna.tone} energy, ${dna.energy} pacing`,

      // videoScript uses cleaned synthesis; falls back to structured scaffold
      videoScript:        cleanBody || this.buildScriptScaffold(options.topic, options.format),
      // Opening hook is always Nano Banana archetype-driven — never echoes agent text
      openingHook:        nanaBanana.craftHook(options.topic, dna.hookArchetype),
      chapterMarkers:     this.buildChapters(options.format),
      patternInterrupts:  [
        "Cut to screen recording / demo at 2:00",
        "Camera angle change + music shift at 5:00",
        "Text overlay: 'THIS is the key bit' at 7:00",
        "Cut to B-roll of results at 10:00",
      ],
      endScreenCTA:       "If this helped you, subscribe now so you never miss another video like this. And watch this one next [gestures to suggested video card].",
      cardSuggestions:    [
        "Related tutorial at 2:00",
        "Playlist card at 5:00",
        "Subscribe reminder at 8:00",
      ],

      shotList: [
        "Talking head: main camera, eye-level, clean background",
        "Screen recording: tutorial sections",
        "Close-up B-roll: hands, keyboard, monitor",
        "Over-shoulder shot: working at desk",
        "Result reveal: before/after split screen",
      ],
      // NanaBanana recipe-specific editing and audio directives
      editingNotes:   nanaBanana.enhanceEditingNotes(recipe),
      audioNotes:     this.audioNotesForRecipe(recipe),
      colorGrading:   this.colorGradingForStyle(dna.visualStyle),

      monetisationLayer: this.buildYTMonetisation(options.format, options.sponsorDetails),
      sponsorSegmentScript: options.sponsorDetails
        ? `This video is sponsored by [Brand]. I use [product] personally because [genuine reason]. Get [discount] using the link in the description. It helps support the channel and I only work with brands I actually believe in.`
        : undefined,
      affiliateProducts: [
        { name: "Video editing software", category: "Software", descriptionLine: "The software I use to edit every video", disclosureRequired: true },
        { name: "Microphone", category: "Hardware", descriptionLine: "Best mic at this price point", disclosureRequired: true },
        { name: "Camera", category: "Hardware", descriptionLine: "Started with this camera, still love it", disclosureRequired: true },
      ],

      seoKeywords:        [keyword, `${keyword} tutorial`, `how to ${keyword}`, `${options.niche} tips`, `best ${keyword}`],
      searchVolumeTier:   "medium",
      competitorGap:      "Most existing videos are too long, skip the fundamentals, or do not show real results. This video solves all three.",

      contentWarnings: [],
      aiDisclosure:    "Some elements of this content were created with AI assistance. All information has been reviewed and verified by the creator.",
      approvedForUpload: false,
      nanoBananaDNA:   dna,
    };
  }

  private audioNotesForRecipe(recipe: { energy: string; visualStyle: string }): string {
    const byEnergy: Record<string, string> = {
      "explosive":  "High-energy track from YouTube Audio Library. Full volume in intro, -10dB under VO, back up on cuts.",
      "high":       "Upbeat background music from YouTube Audio Library. -15dB under VO. SFX on key transitions.",
      "medium":     "Lo-fi or mid-tempo instrumental. -18dB under VO. Light SFX on chapter transitions.",
      "calm":       "Minimal ambient track at -22dB. VO is the focus. Silence between sections is fine.",
      "reflective": "Soft acoustic or piano. -20dB. Let music swell during emotional beats then pull back.",
    };
    return (byEnergy[recipe.energy] ?? "Royalty-free music from YouTube Audio Library. -20dB under VO.") +
      " All audio royalty-free. VO at -6dB peak. 48kHz/16-bit or better.";
  }

  private colorGradingForStyle(visualStyle: string): string {
    const grades: Record<string, string> = {
      "cinematic":           "Warm cinematic grade. S-curve contrast. Lift shadows slightly. Boost mid-tones. Subtle vignette. 24fps playback.",
      "clean-minimal":       "Clean, neutral grade. Balanced whites. Slight desaturation (-5). Boost clarity. No vignette.",
      "energetic-fast-cut":  "Punchy, saturated grade. High contrast. Warm highlights. Deep shadows. Vibrant colours.",
      "documentary":         "Natural, slightly desaturated grade. Lift blacks slightly. Warm skin tones. Filmic grain at 10%.",
      "vlog-style":          "Natural, minimally graded. Match auto white balance. Skin tones accurate. Consistent across cuts.",
      "screen-dominant":     "Match screen colour temperature to face cam. Clean, bright screen recording. Face cam warm grade.",
      "animation-driven":    "Vivid, high-saturation palette. Match brand colours. Consistent colour system across all animations.",
      "talking-head-raw":    "Minimal grade. Neutral, clean. Subject looks natural. Background slightly underexposed to draw eye.",
    };
    return grades[visualStyle] ?? "Warm, saturated grade. Boost highlights. Clean whites. Skin tones natural. Consistent look.";
  }

  /** Structured script scaffold for local-mode (no LLM) — clean, publishable content. */
  private buildScriptScaffold(topic: string, format: YouTubeFormat): string {
    return `# ${topic} — Complete Guide

## HOOK (0:00-0:30)
Hey — before you skip, let me show you one thing about ${topic} that most people get completely wrong.
I spent [X] months figuring this out so you do not have to. Stick with me.

## CONTEXT (0:30-1:30)
Here is the situation. Most people approach ${topic} the hard way.
They spend hours on the wrong things. I used to do the same.
Today I am going to show you the approach that actually works.

## MAIN CONTENT (1:30 onwards)
Let us start with the foundation. When it comes to ${topic}, there are three things that matter above everything else.

### Point 1: Getting the fundamentals right
This is where most people skip ahead and regret it later.
The fundamentals of ${topic} are: clarity of goal, consistency of execution, and measurement of results.

### Point 2: The method that works
Here is the step-by-step approach I use for ${topic}.
[Walk through process with screen recording / demo footage]

### Point 3: The mistake to avoid
The single most common ${topic} mistake is trying to optimise before you have validated.
Do not do this. Validate first, then optimise.

## DEMO / PROOF
Let me show you this in action. [Screen recording segment]
You can see the difference immediately.

## SUMMARY
So to recap — when it comes to ${topic}:
1. Start with the fundamentals
2. Follow the proven method
3. Avoid the common mistake

## CTA (last 20 seconds)
If this helped you, subscribe — I post practical ${topic} content every week.
Drop your biggest ${topic} question in the comments and I will reply.
And watch this video next [gesture to card] — it goes deeper on this topic.`;
  }

  private buildDescription(topic: string, keyword: string, synthesis: string): string {
    const bodyText = synthesis.slice(0, 300).trim() ||
      `I cover everything you need to know about ${topic} — from the fundamentals to advanced techniques. ` +
      `Whether you are just starting out or looking to level up, this video has you covered. ` +
      `Watch until the end for the tip that changes everything.`;

    return `In this video, I show you everything about ${topic} that I wish I had known from day one.

${bodyText}

TIMESTAMPS:
00:00 Introduction
02:00 The fundamentals
05:00 Step-by-step walkthrough
10:00 Common mistakes to avoid
14:00 Advanced techniques
18:00 Results and next steps

USEFUL LINKS:
- My recommended tools: [link]
- Full playlist: [link]
- Free resources: [link]

CONNECT:
Instagram: [handle]
Website: [link]

DISCLOSURE: Some links above may be affiliate links. I only recommend products I personally use and believe in. Thank you for supporting the channel.

${keyword} | ${topic} tutorial | how to ${keyword}`;
  }

  private generateTags(niche: YouTubeNiche, topic: string): string[] {
    const base: Record<YouTubeNiche, string[]> = {
      "video-editing":  ["video editing","video editing tutorial","how to edit videos","premiere pro","davinci resolve","capcut"],
      "ai-tools":       ["ai tools","artificial intelligence","ai tutorial","chatgpt","claude ai","best ai tools"],
      "tech":           ["technology","tech tips","tech review","software","productivity","tech 2025"],
      "business":       ["business tips","entrepreneur","make money online","passive income","business strategy"],
      "education":      ["education","learning","how to","tutorial","explained","study tips"],
      "entertainment":  ["entertainment","funny","viral","reaction","challenge","trending"],
    };

    const topicTags = topic.toLowerCase().split(" ").filter(w => w.length > 2);
    return [...new Set([...base[niche], ...topicTags, topic, `${topic} 2025`, `${niche.replace("-", " ")} channel`])].slice(0, 30);
  }

  private getCategory(niche: YouTubeNiche): string {
    const map: Record<YouTubeNiche, string> = {
      "video-editing": "Film & Animation",
      "ai-tools":      "Science & Technology",
      "tech":          "Science & Technology",
      "business":      "Education",
      "education":     "Education",
      "entertainment": "Entertainment",
    };
    return map[niche];
  }

  private buildChapters(format: YouTubeFormat): ChapterMarker[] {
    const chapters: Record<YouTubeFormat, ChapterMarker[]> = {
      "long-form": [
        { timestamp: "0:00",  title: "Introduction", purpose: "hook" },
        { timestamp: "1:30",  title: "Why this matters", purpose: "context" },
        { timestamp: "3:00",  title: "The fundamentals", purpose: "main-content" },
        { timestamp: "7:00",  title: "Step-by-step demonstration", purpose: "demo" },
        { timestamp: "12:00", title: "Common mistakes", purpose: "main-content" },
        { timestamp: "16:00", title: "Advanced tips", purpose: "main-content" },
        { timestamp: "19:00", title: "Summary and next steps", purpose: "cta" },
      ],
      "short":          [{ timestamp: "0:00", title: "Main tip", purpose: "main-content" }],
      "documentary":    [
        { timestamp: "0:00",  title: "Opening", purpose: "hook" },
        { timestamp: "5:00",  title: "Background", purpose: "context" },
        { timestamp: "15:00", title: "Deep dive", purpose: "main-content" },
        { timestamp: "30:00", title: "Results", purpose: "demo" },
        { timestamp: "40:00", title: "Takeaways", purpose: "cta" },
      ],
      "live-stream":    [{ timestamp: "0:00", title: "Welcome", purpose: "hook" }],
      "series-episode": [
        { timestamp: "0:00", title: "Previously / recap", purpose: "context" },
        { timestamp: "2:00", title: "Today's episode", purpose: "main-content" },
        { timestamp: "10:00", title: "Key moments", purpose: "demo" },
        { timestamp: "18:00", title: "Next episode preview", purpose: "cta" },
      ],
      "explainer":      [
        { timestamp: "0:00", title: "The question", purpose: "hook" },
        { timestamp: "1:00", title: "The answer", purpose: "main-content" },
        { timestamp: "5:00", title: "Why it matters", purpose: "summary" },
        { timestamp: "7:00", title: "What to do next", purpose: "cta" },
      ],
      "review":         [
        { timestamp: "0:00", title: "First impressions", purpose: "hook" },
        { timestamp: "2:00", title: "Setup and features", purpose: "main-content" },
        { timestamp: "8:00", title: "Real-world testing", purpose: "demo" },
        { timestamp: "14:00", title: "Verdict", purpose: "summary" },
      ],
      "case-study":     [
        { timestamp: "0:00", title: "The problem", purpose: "hook" },
        { timestamp: "2:00", title: "The approach", purpose: "context" },
        { timestamp: "6:00", title: "What happened", purpose: "main-content" },
        { timestamp: "14:00", title: "Results", purpose: "demo" },
        { timestamp: "18:00", title: "What you can replicate", purpose: "cta" },
      ],
    };
    return chapters[format];
  }

  private buildYTMonetisation(format: YouTubeFormat, sponsorDetails?: string): YTMonetisationLayer {
    const cpmMap: Record<YouTubeFormat, string> = {
      "long-form":      "GBP 3-12 per 1000 views",
      "documentary":    "GBP 5-20 per 1000 views",
      "explainer":      "GBP 3-8 per 1000 views",
      "review":         "GBP 4-15 per 1000 views (tech/finance = higher)",
      "case-study":     "GBP 5-18 per 1000 views",
      "series-episode": "GBP 3-10 per 1000 views",
      "short":          "GBP 0.05-0.20 per 1000 views (volume game)",
      "live-stream":    "GBP 2-8 per 1000 + Super Chat",
    };

    return {
      primaryRevenue:   sponsorDetails ? "sponsorship" : "adsense",
      adsenseEligible:  !["short"].includes(format),
      estimatedCPM:     cpmMap[format],
      sponsorPlacement: sponsorDetails ? "mid-roll" : undefined,
      revenueEstimate:  `At 10k views: ${cpmMap[format].split(" ")[0]} ${parseInt(cpmMap[format].match(/\d+/)?.[0] ?? "5") * 10}. At 100k views: 10x that.`,
    };
  }

  private selectContentTeam(allAgents: AgentDefinition[], niche: YouTubeNiche, format: YouTubeFormat): AgentDefinition[] {
    const nicheKeywords: Record<YouTubeNiche, string[]> = {
      "video-editing": ["video", "editing", "production", "creative", "film"],
      "ai-tools":      ["AI", "technology", "digital", "innovation", "software"],
      "tech":          ["technology", "software", "digital", "engineering"],
      "business":      ["business", "strategy", "marketing", "growth"],
      "education":     ["education", "teaching", "content", "curriculum"],
      "entertainment": ["creative", "entertainment", "media", "content"],
    };

    return allAgents
      .filter(a => ["Creative", "Marketing", "Media", "Design", "Communications"].some(d => a.department?.includes(d)))
      .map(a => ({
        agent: a,
        score: nicheKeywords[niche].filter(k =>
          a.expertise?.some(e => e.toLowerCase().includes(k.toLowerCase()))
        ).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(s => s.agent);
  }
}

export const youtubeForge = new YouTubeForgeEngine();
export default youtubeForge;
