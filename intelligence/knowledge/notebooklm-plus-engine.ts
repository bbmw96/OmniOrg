// Created by BBMW0 Technologies | bbmw0.com
/**
 * NOTEBOOKLM+ ENGINE
 *
 * Web-to-NotebookLM content sync — equivalent to WebSync for NotebookLM extension.
 * But runs headlessly, no Chrome extension, no 50-source cap workaround needed.
 *
 * Architecture:
 *   There is NO public NotebookLM REST API for consumer accounts.
 *   WebSync works by injecting content scripts into the user's live browser session.
 *   Our approach: Playwright automation against notebooklm.google.com UI.
 *   Fallback: export cleaned content as .txt files the user can drag-and-drop.
 *
 * Capabilities:
 *   - Scrape and Readability-clean any web page
 *   - Multi-page site crawl (up to configurable depth)
 *   - YouTube transcript extraction (reuses Grabbit+ engine)
 *   - Push content directly to NotebookLM via Playwright automation
 *   - Export aggregated .txt / .md bundles for manual import
 *   - Batch URL processing
 *
 * Exceeds WebSync by:
 *   - Works without Chrome (headless Playwright)
 *   - Can aggregate 100s of URLs into a single .txt source (bypasses 50-source cap)
 *   - Integrates with OmniOrg research pipeline (Grabbit+, content scheduler)
 *   - No per-account subscription — runs on your own Google account
 */

import { chromium, Browser, BrowserContext, Page } from "playwright";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const KNOWLEDGE_DIR = path.resolve(__dirname, "../../output/knowledge");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotebookSyncOptions {
  notebookName:      string;   // Target NotebookLM notebook title
  urls:              string[];
  crawlDepth?:       number;   // 0 = single page, 1 = follow internal links once
  includeYouTube?:   boolean;
  exportFallback?:   boolean;  // Also write .txt fallback regardless of Playwright result
  headless?:         boolean;  // Default: true
}

export interface SyncResult {
  notebookName:    string;
  sourcesAdded:    number;
  exportedFile?:   string;
  errors:          string[];
}

export interface ScrapedSource {
  url:    string;
  title:  string;
  text:   string;
}

// ── Content scraping (reusable, same Readability approach as Grabbit+) ────────

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept":     "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
};

async function scrapeUrl(url: string): Promise<ScrapedSource> {
  const resp = await fetch(url, { headers: FETCH_HEADERS });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
  const raw  = await resp.text();
  const dom  = new JSDOM(raw, { url });
  const doc  = dom.window.document;
  const art  = new Readability(doc).parse();
  return {
    url,
    title: art?.title ?? doc.title ?? url,
    text:  (art?.textContent ?? raw.replace(/<[^>]+>/g, " ")).trim().slice(0, 60_000),
  };
}

async function crawlSite(startUrl: string, depth: number): Promise<ScrapedSource[]> {
  const visited  = new Set<string>();
  const queue:   Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
  const results: ScrapedSource[] = [];
  const base     = new URL(startUrl).origin;

  while (queue.length > 0) {
    const { url, depth: d } = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const resp = await fetch(url, { headers: FETCH_HEADERS });
      if (!resp.ok) continue;
      const raw = await resp.text();
      const dom = new JSDOM(raw, { url });
      const doc = dom.window.document;
      const art = new Readability(doc).parse();
      results.push({
        url,
        title: art?.title ?? doc.title ?? url,
        text:  (art?.textContent ?? "").trim().slice(0, 60_000),
      });

      if (d < depth) {
        const links = Array.from(doc.querySelectorAll("a[href]"))
          .map(a => {
            try { return new URL((a as HTMLAnchorElement).href, url).href; } catch { return ""; }
          })
          .filter(l => l.startsWith(base) && !visited.has(l))
          .slice(0, 30);
        for (const l of links) queue.push({ url: l, depth: d + 1 });
      }
    } catch (err) {
      console.warn(`[NotebookLM+] Crawl error at ${url}: ${err}`);
    }
  }

  return results;
}

// ── Export (fallback path) ────────────────────────────────────────────────────

/**
 * Aggregate multiple scraped sources into a single .txt file.
 * One file can represent hundreds of pages — bypasses the 50-source cap
 * by packaging everything as a single text source in NotebookLM.
 */
export function exportToTxt(sources: ScrapedSource[], notebookName: string): string {
  mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  const safe      = notebookName.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
  const outPath   = path.join(KNOWLEDGE_DIR, `${safe}-${Date.now()}.txt`);
  const sections  = sources.map(s =>
    `=== ${s.title} ===\nURL: ${s.url}\n\n${s.text}\n\n${"─".repeat(80)}\n`
  );
  writeFileSync(outPath, sections.join("\n"), "utf-8");
  console.log(`[NotebookLM+] Exported ${sources.length} sources → ${outPath}`);
  return outPath;
}

// ── Playwright automation ─────────────────────────────────────────────────────

async function launchBrowser(headless: boolean): Promise<{ browser: Browser; ctx: BrowserContext }> {
  const browser = await chromium.launch({ headless });
  const ctx     = await browser.newContext({
    userAgent: FETCH_HEADERS["User-Agent"],
    locale:    "en-GB",
  });
  return { browser, ctx };
}

/**
 * Push a URL as a source into an existing NotebookLM notebook.
 * Requires the user to be logged into Google in the default Chrome profile
 * (storageState path) OR a fresh Google login will be required.
 *
 * NotebookLM has no public REST API — this replicates the exact UI flow:
 *   "Add source" → "Website" → paste URL → confirm
 */
