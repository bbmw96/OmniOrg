// Created by BBMW0 Technologies | bbmw0.com

import { agentSecurity, SecurityContext, SecurityAuditReport } from "../security/agent-security-engine";
import { affiliateEngine } from "./affiliate-engine";
import { composioPublisher, COMPOSIO_ACCOUNTS } from "./composio-publisher";
import * as fs from "fs";
import * as path from "path";

// ── TYPES ──────────────────────────────────────────────────────────────────────

export interface AutoPublishDecision {
  contentId: string;
  platform: "instagram" | "youtube";
  securityReport: SecurityAuditReport;
  affiliateInjected: boolean;
  autoApproved: boolean;
  approvalReason: string;
  composioPlan: object[];
  readyToExecute: boolean;
  blockers: string[];
  estimatedPostTime: string;
}

export interface ComposioExecutionManifest {
  generatedAt: string;
  totalPosts: number;
  readyToExecute: number;
  requiresHumanApproval: number;
  requiresVideoFile: number;
  instagramPosts: AutoPublishDecision[];
  youtubePosts: AutoPublishDecision[];
  executionOrder: string[];
  estimatedCompletionTime: string;
  securitySummary: {
    allSecurityPassed: boolean;
    avgRiskScore: number;
    criticalBlockers: string[];
  };
}

// ── AUTO PUBLISHER ─────────────────────────────────────────────────────────────

export class AutoPublisher {

  /**
   * Prepares a full AutoPublishDecision for an Instagram content package.
   * Runs security audit, checks approval flags, and builds the Composio plan.
   */
  async prepareInstagramPost(pkg: any): Promise<AutoPublishDecision> {
    const ctx: SecurityContext = {
      agentId:   "auto-publisher",
      tenantId:  pkg.tenantId ?? "bbmw0-main",
      operation: "publish-instagram",
      platform:  "instagram",
      contentId: pkg.contentId,
      payload:   pkg,
      timestamp: new Date().toISOString(),
    };

    const securityReport: SecurityAuditReport = agentSecurity.runFullSecurityAudit(ctx);

    const blockers: string[] = [];
    let autoApproved = false;
    let approvalReason = "";

    if (!securityReport.clearanceGranted) {
      blockers.push(...(securityReport.criticalFailures ?? []).map(f => f.message ?? f.name));
      approvalReason = "Security clearance denied";
    } else if (pkg.approvedForPosting !== true) {
      blockers.push("pkg.approvedForPosting is not true — awaiting human approval");
      approvalReason = "Pending human approval";
    } else {
      autoApproved = true;
      approvalReason = "Security passed and human approval confirmed";
    }

    const isReel = pkg.format === "reels" || pkg.format === "REELS";
    const composioPlan = isReel
      ? composioPublisher.getInstagramReelPlan({
          contentId: pkg.contentId,
          mediaType: "REELS",
          videoUrl: pkg.videoUrl,
          videoS3Key: pkg.videoS3Key,
          coverUrl: pkg.coverUrl,
          caption: pkg.caption ?? "",
          shareToFeed: true,
          approvedBy: pkg.approvedBy ?? "auto-publisher",
        })
      : composioPublisher.getInstagramCarouselPlan({
          contentId: pkg.contentId,
          mediaType: "CAROUSEL",
          imageUrls: pkg.imageUrls ?? [],
          caption: pkg.caption ?? "",
          approvedBy: pkg.approvedBy ?? "auto-publisher",
        });

    const hasMedia = isReel
      ? !!(pkg.videoUrl || pkg.videoS3Key)
      : !!(pkg.imageUrls && pkg.imageUrls.length >= 2);

    if (!hasMedia) {
      blockers.push(
        isReel
          ? "Missing video file — provide videoUrl or videoS3Key"
          : "Missing images — provide at least 2 imageUrls for carousel",
      );
    }

    const readyToExecute = autoApproved && hasMedia && blockers.length === 0;

    return {
      contentId: pkg.contentId,
      platform: "instagram",
      securityReport,
      affiliateInjected: false,
      autoApproved,
      approvalReason,
      composioPlan,
      readyToExecute,
      blockers,
      estimatedPostTime: pkg.scheduledTime ?? new Date().toISOString(),
    };
  }

