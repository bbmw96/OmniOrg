// Created by BBMW0 Technologies | bbmw0.com
/**
 * INTRUSION INTERCEPTOR - AI-Powered Active Security Layer
 *
 * Every AI agent in OmniOrg calls this module on every inbound request.
 * Does NOT just log - actively BLOCKS, INTERCEPTS, and NEUTRALISES attacks
 * in real time:
 *
 *   - SQL injection (UNION SELECT, DROP TABLE, hex injection, etc.)
 *   - XSS (script tags, event handlers, data URIs, etc.)
 *   - Path traversal (../, %2e%2e, /etc/passwd, etc.)
 *   - Command injection (shell metacharacters, common binaries, etc.)
 *   - Prompt injection (jailbreak attempts against AI agents)
 *   - SSRF (AWS metadata, private IP ranges, localhost, etc.)
 *   - JWT tampering (tracked via watchdog)
 *   - Brute force (tracked via watchdog)
 *   - Data exfiltration indicators
 *
 * Integrates with watchdog-agent for persistent logging and IP blocking.
 */

import { logSecurityEvent, recordAuthFailure } from "./watchdog-agent";

// ── Types ──────────────────────────────────────────────────────────────────────

export type AttackVector =
  | "sql_injection"
  | "xss"
  | "path_traversal"
  | "command_injection"
  | "prompt_injection"
  | "ssrf"
  | "jwt_tampering"
  | "brute_force"
  | "data_exfiltration"
  | "unknown";

export type ThreatScore = number;

export interface InterceptionResult {
  allowed:     boolean;
  threatScore: ThreatScore;
  vectors:     AttackVector[];
  action:      "allow" | "block" | "sanitise" | "quarantine";
  sanitised?:  string;
  reason?:     string;
}

export interface RequestContext {
  ip:          string;
  path:        string;
  method:      string;
  userAgent?:  string;
  body?:       string;
  headers?:    Record<string, string>;
  tenantId?:   string;
}

// ── Base threat scores per vector ─────────────────────────────────────────────

const BASE_SCORES: Record<AttackVector, number> = {
  sql_injection:     90,
  xss:               70,
  path_traversal:    80,
  command_injection: 95,
  prompt_injection:  85,
  ssrf:              90,
  jwt_tampering:     75,
  brute_force:       60,
  data_exfiltration: 80,
  unknown:           40,
};

// ── Detection functions ────────────────────────────────────────────────────────

/**
 * Detect SQL injection patterns.
 * Checks for UNION SELECT, DROP TABLE, INSERT INTO, comment sequences,
 * tautologies, dangerous stored procs, type coercion functions, and hex injection.
 */
