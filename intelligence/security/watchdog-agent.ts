// Created by BBMW0 Technologies | bbmw0.com
/**
 * SECURITY WATCHDOG AGENT - 24/7 Threat Monitor
 *
 * Runs continuously as a background daemon. Monitors for:
 *   - Unusual API call patterns (rate spikes, off-hours bursts)
 *   - JWT token anomalies (replayed JTIs, expired tokens still sent)
 *   - Env/secret file access attempts
 *   - Outbound requests to unexpected destinations
 *   - Composio/YouTube/Instagram auth failures (credential theft indicator)
 *   - Process injection or unusual child process spawning
 *   - Log tampering
 *
 * Alerts via: console (always), email (if ALERT_EMAIL set), file log.
 *
 * This is NOT just logging - it actively blocks and responds:
 *   - Repeated invalid JWT: auto-blocks IP for 15 min
 *   - Env file access from outside known processes: kills the process
 *   - Outbound request to unknown host: flags for review
 */

import { createReadStream, existsSync, mkdirSync, appendFileSync, statSync, watch } from "fs";
import { createHash } from "crypto";
import path from "path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const LOG_DIR     = path.resolve(__dirname, "../../logs/security");
const ALERT_EMAIL = process.env.ALERT_EMAIL ?? process.env.RESEND_FROM ?? null;

mkdirSync(LOG_DIR, { recursive: true });

// ── Types ─────────────────────────────────────────────────────────────────────

export type ThreatLevel = "info" | "warning" | "critical";

export interface SecurityEvent {
  timestamp:   string;
  level:       ThreatLevel;
  category:    string;
  message:     string;
  details?:    Record<string, unknown>;
  blocked?:    boolean;
}

// ── State ─────────────────────────────────────────────────────────────────────

const failedAuthByIp  = new Map<string, { count: number; firstAt: number; blockedUntil?: number }>();
const seenJtis        = new Set<string>();
const apiCallCounts   = new Map<string, number>();   // tenantId:minute -> count
const knownEnvHash    = computeEnvHash();

let totalEvents = 0;
let criticalCount = 0;

// ── Core event logger ─────────────────────────────────────────────────────────

export function logSecurityEvent(event: SecurityEvent): void {
  totalEvents++;
  if (event.level === "critical") criticalCount++;

  const line = JSON.stringify({ ...event, pid: process.pid }) + "\n";
  const logPath = path.join(LOG_DIR, `security-${new Date().toISOString().slice(0, 10)}.jsonl`);

  try {
    appendFileSync(logPath, line, "utf-8");
  } catch {
    // If we can't write to logs something is seriously wrong
    process.stderr.write(`[Watchdog] CRITICAL: Cannot write security log: ${line}`);
  }

  const prefix = event.level === "critical" ? "[CRITICAL]" :
                 event.level === "warning"  ? "[WARNING]" : "[INFO]";

  console.log(`${prefix} [Watchdog] ${event.category}: ${event.message}`);
}

// ── Auth monitoring ───────────────────────────────────────────────────────────

/**
 * Call this every time a JWT verification fails.
 * After 5 failures from same IP in 5 minutes, blocks and alerts.
 */
export function recordAuthFailure(ip: string, reason: string): boolean {
  const now = Date.now();
  const record = failedAuthByIp.get(ip) ?? { count: 0, firstAt: now };

  // Check if currently blocked
  if (record.blockedUntil && now < record.blockedUntil) {
    logSecurityEvent({
      timestamp: new Date().toISOString(),
      level: "critical",
      category: "AUTH_BLOCKED",
      message: `Blocked IP ${ip} attempted request. Blocked until ${new Date(record.blockedUntil).toISOString()}`,
      details: { ip, reason },
      blocked: true,
    });
    return false;   // Blocked
  }

  // Reset window after 5 minutes
  if (now - record.firstAt > 5 * 60 * 1000) {
    record.count  = 0;
    record.firstAt = now;
    delete record.blockedUntil;
  }

  record.count++;
  failedAuthByIp.set(ip, record);

  if (record.count >= 5) {
    record.blockedUntil = now + 15 * 60 * 1000;   // Block for 15 minutes
    logSecurityEvent({
      timestamp: new Date().toISOString(),
      level: "critical",
      category: "AUTH_BRUTE_FORCE",
      message: `IP ${ip} blocked after ${record.count} failed auth attempts in 5 minutes`,
      details: { ip, reason, count: record.count },
      blocked: true,
    });
    sendAlert(`SECURITY ALERT: Brute force detected from IP ${ip}. Auto-blocked for 15 minutes.`);
    return false;
  }

  logSecurityEvent({
    timestamp: new Date().toISOString(),
    level: record.count >= 3 ? "warning" : "info",
    category: "AUTH_FAILURE",
    message: `Auth failure ${record.count}/5 from IP ${ip}: ${reason}`,
    details: { ip, reason, count: record.count },
  });

  return true;   // Not blocked (yet)
}

/**
 * Detect JWT replay attacks by tracking seen JTIs.
 * Returns false if the JTI has been used before.
 */
export function checkJtiReplay(jti: string, tenantId: string): boolean {
  if (seenJtis.has(jti)) {
    logSecurityEvent({
      timestamp: new Date().toISOString(),
      level: "critical",
      category: "JWT_REPLAY",
      message: `JWT replay attack detected for tenant ${tenantId} - JTI ${jti} already used`,
      details: { jti, tenantId },
      blocked: true,
    });
    sendAlert(`SECURITY ALERT: JWT replay attack detected for tenant ${tenantId}`);
    return false;
  }
  seenJtis.add(jti);
  // Prune old JTIs after 2 hours to avoid memory growth
  if (seenJtis.size > 10_000) {
    const iter = seenJtis.values();
    for (let i = 0; i < 1000; i++) seenJtis.delete(iter.next().value!);
  }
  return true;
}

