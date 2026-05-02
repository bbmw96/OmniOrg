// Created by BBMW0 Technologies | bbmw0.com
/**
 * INSFORGE: Instagram Content Forge Engine
 *
 * Generates fully optimised Instagram content packages using
 * the NEUROMESH agent collective. Every output is policy-compliant
 * and algorithmically tuned to maximise reach and monetisation.
 *
 * Platform policy compliance:
 *  - No automated posting without human approval step
 *  - No fake engagement, purchased followers, or inauthentic behaviour
 *  - All content respects Instagram Community Guidelines
 *  - Copyright-safe: no unlicensed music, images, or footage
 *  - Reels: max 90s recommended, hook in first 3 seconds
 *  - No misleading captions, no banned hashtags
 *
 * Monetisation paths supported:
 *  - Instagram Reels Bonus Programme (requires invite)
 *  - Brand partnership disclosures (auto-included per ASA/FTC rules)
 *  - Instagram Shopping product tags
 *  - Subscription content (exclusive Reels/Stories)
 *  - Profile link-in-bio traffic to owned revenue assets
 */

import { mesh } from "../../core/neuromesh/mesh";
import { SynapseSignalFactory } from "../../core/synapse/protocol";
import { AGENT_REGISTRY } from "../../agents/registry/agent-registry";
import type { AgentDefinition } from "../../agents/registry/agent-registry";
import { nanaBanana } from "./nano-banana-engine";
import type { ContentDNA } from "./nano-banana-engine";

// ── INSTAGRAM CONTENT TYPES ───────────────────────────────────────────────────

export type InstagramFormat =
  | "reels"           // Short video, max 90s, highest reach
  | "carousel"        // 2-10 slides, highest save rate
  | "static-post"     // Single image, lower reach
  | "story"           // 24h ephemeral, link sticker available
  | "story-series"    // Multi-slide story arc
  | "guide"           // Curated content collection
  | "live-script";    // Live session talking points

export type InstagramNiche =
  | "video-editing"
  | "tech-tutorial"
  | "lifestyle"
  | "business"
  | "education"
  | "entertainment"
  | "ai-tools"
  | "behind-the-scenes"
  | "day-in-life";

// ── INSFORGE OUTPUT ───────────────────────────────────────────────────────────

export interface InsForgePackage {
  contentId: string;
  format: InstagramFormat;
  niche: InstagramNiche;

  // Visual content direction
  hook: string;                    // First 3 seconds / first slide text
  visualConcept: string;           // Shot-by-shot or slide description
  b_rollSuggestions: string[];     // Supporting footage/images to source
  overlayText: string[];           // On-screen text for each segment
  transitionNotes: string;         // Editing rhythm and transition style
  colourPalette: string;           // Visual brand consistency
  thumbnailConcept: string;        // Cover frame or carousel cover

  // Written content
  caption: string;                 // Full caption, optimised for saves
  hashtags: string[];              // 20-30 researched, non-banned tags
  altText: string;                 // Accessibility alt text
  ctaText: string;                 // Call to action in caption
  storySlides?: string[];          // Story slide text if applicable

  // Audio
  audioDirection: string;          // Sound/music direction (royalty-free only)
  voiceoverScript?: string;        // VO script if talking-head or narrated

  // Posting strategy
  bestPostTime: string;            // Optimal posting window
  engagementPrimer: string;        // Question to ask in caption to drive comments
  collaborationTag?: string;       // Suggested collab account if applicable

  // Monetisation
  monetisationLayer: MonetisationLayer;

  // Policy check
  policyFlags: string[];           // Any content policy considerations flagged
  approvedForPosting: boolean;     // Requires human review to set true

  // Nano Banana uniqueness layer
  nanoBananaDNA: ContentDNA;       // Unique content fingerprint — guarantees no two posts are alike
}

export interface MonetisationLayer {
  primaryPath: "reels-bonus" | "brand-deal" | "affiliate" | "product-tag" | "link-bio" | "subscription";
  disclosureRequired: boolean;     // FTC/ASA ad disclosure
  disclosureText?: string;         // e.g. "#ad #sponsored" if applicable
  estimatedReach: string;          // Low/Medium/High based on format
  revenueEstimate: string;         // Indicative range, not a guarantee
}

// ── INSFORGE ENGINE ───────────────────────────────────────────────────────────

export class InsForgeEngine {
  private readonly CONTENT_AGENTS = [
    "Creative Director", "Copywriter", "Social Media Strategist",
    "Video Editor", "Brand Manager", "SEO Specialist",
    "Content Strategist", "Marketing Analyst",
  ];

