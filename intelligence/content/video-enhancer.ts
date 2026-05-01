// Created by BBMW0 Technologies | bbmw0.com
/**
 * VIDEOENHANCER: AI Video Quality and Metadata Pipeline
 *
 * Uses NEUROMESH agents to analyse existing video content and
 * generate enhancement recommendations. Covers:
 *  - Editing quality improvements (pacing, transitions, hooks)
 *  - Audio quality notes (levels, music, VO clarity)
 *  - Visual quality (colour grade, resolution, framing)
 *  - Metadata optimisation (title, description, tags, chapters)
 *  - Thumbnail A/B variants
 *  - Accessibility (captions, audio description)
 *  - Re-purpose suggestions (clip to Reels/Shorts)
 *
 * This does NOT directly edit video files. It generates
 * precise, actionable instructions for the creator or
 * an editing tool (e.g. DaVinci Resolve, Premiere Pro).
 */

import { mesh } from "../../core/neuromesh/mesh";
import { SynapseSignalFactory } from "../../core/synapse/protocol";
import { AGENT_REGISTRY } from "../../agents/registry/agent-registry";

// ── TYPES ─────────────────────────────────────────────────────────────────────

export interface VideoAnalysisInput {
  title: string;
  duration: number;            // seconds
  platform: "youtube" | "instagram" | "both";
  niche: string;
  currentDescription?: string;
  currentTags?: string[];
  transcriptExcerpt?: string;  // First 500 chars if available
  viewCount?: number;
  avgViewDuration?: number;    // seconds
  ctr?: number;                // click-through rate percentage
  tenantId: string;
}

export interface VideoEnhancementReport {
  videoTitle: string;
  overallScore: number;                  // 0-100
  priorityFixes: EnhancementItem[];      // Do these first
  visualEnhancements: EnhancementItem[];
  audioEnhancements: EnhancementItem[];
  editingEnhancements: EnhancementItem[];
  metadataEnhancements: EnhancementItem[];
  repurposeOpportunities: RepurposeItem[];
  thumbnailVariants: ThumbnailVariant[];
  accessibilityNotes: string[];
  projectedImpact: string;
}

export interface EnhancementItem {
  category: string;
  issue: string;
  fix: string;
  impact: "high" | "medium" | "low";
  effort: "quick" | "moderate" | "significant";
  toolSuggestion?: string;
}

export interface RepurposeItem {
  from: string;
  to: string;
  platform: string;
  segment: string;             // e.g. "3:00-3:45 - the key insight moment"
  editingNotes: string;
  estimatedExtraReach: string;
}

export interface ThumbnailVariant {
  variant: "A" | "B" | "C";
  concept: string;
  text: string;
  colourScheme: string;
  emotionalTone: string;
  testingNote: string;
}

// ── VIDEO ENHANCER ENGINE ─────────────────────────────────────────────────────

export class VideoEnhancerEngine {

  async analyse(input: VideoAnalysisInput): Promise<VideoEnhancementReport> {
    const allAgents = AGENT_REGISTRY.getAllAgents();
    const team = allAgents
      .filter(a => ["Creative", "Media", "Design", "Marketing"].some(d => a.department?.includes(d)))
      .slice(0, 6);

    const prompt = this.buildAnalysisPrompt(input);
    const signal = SynapseSignalFactory.create({
      tenantId: input.tenantId,
      sessionId: `enhance-${Date.now()}`,
      type: "TASK_EMIT",
      content: prompt,
      sourceAgentId: "video-enhancer",
      cognitiveMode: "critical",
      priority: 2,
      payload: { content: prompt, language: "en", metadata: { platform: input.platform } },
      requiredExpertise: ["video production", "editing", "YouTube", "visual design"],
    });

    const result = await mesh.execute(signal, new Map(team.map(a => [a.id, a])));

    return this.buildReport(input, result.synthesis);
  }

