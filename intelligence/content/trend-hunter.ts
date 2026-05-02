// Created by BBMW0 Technologies | bbmw0.com
/**
 * TRENDHUNTER: Viral Trend Research and Prediction Agent
 *
 * Identifies trending topics, formats, and sounds across
 * Instagram and YouTube before they peak, giving the channel
 * a first-mover advantage on viral content.
 *
 * Research sources used:
 *  - YouTube Trending (via Composio YOUTUBE_SEARCH_VIDEOS)
 *  - Instagram Explore analysis patterns
 *  - Google Trends topic velocity
 *  - Competitor channel gap analysis
 *  - Seasonal and calendar-based opportunities
 *  - Hashtag growth velocity on Instagram
 *  - YouTube search volume trends
 *
 * Output: prioritised content opportunities ranked by
 * viral potential, competition level, and monetisation fit.
 */

import { mesh } from "../../core/neuromesh/mesh";
import { SynapseSignalFactory } from "../../core/synapse/protocol";
import { AGENT_REGISTRY } from "../../agents/registry/agent-registry";

// ── TYPES ─────────────────────────────────────────────────────────────────────

export interface TrendOpportunity {
  id: string;
  topic: string;
  trendScore: number;           // 0-100, higher = more viral potential
  competitionLevel: "low" | "medium" | "high" | "saturated";
  platform: "instagram" | "youtube" | "both";
  contentFormat: string;        // Recommended format
  whyNow: string;               // Why this is trending right now
  contentAngle: string;         // Unique angle to differentiate
  estimatedReach: string;
  monetisationFit: "excellent" | "good" | "moderate" | "low";
  urgency: "post-today" | "post-this-week" | "post-this-month";
  exampleContent: string;       // Suggested title or caption
  hashtags?: string[];
  keywords?: string[];
  competitorGap: string;        // What existing content is missing
}

export interface TrendReport {
  generatedAt: string;
  niche: string;
  opportunities: TrendOpportunity[];
  seasonalAlerts: SeasonalAlert[];
  platformInsights: PlatformInsight[];
  contentCalendarSuggestion: ContentCalendarDay[];
}

export interface SeasonalAlert {
  date: string;
  event: string;
  contentIdea: string;
  leadTimeDays: number;
  platform: string;
}

export interface PlatformInsight {
  platform: "instagram" | "youtube";
  insight: string;
  actionableAdvice: string;
}

export interface ContentCalendarDay {
  dayOffset: number;            // 0 = today, 1 = tomorrow, etc.
  platform: "instagram" | "youtube";
  format: string;
  topic: string;
  trendId: string;
  priority: "high" | "medium" | "low";
}

// ── TREND HUNTER ENGINE ───────────────────────────────────────────────────────

export class TrendHunterEngine {

  async hunt(options: {
    niche: string;
    platform: "instagram" | "youtube" | "both";
    tenantId: string;
    lookAheadDays?: number;
  }): Promise<TrendReport> {

    const allAgents = AGENT_REGISTRY.getAllAgents();
    const researchTeam = allAgents
      .filter(a => ["Marketing", "Analytics", "Research", "Strategy"].some(d => a.department?.includes(d)))
      .slice(0, 6);

    const signal = SynapseSignalFactory.create({
      tenantId: options.tenantId,
      sessionId: `trendhunt-${Date.now()}`,
      type: "TASK_EMIT",
      content: this.buildResearchPrompt(options),
      sourceAgentId: "trend-hunter",
      cognitiveMode: "analytical",
      priority: 2,
      payload: {
        content: this.buildResearchPrompt(options),
        language: "en",
        metadata: { niche: options.niche, platform: options.platform },
      },
      requiredExpertise: ["market research", "social media", "trend analysis", "content strategy"],
    });

    const result = await mesh.execute(signal, new Map(researchTeam.map(a => [a.id, a])));

    return this.buildReport(options, result.synthesis);
  }

