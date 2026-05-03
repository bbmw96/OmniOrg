// Created by BBMW0 Technologies | bbmw0.com
/**
 * EXCEL REPORTER — CSV + HTML executive dashboard for monthly content analytics
 *
 * Reads from publish-log-YYYY-MM.jsonl, generates:
 *   - omniorg-report-YYYY-MM-summary.csv
 *   - omniorg-report-YYYY-MM-all-content.csv
 *   - omniorg-report-YYYY-MM-top-performers.csv
 *   - omniorg-report-YYYY-MM.html  (dark-themed executive dashboard)
 */

import fs from "fs";
import path from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PublishedItem {
  date: string;              // ISO date
  channel: string;           // Channel display name
  platform: "youtube" | "instagram";
  format: string;            // "short", "long-form", "reel", "carousel", "story"
  title: string;
  url: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watchTimeMinutes: number;  // YouTube only
  engagementRate: number;    // (likes+comments+shares) / views * 100
  nanaBananaDNA: string;     // fingerprint
  scriptEngine: string;      // which LLM won the competition
  status: "published" | "pending" | "failed";
}

export interface ChannelMonthSummary {
  channelName: string;
  platform: string;
  totalPublished: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalWatchTimeHours: number;
  avgEngagementRate: number;
  estimatedAdRevenue: number;  // GBP estimate
  subscriberGain: number;
  topPerformingTitle: string;
  topPerformingViews: number;
}

export interface MonthlyReport {
  month: string;             // "May 2026"
  generatedAt: string;
  channels: ChannelMonthSummary[];
  allItems: PublishedItem[];
  grandTotals: {
    totalPieces: number;
    totalViews: number;
    totalEngagements: number;
    estimatedRevenue: number;
    avgEngagementRate: number;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const REPORTS_DIR = path.resolve(__dirname, "../../output/reports");
const YT_CPM_GBP = 2.5; // £2.50 per 1,000 YouTube views (UK/tech audience)

// ─── Utilities ───────────────────────────────────────────────────────────────

function ensureReportsDir(): void {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

/** "May 2026" → "2026-05" */
function monthToYYYYMM(month: string): string {
  const [monthName, year] = month.trim().split(" ");
  const months: Record<string, string> = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  };
  const mm = months[monthName];
  if (!mm || !year) throw new Error(`Invalid month string: "${month}"`);
  return `${year}-${mm}`;
}

function logFilePath(month: string): string {
  return path.join(REPORTS_DIR, `publish-log-${monthToYYYYMM(month)}.jsonl`);
}

/** Escape a CSV cell value */
function csvCell(value: string | number | boolean): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values: (string | number | boolean)[]): string {
  return values.map(csvCell).join(",");
}

// ─── Core Functions ───────────────────────────────────────────────────────────

export function loadPublishedItems(month: string): PublishedItem[] {
  const filePath = logFilePath(month);
  if (!fs.existsSync(filePath)) return [];

  const raw = fs.readFileSync(filePath, "utf-8");
  const items: PublishedItem[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      items.push(JSON.parse(trimmed) as PublishedItem);
    } catch {
      // skip malformed lines
    }
  }

  return items;
}

export function appendPublishedItem(
  item: Omit<PublishedItem, "engagementRate">
): void {
  ensureReportsDir();

  const engagementRate =
    ((item.likes + item.comments + item.shares) / Math.max(item.views, 1)) *
    100;

  const full: PublishedItem = { ...item, engagementRate };

  // Derive month from item date ("2026-05-12" → "May 2026")
  const d = new Date(item.date);
  const monthLabel = d.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const filePath = logFilePath(monthLabel);
  fs.appendFileSync(filePath, JSON.stringify(full) + "\n", "utf-8");
}