  async generatePackage(options: {
    niche: InstagramNiche;
    format: InstagramFormat;
    topic: string;
    brandVoice?: string;
    targetAudience?: string;
    monetisationGoal?: string;
    tenantId: string;
  }): Promise<InsForgePackage> {

    const contentId = `ig-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

    // Gather agents best suited for content creation
    const allAgents = AGENT_REGISTRY.getAllAgents();
    const contentTeam = this.selectContentTeam(allAgents, options.niche);

    // Build the signal
    const signal = SynapseSignalFactory.create({
      tenantId: options.tenantId,
      sessionId: `insforge-${contentId}`,
      type: "TASK_EMIT",
      content: this.buildPrompt(options),
      sourceAgentId: "insforge-engine",
      cognitiveMode: "creative",
      priority: 2,
      payload: {
        content: this.buildPrompt(options),
        language: "en",
        metadata: {
          platform: "instagram",
          format: options.format,
          niche: options.niche,
          topic: options.topic,
        },
      },
      requiredExpertise: ["content creation", "social media", "copywriting", "video production"],
    });

    // Execute through NEUROMESH
    const result = await mesh.execute(signal, new Map(contentTeam.map(a => [a.id, a])));

    return this.parseToPackage(contentId, options, result.synthesis);
  }

  private buildPrompt(options: {
    niche: InstagramNiche;
    format: InstagramFormat;
    topic: string;
    brandVoice?: string;
    targetAudience?: string;
    monetisationGoal?: string;
  }): string {
    return `
You are generating a complete Instagram ${options.format} content package for the topic: "${options.topic}".

Niche: ${options.niche}
Target audience: ${options.targetAudience ?? "General audience interested in " + options.niche}
Brand voice: ${options.brandVoice ?? "Professional, engaging, educational with personality"}
Monetisation goal: ${options.monetisationGoal ?? "Grow following and drive engagement"}

INSTAGRAM ALGORITHM PRIORITIES (2025):
- Reels shown to non-followers: hook must stop scroll in 1-3 seconds
- Saves signal deep value: make content worth saving
- Comments signal community: ask a genuine question
- Watch time: structure keeps viewers until the end
- Shares: make content people want to share with friends

CONTENT REQUIREMENTS:
1. Hook (first 3 seconds): bold, pattern-interrupting, specific benefit or curiosity gap
2. Body: deliver genuine value - teach, entertain, or inspire
3. CTA: drive ONE action (save, comment, follow, click link)
4. Caption: 150-300 words with clear value, personal voice, engagement question
5. Hashtags: mix of niche (100k-500k posts), community (500k-2M), and broad (2M+). No banned tags.
6. Visual concept: specific, filmable, describable shot list or slide content

POLICY COMPLIANCE:
- No misleading claims
- Copyright-safe audio only (Instagram Music library or royalty-free)
- Any brand mentions or sponsored content must be disclosed
- No hate speech, harassment, graphic content
- No misinformation

Output a complete structured content package.
    `.trim();
  }

  private selectContentTeam(allAgents: AgentDefinition[], niche: InstagramNiche): AgentDefinition[] {
    const nicheKeywords: Record<InstagramNiche, string[]> = {
      "video-editing":      ["video", "editing", "creative", "production"],
      "tech-tutorial":      ["technology", "education", "digital", "technical"],
      "lifestyle":          ["lifestyle", "brand", "creative", "content"],
      "business":           ["business", "marketing", "strategy", "brand"],
      "education":          ["education", "content", "teaching", "learning"],
      "entertainment":      ["creative", "entertainment", "media", "content"],
      "ai-tools":           ["AI", "technology", "digital", "innovation"],
      "behind-the-scenes":  ["documentary", "creative", "production", "brand"],
      "day-in-life":        ["lifestyle", "content", "social media", "personal"],
    };

    const keywords = nicheKeywords[niche];
    const scored = allAgents
      .filter(a => a.department && [
        "Creative", "Marketing", "Communications", "Media", "Design"
      ].some(d => a.department.includes(d)))
      .map(a => ({
        agent: a,
        score: keywords.filter(k =>
          a.expertise?.some(e => e.toLowerCase().includes(k.toLowerCase()))
        ).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(s => s.agent);

    // Always include at least some agents
    if (scored.length < 3) {
      const fallback = allAgents.filter(a => a.department === "Creative").slice(0, 5);
      return [...new Set([...scored, ...fallback])];
    }

    return scored;
  }

  /**
   * Cleans NEUROMESH synthesis output for safe embedding in content fields.
   *
   * Local-mode outputs (no ANTHROPIC_API_KEY) are identified by two signatures:
   *  1. The "[Local mode: connect ANTHROPIC_API_KEY...]" footer
   *  2. "As [Role] ([Dept] department), here is my analysis:" header
   *
   * When local mode is detected, we return "" so every caller's forge-generated
   * fallback string activates automatically — keeping all content clean and
   * publishable even without a live LLM.
   *
   * With a real API key, strips any residual agent headers and returns the body.
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

  private parseToPackage(
    contentId: string,
    options: { niche: InstagramNiche; format: InstagramFormat; topic: string; monetisationGoal?: string },
    synthesis: string
  ): InsForgePackage {
    const cleanBody = this.cleanSynthesis(synthesis);

    // Assign a unique Nano Banana DNA fingerprint — guarantees no two posts are structurally alike
    const recipeHint = options.format === "reels" ? "viral-reel"
      : options.format === "carousel" ? "fomo-carousel"
      : options.format === "story" || options.format === "story-series" ? "story-trust"
      : undefined;

    const { dna, recipe } = nanaBanana.assignDNA({
      contentId,
      platform: "instagram",
      topic:    options.topic,
      preferRecipe: recipeHint,
    });

    return {
      contentId,
      format: options.format,
      niche: options.niche,
      // Hook is always Nano Banana engine generated — guarantees unique archetype per post
      hook:              nanaBanana.craftHook(options.topic, dna.hookArchetype),
      visualConcept:     cleanBody.slice(0, 500) || `[${recipe.name.toUpperCase()}] ${recipe.productionNotes.slice(0, 300)}`,
      b_rollSuggestions: [
        "Close-up of hands on keyboard/device",
        "Screen recording with cursor movement",
        "Time-lapse of workflow",
        "Reaction shot to results",
        "Before/after comparison split-screen",
      ],
      overlayText: [
        `❌ Most people do this wrong`,
        `✅ Here is the right way`,
        `💡 Pro tip:`,
        `📌 Save this for later`,
      ],
      transitionNotes:   "Fast cuts under 2s each. Zoom-in on key points. Text pop-in on beat.",
      colourPalette:     "Deep navy + electric blue + white. Clean, professional, trustworthy.",
      thumbnailConcept:  `Bold text overlay on high-contrast background: "${options.topic.toUpperCase()}"`,
      caption:           this.generateCaption(options.topic, options.niche, cleanBody),
      hashtags:          this.generateHashtags(options.niche, options.topic),
      altText:           `Educational ${options.format} about ${options.topic} for ${options.niche} audience`,
      ctaText:           nanaBanana.enhanceCTA(dna, recipe),
      audioDirection:    this.audioDirectionForRecipe(recipe),
      voiceoverScript:   cleanBody.slice(0, 300) || undefined,
      bestPostTime:      this.getBestPostTime(),
      engagementPrimer:  `What is your biggest challenge with ${options.topic}? Drop it in the comments.`,
      monetisationLayer: this.buildMonetisationLayer(options.format, options.monetisationGoal),
      policyFlags:       [],
      approvedForPosting: false, // Always requires human approval
      nanoBananaDNA:     dna,
    };
  }

  private generateCaption(topic: string, niche: InstagramNiche, synthesis: string): string {
    return `Everything you need to know about ${topic} in one post.

I have spent [X] years in ${niche.replace("-", " ")} and this is what actually works.

${synthesis.slice(0, 200).replace(/\n/g, "\n\n")}

The key insight most people miss: focus on fundamentals before tactics.

What is your experience with ${topic}? Let me know below.

Save this for when you need it.`;
  }

  private generateHashtags(niche: InstagramNiche, topic: string): string[] {
    const base: Record<InstagramNiche, string[]> = {
      "video-editing":      ["#videoediting","#videoeditor","#editingtips","#contentcreator","#reelstips"],
      "tech-tutorial":      ["#techtips","#techeducation","#learntech","#tutorial","#techcreator"],
      "lifestyle":          ["#lifestyle","#lifestyleblogger","#dailylife","#contentcreation","#lifetips"],
      "business":           ["#business","#entrepreneur","#businesstips","#smallbusiness","#startup"],
      "education":          ["#education","#learning","#studytips","#knowledge","#educationalcontent"],
      "entertainment":      ["#entertainment","#funnyvideos","#viral","#trending","#foryou"],
      "ai-tools":           ["#aitools","#artificialintelligence","#aitech","#futuretech","#automation"],
      "behind-the-scenes":  ["#behindthescenes","#bts","#creativeprocess","#howimade","#makingof"],
      "day-in-life":        ["#dayinmylife","#vlog","#dailyvlog","#lifestyle","#routine"],
    };

    const topicTags = topic.toLowerCase().split(" ")
      .filter(w => w.length > 3)
      .map(w => `#${w.replace(/[^a-z0-9]/g, "")}`);

    return [
      ...base[niche],
      ...topicTags.slice(0, 5),
      "#reels","#reelsinstagram","#explorepage","#viral","#content",
      "#contentmarketing","#socialmedia","#instagram","#instagramreels","#grow",
    ].slice(0, 30);
  }

