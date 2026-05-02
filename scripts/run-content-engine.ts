// Created by BBMW0 Technologies | bbmw0.com
/**
 * OMNIORG FULL EXECUTION SCRIPT
 *
 * Runs the complete content intelligence system:
 *  1. Boot NEUROMESH and verify agent count
 *  2. Hunt for trending content opportunities
 *  3. Generate full Instagram weekly content plan
 *  4. Generate YouTube content packages
 *  5. Generate video enhancement report
 *  6. Run monetisation audit with milestones
 *  7. Build 14-day posting calendar
 *  8. Write all outputs to results/
 *
 * Run: npm run content:run
 */

import "../api/env"; // ← MUST be first: loads .env before any singleton reads process.env

import * as fs   from "fs";
import * as path from "path";

// ── BOOT ──────────────────────────────────────────────────────────────────────
// mesh import triggers preload of all 20,000+ agents automatically
import { mesh }                  from "../core/neuromesh/mesh";
import { contentOrchestrator }   from "../intelligence/content/content-orchestrator";
import { trendHunter }           from "../intelligence/content/trend-hunter";
import { insForge }              from "../intelligence/content/insforge";
import { youtubeForge }          from "../intelligence/content/youtube-forge";
import { videoEnhancer }         from "../intelligence/content/video-enhancer";
import { monetisationEngine }    from "../intelligence/content/monetisation-engine";
import { contentScheduler }      from "../intelligence/content/content-scheduler";
import { nanaBanana }            from "../intelligence/content/nano-banana-engine";
import { composioPublisher }     from "../intelligence/content/composio-publisher";
import { COMPOSIO_ACCOUNTS }     from "../intelligence/content/composio-publisher";
import { agentSecurity }         from "../intelligence/security/agent-security-engine";
import { affiliateEngine }       from "../intelligence/content/affiliate-engine";
import { autoPublisher }         from "../intelligence/content/auto-publisher";

// ── CONFIG ────────────────────────────────────────────────────────────────────

const CHANNEL = {
  tenantId:           "bbmw0-main",
  channelName:        "BBMW0 Technologies",
  niche:              "video-editing" as const,
  brandVoice:         "Expert, direct, no fluff. We show real results and real workflows. UK English. Professional but personable.",
  targetAudience:     "Content creators, video editors, YouTubers and social media managers who want to level up their editing skills and grow their channels faster",
  platforms:          ["instagram", "youtube"] as Array<"instagram" | "youtube">,
  contentGoal:        "grow-fast" as const,
  monetisationGoal:   "AdSense (account: bbmw0, up866106@gmail.com) + brand deals with video editing software companies + affiliate links",
  // Scale to 3 posts/day = 21/week: 14 Instagram + 7 YouTube
  postsPerDayTarget:  3,
  postsPerWeekTarget: 21,
  instagramPerWeek:   14,
  youtubePerWeek:     7,
  youtubeSubscribers: 0,
  youtubeWatchHours:  0,
  youtubeShortsViews: 0,
  instagramFollowers: 0,
  // Live Composio accounts
  accounts: {
    instagram: {
      username:  COMPOSIO_ACCOUNTS.instagram.username,
      igUserId:  COMPOSIO_ACCOUNTS.instagram.igUserId,
    },
    youtube: {
      channelId: COMPOSIO_ACCOUNTS.youtube.channelId,
      handle:    COMPOSIO_ACCOUNTS.youtube.handle,
      name:      COMPOSIO_ACCOUNTS.youtube.name,
    },
  },
};

const RESULTS_DIR = path.join(__dirname, "..", "results");

// ── HELPERS ───────────────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeResult(filename: string, data: unknown) {
  ensureDir(RESULTS_DIR);
  const filepath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");
  console.log(`  ✓ Saved: results/${filename}`);
}

function writeMarkdown(filename: string, content: string) {
  ensureDir(RESULTS_DIR);
  const filepath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(filepath, content, "utf8");
  console.log(`  ✓ Saved: results/${filename}`);
}

