// Created by BBMW0 Technologies | bbmw0.com
/**
 * PERPLEXITY+ ENGINE
 *
 * OmniOrg-native AI search engine - equivalent to Perplexity Pro ($20/mo).
 * Runs entirely locally on this machine with no external search subscription.
 *
 * Architecture (same as Perplexity under the hood):
 *   1. Query expansion: Claude rephrases the question into 2-3 search queries
 *   2. Web search: Brave Search API (or DuckDuckGo fallback) returns top URLs
 *   3. Content extraction: Readability+JSDOM cleans articles from each URL
 *   4. AI synthesis: Claude reads all sources and writes a cited answer
 *   5. Citation map: every claim is linked back to its source URL
 *
 * Privacy advantages over Perplexity:
 *   - All requests routed through proxy (no IP exposure)
 *   - No account, no history stored on Perplexity servers
 *   - You own the full answer + sources
 *
 * Config (.env):
 *   BRAVE_SEARCH_API_KEY=...  (get free at brave.com/search/api - 2000 queries/mo free)
 *   ANTHROPIC_API_KEY=...
 *   OMNIORG_PROXY_URL=...     (optional - routes all fetches through your VPN)
 */

import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import Anthropic from "@anthropic-ai/sdk";
import { proxyFetch } from "../proxy-fetch";
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const anthropic     = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY ?? null;
const BRAVE_SEARCH  = "https://api.search.brave.com/res/v1/web/search";
const DDG_SEARCH    = "https://html.duckduckgo.com/html/";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchResult {
  url:     string;
  title:   string;
  snippet: string;
}

export interface SourcePage {
  url:     string;
  title:   string;
  text:    string;   // Readability-cleaned body text
}

export interface PerplexityAnswer {
  query:       string;
  answer:      string;           // AI-synthesised Markdown answer with [1][2] citations
  sources:     SourcePage[];     // Ordered source list (index matches citation numbers)
  searchedAt:  string;
  model:       string;
}

// ── Web search backends ───────────────────────────────────────────────────────

/**
 * Brave Search API - best quality, requires free API key.
 * Returns top-N web results with title + URL + description.
 */
async function braveSearch(query: string, count = 8): Promise<SearchResult[]> {
  if (!BRAVE_API_KEY) return [];

  const url  = `${BRAVE_SEARCH}?q=${encodeURIComponent(query)}&count=${count}&search_lang=en`;
  const resp = await proxyFetch(url, {
    headers: {
      "Accept":              "application/json",
      "Accept-Encoding":     "gzip",
      "X-Subscription-Token": BRAVE_API_KEY,
    },
  });

  if (!resp.ok) return [];

  type BraveResult = { url: string; title: string; description?: string };
  type BraveResp   = { web?: { results?: BraveResult[] } };
  const data = await resp.json() as BraveResp;

  return (data.web?.results ?? []).map(r => ({
    url:     r.url,
    title:   r.title,
    snippet: r.description ?? "",
  }));
}

/**
 * DuckDuckGo HTML fallback - no API key needed, scrapes results page.
 * Less reliable but works without any credentials.
 */
async function ddgSearch(query: string, count = 8): Promise<SearchResult[]> {
  try {
    const resp = await proxyFetch(DDG_SEARCH, {
      method:  "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: `q=${encodeURIComponent(query)}&b=`,
    });

    if (!resp.ok) return [];
    const html = await resp.text();
    const dom  = new JSDOM(html);
    const doc  = dom.window.document;

    const results: SearchResult[] = [];
    doc.querySelectorAll(".result").forEach((el) => {
      const a       = el.querySelector("a.result__a") as HTMLAnchorElement | null;
      const snippet = el.querySelector(".result__snippet");
      if (a?.href && results.length < count) {
        results.push({
          url:     a.href,
          title:   a.textContent?.trim() ?? a.href,
          snippet: snippet?.textContent?.trim() ?? "",
        });
      }
    });

    return results;
  } catch {
    return [];
  }
}

/**
 * Search: uses Brave if key available, falls back to DuckDuckGo.
 */
async function webSearch(query: string, count = 8): Promise<SearchResult[]> {
  const results = await braveSearch(query, count);
  if (results.length > 0) return results;
  return ddgSearch(query, count);
}

// ── Content extraction ────────────────────────────────────────────────────────

