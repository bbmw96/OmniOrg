// Created by BBMW0 Technologies | bbmw0.com
/**
 * HEALTH MONITOR
 *
 * Runs all service health checks in parallel and returns a structured report.
 * Used by the CLI dashboard and can be called standalone.
 */

import { proxyFetch } from "../proxy-fetch";
import { config as loadEnv } from "dotenv";
import * as path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

// ── Types ─────────────────────────────────────────────────────────────────────

export type ServiceStatus = "ok" | "degraded" | "down" | "unknown";

export interface ServiceCheck {
  name:       string;
  status:     ServiceStatus;
  latencyMs?: number;
  details?:   string;
}

export interface HealthReport {
  timestamp:       string;
  overall:         ServiceStatus;
  services:        ServiceCheck[];
  recommendations: string[];
}

// ── Core helper ───────────────────────────────────────────────────────────────

export async function checkService(
  name: string,
  checkFn: () => Promise<void>,
): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    await checkFn();
    return { name, status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      name,
      status:    "down",
      latencyMs: Date.now() - start,
      details:   err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Individual checks ─────────────────────────────────────────────────────────

export async function checkOllama(): Promise<ServiceCheck> {
  return checkService("Ollama", async () => {
    const resp = await proxyFetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(4000) as RequestInit["signal"],
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  });
}

export async function checkAnthropicKey(): Promise<ServiceCheck> {
  return checkService("Anthropic API Key", async () => {
    const key = process.env["ANTHROPIC_API_KEY"];
    if (!key || key.trim().length === 0) throw new Error("ANTHROPIC_API_KEY is not set");
  });
}

export async function checkGeminiKey(): Promise<ServiceCheck> {
  return checkService("Gemini API Key", async () => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key || key.trim().length === 0) throw new Error("GEMINI_API_KEY is not set");
  });
}

export async function checkHeygenKey(): Promise<ServiceCheck> {
  return checkService("HeyGen API Key", async () => {
    const key = process.env["HEYGEN_API_KEY"];
    if (!key || key.trim().length === 0) throw new Error("HEYGEN_API_KEY is not set");
  });
}

export async function checkElevenLabsKey(): Promise<ServiceCheck> {
  return checkService("ElevenLabs API Key", async () => {
    const key = process.env["ELEVENLABS_API_KEY"];
    if (!key || key.trim().length === 0) throw new Error("ELEVENLABS_API_KEY is not set");
  });
}

export async function checkProxyConfig(): Promise<ServiceCheck> {
  return checkService("Proxy Config", async () => {
    const url = process.env["OMNIORG_PROXY_URL"];
    if (!url || url.trim().length === 0) throw new Error("OMNIORG_PROXY_URL is not set (direct connection will be used)");
  });
}

// ── Overall health ────────────────────────────────────────────────────────────

const CRITICAL_SERVICES = new Set(["Ollama", "Anthropic API Key"]);

const RECOMMENDATIONS: Record<string, string> = {
  "Ollama":             "Install Ollama from ollama.ai and run: ollama serve",
  "Anthropic API Key":  "Set ANTHROPIC_API_KEY in your .env file (console.anthropic.com/keys)",
  "Gemini API Key":     "Set GEMINI_API_KEY in your .env file (aistudio.google.com/app/apikey)",
  "HeyGen API Key":     "Set HEYGEN_API_KEY in your .env file (app.heygen.com/settings)",
  "ElevenLabs API Key": "Set ELEVENLABS_API_KEY in your .env file (elevenlabs.io/app/settings/api)",
  "Proxy Config":       "Set OMNIORG_PROXY_URL in your .env for IP protection (e.g. socks5://127.0.0.1:1080)",
};

export async function runHealthCheck(): Promise<HealthReport> {
  const checks = await Promise.all([
    checkOllama(),
    checkAnthropicKey(),
    checkGeminiKey(),
    checkHeygenKey(),
    checkElevenLabsKey(),
    checkProxyConfig(),
  ]);

  const downServices    = checks.filter(c => c.status === "down");
  const criticalDown    = downServices.filter(c => CRITICAL_SERVICES.has(c.name));
  const nonCriticalDown = downServices.filter(c => !CRITICAL_SERVICES.has(c.name));

  let overall: ServiceStatus;
  if (downServices.length === 0) {
    overall = "ok";
  } else if (criticalDown.length === checks.filter(c => CRITICAL_SERVICES.has(c.name)).length) {
    overall = "down";
  } else if (downServices.length > 0) {
    overall = "degraded";
  } else {
    overall = "ok";
  }

  const recommendations: string[] = [];
  for (const svc of [...criticalDown, ...nonCriticalDown]) {
    const rec = RECOMMENDATIONS[svc.name];
    if (rec) recommendations.push(rec);
  }

  return {
    timestamp: new Date().toISOString(),
    overall,
    services: checks,
    recommendations,
  };
}

// ── Pretty-print ──────────────────────────────────────────────────────────────

const STATUS_COLOUR: Record<ServiceStatus, string> = {
  ok:       "\x1b[32m",
  degraded: "\x1b[33m",
  down:     "\x1b[31m",
  unknown:  "\x1b[2m",
};
const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";
const DIM   = "\x1b[2m";

function colourStatus(status: ServiceStatus): string {
  return `${STATUS_COLOUR[status]}${status.toUpperCase()}${RESET}`;
}

export function printHealthReport(report: HealthReport): void {
  console.log(`\n${BOLD}  OmniOrg Health Report${RESET}  ${DIM}${report.timestamp}${RESET}`);
  console.log(`  Overall: ${colourStatus(report.overall)}\n`);

  const nameWidth   = Math.max(...report.services.map(s => s.name.length), 12);
  const statusWidth = 10;

  const hr = "  " + "-".repeat(nameWidth + statusWidth + 20);
  console.log(hr);
  console.log(
    "  " + `${BOLD}${"Service".padEnd(nameWidth)}${"Status".padEnd(statusWidth)}Latency / Details${RESET}`,
  );
  console.log(hr);

  for (const svc of report.services) {
    const latency  = svc.latencyMs !== undefined ? `${svc.latencyMs} ms` : "";
    const details  = svc.details ? `  ${DIM}${svc.details}${RESET}` : "";
    const coloured = colourStatus(svc.status);
    console.log(
      "  " +
      svc.name.padEnd(nameWidth) +
      coloured.padEnd(statusWidth + (coloured.length - svc.status.length)) +
      `${DIM}${latency}${RESET}${details}`,
    );
  }

  console.log(hr);

  if (report.recommendations.length > 0) {
    console.log(`\n${BOLD}  Recommendations:${RESET}`);
    for (const rec of report.recommendations) {
      console.log(`  ${"\x1b[33m"}>${RESET} ${rec}`);
    }
  }

  console.log();
}

// ── CLI entry point ───────────────────────────────────────────────────────────

if (require.main === module) {
  runHealthCheck()
    .then(printHealthReport)
    .catch(err => {
      console.error(`${STATUS_COLOUR["down"]}Fatal: ${err instanceof Error ? err.message : String(err)}${RESET}`);
      process.exit(1);
    });
}