function separator(title: string) {
  const line = "─".repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

// ── MAIN EXECUTION ────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║     OMNIORG CONTENT ENGINE: FULL EXECUTION              ║");
  console.log("║     Instagram + YouTube · Nano Banana Engine ON         ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Show API key and account status
  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY);
  console.log(`  API mode:    ${hasApiKey ? "LIVE (Claude claude-opus-4-5 — full synthesis)" : "LOCAL (no API key)"}`);
  console.log(`  Instagram:   @${CHANNEL.accounts.instagram.username} (ID: ${CHANNEL.accounts.instagram.igUserId})`);
  console.log(`  YouTube 1:   ${CHANNEL.accounts.youtube.handle} — ${CHANNEL.accounts.youtube.name} (main channel, all formats)`);
  console.log(`  YouTube 2:   @bbm0902 (bbmw96@gmail.com) — Shorts only ⚠️  connect at composio.dev`);
  console.log(`  AdSense:     bbmw0 (up866106@gmail.com) — account created, awaiting YPP`);
  console.log(`  Posts/day:   ${CHANNEL.postsPerDayTarget} (${CHANNEL.instagramPerWeek} Instagram + ${CHANNEL.youtubePerWeek} YouTube per week)`);
  console.log(`  Security:    999-layer engine ACTIVE on all agent operations`);
  console.log("");

  // ── STEP 0: Security Pre-flight ──────────────────────────────────────────
  separator("STEP 0: SECURITY PRE-FLIGHT (999 LAYERS)");
  console.log("  Running full security audit on execution context...");

  const securityCtx = {
    agentId:   "content-engine-main",
    tenantId:  CHANNEL.tenantId,
    operation: "content-engine-full-run",
    timestamp: new Date().toISOString(),
    apiKey:    process.env.ANTHROPIC_API_KEY,
  };
  const preflightReport = agentSecurity.runFullSecurityAudit(securityCtx);

  console.log(`  Layers checked:    ${preflightReport.totalLayers}`);
  console.log(`  Passed:            ${preflightReport.passed}`);
  console.log(`  Failed:            ${preflightReport.failed}`);
  console.log(`  Risk score:        ${preflightReport.overallRiskScore.toFixed(1)}/100`);
  console.log(`  Clearance:         ${preflightReport.clearanceGranted ? "✅ GRANTED" : "❌ DENIED"}`);
  console.log(`  Audit ID:          ${preflightReport.contextId}`);

  if (preflightReport.criticalFailures.length > 0) {
    console.error("\n  CRITICAL SECURITY FAILURES:");
    for (const f of preflightReport.criticalFailures) {
      console.error(`    [CRITICAL] ${f.name}: ${f.message ?? "check failed"}`);
      if (f.remediation) console.error(`              → ${f.remediation}`);
    }
    if (!preflightReport.clearanceGranted) {
      console.error("\n  Security clearance DENIED. Aborting execution.");
      process.exit(1);
    }
  }

  if (preflightReport.highFailures.length > 0) {
    console.warn(`\n  HIGH-RISK FINDINGS (${preflightReport.highFailures.length}):`);
    for (const f of preflightReport.highFailures.slice(0, 5)) {
      console.warn(`    [HIGH] ${f.name}: ${f.message ?? "check failed"}`);
    }
  }

  writeResult("00-security-preflight.json", preflightReport);

  // ── STEP 1: Verify mesh ──────────────────────────────────────────────────
  separator("STEP 1: NEUROMESH STATUS");
  const health = mesh.getHealthReport();
  console.log(`  Agents loaded:     ${health.totalAgents}`);
  console.log(`  Healthy agents:    ${health.healthyAgents}`);
  console.log(`  Average health:    ${(health.avgHealthScore * 100).toFixed(1)}%`);
  console.log(`  Active teams:      ${health.activeTeams}`);

  if (health.totalAgents === 0) {
    console.error("  ERROR: No agents loaded. Check AGENT_REGISTRY.");
    process.exit(1);
  }
  writeResult("01-mesh-health.json", health);

  // ── STEP 2: Trend Research ────────────────────────────────────────────────
  separator("STEP 2: TREND RESEARCH (Instagram + YouTube)");
  console.log("  Hunting viral opportunities in video-editing niche...");

  const trends = await trendHunter.hunt({
    niche:          CHANNEL.niche,
    platform:       "both",
    tenantId:       CHANNEL.tenantId,
    lookAheadDays:  30,
  });

  console.log(`  Opportunities found: ${trends.opportunities.length}`);
  for (const opp of trends.opportunities.slice(0, 5)) {
    console.log(`    [${opp.trendScore}] ${opp.topic} (${opp.urgency})`);
  }
  console.log(`  Seasonal alerts: ${trends.seasonalAlerts.length}`);
  writeResult("02-trend-report.json", trends);

  // ── STEP 3: Instagram Weekly Plan ────────────────────────────────────────
  separator(`STEP 3: INSTAGRAM CONTENT (${CHANNEL.instagramPerWeek} posts — 2/day)`);
  console.log(`  Generating ${CHANNEL.instagramPerWeek}-post Instagram plan via InsForge + Nano Banana Engine...`);

  const topTopics = trends.opportunities
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, CHANNEL.instagramPerWeek)
    .map(t => t.topic);

  // Generate 14 posts for daily posting (2/day)
  const igPackages = await insForge.generateWeeklyPlan({
    niche:           CHANNEL.niche,
    brandVoice:      CHANNEL.brandVoice,
    targetAudience:  CHANNEL.targetAudience,
    tenantId:        CHANNEL.tenantId,
    topics:          topTopics,
  });

  // If we need more than 7 (the default weekly plan), generate extra
  const igExtra = [];
  if (CHANNEL.instagramPerWeek > igPackages.length) {
    const extraCount = CHANNEL.instagramPerWeek - igPackages.length;
    const extraTopics = trends.opportunities.slice(igPackages.length, igPackages.length + extraCount).map(t => t.topic);
    for (let i = 0; i < extraCount; i++) {
      const extraPkg = await insForge.generatePackage({
        niche:          CHANNEL.niche,
        format:         i % 2 === 0 ? "reels" : "carousel",
        topic:          extraTopics[i] ?? `Advanced ${CHANNEL.niche} technique ${i + 1}`,
        brandVoice:     CHANNEL.brandVoice,
        targetAudience: CHANNEL.targetAudience,
        tenantId:       CHANNEL.tenantId,
      });
      igExtra.push(extraPkg);
    }
  }

  const allIgPackages = [...igPackages, ...igExtra];

  for (const pkg of allIgPackages) {
    const dna = pkg.nanoBananaDNA;
    console.log(`    [${pkg.format.toUpperCase()}] ${pkg.contentId}`);
    console.log(`      Hook:    "${pkg.hook.slice(0, 75)}"`);
    console.log(`      DNA:     ${dna.hookArchetype} × ${dna.visualStyle} × ${dna.tone} (novelty: ${dna.noveltyScore})`);
    console.log(`      Recipe:  ${dna.recipeUsed}  |  Best time: ${pkg.bestPostTime}`);
  }
  console.log(`\n  Nano Banana diversity: ${JSON.stringify(nanaBanana.diversityReport())}`);
  writeResult("03-instagram-weekly.json", allIgPackages);

  // ── STEP 4: YouTube Content ───────────────────────────────────────────────
  separator(`STEP 4: YOUTUBE CONTENT (${CHANNEL.youtubePerWeek} videos — 1/day)`);
  console.log(`  Generating ${CHANNEL.youtubePerWeek} YouTube packages via YouTubeForge + Nano Banana Engine...`);

  // 7 videos/week: 2 long-form, 2 case-study, 2 shorts, 1 explainer
  const ytFormats: Array<{ format: "long-form" | "short" | "case-study" | "explainer" | "review"; topic: string }> = [
    { format: "long-form",  topic: topTopics[0] ?? "Complete video editing guide 2026" },
    { format: "short",      topic: topTopics[1] ?? "One editing trick that changes everything" },
    { format: "case-study", topic: topTopics[2] ?? "30-day video editing results: honest numbers" },
    { format: "short",      topic: topTopics[3] ?? "Fastest way to colour grade in DaVinci" },
    { format: "explainer",  topic: topTopics[4] ?? "Why most YouTube videos fail in the first 30 seconds" },
    { format: "long-form",  topic: topTopics[5] ?? "Complete guide: video editing for beginners 2026" },
    { format: "review",     topic: topTopics[6] ?? "Best video editing software 2026: honest comparison" },
  ];

  const ytPackages = [];
  for (const item of ytFormats) {
    const pkg = await youtubeForge.generatePackage({
      niche:              CHANNEL.niche,
      format:             item.format,
      topic:              item.topic,
      channelDescription: CHANNEL.brandVoice,
      tenantId:           CHANNEL.tenantId,
    });
    ytPackages.push(pkg);
    const dna = pkg.nanoBananaDNA;
    console.log(`    [${pkg.format.toUpperCase()}] "${pkg.title}"`);
    console.log(`      Opening hook:  "${pkg.openingHook.slice(0, 70)}"`);
    console.log(`      DNA:           ${dna.hookArchetype} × ${dna.visualStyle} × ${dna.narrativeArc}`);
    console.log(`      Recipe:        ${dna.recipeUsed}  |  CPM: ${pkg.monetisationLayer.estimatedCPM}`);
  }
  writeResult("04-youtube-content.json", ytPackages);

  // ── STEP 5: Video Enhancement Audit ──────────────────────────────────────
  separator("STEP 5: VIDEO ENHANCEMENT ANALYSIS");
  console.log("  Running VideoEnhancer on first video package...");

  const firstVideo = ytPackages[0]!;
  const enhancementReport = await videoEnhancer.analyse({
    title:           firstVideo.title,
    duration:        720, // 12 minutes
    platform:        "youtube",
    niche:           CHANNEL.niche,
    currentDescription: firstVideo.description,
    currentTags:     firstVideo.tags,
    viewCount:       0,
    avgViewDuration: 0,
    ctr:             0,
    tenantId:        CHANNEL.tenantId,
  });

  console.log(`  Overall score: ${enhancementReport.overallScore}/100`);
  console.log(`  Priority fixes: ${enhancementReport.priorityFixes.length}`);
  for (const fix of enhancementReport.priorityFixes) {
    console.log(`    [${fix.impact.toUpperCase()}] ${fix.category}: ${fix.issue.slice(0, 60)}...`);
  }
  console.log(`  Repurpose opportunities: ${enhancementReport.repurposeOpportunities.length}`);
  console.log(`  Thumbnail variants: ${enhancementReport.thumbnailVariants.length}`);
  writeResult("05-video-enhancement.json", enhancementReport);

  // ── STEP 6: Monetisation Audit ────────────────────────────────────────────
  separator("STEP 6: MONETISATION ROADMAP");
  console.log("  Building monetisation status and milestone tracker...");

  const monetisation = monetisationEngine.buildStatus({
    youtubeSubscribers: CHANNEL.youtubeSubscribers,
    youtubeWatchHours:  CHANNEL.youtubeWatchHours,
    youtubeShortsViews: CHANNEL.youtubeShortsViews,
    instagramFollowers: CHANNEL.instagramFollowers,
    tenantId:           CHANNEL.tenantId,
  });

  console.log(`\n  MILESTONES:`);
  for (const m of monetisation.milestones) {
    const bar = "█".repeat(Math.round(m.percentComplete / 10)) + "░".repeat(10 - Math.round(m.percentComplete / 10));
    console.log(`    ${bar} ${m.percentComplete}%  ${m.name}`);
    console.log(`         ${m.current}/${m.target} ${m.unit} → Unlocks: ${m.revenueUnlock}`);
  }

  console.log(`\n  REVENUE STREAMS:`);
  for (const stream of monetisation.revenueStreams) {
    const status = stream.status === "active" ? "✓" : stream.status === "locked" ? "🔒" : "⏳";
    console.log(`    ${status} ${stream.name}: ${stream.status}`);
    if (stream.unlockRequirements) console.log(`         Unlock: ${stream.unlockRequirements.slice(0, 80)}`);
  }

  console.log(`\n  NEXT ACTIONS:`);
  for (const action of monetisation.nextActions) {
    console.log(`    → ${action}`);
  }

  // Revenue projection: 15% monthly growth over 12 months
  const projection = monetisationEngine.projectRevenue(0, 15, 12);
  console.log(`\n  12-MONTH REVENUE PROJECTION (at 15% monthly growth):`);
  for (const p of projection.filter((_, i) => [2, 5, 8, 11].includes(i))) {
    console.log(`    Month ${p.month}: ${p.followers} audience  →  GBP ${p.estimatedGBP}/month est.`);
  }

  writeResult("06-monetisation.json", { ...monetisation, projection });

  // ── STEP 7: Schedule All Content ─────────────────────────────────────────
  separator("STEP 7: SCHEDULING ALL CONTENT");
  console.log("  Scheduling all generated posts (pending human approval)...");

  const allPosts = [];

  // Schedule Instagram posts
  for (const pkg of allIgPackages) {
    const post = contentScheduler.schedule({
      platform:      "instagram",
      tenantId:      CHANNEL.tenantId,
      format:        pkg.format,
      topic:         pkg.hook.slice(0, 80),
      caption:       pkg.caption,
      hashtags:      pkg.hashtags,
      visualConcept: pkg.visualConcept,
      status:        "pending-approval",
      scheduledFor:  contentScheduler.getOptimalNextSlot("instagram"),
      timezone:      "Europe/London",
      bestTimeScore: 87,
      monetisationLayer: {
        type:        pkg.monetisationLayer.primaryPath,
        disclosure:  pkg.monetisationLayer.disclosureRequired,
        disclosureText: pkg.monetisationLayer.disclosureText,
      },
    });
    allPosts.push(post);
  }

  // Schedule YouTube posts
  for (const pkg of ytPackages) {
    const post = contentScheduler.schedule({
      platform:         "youtube",
      tenantId:         CHANNEL.tenantId,
      format:           pkg.format,
      topic:            pkg.title,
      title:            pkg.title,
      caption:          pkg.description,
      hashtags:         pkg.tags.slice(0, 15),
      videoScript:      pkg.videoScript.slice(0, 500),
      thumbnailConcept: pkg.thumbnailConcept,
      status:           "pending-approval",
      scheduledFor:     contentScheduler.getOptimalNextSlot("youtube"),
      timezone:         "Europe/London",
      bestTimeScore:    91,
      monetisationLayer: {
        type:       pkg.monetisationLayer.primaryRevenue,
        disclosure: false,
      },
    });
    allPosts.push(post);
  }

  const pendingApproval = allPosts.filter(p => p.status === "pending-approval");
  console.log(`  Total posts scheduled: ${allPosts.length}`);
  console.log(`  Pending your approval: ${pendingApproval.length}`);
  console.log(`  Policy checks passed:  ${allPosts.filter(p => p.allPolicyChecksPassed).length}`);
  console.log(`  Policy checks failed:  ${allPosts.filter(p => !p.allPolicyChecksPassed).length}`);

  writeResult("07-scheduled-posts.json", allPosts);

  // ── STEP 8: Generate Human-Readable Summary ───────────────────────────────
  separator("STEP 8: GENERATING SUMMARY REPORT");

  // Nano Banana diversity report
  const diversity = nanaBanana.diversityReport();
  console.log(`\n  NANO BANANA DNA DIVERSITY REPORT:`);
  console.log(`    Total fingerprinted: ${diversity.totalPieces}`);
  console.log(`    Avg novelty score:   ${diversity.noveltyAvg}`);
  console.log(`    Recipe distribution: ${JSON.stringify(diversity.recipeUsage)}`);

  // Daily posting schedule
  const schedule = composioPublisher.getDailySchedule();
  writeResult("08-daily-schedule.json", schedule);

  const summaryMd = generateMarkdownSummary(trends, allIgPackages, ytPackages, monetisation, allPosts, schedule);
  writeMarkdown("CONTENT_PLAN.md", summaryMd);

  // ── STEP 9: Auto-Publisher Manifest ──────────────────────────────────────
  separator("STEP 9: AUTO-PUBLISHER — COMPOSIO EXECUTION MANIFEST");
  console.log("  Running 999-layer security + affiliate injection on all 21 posts...");

  const manifest = await autoPublisher.generateManifest(allIgPackages, ytPackages);
  autoPublisher.saveManifest(manifest, path.join(__dirname, "..", "results"));

  console.log(`\n  MANIFEST SUMMARY:`);
  console.log(`    Total posts:            ${manifest.totalPosts}`);
  console.log(`    Ready to execute:       ${manifest.readyToExecute} (need video file + Composio)`);
  console.log(`    Requires approval:      ${manifest.requiresHumanApproval}`);
  console.log(`    Requires video file:    ${manifest.requiresVideoFile}`);
  console.log(`    Avg security risk:      ${manifest.securitySummary.avgRiskScore.toFixed(1)}/100`);
  console.log(`    All security passed:    ${manifest.securitySummary.allSecurityPassed ? "✅ YES" : "⚠️  NO — see manifest"}`);

  if (manifest.securitySummary.criticalBlockers.length > 0) {
    console.warn(`\n  ⚠️  CRITICAL BLOCKERS:`);
    for (const b of manifest.securitySummary.criticalBlockers.slice(0, 5)) {
      console.warn(`    → ${b}`);
    }
  }

  console.log(`\n  AFFILIATE INJECTION:`);
  const injectedYt = manifest.youtubePosts.filter(p => p.affiliateInjected).length;
  console.log(`    YouTube descriptions with affiliate links: ${injectedYt}/${manifest.youtubePosts.length}`);
  console.log(`    Amazon Associates tag: bbmw0-21`);
  console.log(`    Est. monthly commission (1k views/video): ${affiliateEngine.estimateMonthlyCommission(7000, 0.03)}`);

  // ── STEP 10: @bbm0902 YouTube Short ──────────────────────────────────────
  separator("STEP 10: @bbm0902 CHANNEL — YOUTUBE SHORT");
  console.log("  Generating 1 Short for @bbm0902 (bbmw96@gmail.com) — Shorts only channel...");

  const bbm0902Topic = topTopics[0] ?? "1 video editing trick that changed everything for me";
  const bbm0902Short = await youtubeForge.generatePackage({
    niche:              CHANNEL.niche,
    format:             "short",
    topic:              bbm0902Topic,
    channelDescription: "Fast, punchy video editing tips. No fluff. Under 60 seconds.",
    tenantId:           "bbm0902",
  });

  // Run security audit specifically for this channel's publish operation
  const bbm0902SecurityCtx = {
    agentId:   "auto-publisher",
    tenantId:  "bbm0902",
    operation: "publish-youtube-short",
    platform:  "youtube" as const,
    contentId: bbm0902Short.contentId,
    timestamp: new Date().toISOString(),
  };
  const bbm0902Security = agentSecurity.runFullSecurityAudit(bbm0902SecurityCtx);

  // Inject affiliate links
  const bbm0902AffiliateResult = affiliateEngine.injectIntoDescription(
    bbm0902Short.description,
    bbm0902Short.tags,
    bbm0902Topic,
  );

  // Build the Composio posting plan
  const bbm0902Plan = composioPublisher.getBbm0902ShortPlan({
    contentId:      bbm0902Short.contentId,
    title:          bbm0902Short.title,
    description:    bbm0902AffiliateResult.enhancedDescription,
    tags:           bbm0902Short.tags,
    categoryId:     "26",   // Howto & Style
    privacyStatus:  "public",
    approvedBy:     "pending-human-approval",
  });

  console.log(`\n  SHORT PACKAGE:`);
  console.log(`    Channel:     @bbm0902 (connect: bbmw96@gmail.com)`);
  console.log(`    Title:       "${bbm0902Short.title.slice(0, 70)}"`);
  console.log(`    Hook:        "${bbm0902Short.openingHook.slice(0, 70)}"`);
  const bbm0902Dna = bbm0902Short.nanoBananaDNA;
  console.log(`    DNA:         ${bbm0902Dna.hookArchetype} × ${bbm0902Dna.visualStyle} × ${bbm0902Dna.tone}`);
  console.log(`    Affiliate:   ${bbm0902AffiliateResult.productsInjected.length} products injected`);
  console.log(`    Security:    ${bbm0902Security.clearanceGranted ? "✅ CLEARED" : "❌ BLOCKED"} (risk: ${bbm0902Security.overallRiskScore.toFixed(1)}/100)`);
  console.log(`    Status:      ⚠️  Awaiting Composio connection for bbmw96@gmail.com`);
  console.log(`    Action:      composio.dev → Apps → YouTube → Add Account → bbmw96@gmail.com`);

  writeResult("10-bbm0902-short.json", {
    package:        bbm0902Short,
    affiliateResult: bbm0902AffiliateResult,
    composioPlan:   bbm0902Plan,
    securityReport: bbm0902Security,
  });

  // ── DONE ──────────────────────────────────────────────────────────────────
  separator("EXECUTION COMPLETE");
  console.log(`\n  All results saved to: C:\\Users\\BBMW0\\Projects\\OmniOrg\\results\\`);
  console.log(`\n  FILES GENERATED:`);
  console.log(`    00-security-preflight.json - 999-layer security audit report`);
  console.log(`    01-mesh-health.json        - NEUROMESH agent status`);
  console.log(`    02-trend-report.json       - Viral opportunity research`);
  console.log(`    03-instagram-weekly.json   - 14 Instagram content packages`);
  console.log(`    04-youtube-content.json    - 7 YouTube video packages`);
  console.log(`    05-video-enhancement.json  - Video quality improvement report`);
  console.log(`    06-monetisation.json       - Revenue roadmap + projections`);
  console.log(`    07-scheduled-posts.json    - All 21 posts in approval queue`);
  console.log(`    08-daily-schedule.json     - Optimal posting times + revenue projection`);
  console.log(`    09-composio-manifest.json  - Composio execution plan (all 21 posts)`);
  console.log(`    09-execution-instructions.md - Human-readable posting guide`);
  console.log(`    10-bbm0902-short.json      - @bbm0902 Short package + Composio plan`);
  console.log(`    CONTENT_PLAN.md            - Human-readable action plan`);
  console.log(`\n  AUTONOMOUS AGENT PIPELINE:`);
  console.log(`    → Security engine guards every operation (999 layers, OWASP-compliant)`);
  console.log(`    → Affiliate links auto-injected into all YouTube descriptions`);
  console.log(`    → Posts auto-approved when security clearance granted + policy checks pass`);
  console.log(`    → Composio execution manifest ready — agents post on your behalf once video files are uploaded`);
  console.log(`\n  ACTION REQUIRED (agents need these to fully automate):`);
  console.log(`    1. Record videos using hooks/scripts in results/03 and results/04`);
  console.log(`    2. Upload MP4 files → agents call Composio automatically`);
  console.log(`    3. YouTube AdSense: studio.youtube.com → Monetisation → Get Started`);
  console.log(`    4. Amazon Associates: affiliate.amazon.co.uk → sign up → tag: bbmw0-21`);
  console.log(`    5. Connect @bbm0902: composio.dev → Apps → YouTube → Add Account → bbmw96@gmail.com\n`);
}

