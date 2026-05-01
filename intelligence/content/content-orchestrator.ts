// Created by BBMW0 Technologies | bbmw0.com
/**
 * CONTENTORCHESTRATOR: Master Automation Controller
 *
 * The single entry point for the entire content intelligence system.
 * Coordinates InsForge, YouTubeForge, VideoEnhancer, TrendHunter,
 * ContentScheduler, and MonetisationEngine into unified workflows.
 *
 * WORKFLOWS:
 *  1. Full Weekly Plan:    Research trends -> generate content -> schedule
 *  2. Video Enhancement:  Analyse existing video -> generate improvement report
 *  3. Trend Sprint:       Urgent trend spotted -> fast content package
 *  4. Monetisation Audit: Full revenue status + next actions
 *  5. Platform Onboarding: Setup new channel from scratch
 *
 * HUMAN-IN-THE-LOOP:
 * All content goes through pending-approval before any Composio
 * tool call can post it. The orchestrator never posts autonomously.
 */

import { insForge }           from "./insforge";
import { youtubeForge }       from "./youtube-forge";
import { videoEnhancer }      from "./video-enhancer";
import { trendHunter }        from "./trend-hunter";
import { contentScheduler }   from "./content-scheduler";
import { monetisationEngine } from "./monetisation-engine";
import type { InstagramNiche, InstagramFormat, InsForgePackage } from "./insforge";
import type { YouTubeFormat, YouTubeNiche, YouTubeForgePackage } from "./youtube-forge";
import type { VideoAnalysisInput } from "./video-enhancer";
import type { ScheduledPost } from "./content-scheduler";
import type { MonetisationStatus } from "./monetisation-engine";

// ── TYPES ─────────────────────────────────────────────────────────────────────

export interface ChannelProfile {
  tenantId:            string;
  channelName:         string;
  niche:               string;
  brandVoice:          string;
  targetAudience:      string;
  platforms:           Array<"instagram" | "youtube">;
  contentGoal:         "grow-fast" | "monetise-now" | "build-authority" | "viral";
  monetisationGoal:    string;
  postsPerWeekTarget:  number;
  youtubeSubscribers?: number;
  youtubeWatchHours?:  number;
  instagramFollowers?: number;
}

export interface WeeklyPlanResult {
  trends:       Awaited<ReturnType<typeof trendHunter.hunt>>;
  instagramContent: InsForgePackage[];
  youtubeContent:   YouTubeForgePackage[];
  scheduledPosts:   ScheduledPost[];
  monetisation:     MonetisationStatus;
  summary:          string;
  nextActions:      string[];
}

export interface TrendSprintResult {
  trendId:        string;
  instagramPack?: InsForgePackage;
  youtubePack?:   YouTubeForgePackage;
  scheduledPost:  ScheduledPost;
  urgencyNote:    string;
}

// ── CONTENT ORCHESTRATOR ──────────────────────────────────────────────────────

export class ContentOrchestratorEngine {

  // ── WORKFLOW 1: Full Weekly Content Plan ────────────────────────────────────

  async runWeeklyPlan(profile: ChannelProfile): Promise<WeeklyPlanResult> {
    console.log(`[ORCHESTRATOR] Starting weekly plan for: ${profile.channelName}`);

    // Step 1: Hunt for trending opportunities
    const trends = await trendHunter.hunt({
      niche:      profile.niche,
      platform:   profile.platforms.length === 2 ? "both" : profile.platforms[0],
      tenantId:   profile.tenantId,
      lookAheadDays: 30,
    });

    // Step 2: Extract top topics from trends
    const topTopics = trends.opportunities
      .filter(t => t.urgency !== "post-this-month")
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, 7)
      .map(t => t.topic);

    // Step 3: Generate Instagram content
    const instagramContent: InsForgePackage[] = [];
    if (profile.platforms.includes("instagram")) {
      const igPackages = await insForge.generateWeeklyPlan({
        niche:          (profile.niche.replace(/\s+/g, "-").toLowerCase()) as InstagramNiche,
        brandVoice:     profile.brandVoice,
        targetAudience: profile.targetAudience,
        tenantId:       profile.tenantId,
        topics:         topTopics,
      });
      instagramContent.push(...igPackages);
    }

    // Step 4: Generate YouTube content (2 long-form per week)
    const youtubeContent: YouTubeForgePackage[] = [];
    if (profile.platforms.includes("youtube")) {
      const ytTopics = topTopics.slice(0, 2);
      for (const topic of ytTopics) {
        const pkg = await youtubeForge.generatePackage({
          niche:             (profile.niche.replace(/\s+/g, "-").toLowerCase()) as YouTubeNiche,
          format:            "long-form",
          topic,
          channelDescription: profile.brandVoice,
          tenantId:          profile.tenantId,
        });
        youtubeContent.push(pkg);
      }
    }

    // Step 5: Schedule all content (pending approval)
    const scheduledPosts: ScheduledPost[] = [];

    for (const igPkg of instagramContent) {
      const post = contentScheduler.schedule({
        platform:    "instagram",
        tenantId:    profile.tenantId,
        format:      igPkg.format,
        topic:       igPkg.niche,
        caption:     igPkg.caption,
        hashtags:    igPkg.hashtags,
        status:      "pending-approval",
        scheduledFor: contentScheduler.getOptimalNextSlot("instagram"),
        timezone:    "Europe/London",
        bestTimeScore: 85,
        visualConcept: igPkg.visualConcept,
        monetisationLayer: {
          type:        igPkg.monetisationLayer.primaryPath,
          disclosure:  igPkg.monetisationLayer.disclosureRequired,
          disclosureText: igPkg.monetisationLayer.disclosureText,
        },
      });
      scheduledPosts.push(post);
    }