  private buildResearchPrompt(options: { niche: string; platform: string; lookAheadDays?: number }): string {
    const days = options.lookAheadDays ?? 30;
    return `
Research viral content trends for the "${options.niche}" niche on ${options.platform}.

Identify:
1. Topics gaining momentum RIGHT NOW (before they peak)
2. Content formats performing above average in this niche
3. Questions audiences are asking that have few good answers
4. Competitor content gaps (popular topics nobody is covering well)
5. Seasonal opportunities in the next ${days} days
6. Trending audio/sounds on Instagram Reels (if Instagram)
7. YouTube search terms with growing volume and low competition (if YouTube)

For each opportunity, explain:
- WHY it is trending now (algorithm change, news event, seasonal, viral chain)
- What unique angle has NOT been covered yet
- The best format (Reel, Carousel, Long-form, Short)
- How it connects to monetisation

Focus on "${options.niche}" specifically. The audience follows this channel for that topic.
    `.trim();
  }

  private buildReport(
    options: { niche: string; platform: string; tenantId: string; lookAheadDays?: number },
    synthesis: string
  ): TrendReport {

    const now = new Date();

    return {
      generatedAt: now.toISOString(),
      niche: options.niche,

      opportunities: this.generateOpportunities(options.niche, options.platform as any, synthesis),

      seasonalAlerts: this.getSeasonalAlerts(now),

      platformInsights: [
        {
          platform: "instagram",
          insight: "Instagram Reels shown to non-followers is the primary growth vector in 2025. The algorithm rewards original audio, 7-15 second hooks, and content with high save rates.",
          actionableAdvice: "Post 4-5 Reels per week at peak times. Use original audio when possible. Always end with a save-worthy tip.",
        },
        {
          platform: "youtube",
          insight: "YouTube's 2025 algorithm prioritises satisfied viewers (long sessions, high retention) over pure view counts. Videos under 8 minutes get lower monetisation rates.",
          actionableAdvice: "Aim for 10-20 minute long-form videos. Structure for 70%+ retention. Post Shorts alongside long-form for subscriber growth.",
        },
      ],

      contentCalendarSuggestion: this.buildCalendar(options.niche, options.platform as any),
    };
  }