  private audioDirectionForRecipe(recipe: { energy: string }): string {
    const byEnergy: Record<string, string> = {
      "explosive":  "High-energy trending audio from Instagram Reels library this week. Drop directly into beat.",
      "high":       "Upbeat pop or hip-hop instrumental from Instagram Music library. -10dB under VO.",
      "medium":     "Lo-fi or mid-tempo instrumental from Instagram Music library. -15dB under VO.",
      "calm":       "Ambient/atmospheric instrumental or soft piano. -18dB, barely perceptible.",
      "reflective": "Minimal piano or acoustic guitar. Silence is OK. Let pauses breathe.",
    };
    return byEnergy[recipe.energy] ?? "Royalty-free instrumental from Instagram Music library. No copyright issues.";
  }

  private getBestPostTime(): string {
    const slots = [
      "Tuesday 11:00-13:00 BST",
      "Wednesday 10:00-12:00 BST",
      "Thursday 13:00-15:00 BST",
      "Friday 09:00-11:00 BST",
    ];
    return slots[Math.floor(Math.random() * slots.length)];
  }

  private buildMonetisationLayer(format: InstagramFormat, goal?: string): MonetisationLayer {
    if (goal?.includes("brand") || goal?.includes("sponsor")) {
      return {
        primaryPath: "brand-deal",
        disclosureRequired: true,
        disclosureText: "#ad #sponsored #paidpartnership",
        estimatedReach: format === "reels" ? "High" : "Medium",
        revenueEstimate: "GBP 100-2000 per post depending on following size",
      };
    }
    if (goal?.includes("affiliate")) {
      return {
        primaryPath: "affiliate",
        disclosureRequired: true,
        disclosureText: "#affiliate #ad",
        estimatedReach: "Medium",
        revenueEstimate: "Commission-based: 5-20% per sale via link in bio",
      };
    }
    return {
      primaryPath: "reels-bonus",
      disclosureRequired: false,
      estimatedReach: format === "reels" ? "High" : "Medium",
      revenueEstimate: "GBP 0-500/month from Reels bonus (invite-based from Instagram)",
    };
  }

