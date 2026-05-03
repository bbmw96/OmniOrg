// Created by BBMW0 Technologies | bbmw0.com
/**
 * OmniOrg Self-Enhancement Engine
 *
 * Runs on a schedule to automatically scan the codebase, identify improvement
 * opportunities, and generate structured enhancement proposals via Claude.
 *
 * All proposals are persisted to output/evolution/enhancements.json.
 * Reports are saved to output/evolution/report-{timestamp}.json.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env") });

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnhancementCategory =
  | "performance"
  | "security"
  | "feature"
  | "integration"
  | "documentation"
  | "testing";

export interface Enhancement {
  id:          string;
  category:    EnhancementCategory;
  title:       string;
  description: string;
  priority:    1 | 2 | 3;
  effort:      "small" | "medium" | "large";
  status:      "proposed" | "approved" | "in_progress" | "completed" | "rejected";
  proposedAt:  string;
  proposedBy:  string;
  files?:      string[];
}

export interface EnhancementReport {
  reportId:     string;
  generatedAt:  string;
  enhancements: Enhancement[];
  summary:      string;
  topPriority:  Enhancement[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ENHANCEMENTS_FILE = path.join(process.cwd(), "output", "evolution", "enhancements.json");
const REPORTS_DIR       = path.join(process.cwd(), "output", "evolution");

// ─── Anthropic client ─────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function uuid(): string {
  return crypto.randomUUID();
}

function collectTsFiles(dir: string, skip: string[] = ["node_modules", "dist"]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skip.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(fullPath, skip));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

function countLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

// ─── Core functions ───────────────────────────────────────────────────────────

export async function scanCodebaseMetrics(): Promise<Record<string, unknown>> {
  const projectRoot = process.cwd();
  const tsFiles = collectTsFiles(projectRoot);

  let totalLines = 0;
  for (const f of tsFiles) {
    totalLines += countLines(f);
  }

  const missingEnvKeys: string[] = [];
  const examplePath = path.join(projectRoot, ".env.example");
  if (fs.existsSync(examplePath)) {
    const raw = fs.readFileSync(examplePath, "utf-8");
    const keyLines = raw
      .split("\n")
      .filter((l) => /^[A-Z_]+=/.test(l.trim()))
      .map((l) => l.split("=")[0].trim());

    for (const key of keyLines) {
      const val = process.env[key];
      if (!val || val.trim() === "") {
        missingEnvKeys.push(key);
      }
    }
  }

  return {
    fileCount:      tsFiles.length,
    totalLines,
    missingEnvKeys,
    timestamp:      new Date().toISOString(),
  };
}

export async function analyseCodeQuality(sampleFiles: string[]): Promise<string[]> {
  const targets = sampleFiles.slice(0, 5);
  if (targets.length === 0) return [];

  const fileSections = targets.map((f) => {
    try {
      const content = fs.readFileSync(f, "utf-8");
      const rel = path.relative(process.cwd(), f);
      return `=== ${rel} ===\n${content.slice(0, 4000)}`;
    } catch {
      return "";
    }
  }).filter(Boolean);

  const prompt = `You are a senior TypeScript engineer reviewing OmniOrg source files.\n\nFor each file below, identify up to 3 quick improvements (performance, security, maintainability). Be specific with line references if possible. Return as a bulleted list.\n\n${fileSections.join("\n\n")}`;

  const response = await anthropic.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 1024,
    messages:   [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");

  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-") || l.startsWith("*") || l.startsWith("•"))
    .map((l) => l.replace(/^[-*•]\s*/, ""));
}

