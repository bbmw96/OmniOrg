// Created by BBMW0 Technologies | bbmw0.com
/**
 * GRABBIT+ ENGINE
 *
 * Content intelligence engine  -  equivalent to Grabbit Chrome extension.
 * But fully server-side, no browser extension required.
 *
 * Capabilities:
 *   - Extract all links from any URL (replaces Grabbit drag-select)
 *   - Bulk-fetch and Readability-clean content from multiple URLs
 *   - AI product comparison across up to 5 URLs (Claude)
 *   - AI article summarisation with key takeaways and tags
 *   - YouTube transcript extraction (InnerTube API  -  no API key needed)
 *   - Export results as Markdown, JSON, or plain text
 *
 * Exceeds Grabbit by:
 *   - Works headlessly (no Chrome needed)
 *   - Persistent cross-session storage (SQLite via OmniOrg DB)
 *   - Pushes directly to NotebookLM+ and content pipeline
 *   - Unlimited requests (no 300/month cap)
 */

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";
import { proxyFetch } from "../../core/proxy-fetch";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GrabbedPage {
  url:          string;
  title:        string;
  text:         string;       // Readability-cleaned body text
  html:         string;       // Raw HTML (truncated to 50 KB)
  links:        string[];     // All href links found on page
  fetchedAt:    string;
}

export interface AiSummary {
  url:          string;
  title:        string;
  takeaways:    string[];
  tags:         string[];
  conclusion:   string;
}

export interface AiComparison {
  items:        Array<{ url: string; title: string }>;
  winner:       string;
  table:        Array<{ feature: string; values: string[] }>;
  pros:         Record<string, string[]>;
  cons:         Record<string, string[]>;
  verdict:      string;
}

export interface YouTubeTranscript {
  videoId:     string;
  title:       string;
  chapters:    Array<{ timestamp: string; seconds: number; text: string }>;
  fullText:    string;
}

// ── Content fetching ──────────────────────────────────────────────────────────

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":     "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
};

export async function fetchPage(url: string): Promise<GrabbedPage> {
  const resp = await proxyFetch(url, { headers: FETCH_HEADERS });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);

  const raw  = await resp.text();
  const dom  = new JSDOM(raw, { url });
  const doc  = dom.window.document;

  // Extract all links
  const links = Array.from(doc.querySelectorAll("a[href]"))
    .map(a => (a as HTMLAnchorElement).href)
    .filter(h => h.startsWith("http"))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 500);

  // Readability content extraction (same technique as Grabbit's "Defuddle")
  const article = new Readability(doc).parse();
  const title   = article?.title ?? doc.title ?? new URL(url).hostname;
  const text    = article?.textContent?.trim() ?? raw.replace(/<[^>]+>/g, " ").trim();

  return {
    url,
    title,
    text:      text.slice(0, 60_000),
    html:      raw.slice(0, 51_200),
    links,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Extract all links from a page, optionally filtered by a pattern.
 * Server-side equivalent of Grabbit's drag-select link collection.
 */
export async function grabLinks(url: string, filterPattern?: RegExp): Promise<string[]> {
  const page = await fetchPage(url);
  return filterPattern ? page.links.filter(l => filterPattern.test(l)) : page.links;
}

/**
 * Bulk-fetch and clean multiple URLs in parallel.
 */
export async function grabBulk(urls: string[], concurrency = 4): Promise<GrabbedPage[]> {
  const results: GrabbedPage[] = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map(u => fetchPage(u)));
    for (const r of settled) {
      if (r.status === "fulfilled") results.push(r.value);
      else console.warn(`[Grabbit+] Failed: ${r.reason}`);
    }
  }
  return results;
}

// ── YouTube transcript ────────────────────────────────────────────────────────

function extractVideoId(urlOrId: string): string {
  try {
    const u = new URL(urlOrId);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    return u.searchParams.get("v") ?? urlOrId;
  } catch {
    return urlOrId;
  }
}

