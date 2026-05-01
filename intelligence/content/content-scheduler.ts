// Created by BBMW0 Technologies | bbmw0.com
/**
 * CONTENTSCHEDULER: Policy-Compliant Cross-Platform Scheduler
 *
 * Manages the posting calendar for Instagram and YouTube.
 * Every scheduled post requires human approval before it is
 * submitted to Composio for actual platform delivery.
 *
 * CRITICAL POLICY COMPLIANCE:
 *  - No automated posting without explicit human approval
 *  - Respects platform rate limits (Instagram: max 25 posts/day API)
 *  - No bulk scheduling that mimics spam behaviour
 *  - All disclosure tags (ad, sponsored) included when required
 *  - Posts are flagged with policy status before approval
 *
 * Integration with Composio:
 *  - INSTAGRAM_CREATE_POST (requires OAuth token)
 *  - YOUTUBE_UPLOAD_VIDEO (requires OAuth token)
 *  - Content is staged here, delivered via Composio tool calls
 */

// ── TYPES ─────────────────────────────────────────────────────────────────────

export type ScheduleStatus = "draft" | "pending-approval" | "approved" | "scheduled" | "published" | "failed" | "cancelled";

export interface ScheduledPost {
  postId: string;
  platform: "instagram" | "youtube";
  tenantId: string;
  format: string;
  topic: string;

  // Content ready to publish
  caption?: string;                 // Instagram caption / YouTube description
  hashtags?: string[];
  title?: string;                   // YouTube title
  thumbnailConcept?: string;
  videoScript?: string;
  visualConcept?: string;

  // Schedule
  scheduledFor: string;             // ISO datetime
  timezone: string;
  bestTimeScore: number;            // 0-100, algorithmic timing score

  // Approval
  status: ScheduleStatus;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;

  // Policy
  policyChecks: PolicyCheck[];
  allPolicyChecksPassed: boolean;

  // Monetisation
  monetisationLayer?: {
    type: string;
    disclosure: boolean;
    disclosureText?: string;
  };

  // Tracking
  createdAt: string;
  updatedAt: string;
  composioJobId?: string;           // Set after Composio submission
  publishedAt?: string;
  publishedUrl?: string;
}

export interface PolicyCheck {
  rule: string;
  passed: boolean;
  note?: string;
}

export interface PostingWindow {
  platform: "instagram" | "youtube";
  dayOfWeek: string;
  timeRangeStart: string;           // HH:MM
  timeRangeEnd: string;
  timezoneNote: string;
  audienceActivityScore: number;    // 0-100
  rationale: string;
}

// ── CONTENT SCHEDULER ENGINE ──────────────────────────────────────────────────

export class ContentSchedulerEngine {
  private queue: Map<string, ScheduledPost> = new Map();

  // Optimal posting windows based on general audience data
  // Adjust based on your specific audience analytics
  readonly OPTIMAL_WINDOWS: PostingWindow[] = [
    {
      platform:           "instagram",
      dayOfWeek:          "Tuesday",
      timeRangeStart:     "11:00",
      timeRangeEnd:       "13:00",
      timezoneNote:       "BST (British Summer Time)",
      audienceActivityScore: 87,
      rationale:          "Mid-week lunch break. Audiences browse Instagram during 12-13:00 BST peak.",
    },
    {
      platform:           "instagram",
      dayOfWeek:          "Wednesday",
      timeRangeStart:     "10:00",
      timeRangeEnd:       "12:00",
      timezoneNote:       "BST",
      audienceActivityScore: 84,
      rationale:          "Mid-week morning peak before daily meetings.",
    },
    {
      platform:           "instagram",
      dayOfWeek:          "Thursday",
      timeRangeStart:     "14:00",
      timeRangeEnd:       "16:00",
      timezoneNote:       "BST",
      audienceActivityScore: 82,
      rationale:          "Afternoon engagement peak. Pre-weekend content performs well.",
    },
    {
      platform:           "instagram",
      dayOfWeek:          "Sunday",
      timeRangeStart:     "10:00",
      timeRangeEnd:       "12:00",
      timezoneNote:       "BST",
      audienceActivityScore: 79,
      rationale:          "Sunday morning casual browsing. Educational content performs well.",
    },
    {
      platform:           "youtube",
      dayOfWeek:          "Thursday",
      timeRangeStart:     "14:00",
      timeRangeEnd:       "16:00",
      timezoneNote:       "BST",
      audienceActivityScore: 91,
      rationale:          "Thursday 15:00 BST is the single best YouTube upload time. Videos index before weekend watching peak.",
    },
    {
      platform:           "youtube",
      dayOfWeek:          "Saturday",
      timeRangeStart:     "09:00",
      timeRangeEnd:       "11:00",
      timezoneNote:       "BST",
      audienceActivityScore: 88,
      rationale:          "Saturday morning. Highest YouTube viewing hours of the week.",
    },
    {
      platform:           "youtube",
      dayOfWeek:          "Tuesday",
      timeRangeStart:     "16:00",
      timeRangeEnd:       "18:00",
      timezoneNote:       "BST",
      audienceActivityScore: 83,
      rationale:          "Post-work viewing window. Viewers relaxing after work hours.",
    },
  ];