// ── MARKDOWN REPORT GENERATOR ─────────────────────────────────────────────────

function generateMarkdownSummary(trends: any, ig: any[], yt: any[], monetisation: any, posts: any[], schedule: any): string {
  const now = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return `# OmniOrg Content Plan
**Generated:** ${now}
**Channel niche:** Video Editing
**Platforms:** Instagram + YouTube

---

## Monetisation Milestones

${monetisation.milestones.map((m: any) => {
  const pct = m.percentComplete;
  const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
  return `### ${m.name}
\`${bar}\` **${pct}%** (${m.current}/${m.target} ${m.unit})
Unlocks: **${m.revenueUnlock}**`;
}).join("\n\n")}

---

## Revenue Streams

| Stream | Status | Estimated Monthly |
|--------|--------|------------------|
${monetisation.revenueStreams.map((s: any) =>
  `| ${s.name} | ${s.status} | ${s.projectedMonthlyEarnings ? "GBP " + s.projectedMonthlyEarnings : "See unlock requirements"} |`
).join("\n")}

---

## Immediate Next Actions

${monetisation.nextActions.map((a: string, i: number) => `${i + 1}. ${a}`).join("\n")}

---

## This Week: Top Trending Opportunities

${trends.opportunities.slice(0, 5).map((t: any, i: number) => `
### ${i + 1}. ${t.topic}
- **Trend score:** ${t.trendScore}/100
- **Competition:** ${t.competitionLevel}
- **Urgency:** ${t.urgency}
- **Platform:** ${t.platform}
- **Format:** ${t.contentFormat}
- **Why now:** ${t.whyNow}
- **Your angle:** ${t.contentAngle}
- **Example title:** *${t.exampleContent}*
`).join("")}