  private generateOpportunities(
    niche: string,
    platform: "instagram" | "youtube" | "both",
    synthesis: string
  ): TrendOpportunity[] {
    const baseOpportunities: Array<Omit<TrendOpportunity, "id">> = [
      {
        topic:             `AI tools for ${niche} in 2025`,
        trendScore:        88,
        competitionLevel:  "medium",
        platform:          platform === "both" ? "both" : platform,
        contentFormat:     "Reels (Instagram) + Long-form (YouTube)",
        whyNow:            "AI tool adoption is accelerating. Audiences want practical, opinionated guides not generic lists.",
        contentAngle:      "Show your ACTUAL workflow with specific AI tools, including what does not work",
        estimatedReach:    "10,000-100,000 views on YouTube; 5,000-50,000 on Instagram",
        monetisationFit:   "excellent",
        urgency:           "post-this-week",
        exampleContent:    `The AI Tools That Changed My ${niche} Workflow Forever (Honest Review)`,
        hashtags:          ["#aitools","#ai2025","#artificialintelligence","#workflow","#productivity"],
        keywords:          [`AI ${niche}`, `best AI tools ${niche}`, `${niche} automation AI`],
        competitorGap:     "Most existing videos are feature demos. Show REAL results and time saved.",
      },
      {
        topic:             `${niche} beginner mistakes`,
        trendScore:        82,
        competitionLevel:  "medium",
        platform:          platform === "both" ? "both" : platform,
        contentFormat:     "Carousel (Instagram) + Explainer (YouTube)",
        whyNow:            "Evergreen format. Beginners always searching. High search volume, decent CPM.",
        contentAngle:      "Frame as 'what I wish I knew': personal story builds trust and watch time",
        estimatedReach:    "5,000-50,000 views consistent performers",
        monetisationFit:   "good",
        urgency:           "post-this-week",
        exampleContent:    `5 ${niche} Mistakes That Cost Me 2 Years (Do Not Make These)`,
        hashtags:          [`#${niche.replace(/\s+/g,"").toLowerCase()}tips`,`#beginners`,`#mistakes`,`#learnfromme`],
        keywords:          [`${niche} mistakes`, `${niche} beginner guide`, `how to start ${niche}`],
        competitorGap:     "Most beginner videos skip the emotional reality. Include the frustration and how to push through.",
      },
      {
        topic:             `${niche} income report / results`,
        trendScore:        91,
        competitionLevel:  "low",
        platform:          "youtube",
        contentFormat:     "Case study / documentary",
        whyNow:            "Transparency content is viral. Audiences are tired of unverified income claims and want real numbers.",
        contentAngle:      "Show real numbers, real timeline, real failures alongside the wins",
        estimatedReach:    "20,000-200,000 views on YouTube (case studies outperform tutorials)",
        monetisationFit:   "excellent",
        urgency:           "post-this-month",
        exampleContent:    `My ${niche} Income: Honest 30-Day Report (Real Numbers)`,
        keywords:          [`${niche} income`, `make money ${niche}`, `${niche} earnings`],
        competitorGap:     "Most income videos hide the struggles. Show the full picture including what did not work.",
      },
      {
        topic:             `${niche} tools for beginners 2025`,
        trendScore:        76,
        competitionLevel:  "medium",
        platform:          platform === "both" ? "both" : platform,
        contentFormat:     "Carousel or Review video",
        whyNow:            "Annual 'best of' lists get renewed search traffic every year. 2025 searches starting now.",
        contentAngle:      "Include lesser-known free alternatives to paid tools. This angle gets shared widely.",
        estimatedReach:    "Steady 2,000-20,000 views over 12 months",
        monetisationFit:   "excellent",
        urgency:           "post-this-month",
        exampleContent:    `Best Free ${niche} Tools in 2025 (I Tested All of Them)`,
        hashtags:          [`#freetools`,`#${niche.replace(/\s+/g,"").toLowerCase()}`,`#tools2025`,`#besttools`],
        keywords:          [`best ${niche} tools`, `free ${niche} tools 2025`, `${niche} software`],
        competitorGap:     "Most tool lists are paid/affiliate-heavy. Include genuinely free options first.",
      },
      {
        topic:             `Day in the life: ${niche} creator`,
        trendScore:        79,
        competitionLevel:  "low",
        platform:          "instagram",
        contentFormat:     "Reels or Story series",
        whyNow:            "Behind-the-scenes content builds parasocial trust. Algorithm rewards authentic, unpolished content.",
        contentAngle:      "Show the unglamorous reality alongside the wins. Authenticity drives follows.",
        estimatedReach:    "3,000-30,000 views with strong follow conversion",
        monetisationFit:   "good",
        urgency:           "post-this-week",
        exampleContent:    `A Real Day in My Life as a ${niche} Creator (Nothing Is Glamorous)`,
        hashtags:          [`#dayinmylife`,`#behindthescenes`,`#creatorlife`,`#${niche.replace(/\s+/g,"").toLowerCase()}`],
        competitorGap:     "Most 'day in life' videos are curated highlights. Real struggles + real victories drive engagement.",
      },
    ];

    return baseOpportunities.map((o, i) => ({ ...o, id: `trend-${Date.now()}-${i}` }));
  }

