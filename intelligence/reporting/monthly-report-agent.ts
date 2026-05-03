// Created by BBMW0 Technologies | bbmw0.com
/**
 * MONTHLY REPORT AGENT
 *
 * Runs on the 1st of every month.
 * Compiles the full previous-month performance report:
 *   - Every piece published across all 4 channels
 *   - Views, likes, comments, shares, saves per piece
 *   - Channel summaries + grand totals
 *   - Top 10 performers
 *   - Revenue estimates (YouTube AdSense CPM)
 *   - Growth vs targets
 *   - Emoji-rich HTML email delivered to up866106@gmail.com
 *   - Excel-ready CSV files written to output/reports/
 *   - HTML dashboard written to output/reports/
 *
 * Trigger: scheduled cron OR call runMonthlyReport() directly.
 */

import { config as loadEnv } from "dotenv";
import path from "path";
import fs from "fs";
import { Resend } from "resend";

import {
  generateExcelReport,
  loadPublishedItems,
  buildChannelSummary,
  MonthlyReport,
  PublishedItem,
  ChannelMonthSummary,
} from "./excel-reporter";

import { CHANNELS, getTotalMonthlyVolume } from "../../core/channels/channel-config";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function getPreviousMonth(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getPreviousMonthLabel(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-GB");
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ─── Email HTML Builder ───────────────────────────────────────────────────────

function buildEmailHtml(report: MonthlyReport): string {
  const { month, channels, allItems, grandTotals } = report;

  // ── Section 1: Grand total stat cards ─────────────────────────────────────
  const statCards = `
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:32px;">
      <div style="background:#111;border:1px solid #222;border-radius:12px;padding:20px;border-top:2px solid #C9A84C;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:8px;">📹 Total Pieces</div>
        <div style="font-size:32px;font-weight:700;color:#00D4FF;">${fmt(grandTotals.totalPieces)}</div>
      </div>
      <div style="background:#111;border:1px solid #222;border-radius:12px;padding:20px;border-top:2px solid #C9A84C;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:8px;">👁️ Total Views</div>
        <div style="font-size:32px;font-weight:700;color:#F0F0F0;">${fmt(grandTotals.totalViews)}</div>
      </div>
      <div style="background:#111;border:1px solid #222;border-radius:12px;padding:20px;border-top:2px solid #C9A84C;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:8px;">💬 Total Engagements</div>
        <div style="font-size:32px;font-weight:700;color:#F0F0F0;">${fmt(grandTotals.totalEngagements)}</div>
      </div>
      <div style="background:#111;border:1px solid #222;border-radius:12px;padding:20px;border-top:2px solid #C9A84C;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:8px;">💰 Est. Revenue</div>
        <div style="font-size:32px;font-weight:700;color:#C9A84C;">£${fmt(grandTotals.estimatedRevenue)}</div>
      </div>
    </div>`;

  // ── Section 2: Per-channel breakdown table ─────────────────────────────────
  const channelRows = channels
    .map(
      (c) => `
      <tr>
        <td style="padding:10px 12px;color:#F0F0F0;font-weight:500;">${c.channelName}</td>
        <td style="padding:10px 12px;color:#888;">${c.platform}</td>
        <td style="padding:10px 12px;color:#00D4FF;text-align:center;">${fmt(c.totalPublished)}</td>
        <td style="padding:10px 12px;text-align:right;">${fmt(c.totalViews)}</td>
        <td style="padding:10px 12px;text-align:right;">${fmt(c.totalLikes)}</td>
        <td style="padding:10px 12px;text-align:right;">${fmt(c.totalComments)}</td>
        <td style="padding:10px 12px;text-align:right;">${fmt(c.subscriberGain)}</td>
        <td style="padding:10px 12px;text-align:right;color:#00C781;">${fmtPct(c.avgEngagementRate)}</td>
        <td style="padding:10px 12px;text-align:right;color:#C9A84C;">£${fmt(c.estimatedAdRevenue)}</td>
      </tr>`
    )
    .join("");

  const channelSection = `
    <div style="margin-bottom:32px;">
      <div style="font-size:13px;font-weight:600;color:#C9A84C;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #222;">
        📊 Channel Breakdown
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#1A1A1A;">
              <th style="padding:10px 12px;text-align:left;color:#C9A84C;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #222;">Channel</th>
              <th style="padding:10px 12px;text-align:left;color:#C9A84C;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #222;">Platform</th>
              <th style="padding:10px 12px;text-align:center;color:#C9A84C;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #222;">Pieces</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #222;">Views</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #222;">Likes</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #222;">Comments</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #222;">Subs Gained</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #222;">Eng%</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #222;">Est. Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${channelRows || '<tr><td colspan="9" style="text-align:center;color:#888;padding:20px;">No data available</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;

  // ── Section 3: Top 5 performers ────────────────────────────────────────────
  const top5 = [...allItems]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const top5Rows = top5
    .map(
      (item, i) => `
      <tr>
        <td style="padding:10px 12px;color:#C9A84C;font-weight:700;text-align:center;">${i + 1}</td>
        <td style="padding:10px 12px;color:#F0F0F0;max-width:260px;">${item.title.replace(/</g, "&lt;")}</td>
        <td style="padding:10px 12px;color:#888;">${item.channel}</td>
        <td style="padding:10px 12px;text-align:right;">${fmt(item.views)}</td>
        <td style="padding:10px 12px;text-align:right;">${fmt(item.likes)}</td>
        <td style="padding:10px 12px;text-align:right;color:#00C781;">${fmtPct(item.engagementRate)}</td>
      </tr>`
    )
    .join("");

  const top5Section = `
    <div style="margin-bottom:32px;">
      <div style="font-size:13px;font-weight:600;color:#C9A84C;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #222;">
        🏆 Top 5 Performers
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#1A1A1A;">
              <th style="padding:10px 12px;text-align:center;color:#C9A84C;font-size:11px;text-transform:uppercase;border-bottom:1px solid #222;">#</th>
              <th style="padding:10px 12px;text-align:left;color:#C9A84C;font-size:11px;text-transform:uppercase;border-bottom:1px solid #222;">Title</th>
              <th style="padding:10px 12px;text-align:left;color:#C9A84C;font-size:11px;text-transform:uppercase;border-bottom:1px solid #222;">Channel</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;border-bottom:1px solid #222;">Views</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;border-bottom:1px solid #222;">Likes</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;border-bottom:1px solid #222;">Eng%</th>
            </tr>
          </thead>
          <tbody>
            ${top5Rows || '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px;">No content yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;

  // ── Section 4: Growth vs targets ──────────────────────────────────────────
  const growthRows = CHANNELS.map((cfg) => {
    const summary = channels.find((c) => c.channelName === cfg.displayName);
    const actualViews = summary?.totalViews ?? 0;
    const actualGain = summary?.subscriberGain ?? 0;
    const hitPct =
      cfg.targetViewsThisMonth > 0
        ? Math.round((actualViews / cfg.targetViewsThisMonth) * 100)
        : 0;
    const hitColour =
      hitPct >= 100 ? "#00C781" : hitPct >= 70 ? "#C9A84C" : "#FF4B4B";

    return `
      <tr>
        <td style="padding:10px 12px;color:#F0F0F0;font-weight:500;">${cfg.displayName}</td>
        <td style="padding:10px 12px;text-align:right;color:#888;">${fmt(cfg.targetViewsThisMonth)}</td>
        <td style="padding:10px 12px;text-align:right;">${fmt(actualViews)}</td>
        <td style="padding:10px 12px;text-align:right;font-weight:700;color:${hitColour};">${hitPct}%</td>
        <td style="padding:10px 12px;text-align:right;color:#888;">${fmt(cfg.targetSubscribersGain)}</td>
        <td style="padding:10px 12px;text-align:right;">${fmt(actualGain)}</td>
      </tr>`;
  }).join("");

  const growthSection = `
    <div style="margin-bottom:32px;">
      <div style="font-size:13px;font-weight:600;color:#C9A84C;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #222;">
        🎯 Growth vs Targets
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#1A1A1A;">
              <th style="padding:10px 12px;text-align:left;color:#C9A84C;font-size:11px;text-transform:uppercase;border-bottom:1px solid #222;">Channel</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;border-bottom:1px solid #222;">Target Views</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;border-bottom:1px solid #222;">Actual Views</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;border-bottom:1px solid #222;">% Hit</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;border-bottom:1px solid #222;">Target Followers</th>
              <th style="padding:10px 12px;text-align:right;color:#C9A84C;font-size:11px;text-transform:uppercase;border-bottom:1px solid #222;">Actual Gained</th>
            </tr>
          </thead>
          <tbody>
            ${growthRows}
          </tbody>
        </table>
      </div>
    </div>`;

  // ── Section 5: Next month focus ────────────────────────────────────────────
  // Derive from what performed best
  const topChannel =
    channels.length > 0
      ? channels.reduce((best, c) =>
          c.totalViews > best.totalViews ? c : best
        )
      : null;

  const topItem = allItems.length > 0
    ? allItems.reduce((best, i) => (i.views > best.views ? i : best))
    : null;

  const recommendations: string[] = [
    topChannel
      ? `Double down on <strong>${topChannel.channelName}</strong> — it drove the most views this month (${fmt(topChannel.totalViews)} views).`
      : "Ensure all 4 channels are publishing at full schedule capacity.",
    topItem
      ? `Replicate the formula of "<em>${topItem.title.replace(/</g, "&lt;").slice(0, 60)}${topItem.title.length > 60 ? "…" : ""}</em>" — your highest performing piece this month.`
      : "Run A/B tests on title formats to identify breakthrough hook archetypes.",
    "Increase Shorts/Reels output on any channel that missed its views target.",
    "Review NanoBanana DNA fingerprints — use only the patterns from top-10 content.",
    "Schedule engagement sweeps within 1 hour of each post to maximise algorithm reach.",
  ];

  const recommendationItems = recommendations
    .map(
      (r) =>
        `<li style="padding:6px 0;color:#D0D0D0;line-height:1.6;">${r}</li>`
    )
    .join("");

  const nextMonthSection = `
    <div style="margin-bottom:32px;">
      <div style="font-size:13px;font-weight:600;color:#C9A84C;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #222;">
        🚀 Next Month Focus
      </div>
      <ul style="margin:0;padding-left:20px;font-size:13px;">
        ${recommendationItems}
      </ul>
    </div>`;

  // ── Assemble full email ────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OmniOrg Monthly Report — ${month}</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F0F0F0;">
  <div style="max-width:720px;margin:0 auto;padding:32px 24px;">

    <!-- Header -->
    <div style="margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #222;">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#C9A84C;margin-bottom:8px;">
        BBMW0 Technologies · OmniOrg Intelligence Platform
      </div>
      <h1 style="font-size:24px;font-weight:700;color:#F0F0F0;margin:0 0 4px;">
        📊 OmniOrg Monthly Performance Report
      </h1>
      <div style="font-size:18px;font-weight:500;color:#C9A84C;margin-bottom:8px;">
        ${month}
      </div>
      <div style="font-size:12px;color:#888;">
        Generated: ${new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
        &nbsp;·&nbsp; CODE PROJECT 9697
      </div>
    </div>

    ${statCards}
    ${channelSection}
    ${top5Section}
    ${growthSection}
    ${nextMonthSection}

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #222;text-align:center;font-size:11px;color:#555;">
      Generated by OmniOrg AI Empire — CODE PROJECT 9697 |
      <a href="https://agents.bbmw0.com" style="color:#C9A84C;text-decoration:none;">agents.bbmw0.com</a>
      &nbsp;·&nbsp;
      <a href="https://bbmw0.com" style="color:#C9A84C;text-decoration:none;">bbmw0.com</a>
    </div>

  </div>
</body>
</html>`;
}

// ─── Send Email via Resend ────────────────────────────────────────────────────

async function sendMonthlyEmail(
  report: MonthlyReport,
  reportHtmlPath: string
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY ?? "");
  const label = report.month;
  const emailHtml = buildEmailHtml(report);

  // Attach the HTML dashboard as an inline attachment reference in the body
  let attachmentNote = "";
  if (fs.existsSync(reportHtmlPath)) {
    attachmentNote = `<p style="font-size:12px;color:#888;margin-top:16px;">
      Full HTML dashboard saved to: <code style="color:#00D4FF;">${reportHtmlPath}</code>
    </p>`;
  }

  const finalHtml = emailHtml.replace(
    "<!-- Footer -->",
    attachmentNote + "<!-- Footer -->"
  );

  const { error } = await resend.emails.send({
    from: "OmniOrg Reports <reports@agents.bbmw0.com>",
    to: ["up866106@gmail.com"],
    subject: `JiaWen money Claude Code project — ${label}`,
    html: finalHtml,
  });

  if (error) {
    throw new Error(`[MonthlyReportAgent] Resend error: ${JSON.stringify(error)}`);
  }

  console.log(`[MonthlyReportAgent] Email sent for ${label}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runMonthlyReport(): Promise<void> {
  const label = getPreviousMonthLabel();
  console.log(`[MonthlyReportAgent] Compiling report for ${label}…`);

  // 1. Load all published items for previous month
  const allItems = loadPublishedItems(label);
  console.log(`[MonthlyReportAgent] Loaded ${allItems.length} published items`);

  // 2. Build channel summaries
  const channelNames = CHANNELS.map((c) => c.displayName);
  const channelSummaries: ChannelMonthSummary[] = channelNames.map((name) =>
    buildChannelSummary(allItems, name)
  );

  // 3. Build grand totals
  const totalPieces = allItems.length;
  const totalViews = channelSummaries.reduce((s, c) => s + c.totalViews, 0);
  const totalEngagements = allItems.reduce(
    (s, i) => s + i.likes + i.comments + i.shares,
    0
  );
  const estimatedRevenue =
    Math.round(
      channelSummaries.reduce((s, c) => s + c.estimatedAdRevenue, 0) * 100
    ) / 100;
  const avgEngagementRate =
    channelSummaries.length > 0
      ? Math.round(
          (channelSummaries.reduce((s, c) => s + c.avgEngagementRate, 0) /
            channelSummaries.length) *
            100
        ) / 100
      : 0;

  // 4. Generate Excel/HTML report files
  const reportHtmlPath = generateExcelReport(label);
  console.log(`[MonthlyReportAgent] Report files written, HTML at: ${reportHtmlPath}`);

  // 5. Build MonthlyReport object
  const report: MonthlyReport = {
    month: label,
    generatedAt: new Date().toISOString(),
    channels: channelSummaries,
    allItems,
    grandTotals: {
      totalPieces,
      totalViews,
      totalEngagements,
      estimatedRevenue,
      avgEngagementRate,
    },
  };

  // 6 + 7. Build email HTML and send via Resend
  await sendMonthlyEmail(report, reportHtmlPath);

  // 8. Log result
  const vol = getTotalMonthlyVolume();
  console.log(
    `[MonthlyReportAgent] Done. ` +
      `Pieces: ${totalPieces} | Views: ${fmt(totalViews)} | Revenue: £${fmt(estimatedRevenue)} | ` +
      `Monthly volume targets — shorts: ${vol.shorts}, long-form: ${vol.longForm}, stories: ${vol.stories}`
  );
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

if (require.main === module) {
  runMonthlyReport().catch(console.error);
}