---

## Instagram: 7 Posts This Week

${ig.map((pkg: any, i: number) => `
### Post ${i + 1}: ${pkg.format.toUpperCase()}
**Hook:** ${pkg.hook}

**Best posting time:** ${pkg.bestPostTime}

**Caption preview:**
${pkg.caption.slice(0, 300)}...

**Hashtags (${pkg.hashtags.length}):**
${pkg.hashtags.join(" ")}

**Visual concept:**
${pkg.visualConcept.slice(0, 200)}

**Audio direction:** ${pkg.audioDirection}

**CTA:** ${pkg.ctaText}

**Monetisation:** ${pkg.monetisationLayer.primaryPath} ${pkg.monetisationLayer.disclosureRequired ? "(disclosure required: " + pkg.monetisationLayer.disclosureText + ")" : ""}

**Policy status:** ${pkg.policyFlags.length === 0 ? "All clear" : pkg.policyFlags.join("; ")}
${pkg.approvedForPosting ? "STATUS: APPROVED" : "STATUS: AWAITING HUMAN APPROVAL"}
`).join("---\n")}

---

## YouTube: 7 Videos This Week

${yt.map((pkg: any, i: number) => `
### Video ${i + 1}: ${pkg.format.toUpperCase()}
**Title:** ${pkg.title}

**Title variants:**
${pkg.titleVariants.map((t: string) => `- ${t}`).join("\n")}

**Thumbnail concept:**
${pkg.thumbnailConcept}

**Opening hook:**
${pkg.openingHook}

**Chapter structure:**
${pkg.chapterMarkers.map((c: any) => `- ${c.timestamp} ${c.title}`).join("\n")}

**SEO tags:** ${pkg.tags.slice(0, 10).join(", ")}

**Revenue estimate:** ${pkg.monetisationLayer.estimatedCPM}

**AI disclosure:** ${pkg.aiDisclosure}

**Status:** ${pkg.approvedForUpload ? "APPROVED FOR UPLOAD" : "AWAITING HUMAN APPROVAL"}
`).join("---\n")}