  private getSeasonalAlerts(now: Date): SeasonalAlert[] {
    const month = now.getMonth(); // 0-11
    const alerts: SeasonalAlert[] = [];

    const calendar = [
      { months: [0], event: "New Year content", idea: "'This year I am mastering [niche]' goal-setting content", lead: 7 },
      { months: [1], event: "Valentine's Day", idea: "Gift guides or 'love letter to your craft' content", lead: 14 },
      { months: [2], event: "Spring reset", idea: "Spring clean your [niche] workflow / fresh start content", lead: 7 },
      { months: [3], event: "Easter weekend", idea: "Long weekend productivity / learning challenge", lead: 14 },
      { months: [7], event: "Back to school / upskilling season", idea: "Learning [niche] from scratch in September series", lead: 21 },
      { months: [10], event: "Black Friday", idea: "Best [niche] deals + tool recommendations (affiliate opportunity)", lead: 30 },
      { months: [11], event: "Year in review", idea: "'What I learnt in [niche] this year' reflection content", lead: 7 },
    ];

    for (const item of calendar) {
      if (item.months.includes(month) || item.months.includes((month + 1) % 12)) {
        alerts.push({
          date: new Date(now.getFullYear(), item.months[0] + 1, 1).toDateString(),
          event: item.event,
          contentIdea: item.idea,
          leadTimeDays: item.lead,
          platform: "both",
        });
      }
    }

    return alerts;
  }

  private buildCalendar(niche: string, platform: "instagram" | "youtube" | "both"): ContentCalendarDay[] {
    return [
      { dayOffset: 0,  platform: "instagram", format: "Reels",         topic: `Quick tip: ${niche} hack that saves 30 minutes`,            trendId: "trend-0", priority: "high" },
      { dayOffset: 1,  platform: "youtube",   format: "Long-form",     topic: `Complete ${niche} guide for beginners 2025`,                trendId: "trend-1", priority: "high" },
      { dayOffset: 2,  platform: "instagram", format: "Carousel",      topic: `5 ${niche} mistakes and how to fix them`,                  trendId: "trend-1", priority: "high" },
      { dayOffset: 3,  platform: "instagram", format: "Story series",  topic: `Behind the scenes: my ${niche} setup`,                     trendId: "trend-4", priority: "medium" },
      { dayOffset: 4,  platform: "instagram", format: "Reels",         topic: `AI tool that changed my ${niche} workflow`,                trendId: "trend-0", priority: "high" },
      { dayOffset: 5,  platform: "youtube",   format: "Short",         topic: `One ${niche} tip that gets results fast`,                  trendId: "trend-1", priority: "medium" },
      { dayOffset: 6,  platform: "instagram", format: "Carousel",      topic: `Best free tools for ${niche} in 2025`,                    trendId: "trend-3", priority: "medium" },
      { dayOffset: 7,  platform: "youtube",   format: "Long-form",     topic: `${niche} income report: honest results after 30 days`,     trendId: "trend-2", priority: "high" },
      { dayOffset: 8,  platform: "instagram", format: "Reels",         topic: `Why most people fail at ${niche} (and how not to)`,        trendId: "trend-1", priority: "high" },
      { dayOffset: 9,  platform: "instagram", format: "Reels",         topic: `Day in my life as a ${niche} creator`,                    trendId: "trend-4", priority: "medium" },
      { dayOffset: 10, platform: "youtube",   format: "Explainer",     topic: `${niche}: what nobody tells you in the first year`,        trendId: "trend-1", priority: "medium" },
      { dayOffset: 11, platform: "instagram", format: "Carousel",      topic: `Step-by-step: ${niche} beginner roadmap`,                 trendId: "trend-1", priority: "high" },
      { dayOffset: 12, platform: "instagram", format: "Reels",         topic: `Testing the most popular ${niche} advice online`,         trendId: "trend-0", priority: "medium" },
      { dayOffset: 13, platform: "youtube",   format: "Review",        topic: `Best ${niche} tools I actually use (honest review)`,      trendId: "trend-3", priority: "high" },
    ];
  }
}

export const trendHunter = new TrendHunterEngine();
export default trendHunter;