export function buildChannelSummary(
  items: PublishedItem[],
  channelName: string
): ChannelMonthSummary {
  const channelItems = items.filter((i) => i.channel === channelName);

  if (channelItems.length === 0) {
    return {
      channelName,
      platform: "youtube",
      totalPublished: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalWatchTimeHours: 0,
      avgEngagementRate: 0,
      estimatedAdRevenue: 0,
      subscriberGain: 0,
      topPerformingTitle: "—",
      topPerformingViews: 0,
    };
  }

  const totalViews = channelItems.reduce((s, i) => s + i.views, 0);
  const totalLikes = channelItems.reduce((s, i) => s + i.likes, 0);
  const totalComments = channelItems.reduce((s, i) => s + i.comments, 0);
  const totalShares = channelItems.reduce((s, i) => s + i.shares, 0);
  const totalWatchMins = channelItems.reduce(
    (s, i) => s + i.watchTimeMinutes,
    0
  );
  const avgEngagementRate =
    channelItems.reduce((s, i) => s + i.engagementRate, 0) /
    channelItems.length;

  // YouTube CPM only — Instagram has no AdSense
  const platform = channelItems[0].platform;
  const estimatedAdRevenue =
    platform === "youtube"
      ? (totalViews / 1000) * YT_CPM_GBP
      : 0;

  const top = channelItems.reduce(
    (best, i) => (i.views > best.views ? i : best),
    channelItems[0]
  );

  return {
    channelName,
    platform,
    totalPublished: channelItems.length,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    totalWatchTimeHours: Math.round((totalWatchMins / 60) * 100) / 100,
    avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
    estimatedAdRevenue: Math.round(estimatedAdRevenue * 100) / 100,
    subscriberGain: 0, // populated externally from platform API data
    topPerformingTitle: top.title,
    topPerformingViews: top.views,
  };
}

export function generateExcelReport(month: string): string {
  ensureReportsDir();
  const yyyymm = monthToYYYYMM(month);
  const items = loadPublishedItems(month);

  // ── Build channel summaries ────────────────────────────────────────────────
  const channelNames = [...new Set(items.map((i) => i.channel))];
  const summaries = channelNames.map((name) =>
    buildChannelSummary(items, name)
  );

  // ── Grand totals ──────────────────────────────────────────────────────────
  const totalViews = summaries.reduce((s, c) => s + c.totalViews, 0);
  const totalEngagements = items.reduce(
    (s, i) => s + i.likes + i.comments + i.shares,
    0
  );
  const estimatedRevenue = summaries.reduce(
    (s, c) => s + c.estimatedAdRevenue,
    0
  );
  const avgEngagementRate =
    summaries.length > 0
      ? summaries.reduce((s, c) => s + c.avgEngagementRate, 0) /
        summaries.length
      : 0;

  // ── 1. Summary CSV ────────────────────────────────────────────────────────
  const summaryHeaders = [
    "Channel",
    "Platform",
    "Published",
    "Total Views",
    "Total Likes",
    "Total Comments",
    "Total Shares",
    "Watch Time (hrs)",
    "Avg Engagement %",
    "Est. Revenue (GBP)",
    "Subscriber Gain",
    "Top Performing Title",
    "Top Performing Views",
  ];
  const summaryRows = summaries.map((c) =>
    toCsvRow([
      c.channelName,
      c.platform,
      c.totalPublished,
      c.totalViews,
      c.totalLikes,
      c.totalComments,
      c.totalShares,
      c.totalWatchTimeHours,
      c.avgEngagementRate,
      c.estimatedAdRevenue,
      c.subscriberGain,
      c.topPerformingTitle,
      c.topPerformingViews,
    ])
  );
  const summaryCsv = [toCsvRow(summaryHeaders), ...summaryRows].join("\n");
  const summaryPath = path.join(
    REPORTS_DIR,
    `omniorg-report-${yyyymm}-summary.csv`
  );
  fs.writeFileSync(summaryPath, summaryCsv, "utf-8");

  // ── 2. All-content CSV ────────────────────────────────────────────────────
  const contentHeaders = [
    "Date",
    "Channel",
    "Platform",
    "Format",
    "Title",
    "URL",
    "Views",
    "Likes",
    "Comments",
    "Shares",
    "Saves",
    "Watch Time (mins)",
    "Engagement %",
    "NanaBanana DNA",
    "Script Engine",
    "Status",
  ];
  const sortedItems = [...items].sort((a, b) => b.views - a.views);
  const contentRows = sortedItems.map((i) =>
    toCsvRow([
      i.date,
      i.channel,
      i.platform,
      i.format,
      i.title,
      i.url,
      i.views,
      i.likes,
      i.comments,
      i.shares,
      i.saves,
      i.watchTimeMinutes,
      i.engagementRate,
      i.nanaBananaDNA,
      i.scriptEngine,
      i.status,
    ])
  );
  const contentCsv = [toCsvRow(contentHeaders), ...contentRows].join("\n");
  const contentPath = path.join(
    REPORTS_DIR,
    `omniorg-report-${yyyymm}-all-content.csv`
  );
  fs.writeFileSync(contentPath, contentCsv, "utf-8");

  // ── 3. Top performers CSV (top 10 by views) ───────────────────────────────
  const top10 = sortedItems.slice(0, 10);
  const topCsv = [toCsvRow(contentHeaders), ...top10.map((i) =>
    toCsvRow([
      i.date,
      i.channel,
      i.platform,
      i.format,
      i.title,
      i.url,
      i.views,
      i.likes,
      i.comments,
      i.shares,
      i.saves,
      i.watchTimeMinutes,
      i.engagementRate,
      i.nanaBananaDNA,
      i.scriptEngine,
      i.status,
    ])
  )].join("\n");
  const topPath = path.join(
    REPORTS_DIR,
    `omniorg-report-${yyyymm}-top-performers.csv`
  );
  fs.writeFileSync(topPath, topCsv, "utf-8");

  // ── 4. HTML executive dashboard ───────────────────────────────────────────
  const htmlPath = path.join(REPORTS_DIR, `omniorg-report-${yyyymm}.html`);
  fs.writeFileSync(htmlPath, buildHtml(month, summaries, sortedItems, {
    totalPieces: items.length,
    totalViews,
    totalEngagements,
    estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
    avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
  }), "utf-8");

  return htmlPath;
}