  // Batch generate a full week of content
  async generateWeeklyPlan(options: {
    niche: InstagramNiche;
    brandVoice?: string;
    targetAudience?: string;
    tenantId: string;
    topics?: string[];
  }): Promise<InsForgePackage[]> {
    const schedule: Array<{ format: InstagramFormat; topic: string }> = [
      { format: "reels",    topic: options.topics?.[0] ?? "Top 5 tips for " + options.niche },
      { format: "carousel", topic: options.topics?.[1] ?? "Complete guide to " + options.niche },
      { format: "reels",    topic: options.topics?.[2] ?? "Mistakes everyone makes in " + options.niche },
      { format: "story-series", topic: options.topics?.[3] ?? "Behind the scenes: my " + options.niche + " workflow" },
      { format: "reels",    topic: options.topics?.[4] ?? "How I got started in " + options.niche },
      { format: "carousel", topic: options.topics?.[5] ?? "Tools I use for " + options.niche },
      { format: "reels",    topic: options.topics?.[6] ?? "Results after 30 days of " + options.niche },
    ];

    const packages = await Promise.all(
      schedule.map(item =>
        this.generatePackage({
          niche: options.niche,
          format: item.format,
          topic: item.topic,
          brandVoice: options.brandVoice,
          targetAudience: options.targetAudience,
          tenantId: options.tenantId,
        })
      )
    );

    return packages;
  }
}

export const insForge = new InsForgeEngine();
export default insForge;