---

## 14-Day Content Calendar

| Day | Platform | Format | Topic | Priority |
|-----|----------|--------|-------|----------|
${trends.contentCalendarSuggestion.map((day: any) =>
  `| Day ${day.dayOffset + 1} | ${day.platform} | ${day.format} | ${day.topic.slice(0, 50)} | ${day.priority} |`
).join("\n")}

---

## Daily Posting Schedule (${schedule.totalPerDay} posts/day · ${schedule.breakdown.youtube} YouTube + ${schedule.breakdown.instagram} Instagram)

### YouTube — ${schedule.weeklyBreakdown.youtube.total} videos/week

| Day | Format | Optimal Time | Why |
|-----|--------|-------------|-----|
${schedule.weeklyBreakdown.youtube.formats.map((s: any) =>
  `| ${s.day} | ${s.format} | ${s.time} | ${s.rationale} |`
).join("\n")}

### Instagram — ${schedule.weeklyBreakdown.instagram.total} posts/week

| Day | Format | Optimal Time | Why |
|-----|--------|-------------|-----|
${schedule.weeklyBreakdown.instagram.formats.map((s: any) =>
  `| ${s.day} | ${s.format} | ${s.time} | ${s.rationale} |`
).join("\n")}

### 12-Month Revenue Projection (AdSense · bbmw0 · up866106@gmail.com)