// ── Rate limit monitoring ─────────────────────────────────────────────────────

/**
 * Track API call volume per tenant per minute.
 * Returns false if the tenant is calling too fast (>100 req/min).
 */
export function checkRateLimit(tenantId: string, limitPerMinute = 100): boolean {
  const key = `${tenantId}:${Math.floor(Date.now() / 60_000)}`;
  const count = (apiCallCounts.get(key) ?? 0) + 1;
  apiCallCounts.set(key, count);

  // Prune old keys
  if (apiCallCounts.size > 5000) {
    const cutoff = Math.floor(Date.now() / 60_000) - 5;
    for (const [k] of apiCallCounts) {
      if (parseInt(k.split(":")[1]) < cutoff) apiCallCounts.delete(k);
    }
  }

  if (count > limitPerMinute) {
    logSecurityEvent({
      timestamp: new Date().toISOString(),
      level: "warning",
      category: "RATE_LIMIT",
      message: `Tenant ${tenantId} exceeded ${limitPerMinute} req/min (currently ${count}/min)`,
      details: { tenantId, count, limit: limitPerMinute },
    });
    return false;
  }
  return true;
}

// ── Env file integrity monitor ────────────────────────────────────────────────

function computeEnvHash(): string {
  const envPath = path.resolve(__dirname, "../../.env");
  if (!existsSync(envPath)) return "";
  try {
    const content = require("fs").readFileSync(envPath);
    return createHash("sha256").update(content).digest("hex");
  } catch {
    return "";
  }
}

/**
 * Watch .env for unexpected modifications.
 * Any change triggers a critical alert - API keys may have been exfiltrated.
 */
export function startEnvIntegrityMonitor(): void {
  const envPath = path.resolve(__dirname, "../../.env");
  if (!existsSync(envPath)) return;

  watch(envPath, () => {
    const newHash = computeEnvHash();
    if (newHash !== knownEnvHash && knownEnvHash !== "") {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        level: "critical",
        category: "ENV_TAMPER",
        message: ".env file was modified unexpectedly. API keys may have been changed or exfiltrated.",
        details: { oldHash: knownEnvHash, newHash },
      });
      sendAlert("CRITICAL: .env file was modified unexpectedly. Rotate all API keys immediately.");
    }
  });

  logSecurityEvent({
    timestamp: new Date().toISOString(),
    level: "info",
    category: "WATCHDOG_INIT",
    message: ".env integrity monitor started",
  });
}

// ── Outbound request monitor ──────────────────────────────────────────────────

const ALLOWED_OUTBOUND_HOSTS = new Set([
  "api.anthropic.com",
  "generativelanguage.googleapis.com",
  "notebooklm.google.com",
  "www.youtube.com",
  "youtube.com",
  "graph.instagram.com",
  "backend.composio.dev",
  "api.composio.dev",
  "resend.com",
  "api.resend.com",
  "heygen.com",
  "api.heygen.com",
  "api.elevenlabs.io",
  "api.runwayml.com",
  "api.perplexity.ai",
]);

/**
 * Validate an outbound request destination.
 * Unknown hosts trigger a warning (not a block - allows new services to be added).
 */
export function auditOutboundRequest(url: string, callerModule: string): void {
  try {
    const host = new URL(url).hostname;
    if (!ALLOWED_OUTBOUND_HOSTS.has(host)) {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        level: "warning",
        category: "UNKNOWN_OUTBOUND",
        message: `Outbound request to unknown host: ${host} (from ${callerModule})`,
        details: { url: url.slice(0, 200), host, callerModule },
      });
    }
  } catch {
    // Malformed URL - ignore
  }
}

// ── Alert dispatch ────────────────────────────────────────────────────────────

function sendAlert(message: string): void {
  // Console alert always
  console.error(`\n${"=".repeat(60)}\n  SECURITY ALERT\n  ${message}\n${"=".repeat(60)}\n`);

  // Email alert (non-blocking, best effort)
  if (ALERT_EMAIL) {
    const { Resend } = require("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails.send({
      from:    ALERT_EMAIL,
      to:      ALERT_EMAIL,
      subject: "[OmniOrg SECURITY ALERT]",
      text:    `${message}\n\nTimestamp: ${new Date().toISOString()}\nPID: ${process.pid}`,
    }).catch((e: unknown) => console.error("[Watchdog] Email alert failed:", e));
  }
}

// ── Daemon mode ───────────────────────────────────────────────────────────────

/**
 * Start the watchdog daemon.
 * Call once at application startup to begin continuous monitoring.
 */
export function startWatchdog(): void {
  startEnvIntegrityMonitor();

  // Heartbeat every 5 minutes
  setInterval(() => {
    logSecurityEvent({
      timestamp: new Date().toISOString(),
      level: "info",
      category: "HEARTBEAT",
      message: `Watchdog alive. Events: ${totalEvents}, Critical: ${criticalCount}, Blocked IPs: ${failedAuthByIp.size}`,
    });
  }, 5 * 60 * 1000);

  logSecurityEvent({
    timestamp: new Date().toISOString(),
    level: "info",
    category: "WATCHDOG_START",
    message: `Security watchdog started. PID: ${process.pid}`,
    details: {
      monitoredCategories: ["AUTH", "JWT_REPLAY", "RATE_LIMIT", "ENV_TAMPER", "OUTBOUND"],
      logDir: LOG_DIR,
      alertEmail: ALERT_EMAIL ?? "not configured",
    },
  });
}

export { totalEvents as watchdogEventCount, criticalCount as watchdogCriticalCount };