/**
 * Extract YouTube transcript using the InnerTube API (no API key needed).
 * Same technique as Grabbit's premium YouTube summary feature.
 */
export async function grabYouTubeTranscript(urlOrId: string): Promise<YouTubeTranscript> {
  const videoId = extractVideoId(urlOrId);

  const initResp = await proxyFetch("https://www.youtube.com/youtubei/v1/player", {
    method:  "POST",
    headers: { "Content-Type": "application/json", "User-Agent": FETCH_HEADERS["User-Agent"] },
    body: JSON.stringify({
      videoId,
      context: {
        client: { clientName: "ANDROID", clientVersion: "19.09.37", androidSdkVersion: 30 },
      },
    }),
  });

  const data = await initResp.json() as Record<string, unknown>;
  const videoDetails = (data.videoDetails as Record<string, string>) ?? {};
  const title = videoDetails.title ?? videoId;

  type CaptionTrack = { baseUrl: string; languageCode: string };
  type CaptionsData = { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
  const captions = (data as { captions?: CaptionsData }).captions;
  const tracks = captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const enTrack = tracks.find(t => t.languageCode?.startsWith("en")) ?? tracks[0];

  if (!enTrack) return { videoId, title, chapters: [], fullText: "No transcript available." };

  const xmlResp = await proxyFetch(enTrack.baseUrl);
  const xml     = await xmlResp.text();

  const entries: Array<{ seconds: number; text: string }> = [];
  const re = /<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const seconds = parseFloat(m[1]);
    const text    = m[2]
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (text) entries.push({ seconds, text });
  }

  // Group into 30-second chapters (same interval as Grabbit)
  const chapters: YouTubeTranscript["chapters"] = [];
  let chapterStart = 0;
  let chapterBuffer: string[] = [];

  for (const e of entries) {
    if (e.seconds - chapterStart >= 30 && chapterBuffer.length > 0) {
      const mins = Math.floor(chapterStart / 60).toString().padStart(2, "0");
      const secs = Math.floor(chapterStart % 60).toString().padStart(2, "0");
      chapters.push({ timestamp: `${mins}:${secs}`, seconds: chapterStart, text: chapterBuffer.join(" ") });
      chapterStart  = e.seconds;
      chapterBuffer = [];
    }
    chapterBuffer.push(e.text);
  }
  if (chapterBuffer.length > 0) {
    const mins = Math.floor(chapterStart / 60).toString().padStart(2, "0");
    const secs = Math.floor(chapterStart % 60).toString().padStart(2, "0");
    chapters.push({ timestamp: `${mins}:${secs}`, seconds: chapterStart, text: chapterBuffer.join(" ") });
  }

  return { videoId, title, chapters, fullText: entries.map(e => e.text).join(" ").slice(0, 60_000) };
}

// ── AI analysis ───────────────────────────────────────────────────────────────

/**
 * Summarise a single article/page with Claude.
 * Key takeaways + tags + conclusion  -  same output format as Grabbit Premium.
 */
export async function summarisePage(page: GrabbedPage): Promise<AiSummary> {
  const resp = await anthropic.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `Summarise this article for a busy professional. Return JSON only.
Schema: { "takeaways": string[], "tags": string[], "conclusion": string }

Title: ${page.title}
URL: ${page.url}
Content:
${page.text.slice(0, 8000)}`,
    }],
  });

  const text  = resp.content[0].type === "text" ? resp.content[0].text : "{}";
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = match
    ? JSON.parse(match[0]) as { takeaways: string[]; tags: string[]; conclusion: string }
    : { takeaways: [], tags: [], conclusion: text };

  return { url: page.url, title: page.title, ...parsed };
}

/**
 * Compare up to 5 products/pages with Claude.
 * Winner + feature table + pros/cons + verdict  -  same as Grabbit AI Compare.
 */