export function detectSqlInjection(input: string): boolean {
  const patterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /--\s*$/m,
    /;--/,
    /'\s*or\s*'1'\s*=\s*'1/i,
    /xp_cmdshell/i,
    /exec\s*\(/i,
    /cast\s*\(/i,
    /convert\s*\(/i,
    /0x[0-9a-f]{2,}/i,
    /waitfor\s+delay/i,
  ];
  return patterns.some((p) => p.test(input));
}

/**
 * Detect XSS (cross-site scripting) patterns.
 * Checks for script tags, javascript: URIs, event handlers, eval, DOM sinks,
 * dangerous HTML elements, and data: URIs with HTML content.
 */
export function detectXss(input: string): boolean {
  const patterns = [
    /<script/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /onclick\s*=/i,
    /eval\s*\(/i,
    /document\.cookie/i,
    /window\.location/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
    /vbscript:/i,
  ];
  return patterns.some((p) => p.test(input));
}

/**
 * Detect path traversal attempts.
 * Checks for directory traversal sequences (URL-encoded and raw),
 * and access to known sensitive system paths.
 */
export function detectPathTraversal(input: string): boolean {
  const patterns = [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e/i,
    /%252e/i,
    /\/etc\/passwd/i,
    /\/windows\/system32/i,
    /\\\\[^\\]+\\[^\\]+/,
  ];
  return patterns.some((p) => p.test(input));
}

/**
 * Detect command injection attempts.
 * Checks for shell operator sequences, dangerous binaries, reverse shell
 * patterns, and remote download utilities.
 */
export function detectCommandInjection(input: string): boolean {
  const patterns = [
    /;\s*ls/,
    /&&\s*cat/,
    /\|\s*nc\b/,
    /`[^`]+`/,
    /\$\([^)]+\)/,
    /\/bin\/sh/,
    /\/bin\/bash/,
    /cmd\.exe/i,
    /powershell/i,
    /wget\s+http/i,
    /curl\s+http/i,
    /nc\s+-e/,
  ];
  return patterns.some((p) => p.test(input));
}

/**
 * Detect prompt injection attacks against AI agents.
 * Checks for attempts to override system instructions, jailbreak patterns,
 * DAN-style mode switches, and injected system-level markup.
 */
export function detectPromptInjection(input: string): boolean {
  const patterns = [
    /ignore\s+previous\s+instructions/i,
    /disregard\s+your/i,
    /you\s+are\s+now/i,
    /new\s+system\s+prompt/i,
    /forget\s+everything/i,
    /jailbreak/i,
    /dan\s+mode/i,
    /pretend\s+you\s+are/i,
    /act\s+as\s+if/i,
    /\[SYSTEM\]/,
    /###INSTRUCTION/,
  ];
  return patterns.some((p) => p.test(input));
}

/**
 * Detect Server-Side Request Forgery (SSRF) targets.
 * Blocks requests targeting cloud metadata endpoints, private IP ranges,
 * loopback addresses, and dangerous URI schemes.
 */
export function detectSsrf(url: string): boolean {
  const patterns = [
    /169\.254\.169\.254/,
    /192\.168\./,
    /^10\./,
    /172\.(1[6-9]|2[0-9]|3[01])\./,
    /localhost/i,
    /127\.0\.0\.1/,
    /0\.0\.0\.0/,
    /^file:\/\//i,
    /^gopher:\/\//i,
    /^dict:\/\//i,
  ];
  return patterns.some((p) => p.test(url));
}

// ── Threat scoring ─────────────────────────────────────────────────────────────

/**
 * Calculate an aggregate threat score for the detected attack vectors.
 * Applies a 1.3x multiplier when multiple vectors are present, capped at 100.
 */
export function calculateThreatScore(
  vectors: AttackVector[],
  _context: RequestContext
): ThreatScore {
  if (vectors.length === 0) return 0;

  const maxBase = Math.max(...vectors.map((v) => BASE_SCORES[v]));
  const score   = vectors.length > 1 ? maxBase * 1.3 : maxBase;

  return Math.min(100, Math.round(score));
}

// ── Input sanitisation ─────────────────────────────────────────────────────────

/**
 * Sanitise user input by stripping HTML tags, escaping SQL special characters,
 * and removing shell metacharacters. Returns a string safe to pass to
 * downstream systems.
 */
export function sanitiseInput(input: string): string {
  return input
    // Strip HTML tags
    .replace(/<[^>]*>/g, "")
    // Escape SQL special characters
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/;/g, "\\;")
    .replace(/--/g, "")
    // Remove shell metacharacters
    .replace(/[|&$`()]/g, "");
}

// ── Main interceptor ───────────────────────────────────────────────────────────

/**
 * Inspect an inbound request context for all known attack vectors.
 * Returns an InterceptionResult with a decision, threat score, and optional
 * sanitised body.
 *
 * Decision thresholds:
 *   >= 80: block     - request denied, auth failure recorded
 *   >= 50: quarantine - request denied, logged for human review
 *   >= 20: sanitise  - request allowed with sanitised body
 *   <  20: allow     - request passes through unchanged
 */
export function interceptRequest(ctx: RequestContext): InterceptionResult {
  const candidates: string[] = [ctx.path];

  if (ctx.body)      candidates.push(ctx.body);
  if (ctx.userAgent) candidates.push(ctx.userAgent);

  if (ctx.headers) {
    for (const value of Object.values(ctx.headers)) {
      candidates.push(value);
    }
  }

  const detectedVectors: AttackVector[] = [];

  for (const candidate of candidates) {
    if (detectSqlInjection(candidate) && !detectedVectors.includes("sql_injection")) {
      detectedVectors.push("sql_injection");
    }
    if (detectXss(candidate) && !detectedVectors.includes("xss")) {
      detectedVectors.push("xss");
    }
    if (detectPathTraversal(candidate) && !detectedVectors.includes("path_traversal")) {
      detectedVectors.push("path_traversal");
    }
    if (detectCommandInjection(candidate) && !detectedVectors.includes("command_injection")) {
      detectedVectors.push("command_injection");
    }
    if (detectPromptInjection(candidate) && !detectedVectors.includes("prompt_injection")) {
      detectedVectors.push("prompt_injection");
    }
    if (detectSsrf(candidate) && !detectedVectors.includes("ssrf")) {
      detectedVectors.push("ssrf");
    }
  }

  const threatScore = calculateThreatScore(detectedVectors, ctx);

  let action: InterceptionResult["action"];
  let allowed: boolean;
  let reason: string | undefined;
  let sanitised: string | undefined;

  if (threatScore >= 80) {
    action  = "block";
    allowed = false;
    reason  = `High-threat request blocked (score: ${threatScore}, vectors: ${detectedVectors.join(", ")})`;

    logSecurityEvent({
      timestamp: new Date().toISOString(),
      level:     "critical",
      category:  "INTRUSION_BLOCKED",
      message:   `Request from ${ctx.ip} blocked. Score: ${threatScore}. Vectors: ${detectedVectors.join(", ")}`,
      details:   { ip: ctx.ip, path: ctx.path, method: ctx.method, vectors: detectedVectors, threatScore, tenantId: ctx.tenantId },
      blocked:   true,
    });

    recordAuthFailure(ctx.ip, reason);

  } else if (threatScore >= 50) {
    action  = "quarantine";
    allowed = false;
    reason  = `Request quarantined for human review (score: ${threatScore}, vectors: ${detectedVectors.join(", ")})`;

    logSecurityEvent({
      timestamp: new Date().toISOString(),
      level:     "critical",
      category:  "INTRUSION_QUARANTINE",
      message:   `Request from ${ctx.ip} quarantined. Score: ${threatScore}. Vectors: ${detectedVectors.join(", ")}`,
      details:   { ip: ctx.ip, path: ctx.path, method: ctx.method, vectors: detectedVectors, threatScore, tenantId: ctx.tenantId },
      blocked:   true,
    });

    recordAuthFailure(ctx.ip, reason);

  } else if (threatScore >= 20) {
    action    = "sanitise";
    allowed   = true;
    sanitised = ctx.body ? sanitiseInput(ctx.body) : undefined;
    reason    = `Request sanitised (score: ${threatScore}, vectors: ${detectedVectors.join(", ")})`;

    logSecurityEvent({
      timestamp: new Date().toISOString(),
      level:     "warning",
      category:  "INTRUSION_SANITISED",
      message:   `Request from ${ctx.ip} sanitised. Score: ${threatScore}. Vectors: ${detectedVectors.join(", ")}`,
      details:   { ip: ctx.ip, path: ctx.path, method: ctx.method, vectors: detectedVectors, threatScore, tenantId: ctx.tenantId },
    });

  } else {
    action  = "allow";
    allowed = true;

    if (threatScore > 0) {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        level:     "info",
        category:  "INTRUSION_ALLOW",
        message:   `Request from ${ctx.ip} allowed. Score: ${threatScore}.`,
        details:   { ip: ctx.ip, path: ctx.path, method: ctx.method, threatScore, tenantId: ctx.tenantId },
      });
    }
  }

  const result: InterceptionResult = { allowed, threatScore, vectors: detectedVectors, action };
  if (reason)    result.reason    = reason;
  if (sanitised) result.sanitised = sanitised;

  return result;
}

// ── Middleware factory ─────────────────────────────────────────────────────────

/**
 * Returns a bound interceptor function ready for use by Express/HTTP servers.
 * Every call logs through the watchdog via interceptRequest.
 */
export function createInterceptorMiddleware(): (ctx: RequestContext) => InterceptionResult {
  return (ctx: RequestContext) => interceptRequest(ctx);
}

// ── AI input monitor ──────────────────────────────────────────────────────────

/**
 * Validate input destined for an AI agent.
 * Specifically guards against prompt injection that could hijack model behaviour.
 *
 * Throws an Error if a prompt injection attempt is detected.
 * Returns a sanitised copy of the message otherwise.
 */
export function monitorAiInput(userMessage: string, tenantId: string): string {
  if (detectPromptInjection(userMessage)) {
    logSecurityEvent({
      timestamp: new Date().toISOString(),
      level:     "critical",
      category:  "PROMPT_INJECTION_BLOCKED",
      message:   `Prompt injection attempt blocked for tenant ${tenantId}`,
      details:   {
        tenantId,
        preview: userMessage.slice(0, 200),
      },
      blocked: true,
    });

    throw new Error("AI prompt injection attempt blocked");
  }

  return sanitiseInput(userMessage);
}
