// Created by BBMW0 Technologies | bbmw0.com
/**
 * MONETISATIONENGINE: Revenue Tracking and Optimisation
 *
 * Tracks, projects, and optimises revenue across all
 * monetisation paths for Instagram and YouTube channels.
 *
 * Revenue streams covered:
 *  - YouTube AdSense (CPM-based)
 *  - YouTube Shorts bonus (per-view programme)
 *  - Instagram Reels bonus (invite-based)
 *  - Brand partnerships / sponsorships
 *  - Affiliate commissions
 *  - Channel memberships / subscriptions
 *  - Super Chat / Super Thanks (live)
 *  - Merchandise
 *  - Link-in-bio traffic monetisation
 *
 * PAYOUT NOTE:
 * Platform payouts (YouTube AdSense, Instagram payouts)
 * are configured DIRECTLY in YouTube Studio and Instagram
 * Creator tools using your bank account details.
 * They are NEVER entered into code.
 *
 * YouTube AdSense payout: google.com/adsense
 * Instagram payouts: instagram.com/creator/monetisation
 * Both support UK bank accounts (sort code + account number).
 *
 * ADSENSE ACCOUNT (created, awaiting YPP approval):
 *   Organisation: bbmw0
 *   Email:        up866106@gmail.com
 *   Status:       Account created. Link in YouTube Studio once YPP threshold hit.
 */

// ── TYPES ─────────────────────────────────────────────────────────────────────

export interface RevenueStream {
  id: string;
  name: string;
  platform: "youtube" | "instagram" | "both";
  type: RevenueType;
  status: "active" | "pending" | "locked" | "not-started";
  unlockRequirements?: string;
  currentMonthEarnings?: number;    // GBP
  lastMonthEarnings?: number;       // GBP
  projectedMonthlyEarnings?: number;
  notes: string;
}

export type RevenueType =
  | "ad-revenue"
  | "bonus-programme"
  | "brand-deal"
  | "affiliate"
  | "membership"
  | "super-chat"
  | "merchandise"
  | "link-traffic";

export interface MonetisationStatus {
  youtubePartnerProgramme: YPPStatus;
  instagramMonetisation: IGMonetisationStatus;
  revenueStreams: RevenueStream[];
  monthlyTotal: number;             // GBP
  projectedMonthly: number;         // GBP
  milestones: Milestone[];
  nextActions: string[];
}

export interface YPPStatus {
  eligible: boolean;
  subscribers: number;
  watchHours: number;              // Last 12 months
  shortsViews: number;             // Last 90 days
  requirementsForBasicPath: {
    subscribersNeeded: number;
    watchHoursNeeded: number;
  };
  requirementsForShortsPath: {
    subscribersNeeded: number;
    shortsViewsNeeded: number;
  };
  adSenseLinked: boolean;
  communityGuidelinesStrike: boolean;
  estimatedMonthlyRange: string;
}

export interface IGMonetisationStatus {
  reelsBonusInvited: boolean;
  brandDealsEnabled: boolean;
  shoppingEnabled: boolean;
  subscriptionsEnabled: boolean;
  estimatedMonthlyRange: string;
}

export interface Milestone {
  name: string;
  platform: string;
  current: number;
  target: number;
  unit: string;
  revenueUnlock: string;
  percentComplete: number;
}

// ── MONETISATION ENGINE ───────────────────────────────────────────────────────

export class MonetisationEngineClass {