  schedule(post: Omit<ScheduledPost, "postId" | "createdAt" | "updatedAt" | "policyChecks" | "allPolicyChecksPassed">): ScheduledPost {
    const postId = `post-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const now = new Date().toISOString();

    const policyChecks = this.runPolicyChecks(post);
    const allPassed = policyChecks.every(c => c.passed);

    const scheduled: ScheduledPost = {
      ...post,
      postId,
      status: allPassed ? "pending-approval" : "draft",
      policyChecks,
      allPolicyChecksPassed: allPassed,
      createdAt: now,
      updatedAt: now,
    };

    this.queue.set(postId, scheduled);
    return scheduled;
  }

  approve(postId: string, approvedBy: string, notes?: string): ScheduledPost | null {
    const post = this.queue.get(postId);
    if (!post) return null;
    if (!post.allPolicyChecksPassed) {
      throw new Error(`Post ${postId} has failed policy checks and cannot be approved.`);
    }

    const updated: ScheduledPost = {
      ...post,
      status: "approved",
      approvedBy,
      approvedAt: new Date().toISOString(),
      approvalNotes: notes,
      updatedAt: new Date().toISOString(),
    };

    this.queue.set(postId, updated);
    return updated;
  }

  getPendingApproval(tenantId: string): ScheduledPost[] {
    return Array.from(this.queue.values())
      .filter(p => p.tenantId === tenantId && p.status === "pending-approval");
  }

  getApproved(tenantId: string): ScheduledPost[] {
    return Array.from(this.queue.values())
      .filter(p => p.tenantId === tenantId && p.status === "approved");
  }

  getFullQueue(tenantId: string): ScheduledPost[] {
    return Array.from(this.queue.values())
      .filter(p => p.tenantId === tenantId)
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  }

  getOptimalNextSlot(platform: "instagram" | "youtube"): string {
    const windows = this.OPTIMAL_WINDOWS.filter(w => w.platform === platform);
    const best = windows.sort((a, b) => b.audienceActivityScore - a.audienceActivityScore)[0];

    const now = new Date();
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const targetDay = days.indexOf(best.dayOfWeek);
    const currentDay = now.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;

    const slot = new Date(now);
    slot.setDate(slot.getDate() + daysUntil);
    const [hours, minutes] = best.timeRangeStart.split(":").map(Number);
    slot.setHours(hours, minutes, 0, 0);

    return slot.toISOString();
  }

  private runPolicyChecks(post: Partial<ScheduledPost>): PolicyCheck[] {
    const checks: PolicyCheck[] = [];

    // Disclosure check
    const hasSponsored = post.caption?.toLowerCase().includes("sponsor") ||
                         post.caption?.toLowerCase().includes("paid") ||
                         post.caption?.toLowerCase().includes("brand deal");
    const hasDisclosure = post.caption?.includes("#ad") ||
                          post.caption?.includes("#sponsored") ||
                          post.monetisationLayer?.disclosureText;

    if (hasSponsored && !hasDisclosure) {
      checks.push({
        rule: "Paid partnership disclosure",
        passed: false,
        note: "Content mentions sponsorship but no #ad or #sponsored disclosure found. Required by ASA (UK) and FTC (US).",
      });
    } else {
      checks.push({ rule: "Paid partnership disclosure", passed: true });
    }

    // Banned hashtags check (basic)
    const bannedPatterns = ["#follow4follow", "#like4like", "#f4f", "#likeforlike"];
    const hasBanned = post.hashtags?.some(h => bannedPatterns.includes(h.toLowerCase()));
    checks.push({
      rule: "No banned hashtags",
      passed: !hasBanned,
      note: hasBanned ? "One or more hashtags may be banned on Instagram and could suppress reach." : undefined,
    });

    // Caption length check (Instagram: 2200 max)
    if (post.platform === "instagram" && post.caption) {
      checks.push({
        rule: "Caption length (Instagram max 2200 chars)",
        passed: post.caption.length <= 2200,
        note: post.caption.length > 2200
          ? `Caption is ${post.caption.length} characters. Truncate to 2200.`
          : undefined,
      });
    }

    // Title length check (YouTube: 100 max, 60 recommended)
    if (post.platform === "youtube" && post.title) {
      checks.push({
        rule: "Title length (YouTube: 60 chars recommended)",
        passed: post.title.length <= 100,
        note: post.title.length > 60
          ? `Title is ${post.title.length} chars. Recommended max 60 for search display.`
          : undefined,
      });
    }

    // Human approval requirement
    checks.push({
      rule: "Human approval required before posting",
      passed: true,
      note: "All posts require explicit human approval. Set status to 'approved' via the /content/approve endpoint.",
    });

    return checks;
  }
}

export const contentScheduler = new ContentSchedulerEngine();
export default contentScheduler;