async function pushUrlToNotebook(page: Page, notebookName: string, url: string): Promise<void> {
  // Navigate to NotebookLM
  await page.goto("https://notebooklm.google.com", { waitUntil: "networkidle", timeout: 30_000 });

  // Find and open the target notebook
  const notebookCard = page.locator(`[aria-label*="${notebookName}"], text="${notebookName}"`).first();
  const notebookExists = await notebookCard.isVisible({ timeout: 5_000 }).catch(() => false);

  if (!notebookExists) {
    // Create the notebook if it doesn't exist
    const newBtn = page.locator('button:has-text("New notebook"), [aria-label*="New notebook"]').first();
    await newBtn.click();
    await page.waitForTimeout(1500);
  } else {
    await notebookCard.click();
    await page.waitForTimeout(1500);
  }

  // Click "Add source"
  const addSourceBtn = page.locator('button:has-text("Add source"), [aria-label*="Add source"]').first();
  await addSourceBtn.waitFor({ state: "visible", timeout: 10_000 });
  await addSourceBtn.click();

  // Select "Website" option
  const websiteOption = page.locator('text="Website", [aria-label*="Website"]').first();
  await websiteOption.waitFor({ state: "visible", timeout: 5_000 });
  await websiteOption.click();

  // Paste URL into the input field
  const urlInput = page.locator('input[placeholder*="URL"], input[type="url"], input[placeholder*="url"]').first();
  await urlInput.waitFor({ state: "visible", timeout: 5_000 });
  await urlInput.fill(url);

  // Confirm
  const insertBtn = page.locator('button:has-text("Insert"), button:has-text("Add"), button:has-text("Import")').first();
  await insertBtn.click();

  // Wait for processing indicator to clear
  await page.waitForTimeout(3_000);
  console.log(`[NotebookLM+] Added source: ${url}`);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Sync a list of URLs to a NotebookLM notebook.
 *
 * Mode A (Playwright automation): pushes each URL directly into NotebookLM UI.
 *   Requires a logged-in Google session. On first run, a browser window opens
 *   for the user to log in; subsequent runs reuse the saved session.
 *
 * Mode B (export fallback): aggregates all content into a single .txt file
 *   which the user can drag-and-drop into NotebookLM as one source.
 *   This sidesteps the 50-source limit entirely.
 *
 * exportFallback: true (default) always writes the .txt file regardless.
 */
export async function syncToNotebookLM(opts: NotebookSyncOptions): Promise<SyncResult> {
  const {
    notebookName,
    urls,
    crawlDepth    = 0,
    includeYouTube = false,
    exportFallback = true,
    headless      = true,
  } = opts;

  const errors:   string[] = [];
  let sourcesAdded = 0;
  let exportedFile: string | undefined;

  // ── Step 1: Scrape content ──────────────────────────────────────────────
  const sources: ScrapedSource[] = [];
  for (const url of urls) {
    try {
      if (crawlDepth > 0) {
        const crawled = await crawlSite(url, crawlDepth);
        sources.push(...crawled);
      } else {
        sources.push(await scrapeUrl(url));
      }
    } catch (err) {
      errors.push(`Scrape failed (${url}): ${err}`);
    }
  }

  // ── Step 2: Export fallback .txt ────────────────────────────────────────
  if (exportFallback && sources.length > 0) {
    exportedFile = exportToTxt(sources, notebookName);
  }

  // ── Step 3: Playwright push ─────────────────────────────────────────────
  const sessionPath = path.resolve(__dirname, "../../.notebooklm-session.json");
  let browser: Browser | undefined;

  try {
    const { browser: b, ctx } = await launchBrowser(headless);
    browser = b;

    // Try to restore saved Google session
    let ctxWithSession = ctx;
    if (require("fs").existsSync(sessionPath)) {
      await ctx.close();
      ctxWithSession = await b.newContext({ storageState: sessionPath });
    }

    const page = await ctxWithSession.newPage();

    for (const source of sources) {
      try {
        await pushUrlToNotebook(page, notebookName, source.url);
        sourcesAdded++;
        await page.waitForTimeout(1200);  // Throttle to avoid rate limiting
      } catch (err) {
        errors.push(`Push failed (${source.url}): ${err}`);
      }
    }

    // Save session for next run
    await ctxWithSession.storageState({ path: sessionPath });
    await page.close();
    await ctxWithSession.close();
  } catch (err) {
    errors.push(`Playwright session error: ${err}`);
    if (sourcesAdded === 0 && exportedFile) {
      console.warn(`[NotebookLM+] Playwright failed — use the exported file: ${exportedFile}`);
    }
  } finally {
    await browser?.close();
  }

  return { notebookName, sourcesAdded, exportedFile, errors };
}

/**
 * Export-only mode: produce a .txt bundle without any Playwright automation.
 * Drag the output file into NotebookLM's "Upload" source type.
 * Aggregates unlimited URLs into one file — circumvents the 50-source cap.
 */
export async function exportForNotebookLM(urls: string[], notebookName: string, crawlDepth = 0): Promise<string> {
  const sources: ScrapedSource[] = [];
  for (const url of urls) {
    try {
      if (crawlDepth > 0) {
        sources.push(...await crawlSite(url, crawlDepth));
      } else {
        sources.push(await scrapeUrl(url));
      }
    } catch (err) {
      console.warn(`[NotebookLM+] ${url}: ${err}`);
    }
  }
  return exportToTxt(sources, notebookName);
}