  buildStatus(channelData: {
    youtubeSubscribers?: number;
    youtubeWatchHours?: number;
    youtubeShortsViews?: number;
    instagramFollowers?: number;
    instagramReach?: number;
    monthlyVideoCount?: number;
    activeBrandDeals?: number;
    affiliateProducts?: number;
    tenantId: string;
  }): MonetisationStatus {

    const yt = {
      subs:        channelData.youtubeSubscribers  ?? 0,
      watchHours:  channelData.youtubeWatchHours   ?? 0,
      shortsViews: channelData.youtubeShortsViews  ?? 0,
    };

    const ig = {
      followers: channelData.instagramFollowers ?? 0,
      reach:     channelData.instagramReach     ?? 0,
    };

    const ypStatus = this.buildYPPStatus(yt);
    const igStatus = this.buildIGStatus(ig);
    const streams  = this.buildRevenueStreams(yt, ig, channelData);

    const monthlyTotal    = streams.reduce((s, r) => s + (r.currentMonthEarnings ?? 0), 0);
    const projectedMonthly = streams.reduce((s, r) => s + (r.projectedMonthlyEarnings ?? 0), 0);

    return {
      youtubePartnerProgramme: ypStatus,
      instagramMonetisation:   igStatus,
      revenueStreams:           streams,
      monthlyTotal:             Math.round(monthlyTotal * 100) / 100,
      projectedMonthly:         Math.round(projectedMonthly * 100) / 100,
      milestones:               this.buildMilestones(yt, ig),
      nextActions:              this.buildNextActions(yt, ig, ypStatus),
    };
  }

  private buildYPPStatus(yt: { subs: number; watchHours: number; shortsViews: number }): YPPStatus {
    const basicEligible  = yt.subs >= 1000 && yt.watchHours >= 4000;
    const shortsEligible = yt.subs >= 1000 && yt.shortsViews >= 10_000_000;

    // CPM estimate: broad niche = GBP 3-8. Tech/finance = GBP 8-20
    const estimatedCPM = 5; // GBP, conservative mid-range
    const monthlyViews = yt.watchHours * 6 * 0.7; // estimate views from watch hours
    const adRevenue = (monthlyViews / 1000) * estimatedCPM;

    return {
      eligible:              basicEligible || shortsEligible,
      subscribers:           yt.subs,
      watchHours:            yt.watchHours,
      shortsViews:           yt.shortsViews,
      requirementsForBasicPath: {
        subscribersNeeded: Math.max(0, 1000 - yt.subs),
        watchHoursNeeded:  Math.max(0, 4000 - yt.watchHours),
      },
      requirementsForShortsPath: {
        subscribersNeeded: Math.max(0, 1000 - yt.subs),
        shortsViewsNeeded: Math.max(0, 10_000_000 - yt.shortsViews),
      },
      // AdSense account exists (org: bbmw0, up866106@gmail.com), link in Studio once YPP eligible
      adSenseLinked:                   true,
      communityGuidelinesStrike:       false,
      estimatedMonthlyRange:           basicEligible
        ? `GBP ${Math.round(adRevenue * 0.6)}-${Math.round(adRevenue * 1.4)} (at current growth rate)`
        : "Not yet eligible. See milestones.",
    };
  }

  private buildIGStatus(ig: { followers: number; reach: number }): IGMonetisationStatus {
    const reachRate = ig.followers > 0 ? ig.reach / ig.followers : 0;
    const estimatedCPM = 2; // GBP, Instagram pays less than YouTube
    const monthlyEstimate = (ig.reach / 1000) * estimatedCPM;

    return {
      reelsBonusInvited:    ig.followers >= 10_000, // Approximate threshold
      brandDealsEnabled:    ig.followers >= 5_000,
      shoppingEnabled:      false, // Requires shop setup
      subscriptionsEnabled: ig.followers >= 10_000,
      estimatedMonthlyRange: ig.followers >= 10_000
        ? `GBP ${Math.round(monthlyEstimate * 0.5)}-${Math.round(monthlyEstimate * 2.0)} (Reels bonus + brand deal potential)`
        : "Build to 10,000 followers to unlock monetisation programmes.",
    };
  }