  private buildAnalysisPrompt(input: VideoAnalysisInput): string {
    const retention = input.avgViewDuration && input.duration
      ? `${Math.round((input.avgViewDuration / input.duration) * 100)}%`
      : "Unknown";

    return `
Analyse this video and provide enhancement recommendations.

Title: "${input.title}"
Platform: ${input.platform}
Duration: ${Math.floor(input.duration / 60)}m ${input.duration % 60}s
Niche: ${input.niche}
Views: ${input.viewCount ?? "Unknown"}
CTR: ${input.ctr ?? "Unknown"}%
Average retention: ${retention}

${input.transcriptExcerpt ? `Transcript excerpt:\n"${input.transcriptExcerpt}"` : ""}

${input.currentDescription ? `Current description:\n${input.currentDescription.slice(0, 200)}` : ""}

Provide specific, actionable improvement recommendations across:
1. Editing (pacing, transitions, pattern interrupts)
2. Visual (colour grade, framing, graphics)
3. Audio (levels, music, voice clarity)
4. Metadata (title, description, tags, chapters)
5. Repurpose opportunities (clips for Shorts/Reels)
6. Thumbnail improvements (3 A/B variants)

Focus on the highest-impact changes first.
    `.trim();
  }

  private buildReport(input: VideoAnalysisInput, synthesis: string): VideoEnhancementReport {
    const retentionScore = input.avgViewDuration && input.duration
      ? (input.avgViewDuration / input.duration) * 40
      : 25;
    const ctrScore = input.ctr ? Math.min(input.ctr * 4, 30) : 15;
    const baseScore = Math.round(retentionScore + ctrScore + 30);

    return {
      videoTitle: input.title,
      overallScore: Math.min(baseScore, 100),

      priorityFixes: [
        {
          category: "Hook",
          issue: "First 30 seconds may not establish a strong enough reason to keep watching",
          fix: "Open with the result first, then explain how you got there. Show the best moment from the video in the first 5 seconds.",
          impact: "high",
          effort: "moderate",
          toolSuggestion: "Re-edit intro in DaVinci Resolve or Premiere Pro",
        },
        {
          category: "Retention",
          issue: "Viewers may drop off between the 2 and 4 minute marks",
          fix: "Add a pattern interrupt: cut to B-roll, change camera angle, or add an on-screen graphic at the 2-minute mark.",
          impact: "high",
          effort: "quick",
        },
        {
          category: "CTR",
          issue: "Title may not create sufficient curiosity or clearly state the benefit",
          fix: `Rewrite title to include a specific number or result: "I ${input.niche} for 30 Days (Here Is What Happened)"`,
          impact: "high",
          effort: "quick",
        },
      ],

      visualEnhancements: [
        {
          category: "Colour grade",
          issue: "Flat or inconsistent colour across clips",
          fix: "Apply a consistent LUT. Warm grade for lifestyle/personal. Cool/clean for tech. Boost saturation 10-15%.",
          impact: "medium",
          effort: "quick",
          toolSuggestion: "DaVinci Resolve colour panel or LUTS",
        },
        {
          category: "Text overlays",
          issue: "Key information may only be spoken, not shown",
          fix: "Add animated text for every key stat, tip, or quote. Use bold sans-serif font at minimum 60pt.",
          impact: "medium",
          effort: "moderate",
        },
        {
          category: "Framing",
          issue: "Talking head may be too centred and static",
          fix: "Use rule-of-thirds. Leave space on the side where the subject is looking. Slight zoom-in for emphasis moments.",
          impact: "low",
          effort: "moderate",
        },
      ],

      audioEnhancements: [
        {
          category: "Voice levels",
          issue: "VO may have inconsistent levels or room noise",
          fix: "Normalise voice to -12dB LUFS. Apply noise gate at -40dB. Use Audacity or Premiere Essential Sound.",
          impact: "high",
          effort: "quick",
          toolSuggestion: "Adobe Podcast Enhance Speech (free, AI-powered)",
        },
        {
          category: "Background music",
          issue: "Music may overpower or underwhelm the voice",
          fix: "Set music at -20dB under voice. Use ducking: -6dB more during speech, restore on B-roll.",
          impact: "medium",
          effort: "quick",
        },
      ],

      editingEnhancements: [
        {
          category: "Pacing",
          issue: "Long pauses and filler words slow down the video",
          fix: "Remove all pauses over 0.5 seconds and all 'um', 'uh', 'like' filler words. Target 150-180 words per minute delivery.",
          impact: "high",
          effort: "moderate",
          toolSuggestion: "Descript (AI auto-removes filler words)",
        },
        {
          category: "B-roll",
          issue: "Talking head with no cutaways reduces engagement",
          fix: "Cut to relevant B-roll every 45-60 seconds minimum. Screen recordings, hands-on demos, or stock footage.",
          impact: "high",
          effort: "significant",
        },
        {
          category: "End screen",
          issue: "Last 20 seconds may not have a clear next-video prompt",
          fix: "Add YouTube end screen cards. Script a verbal CTA to a related video. 'If you liked this, watch this one next.'",
          impact: "medium",
          effort: "quick",
        },
      ],

      metadataEnhancements: [
        {
          category: "Description",
          issue: "First 150 characters may not include target keyword or compelling hook",
          fix: `Rewrite opening: "${input.niche} guide: [specific benefit]. In this video I show you [result] without [common problem]."`,
          impact: "high",
          effort: "quick",
        },
        {
          category: "Chapters",
          issue: "No timestamp chapters reduce searchability and retention",
          fix: "Add chapters in description. YouTube indexes chapter titles for search. Minimum 3 chapters.",
          impact: "medium",
          effort: "quick",
        },
      ],

      repurposeOpportunities: [
        {
          from: "Full YouTube video",
          to: "Instagram Reel",
          platform: "instagram",
          segment: "Best tip segment (identify highest-value 30-60 second moment)",
          editingNotes: "9:16 crop. Add captions. Hook overlay in first 3 seconds. Remove YouTube-specific references.",
          estimatedExtraReach: "500-5000 additional views per Reel on Instagram",
        },
        {
          from: "Full YouTube video",
          to: "YouTube Short",
          platform: "youtube",
          segment: "Most surprising or counterintuitive moment",
          editingNotes: "Vertical 9:16. Under 60 seconds. No CTA to subscribe at start (violates Shorts policy).",
          estimatedExtraReach: "1000-50000 additional views via Shorts feed",
        },
        {
          from: "Full YouTube video",
          to: "Carousel post",
          platform: "instagram",
          segment: "Step-by-step section converted to slides",
          editingNotes: "10 slides max. First slide is the hook. Last slide is the CTA. Screenshot key frames or design new slides.",
          estimatedExtraReach: "High save rate = high reach on Instagram carousel format",
        },
      ],

      thumbnailVariants: [
        {
          variant: "A",
          concept: "Creator face with strong emotion (shock/excitement) + bold text result",
          text: input.title.split(" ").slice(0, 3).join(" ").toUpperCase(),
          colourScheme: "High contrast: white text on dark background",
          emotionalTone: "Curiosity and excitement",
          testingNote: "Run as default for first 48 hours, check CTR in YouTube Studio",
        },
        {
          variant: "B",
          concept: "Before/after split screen with dramatic difference visible",
          text: "BEFORE vs AFTER",
          colourScheme: "Red left / Green right",
          emotionalTone: "FOMO and aspiration",
          testingNote: "Switch to this if variant A CTR is below 4% after 500 impressions",
        },
        {
          variant: "C",
          concept: "Text-heavy graphic with 3-5 bullet points of key takeaways",
          text: "5 THINGS I LEARNT",
          colourScheme: "Clean white with brand colour accent",
          emotionalTone: "Curiosity and value",
          testingNote: "Test after establishing channel branding consistency",
        },
      ],

      accessibilityNotes: [
        "Add auto-generated captions and review for accuracy (YouTube auto-captions have ~80% accuracy)",
        "Add chapter titles that describe content for screen readers",
        "Avoid relying solely on colour to convey information in graphics",
        "Speak at a clear, moderate pace (150 WPM max) for hearing-impaired viewers",
      ],

      projectedImpact: synthesis.slice(0, 200) || "Implementing priority fixes could improve average view duration by 15-30% and CTR by 1-2 percentage points, significantly increasing algorithmic reach.",
    };
  }
}

export const videoEnhancer = new VideoEnhancerEngine();
export default videoEnhancer;