export async function comparePages(pages: GrabbedPage[]): Promise<AiComparison> {
  if (pages.length < 2) throw new Error("Need at least 2 pages to compare");
  if (pages.length > 5) throw new Error("Max 5 pages per comparison");

  const snippets = pages.map((p, i) =>
    `--- ITEM ${i + 1}: ${p.title} (${p.url}) ---\n${p.text.slice(0, 4000)}`
  ).join("\n\n");

  const resp = await anthropic.messages.create({
    model:      "claude-opus-4-7",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Compare these ${pages.length} items and return JSON only.
Schema:
{
  "winner": "title of best item",
  "table": [{ "feature": string, "values": string[] }],
  "pros": { "<title>": string[] },
  "cons": { "<title>": string[] },
  "verdict": "2-3 sentence recommendation"
}
Note: "values" array must have exactly ${pages.length} entries (one per item, in order).

${snippets}`,
    }],
  });

  const text  = resp.content[0].type === "text" ? resp.content[0].text : "{}";
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = match
    ? JSON.parse(match[0]) as Omit<AiComparison, "items">
    : { winner: "", table: [], pros: {}, cons: {}, verdict: text };

  return { items: pages.map(p => ({ url: p.url, title: p.title })), ...parsed };
}

/**
 * AI chapter-by-chapter summary of a YouTube video.
 */
export async function summariseYouTube(transcript: YouTubeTranscript): Promise<AiSummary> {
  const chapterText = transcript.chapters
    .map(c => `[${c.timestamp}] ${c.text}`)
    .join("\n")
    .slice(0, 12_000);

  const resp = await anthropic.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: `Summarise this YouTube video transcript. Return JSON only.
Schema: { "takeaways": string[], "tags": string[], "conclusion": string }

Video: "${transcript.title}" (ID: ${transcript.videoId})
Chapters:
${chapterText}`,
    }],
  });

  const text  = resp.content[0].type === "text" ? resp.content[0].text : "{}";
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = match
    ? JSON.parse(match[0]) as { takeaways: string[]; tags: string[]; conclusion: string }
    : { takeaways: [], tags: [], conclusion: text };

  return {
    url:   `https://www.youtube.com/watch?v=${transcript.videoId}`,
    title: transcript.title,
    ...parsed,
  };
}

// ── Export formatters ─────────────────────────────────────────────────────────

export function toMarkdown(summary: AiSummary): string {
  return [
    `# ${summary.title}`,
    `> ${summary.url}`,
    "",
    `**Tags:** ${summary.tags.join(", ")}`,
    "",
    "## Key Takeaways",
    ...summary.takeaways.map(t => `- ${t}`),
    "",
    "## Bottom Line",
    summary.conclusion,
  ].join("\n");
}

export function comparisonToMarkdown(cmp: AiComparison): string {
  const headers  = ["Feature", ...cmp.items.map(i => i.title)];
  const rows     = cmp.table.map(r => [r.feature, ...r.values]);
  const maxCols  = headers.length;
  const colWidths = Array.from({ length: maxCols }, (_, ci) =>
    Math.min(40, Math.max(headers[ci].length, ...rows.map(r => (r[ci] ?? "").length)))
  );
  const pad = (s: string, len: number) => s.slice(0, len).padEnd(len);
  const headerLine    = "| " + headers.map((h, i) => pad(h, colWidths[i])).join(" | ") + " |";
  const separatorLine = "| " + colWidths.map(w => "-".repeat(w)).join(" | ") + " |";
  const dataLines     = rows.map(r => "| " + r.map((v, i) => pad(v ?? "", colWidths[i])).join(" | ") + " |");

  return [
    `## Comparison: ${cmp.items.map(i => i.title).join(" vs ")}`,
    "",
    `**Winner:** ${cmp.winner}`,
    "",
    headerLine, separatorLine, ...dataLines,
    "",
    "## Verdict",
    cmp.verdict,
  ].join("\n");
}