  private buildRevenueStreams(
    yt: { subs: number; watchHours: number; shortsViews: number },
    ig: { followers: number },
    data: { activeBrandDeals?: number; affiliateProducts?: number }
  ): RevenueStream[] {
    return [
      {
        id:                       "yt-adsense",
        name:                     "YouTube AdSense",
        platform:                 "youtube",
        type:                     "ad-revenue",
        status:                   yt.subs >= 1000 && yt.watchHours >= 4000 ? "active" : "locked",
        unlockRequirements:       `1,000 subscribers (${yt.subs}/1,000) + 4,000 watch hours (${yt.watchHours}/4,000)`,
        currentMonthEarnings:     yt.subs >= 1000 ? (yt.watchHours * 0.01) : 0,
        projectedMonthlyEarnings: yt.subs >= 1000 ? (yt.watchHours * 0.012 * 2) : 0,
        notes:                    "Configure payout in YouTube Studio > Monetisation > AdSense. Payments monthly when balance exceeds GBP 70.",
      },
      {
        id:                       "yt-shorts-bonus",
        name:                     "YouTube Shorts Revenue",
        platform:                 "youtube",
        type:                     "bonus-programme",
        status:                   yt.subs >= 1000 ? "pending" : "locked",
        unlockRequirements:       "1,000 subscribers + 10 million Shorts views in 90 days",
        currentMonthEarnings:     0,
        projectedMonthlyEarnings: yt.shortsViews > 100_000 ? yt.shortsViews * 0.00004 : 0,
        notes:                    "Shorts revenue pool: approximately GBP 0.04-0.10 per 1,000 Shorts views. Volume is the strategy here.",
      },
      {
        id:                       "ig-reels-bonus",
        name:                     "Instagram Reels Bonus",
        platform:                 "instagram",
        type:                     "bonus-programme",
        status:                   ig.followers >= 10_000 ? "pending" : "locked",
        unlockRequirements:       "Invite-only. Build to 10,000+ followers and maintain consistent Reels posting to get invited.",
        currentMonthEarnings:     0,
        projectedMonthlyEarnings: ig.followers >= 10_000 ? 150 : 0,
        notes:                    "Instagram pays per play on qualifying Reels. Range: GBP 0-1000/month depending on reach. Not available in all markets.",
      },
      {
        id:                       "brand-deals",
        name:                     "Brand Partnerships",
        platform:                 "both",
        type:                     "brand-deal",
        status:                   (yt.subs >= 5_000 || ig.followers >= 5_000) ? "active" : "not-started",
        currentMonthEarnings:     (data.activeBrandDeals ?? 0) * 250,
        projectedMonthlyEarnings: (yt.subs + ig.followers) > 20_000 ? 500 : 100,
        notes:                    "At 10k followers/subs expect GBP 100-500 per post. At 100k expect GBP 500-5000. Outreach starts at 5k. Always disclose with #ad.",
      },
      {
        id:                       "affiliate",
        name:                     "Affiliate Commissions",
        platform:                 "both",
        type:                     "affiliate",
        status:                   "active",
        currentMonthEarnings:     (data.affiliateProducts ?? 0) * 15,
        projectedMonthlyEarnings: 50 + ((data.affiliateProducts ?? 0) * 25),
        notes:                    "Amazon Associates, Impact, PartnerStack. 5-20% commission. Always disclose affiliate links. UK: must comply with ASA rules.",
      },
      {
        id:                       "yt-memberships",
        name:                     "YouTube Channel Memberships",
        platform:                 "youtube",
        type:                     "membership",
        status:                   yt.subs >= 1000 ? "pending" : "locked",
        unlockRequirements:       "1,000 subscribers and no Community Guideline strikes",
        projectedMonthlyEarnings: yt.subs >= 1000 ? yt.subs * 0.001 * 4.99 * 0.7 : 0,
        notes:                    "Approximately 1% of subscribers convert to members at GBP 4.99/month. YouTube takes 30%.",
      },
    ];
  }