export async function generateEnhancements(
  metrics: Record<string, unknown>,
  codeIssues: string[]
): Promise<Enhancement[]> {
  const prompt = `You are the OmniOrg self-improvement AI.

Based on these metrics and code issues, generate 5-10 specific enhancement proposals.

METRICS:
${JSON.stringify(metrics, null, 2)}

CODE ISSUES:
${codeIssues.map((i) => `- ${i}`).join("\n")}

Return a JSON array matching this TypeScript type (omit id, status, proposedAt, proposedBy):
[
  {
    "category": "performance" | "security" | "feature" | "integration" | "documentation" | "testing",
    "title": string,
    "description": string,
    "priority": 1 | 2 | 3,
    "effort": "small" | "medium" | "large",
    "files": string[] (optional, relative paths)
  }
]

Return ONLY the JSON array. No explanation, no markdown fences.`;

  const response = await anthropic.messages.create({
    model:      "claude-opus-4-5",
    max_tokens: 2048,
    messages:   [{ role: "user", content: prompt }],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  let parsed: Omit<Enhancement, "id" | "status" | "proposedAt" | "proposedBy">[];
  try {
    const jsonStr = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    parsed = [];
  }

  const now = new Date().toISOString();
  return parsed.map((e) => ({
    ...e,
    id:         uuid(),
    status:     "proposed" as const,
    proposedAt: now,
    proposedBy: "self-enhancer-v1",
  }));
}

export function saveEnhancements(enhancements: Enhancement[]): void {
  ensureDir(ENHANCEMENTS_FILE);
  const existing = loadEnhancements();
  const existingTitles = new Set(existing.map((e) => e.title));
  const deduped = enhancements.filter((e) => !existingTitles.has(e.title));
  const merged = [...existing, ...deduped];
  fs.writeFileSync(ENHANCEMENTS_FILE, JSON.stringify(merged, null, 2), "utf-8");
}

export function loadEnhancements(): Enhancement[] {
  if (!fs.existsSync(ENHANCEMENTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(ENHANCEMENTS_FILE, "utf-8");
    return JSON.parse(raw) as Enhancement[];
  } catch {
    return [];
  }
}

export async function runEnhancementCycle(): Promise<EnhancementReport> {
  // 1. Scan metrics
  const metrics = await scanCodebaseMetrics();

  // 2. Find largest .ts files for quality analysis
  const allFiles = collectTsFiles(process.cwd());
  const withSizes = allFiles.map((f) => ({ f, lines: countLines(f) }));
  withSizes.sort((a, b) => b.lines - a.lines);
  const sampleFiles = withSizes.slice(0, 5).map((x) => x.f);

  // 3. Analyse code quality
  const codeIssues = await analyseCodeQuality(sampleFiles);

  // 4. Generate enhancements
  const enhancements = await generateEnhancements(metrics, codeIssues);

  // 5. Save enhancements
  saveEnhancements(enhancements);

  // 6. Top priority filter
  const topPriority = enhancements.filter((e) => e.priority === 1 || e.priority === 2);

  // 7. Generate summary via Claude Haiku
  const summaryPrompt = `Summarise these ${enhancements.length} proposed enhancements in 2-3 sentences:\n${enhancements.map((e) => `- [${e.category}] ${e.title}: ${e.description}`).join("\n")}`;

  const summaryResponse = await anthropic.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 256,
    messages:   [{ role: "user", content: summaryPrompt }],
  });

  const summary = summaryResponse.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("").trim();

  // 8. Build report
  const report: EnhancementReport = {
    reportId:     uuid(),
    generatedAt:  new Date().toISOString(),
    enhancements,
    summary,
    topPriority,
  };

  // 9. Save report
  ensureDir(ENHANCEMENTS_FILE);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(REPORTS_DIR, `report-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  return report;
}

export function getTopPriority(n = 5): Enhancement[] {
  return loadEnhancements()
    .filter((e) => e.status === "proposed")
    .sort((a, b) => a.priority - b.priority)
    .slice(0, n);
}

export function markCompleted(id: string): void {
  const all = loadEnhancements();
  const idx = all.findIndex((e) => e.id === id);
  if (idx !== -1) {
    all[idx].status = "completed";
    fs.writeFileSync(ENHANCEMENTS_FILE, JSON.stringify(all, null, 2), "utf-8");
  }
}