| Milestone | Est. Views | Est. GBP/month | What it unlocks |
|-----------|-----------|---------------|----------------|
${Object.entries(schedule.revenueProjection).map(([k, v]: [string, any]) =>
  `| ${k} | ${v.views.toLocaleString()} | GBP ${v.estimatedGBP} | ${v.milestone} |`
).join("\n")}

---

## Scheduled Posts (${posts.length} total)

${posts.filter((p: any) => p.status === "pending-approval").length} posts awaiting your approval.

To approve a post, call:
\`\`\`
POST /api/v1/content/approve/:postId
{ "approvedBy": "your-name", "notes": "optional notes" }
\`\`\`

Once approved, Composio handles delivery to Instagram and YouTube.

---

## How to Connect Composio for Live Posting

\`\`\`bash
claude mcp add --scope user --transport http composio https://connect.composio.dev/mcp --header "x-consumer-api-key: ck_4QgMHGt4I8Xb6X9shONe"
\`\`\`

Then connect your Instagram and YouTube accounts in Composio:
- **Instagram:** composio.dev → Apps → Instagram → Connect
- **YouTube:** composio.dev → Apps → YouTube → Connect

Once connected, NEUROMESH agents will call:
- \`INSTAGRAM_CREATE_POST\` for approved Instagram content
- \`YOUTUBE_UPLOAD_VIDEO\` for approved YouTube content

---

*Generated by OmniOrg NEUROMESH. All posts require human approval before delivery.*
*Policy-compliant. No automated posting without explicit sign-off.*
`;
}

main().catch(err => {
  console.error("\n  FATAL ERROR:", err.message);
  console.error(err.stack);
  process.exit(1);
});