  private buildMilestones(yt: { subs: number; watchHours: number; shortsViews: number }, ig: { followers: number }): Milestone[] {
    return [
      {
        name:            "YouTube Partner Programme (Basic)",
        platform:        "youtube",
        current:         yt.subs,
        target:          1000,
        unit:            "subscribers",
        revenueUnlock:   "AdSense ad revenue + Channel memberships",
        percentComplete: Math.min(100, Math.round((yt.subs / 1000) * 100)),
      },
      {
        name:            "YouTube Watch Hours Requirement",
        platform:        "youtube",
        current:         yt.watchHours,
        target:          4000,
        unit:            "watch hours",
        revenueUnlock:   "Required alongside 1,000 subscribers for YPP",
        percentComplete: Math.min(100, Math.round((yt.watchHours / 4000) * 100)),
      },
      {
        name:            "Instagram Monetisation Unlock",
        platform:        "instagram",
        current:         ig.followers,
        target:          10_000,
        unit:            "followers",
        revenueUnlock:   "Reels Bonus programme + Subscriptions + Shopping",
        percentComplete: Math.min(100, Math.round((ig.followers / 10_000) * 100)),
      },
      {
        name:            "Brand Deal Tier 1",
        platform:        "both",
        current:         yt.subs + ig.followers,
        target:          10_000,
        unit:            "combined audience",
        revenueUnlock:   "GBP 100-500 per sponsored post/video",
        percentComplete: Math.min(100, Math.round(((yt.subs + ig.followers) / 10_000) * 100)),
      },
      {
        name:            "Brand Deal Tier 2 (significant income)",
        platform:        "both",
        current:         yt.subs + ig.followers,
        target:          100_000,
        unit:            "combined audience",
        revenueUnlock:   "GBP 500-5,000 per post/video. Full-time income potential.",
        percentComplete: Math.min(100, Math.round(((yt.subs + ig.followers) / 100_000) * 100)),
      },
    ];
  }

  private buildNextActions(
    yt: { subs: number; watchHours: number },
    ig: { followers: number },
    ypStatus: YPPStatus
  ): string[] {
    const actions: string[] = [];

    if (!ypStatus.eligible) {
      if (yt.subs < 1000) {
        actions.push(`YouTube: ${1000 - yt.subs} more subscribers needed for YPP. Post 2 long-form videos per week.`);
      }
      if (yt.watchHours < 4000) {
        actions.push(`YouTube: ${4000 - yt.watchHours} more watch hours needed. Longer videos and playlists build watch time fastest.`);
      }
    } else {
      actions.push("YouTube: Link AdSense account in YouTube Studio > Monetisation > Get Started.");
    }

    if (ig.followers < 10_000) {
      actions.push(`Instagram: ${10_000 - ig.followers} more followers to unlock Reels Bonus. Post 4-5 Reels per week and engage with comments.`);
    }

    actions.push("Affiliate: Sign up to Amazon Associates and add product links to YouTube descriptions immediately.");
    actions.push("Brand deals: Create a media kit PDF with your stats. Reach out to 5 relevant brands per week at 5,000+ followers.");
    actions.push("Instagram: Connect Composio INSTAGRAM connector to enable content scheduling via this system.");
    actions.push("YouTube: Connect Composio YOUTUBE connector to enable metadata optimisation via this system.");

    return actions;
  }

  // Revenue projection tool
  projectRevenue(
    currentFollowers: number,
    growthRatePercentPerMonth: number,
    months: number
  ): Array<{ month: number; followers: number; estimatedGBP: number }> {
    const projections = [];
    let followers = currentFollowers;

    for (let m = 1; m <= months; m++) {
      followers = Math.round(followers * (1 + growthRatePercentPerMonth / 100));

      // Very rough estimate: GBP per 1000 followers/subscribers = 5-20/month
      const ratePerThousand = followers < 10_000 ? 2 : followers < 50_000 ? 8 : 20;
      const estimatedGBP = (followers / 1000) * ratePerThousand;

      projections.push({ month: m, followers, estimatedGBP: Math.round(estimatedGBP) });
    }

    return projections;
  }
}

export const monetisationEngine = new MonetisationEngineClass();
export default monetisationEngine;