  /**
   * Prepares a full AutoPublishDecision for a YouTube content package.
   * Runs security audit, injects affiliate links, and builds the Composio plan.
   */
  async prepareYouTubePost(pkg: any): Promise<AutoPublishDecision> {
    const ctx: SecurityContext = {
      agentId:   "auto-publisher",
      tenantId:  pkg.tenantId ?? "bbmw0-main",
      operation: "publish-youtube",
      platform:  "youtube",
      contentId: pkg.contentId,
      payload:   pkg,
      timestamp: new Date().toISOString(),
    };

    const securityReport: SecurityAuditReport = agentSecurity.runFullSecurityAudit(ctx);

    const blockers: string[] = [];
    let autoApproved = false;
    let approvalReason = "";

    if (!securityReport.clearanceGranted) {
      blockers.push(...(securityReport.criticalFailures ?? []).map(f => f.message ?? f.name));
      approvalReason = "Security clearance denied";
    } else if (pkg.approvedForPosting !== true) {
      blockers.push("pkg.approvedForPosting is not true — awaiting human approval");
      approvalReason = "Pending human approval";
    } else {
      autoApproved = true;
      approvalReason = "Security passed and human approval confirmed";
    }

    const affiliateResult = affiliateEngine.injectIntoDescription(
      pkg.description ?? "",
      pkg.tags ?? [],
      pkg.title ?? "",
    );
    const enhancedDescription = affiliateResult.enhancedDescription;

    const composioPlan = composioPublisher.getYouTubeUploadPlan({
      contentId: pkg.contentId,
      videoS3Key: pkg.videoS3Key,
      videoFilePath: pkg.videoFilePath,
      title: pkg.title ?? "",
      description: enhancedDescription,
      tags: pkg.tags ?? [],
      categoryId: pkg.categoryId ?? "28",
      privacyStatus: pkg.privacyStatus ?? "public",
      thumbnailUrl: pkg.thumbnailUrl,
      approvedBy: pkg.approvedBy ?? "auto-publisher",
    });

    const hasVideo = !!(pkg.videoS3Key || pkg.videoFilePath);
    if (!hasVideo) {
      blockers.push("Missing video file — provide videoS3Key or videoFilePath");
    }

    const readyToExecute = autoApproved && hasVideo && blockers.length === 0;

    return {
      contentId: pkg.contentId,
      platform: "youtube",
      securityReport,
      affiliateInjected: affiliateResult.productsInjected.length > 0,
      autoApproved,
      approvalReason,
      composioPlan,
      readyToExecute,
      blockers,
      estimatedPostTime: pkg.scheduledTime ?? new Date().toISOString(),
    };
  }

  /**
   * Generates a complete ComposioExecutionManifest from Instagram and YouTube
   * content packages. YouTube long-form posts are prioritised in execution order.
   */
  async generateManifest(
    igPackages: any[],
    ytPackages: any[],
  ): Promise<ComposioExecutionManifest> {
    const [instagramPosts, youtubePosts] = await Promise.all([
      Promise.all(igPackages.map((pkg) => this.prepareInstagramPost(pkg))),
      Promise.all(ytPackages.map((pkg) => this.prepareYouTubePost(pkg))),
    ]);

    const allPosts = [...instagramPosts, ...youtubePosts];
    const readyPosts = allPosts.filter((p) => p.readyToExecute);
    const requiresHumanApproval = allPosts.filter(
      (p) => !p.readyToExecute && !p.securityReport.clearanceGranted === false,
    ).length;
    const requiresVideoFile = allPosts.filter((p) =>
      p.blockers.some((b) => b.includes("video file") || b.includes("Missing video")),
    ).length;

    const executionOrder = this._buildExecutionOrder(youtubePosts, instagramPosts);

    const riskScores = allPosts
      .map((p) => p.securityReport.overallRiskScore ?? 0)
      .filter((s) => typeof s === "number");
    const avgRiskScore =
      riskScores.length > 0
        ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length
        : 0;

    const criticalBlockers = Array.from(
      new Set(allPosts.flatMap((p) => p.blockers)),
    );

    const estimatedCompletionTime = new Date(
      Date.now() + allPosts.length * 3 * 60 * 1000,
    ).toISOString();

    return {
      generatedAt: new Date().toISOString(),
      totalPosts: allPosts.length,
      readyToExecute: readyPosts.length,
      requiresHumanApproval,
      requiresVideoFile,
      instagramPosts,
      youtubePosts,
      executionOrder,
      estimatedCompletionTime,
      securitySummary: {
        allSecurityPassed: allPosts.every((p) => p.securityReport.clearanceGranted),
        avgRiskScore: Math.round(avgRiskScore * 100) / 100,
        criticalBlockers,
      },
    };
  }