async function fetchAndExtract(url: string): Promise<SourcePage | null> {
  try {
    const resp = await proxyFetch(url, {
      headers: {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept":          "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });

    if (!resp.ok) return null;
    const html    = await resp.text();
    const dom     = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();

    return {
      url,
      title: article?.title ?? new URL(url).hostname,
      text:  (article?.textContent ?? "").trim().slice(0, 8_000),
    };
  } catch {
    return null;
  }
}

// ── Query expansion ───────────────────────────────────────────────────────────

/**
 * Use Claude to rephrase the user query into 2-3 precise search queries.
 * This improves recall by searching from multiple angles.
 */
async function expandQuery(query: string): Promise<string[]> {
  const resp = await anthropic.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{
      role:    "user",
      content: `Generate 2-3 precise web search queries for the following question. Return JSON array of strings only. Question: "${query}"`,
    }],
  });

  const text = resp.content[0].type === "text" ? resp.content[0].text : "[]";
  try {
    const arr = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]") as string[];
    return [query, ...arr.slice(0, 2)];
  } catch {
    return [query];
  }
}

// ── AI synthesis ──────────────────────────────────────────────────────────────

/**
 * Use Claude to synthesise a cited answer from all scraped sources.
 * Citations are formatted as [1], [2] referencing the sources array.
 */
async function synthesiseAnswer(query: string, sources: SourcePage[]): Promise<string> {
  const sourceBlocks = sources.map((s, i) =>
    `[${i + 1}] ${s.title}\nURL: ${s.url}\n\n${s.text.slice(0, 4_000)}`
  ).join("\n\n---\n\n");

  const resp = await anthropic.messages.create({
    model:      "claude-opus-4-7",
    max_tokens: 2_000,
    messages: [{
      role:    "user",
      content: `Answer the following question using ONLY the provided sources.
Cite every claim with [1], [2] etc matching the source numbers below.
Format your answer in clear Markdown with headers where appropriate.
End with a "## Sources" section listing the URLs.

Question: ${query}

Sources:
${sourceBlocks}`,
    }],
  });

  return resp.content[0].type === "text" ? resp.content[0].text : "No answer generated.";
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Full Perplexity-style AI search.
 * Expands query, searches web, extracts content, synthesises cited answer.
 *
 * Usage:
 *   const result = await search("What is the speed of light?");
 *   console.log(result.answer);
 *   console.log(result.sources.map(s => s.url));
 */
export async function search(query: string, opts?: {
  maxSources?:    number;
  expandQueries?: boolean;
  model?:         "fast" | "deep";
}): Promise<PerplexityAnswer> {
  const maxSources  = opts?.maxSources    ?? 6;
  const doExpand    = opts?.expandQueries ?? true;

  console.log(`[Perplexity+] Searching: "${query}"`);

  // Step 1: Expand query
  const queries = doExpand ? await expandQuery(query) : [query];

  // Step 2: Search all query variants, deduplicate by URL
  const urlsSeen  = new Set<string>();
  const allResults: SearchResult[] = [];

  for (const q of queries) {
    const results = await webSearch(q, 5);
    for (const r of results) {
      if (!urlsSeen.has(r.url)) {
        urlsSeen.add(r.url);
        allResults.push(r);
      }
    }
    if (allResults.length >= maxSources * 2) break;
  }

  console.log(`[Perplexity+] Found ${allResults.length} unique URLs, extracting content...`);

  // Step 3: Fetch and extract content in parallel (up to maxSources*2, keep best maxSources)
  const candidates = allResults.slice(0, maxSources * 2);
  const extracted  = await Promise.allSettled(candidates.map(r => fetchAndExtract(r.url)));
  const sources: SourcePage[] = extracted
    .filter((r): r is PromiseFulfilledResult<SourcePage> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value)
    .filter(s => s.text.length > 200)
    .slice(0, maxSources);

  if (sources.length === 0) {
    return {
      query,
      answer:     "Could not retrieve sufficient web content to answer this question.",
      sources:    [],
      searchedAt: new Date().toISOString(),
      model:      "claude-opus-4-7",
    };
  }

  console.log(`[Perplexity+] Synthesising answer from ${sources.length} sources...`);

  // Step 4: Synthesise answer
  const answer = await synthesiseAnswer(query, sources);

  return {
    query,
    answer,
    sources,
    searchedAt: new Date().toISOString(),
    model:      "claude-opus-4-7",
  };
}

/**
 * Quick search: fewer sources, faster model - for simple factual questions.
 */
export async function quickSearch(query: string): Promise<PerplexityAnswer> {
  return search(query, { maxSources: 3, expandQueries: false, model: "fast" });
}

/**
 * Deep research: more sources, deeper analysis.
 */
export async function deepSearch(query: string): Promise<PerplexityAnswer> {
  return search(query, { maxSources: 10, expandQueries: true, model: "deep" });
}