// ─── HTML Builder ─────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-GB");
}

function buildHtml(
  month: string,
  summaries: ChannelMonthSummary[],
  items: PublishedItem[],
  totals: {
    totalPieces: number;
    totalViews: number;
    totalEngagements: number;
    estimatedRevenue: number;
    avgEngagementRate: number;
  }
): string {
  const summaryTableRows = summaries
    .map(
      (c) => `
    <tr>
      <td>${c.channelName}</td>
      <td><span class="badge badge-${c.platform}">${c.platform}</span></td>
      <td>${fmt(c.totalPublished)}</td>
      <td>${fmt(c.totalViews)}</td>
      <td>${fmt(c.totalLikes)}</td>
      <td>${fmt(c.totalComments)}</td>
      <td>${fmt(c.totalShares)}</td>
      <td>${c.totalWatchTimeHours}h</td>
      <td>${c.avgEngagementRate}%</td>
      <td>£${fmt(c.estimatedAdRevenue)}</td>
      <td>${c.topPerformingTitle}</td>
      <td>${fmt(c.topPerformingViews)}</td>
    </tr>`
    )
    .join("");

  const contentTableRows = items
    .map(
      (i) => `
    <tr>
      <td>${i.date}</td>
      <td>${i.channel}</td>
      <td><span class="badge badge-${i.platform}">${i.platform}</span></td>
      <td><span class="format-tag">${i.format}</span></td>
      <td class="title-cell">${i.title.replace(/</g, "&lt;")}</td>
      <td>${fmt(i.views)}</td>
      <td>${fmt(i.likes)}</td>
      <td>${fmt(i.comments)}</td>
      <td>${fmt(i.shares)}</td>
      <td>${i.engagementRate.toFixed(2)}%</td>
      <td><span class="status-${i.status}">${i.status}</span></td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OmniOrg Report — ${month}</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
    rel="stylesheet"
  />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0A0A0A;
      --surface: #111111;
      --surface2: #1A1A1A;
      --border: #222222;
      --gold: #C9A84C;
      --gold-dim: #8a6f2e;
      --text: #F0F0F0;
      --text-dim: #888888;
      --blue: #00D4FF;
      --purple: #7B2FBE;
      --green: #00C781;
      --red: #FF4B4B;
    }

    body {
      font-family: "Inter", -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
    }

    /* ── Header ── */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
    }
    header h1 span { color: var(--gold); }
    .report-meta {
      text-align: right;
      font-size: 0.8rem;
      color: var(--text-dim);
      line-height: 1.6;
    }
    .report-meta strong { color: var(--gold); font-size: 1rem; }

    /* ── Section headings ── */
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--gold);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .section-title::after {
      content: "";
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    /* ── Executive summary cards ── */
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 3rem;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: "";
      position: absolute;
      inset: 0 0 auto 0;
      height: 2px;
      background: linear-gradient(90deg, var(--gold), transparent);
    }
    .card-label {
      font-size: 0.7rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-dim);
      margin-bottom: 0.5rem;
    }
    .card-value {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.02em;
    }
    .card-value.gold { color: var(--gold); }
    .card-value.blue { color: var(--blue); }
    .card-value.green { color: var(--green); }

    /* ── Tables ── */
    .table-wrap {
      overflow-x: auto;
      margin-bottom: 3rem;
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }
    thead th {
      background: var(--surface2);
      color: var(--gold);
      font-weight: 600;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      padding: 0.75rem 1rem;
      text-align: left;
      white-space: nowrap;
      border-bottom: 1px solid var(--border);
    }
    tbody tr {
      border-bottom: 1px solid var(--border);
      transition: background 0.15s;
    }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: var(--surface2); }
    tbody td {
      padding: 0.65rem 1rem;
      color: var(--text);
      vertical-align: middle;
    }
    .title-cell { max-width: 280px; }

    /* ── Badges ── */
    .badge {
      display: inline-block;
      padding: 0.2em 0.6em;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-youtube  { background: #FF0000; color: #fff; }
    .badge-instagram { background: linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: #fff; }
    .format-tag {
      display: inline-block;
      padding: 0.15em 0.55em;
      border-radius: 4px;
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--blue);
      font-size: 0.72rem;
      font-weight: 500;
    }
    .status-published { color: var(--green); font-weight: 600; }
    .status-pending   { color: var(--gold); font-weight: 600; }
    .status-failed    { color: var(--red);  font-weight: 600; }

    /* ── Footer ── */
    footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-dim);
    }
    footer a { color: var(--gold); text-decoration: none; }
  </style>
</head>
<body>

  <header>
    <h1>OmniOrg <span>Report</span></h1>
    <div class="report-meta">
      <strong>${month}</strong><br />
      Generated: ${new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}<br />
      BBMW0 Technologies · bbmw0.com
    </div>
  </header>

  <!-- Executive Summary Cards -->
  <div class="section-title">Executive Summary</div>
  <div class="cards">
    <div class="card">
      <div class="card-label">Total Pieces Published</div>
      <div class="card-value blue">${fmt(totals.totalPieces)}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Views</div>
      <div class="card-value">${fmt(totals.totalViews)}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Engagements</div>
      <div class="card-value">${fmt(totals.totalEngagements)}</div>
    </div>
    <div class="card">
      <div class="card-label">Est. Ad Revenue</div>
      <div class="card-value gold">£${fmt(totals.estimatedRevenue)}</div>
    </div>
    <div class="card">
      <div class="card-label">Avg Engagement Rate</div>
      <div class="card-value green">${totals.avgEngagementRate}%</div>
    </div>
    <div class="card">
      <div class="card-label">Channels Active</div>
      <div class="card-value">${summaries.length}</div>
    </div>
  </div>

  <!-- Channel Breakdown -->
  <div class="section-title">Channel Breakdown</div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Channel</th>
          <th>Platform</th>
          <th>Published</th>
          <th>Views</th>
          <th>Likes</th>
          <th>Comments</th>
          <th>Shares</th>
          <th>Watch Time</th>
          <th>Avg Eng%</th>
          <th>Est. Revenue</th>
          <th>Top Content</th>
          <th>Top Views</th>
        </tr>
      </thead>
      <tbody>
        ${summaryTableRows || "<tr><td colspan='12' style='text-align:center;color:var(--text-dim);padding:2rem'>No data for this month</td></tr>"}
      </tbody>
    </table>
  </div>

  <!-- All Content -->
  <div class="section-title">All Content — sorted by views</div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Channel</th>
          <th>Platform</th>
          <th>Format</th>
          <th>Title</th>
          <th>Views</th>
          <th>Likes</th>
          <th>Comments</th>
          <th>Shares</th>
          <th>Eng%</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${contentTableRows || "<tr><td colspan='11' style='text-align:center;color:var(--text-dim);padding:2rem'>No content published this month</td></tr>"}
      </tbody>
    </table>
  </div>

  <footer>
    <p>
      Generated by <a href="https://bbmw0.com" target="_blank">BBMW0 Technologies</a>
      · OmniOrg Intelligence Platform · ${month}
    </p>
  </footer>

</body>
</html>`;
}