  /**
   * Writes the manifest JSON and a human-readable posting guide to the results dir.
   */
  saveManifest(manifest: ComposioExecutionManifest, resultsDir: string): void {
    fs.mkdirSync(resultsDir, { recursive: true });

    const manifestPath = path.join(resultsDir, "09-composio-manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

    const instructionsPath = path.join(resultsDir, "09-execution-instructions.md");
    fs.writeFileSync(instructionsPath, this._buildInstructions(manifest), "utf-8");

    console.log(`[AutoPublisher] Manifest saved → ${manifestPath}`);
    console.log(`[AutoPublisher] Instructions saved → ${instructionsPath}`);
  }

  /**
   * Logs the execution plan for all ready posts so Claude can execute the
   * Composio MCP calls. Actual MCP execution is performed by Claude Code
   * using the Composio MCP server — this method makes the plan explicit.
   */
  async executeReadyPosts(manifest: ComposioExecutionManifest): Promise<void> {
    const allDecisions = [
      ...manifest.instagramPosts,
      ...manifest.youtubePosts,
    ];

    const ready = manifest.executionOrder
      .map((id) => allDecisions.find((d) => d.contentId === id))
      .filter((d): d is AutoPublishDecision => !!d && d.readyToExecute);

    if (ready.length === 0) {
      console.log("[AutoPublisher] No posts are ready to execute.");
      return;
    }

    console.log(`[AutoPublisher] ${ready.length} post(s) ready. Execution plan:`);
    console.log("=".repeat(60));

    for (const decision of ready) {
      console.log(`\n▶ ${decision.contentId} [${decision.platform.toUpperCase()}]`);
      console.log(`  Estimated post time: ${decision.estimatedPostTime}`);
      console.log(`  Affiliate injected:  ${decision.affiliateInjected}`);
      console.log(`  Composio steps (${decision.composioPlan.length}):`);

      decision.composioPlan.forEach((step: any, i: number) => {
        console.log(`    Step ${i + 1}: ${step.tool}`);
        console.log(`    Params: ${JSON.stringify(step.params, null, 6)}`);
        if (step.storeAs) {
          console.log(`    Store result as: ${step.storeAs} (extract: ${step.extract})`);
        }
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log(
      "[AutoPublisher] Execute these steps via the Composio MCP server (mcp__composio__COMPOSIO_MULTI_EXECUTE_TOOL).",
    );
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private _buildExecutionOrder(
    ytPosts: AutoPublishDecision[],
    igPosts: AutoPublishDecision[],
  ): string[] {
    const ytLongForm = ytPosts
      .filter((p) => p.readyToExecute)
      .map((p) => p.contentId);

    const igReels = igPosts
      .filter((p) => p.readyToExecute && (p.composioPlan[0] as any)?.params?.media_type === "REELS")
      .map((p) => p.contentId);

    const ytShorts = ytPosts
      .filter((p) => !p.readyToExecute)
      .map((p) => p.contentId);

    const igCarousels = igPosts
      .filter((p) => p.readyToExecute && (p.composioPlan[0] as any)?.params?.media_type !== "REELS")
      .map((p) => p.contentId);

    const notReady = [
      ...ytPosts.filter((p) => !p.readyToExecute).map((p) => p.contentId),
      ...igPosts.filter((p) => !p.readyToExecute).map((p) => p.contentId),
    ].filter((id) => !ytShorts.includes(id));

    return [...ytLongForm, ...igReels, ...ytShorts, ...igCarousels, ...notReady];
  }

  private _buildInstructions(manifest: ComposioExecutionManifest): string {
    const lines: string[] = [
      "# OmniOrg — Composio Execution Instructions",
      `Generated: ${manifest.generatedAt}`,
      "",
      "## Summary",
      `- Total posts: ${manifest.totalPosts}`,
      `- Ready to execute: ${manifest.readyToExecute}`,
      `- Requires human approval: ${manifest.requiresHumanApproval}`,
      `- Requires video file: ${manifest.requiresVideoFile}`,
      `- Estimated completion: ${manifest.estimatedCompletionTime}`,
      "",
      "## Security Summary",
      `- All security passed: ${manifest.securitySummary.allSecurityPassed}`,
      `- Average risk score: ${manifest.securitySummary.avgRiskScore}`,
    ];

    if (manifest.securitySummary.criticalBlockers.length > 0) {
      lines.push("- Critical blockers:");
      manifest.securitySummary.criticalBlockers.forEach((b) => lines.push(`  - ${b}`));
    }

    lines.push("", "## Execution Order", "");
    manifest.executionOrder.forEach((id, i) => {
      lines.push(`${i + 1}. ${id}`);
    });

    const allDecisions = [...manifest.instagramPosts, ...manifest.youtubePosts];

    const ready = allDecisions.filter((d) => d.readyToExecute);
    if (ready.length > 0) {
      lines.push("", "## Ready to Execute", "");
      for (const d of ready) {
        lines.push(`### ${d.contentId} [${d.platform}]`);
        lines.push(`- Scheduled: ${d.estimatedPostTime}`);
        lines.push(`- Affiliate injected: ${d.affiliateInjected}`);
        lines.push(`- Approval reason: ${d.approvalReason}`);
        lines.push("- Composio tool calls:");
        d.composioPlan.forEach((step: any, i: number) => {
          lines.push(`  **Step ${i + 1}:** \`${step.tool}\``);
          lines.push("  ```json");
          lines.push("  " + JSON.stringify(step.params, null, 2).replace(/\n/g, "\n  "));
          lines.push("  ```");
        });
        lines.push("");
      }
    }

    const needsVideo = allDecisions.filter((d) =>
      d.blockers.some((b) => b.includes("video file") || b.includes("Missing video")),
    );
    if (needsVideo.length > 0) {
      lines.push("## Requires Video File", "");
      for (const d of needsVideo) {
        lines.push(`### ${d.contentId} [${d.platform}]`);
        d.blockers.forEach((b) => lines.push(`- ${b}`));
        lines.push("");
      }
    }

    return lines.join("\n");
  }
}

export const autoPublisher = new AutoPublisher();
export default autoPublisher;