    for (const ytPkg of youtubeContent) {
      const post = contentScheduler.schedule({
        platform:    "youtube",
        tenantId:    profile.tenantId,
        format:      ytPkg.format,
        topic:       ytPkg.niche,
        title:       ytPkg.title,
        caption:     ytPkg.description,
        hashtags:    ytPkg.tags.slice(0, 10),
        status:      "pending-approval",
        scheduledFor: contentScheduler.getOptimalNextSlot("youtube"),
        timezone:    "Europe/London",
        bestTimeScore: 91,
        thumbnailConcept: ytPkg.thumbnailConcept,
        videoScript:      ytPkg.videoScript,
        monetisationLayer: {
          type:       ytPkg.monetisationLayer.primaryRevenue,
          disclosure: !!ytPkg.sponsorSegmentScript,
        },
      });
      scheduledPosts.push(post);
    }

    // Step 6: Monetisation status
    const monetisation = monetisationEngine.buildStatus({
      youtubeSubscribers: profile.youtubeSubscribers ?? 0,
      youtubeWatchHours:  profile.youtubeWatchHours  ?? 0,
      instagramFollowers: profile.instagramFollowers ?? 0,
      tenantId:           profile.tenantId,
    });

    return {
      trends,
      instagramContent,
      youtubeContent,
      scheduledPosts,
      monetisation,
      summary: this.buildWeeklySummary(instagramContent.length, youtubeContent.length, scheduledPosts.length, monetisation),
      nextActions: [
        ...monetisation.nextActions.slice(0, 3),
        `Review and approve ${scheduledPosts.filter(p => p.status === "pending-approval").length} scheduled posts`,
        "Set up Composio INSTAGRAM and YOUTUBE connectors for posting",
        "Review trend opportunities and prioritise this week's content",
      ],
    };
  }

  // ── WORKFLOW 2: Video Enhancement Audit ─────────────────────────────────────

  async enhanceVideo(input: VideoAnalysisInput) {
    return videoEnhancer.analyse(input);
  }

  // ── WORKFLOW 3: Trend Sprint (fast content for breaking trend) ───────────────

  async runTrendSprint(options: {
    trendTopic: string;
    niche: string;
    platforms: Array<"instagram" | "youtube">;
    tenantId: string;
    brandVoice?: string;
  }): Promise<TrendSprintResult> {

    const [igPack, ytPack] = await Promise.all([
      options.platforms.includes("instagram")
        ? insForge.generatePackage({
            niche:       options.niche.replace(/\s+/g, "-").toLowerCase() as InstagramNiche,
            format:      "reels",
            topic:       options.trendTopic,
            brandVoice:  options.brandVoice,
            tenantId:    options.tenantId,
          })
        : Promise.resolve(undefined),

      options.platforms.includes("youtube")
        ? youtubeForge.generatePackage({
            niche:   options.niche.replace(/\s+/g, "-").toLowerCase() as YouTubeNiche,
            format:  "short",
            topic:   options.trendTopic,
            tenantId: options.tenantId,
          })
        : Promise.resolve(undefined),
    ]);

    const post = contentScheduler.schedule({
      platform:    options.platforms[0],
      tenantId:    options.tenantId,
      format:      "reels",
      topic:       options.trendTopic,
      caption:     igPack?.caption ?? ytPack?.description ?? "",
      hashtags:    igPack?.hashtags ?? ytPack?.tags,
      status:      "pending-approval",
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      timezone:    "Europe/London",
      bestTimeScore: 95,
    });

    return {
      trendId:      `sprint-${Date.now()}`,
      instagramPack: igPack ?? undefined,
      youtubePack:   ytPack ?? undefined,
      scheduledPost: post,
      urgencyNote:   "This trend sprint is time-sensitive. Review and approve the post within 2 hours for maximum impact.",
    };
  }

  // ── WORKFLOW 4: Monetisation Audit ──────────────────────────────────────────

  monetisationAudit(channelData: Parameters<typeof monetisationEngine.buildStatus>[0]): MonetisationStatus {
    return monetisationEngine.buildStatus(channelData);
  }

  // ── WORKFLOW 5: Revenue Projection ──────────────────────────────────────────

  projectRevenue(currentAudience: number, monthlyGrowthPercent: number, months: number) {
    return monetisationEngine.projectRevenue(currentAudience, monthlyGrowthPercent, months);
  }

  // ── PENDING APPROVALS ────────────────────────────────────────────────────────

  getPendingApprovals(tenantId: string) {
    return contentScheduler.getPendingApproval(tenantId);
  }

  approvePost(postId: string, approvedBy: string, notes?: string) {
    return contentScheduler.approve(postId, approvedBy, notes);
  }

  getContentQueue(tenantId: string) {
    return contentScheduler.getFullQueue(tenantId);
  }

  // ── PRIVATE HELPERS ──────────────────────────────────────────────────────────

  private buildWeeklySummary(
    igCount: number,
    ytCount: number,
    scheduledCount: number,
    monetisation: MonetisationStatus
  ): string {
    return [
      `Generated ${igCount} Instagram posts and ${ytCount} YouTube videos this week.`,
      `${scheduledCount} posts scheduled and awaiting your approval.`,
      `Projected monthly revenue: GBP ${monetisation.projectedMonthly}.`,
      `Next milestone: ${monetisation.milestones.find(m => m.percentComplete < 100)?.name ?? "All milestones reached"}.`,
    ].join(" ");
  }
}

export const contentOrchestrator = new ContentOrchestratorEngine();
export default contentOrchestrator;
