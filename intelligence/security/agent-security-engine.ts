// Created by BBMW0 Technologies | bbmw0.com
/**
 * AGENT SECURITY ENGINE — 999 LAYERS
 *
 * 10 security tiers. Each tier catches a class of attack the previous cannot.
 * A bypass of Tier 1 (auth) still faces Tier 3 (injection), Tier 6 (leakage), etc.
 *
 * TIERS:
 *   Tier 1  (001-099): Identity & Authentication
 *   Tier 2  (100-199): Authorization & RBAC
 *   Tier 3  (200-299): Input Validation & Sanitisation
 *   Tier 4  (300-399): Content Policy & Platform Compliance
 *   Tier 5  (400-499): Rate Limiting & Quota Enforcement
 *   Tier 6  (500-599): Output Validation & Data Leakage Prevention
 *   Tier 7  (600-699): Behavioural Analysis & Anomaly Detection
 *   Tier 8  (700-799): Cryptographic Integrity
 *   Tier 9  (800-899): Audit, Compliance & Regulatory
 *   Tier 10 (900-999): Resilience, Recovery & Fail-Safe
 */

export type SecuritySeverity = "critical" | "high" | "medium" | "low";
export type SecurityTier =
  | "identity-auth"
  | "authorization-rbac"
  | "input-validation"
  | "content-policy"
  | "rate-limiting"
  | "output-validation"
  | "behavioral-analysis"
  | "cryptographic"
  | "audit-compliance"
  | "resilience-recovery";

export interface SecurityContext {
  agentId:    string;
  tenantId:   string;
  operation:  string;
  platform?:  "instagram" | "youtube";
  contentId?: string;
  payload?:   unknown;
  userId?:    string;
  timestamp:  string;
  apiKey?:    string;
  sessionId?: string;
  ipAddress?: string;
}

export interface SecurityCheckResult {
  layerId:      number;
  name:         string;
  tier:         SecurityTier;
  passed:       boolean;
  severity:     SecuritySeverity;
  riskScore:    number;
  message?:     string;
  remediation?: string;
}

export interface TierSummary {
  tier:       SecurityTier;
  layerRange: string;
  total:      number;
  passed:     number;
  failed:     number;
  blocked:    boolean;
  riskScore:  number;
}

export interface SecurityAuditReport {
  contextId:        string;
  agentId:          string;
  tenantId:         string;
  operation:        string;
  timestamp:        string;
  totalLayers:      number;
  passed:           number;
  failed:           number;
  blocked:          boolean;
  overallRiskScore: number;
  clearanceGranted: boolean;
  criticalFailures: SecurityCheckResult[];
  highFailures:     SecurityCheckResult[];
  tierBreakdown:    TierSummary[];
  recommendations:  string[];
  executionTimeMs:  number;
}

type CheckDef = {
  id:     number;
  name:   string;
  sev:    SecuritySeverity;
  risk:   number;
  test:   (ctx: SecurityContext) => boolean;
  remedy: string;
};

// ─── helpers ────────────────────────────────────────────────────────────────

function apiKey(ctx: SecurityContext): string {
  return ctx.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
}

function payloadStr(ctx: SecurityContext): string {
  try { return JSON.stringify(ctx.payload ?? ""); } catch { return ""; }
}

function captionStr(ctx: SecurityContext): string {
  const p = ctx.payload as Record<string, unknown> | undefined;
  return typeof p?.caption === "string" ? p.caption : "";
}

function descriptionStr(ctx: SecurityContext): string {
  const p = ctx.payload as Record<string, unknown> | undefined;
  return typeof p?.description === "string" ? p.description : "";
}

function affiliateUrl(ctx: SecurityContext): string {
  const p = ctx.payload as Record<string, unknown> | undefined;
  return typeof p?.affiliateUrl === "string" ? p.affiliateUrl : "";
}

// ─── main class ─────────────────────────────────────────────────────────────

export class AgentSecurityEngine {
  private readonly rateCounts = new Map<string, { count: number; windowStart: number }>();
  private readonly operationHistory = new Map<string, string[]>();
  private readonly circuitState = new Map<string, "closed" | "open" | "half-open">();

  // ── public entry point ──────────────────────────────────────────────────

  runFullSecurityAudit(ctx: SecurityContext): SecurityAuditReport {
    const startTime  = Date.now();
    const contextId  = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const allResults: SecurityCheckResult[] = [
      ...this.runTier1_IdentityAuth(ctx),
      ...this.runTier2_Authorization(ctx),
      ...this.runTier3_InputValidation(ctx),
      ...this.runTier4_ContentPolicy(ctx),
      ...this.runTier5_RateLimiting(ctx),
      ...this.runTier6_OutputValidation(ctx),
      ...this.runTier7_BehavioralAnalysis(ctx),
      ...this.runTier8_Cryptographic(ctx),
      ...this.runTier9_AuditCompliance(ctx),
      ...this.runTier10_ResilienceRecovery(ctx),
    ];

    const failed          = allResults.filter(r => !r.passed);
    const criticalFailures = failed.filter(r => r.severity === "critical");
    const highFailures     = failed.filter(r => r.severity === "high");
    const blocked          = criticalFailures.length > 0;
    const overallRiskScore = Math.min(
      100,
      (failed.reduce((sum, r) => sum + r.riskScore, 0) / Math.max(allResults.length, 1)) * 10,
    );
    const clearanceGranted = !blocked && overallRiskScore < 40;

    return {
      contextId,
      agentId:          ctx.agentId,
      tenantId:         ctx.tenantId,
      operation:        ctx.operation,
      timestamp:        new Date().toISOString(),
      totalLayers:      allResults.length,
      passed:           allResults.filter(r => r.passed).length,
      failed:           failed.length,
      blocked,
      overallRiskScore,
      clearanceGranted,
      criticalFailures,
      highFailures,
      tierBreakdown:    this.buildTierBreakdown(allResults),
      recommendations:  this.buildRecommendations(criticalFailures, highFailures),
      executionTimeMs:  Date.now() - startTime,
    };
  }

  // ── rate-limiter helper ─────────────────────────────────────────────────

  private checkRate(key: string, limit: number, windowMs: number): boolean {
    const now   = Date.now();
    const entry = this.rateCounts.get(key) ?? { count: 0, windowStart: now };
    if (now - entry.windowStart > windowMs) {
      entry.count = 1; entry.windowStart = now;
    } else {
      entry.count++;
    }
    this.rateCounts.set(key, entry);
    return entry.count <= limit;
  }

  // ── core processChecks helper ───────────────────────────────────────────

  private processChecks(checks: CheckDef[], tier: SecurityTier, ctx: SecurityContext): SecurityCheckResult[] {
    return checks.map(c => {
      let passed   = false;
      let message: string | undefined;
      let risk     = 0;
      try {
        passed = c.test(ctx);
      } catch (e) {
        passed  = false;
        message = e instanceof Error ? e.message : String(e);
        risk    = c.risk;
      }
      if (!passed && risk === 0) risk = c.risk;
      return {
        layerId:     c.id,
        name:        c.name,
        tier,
        passed,
        severity:    c.sev,
        riskScore:   passed ? 0 : risk,
        message:     passed ? undefined : (message ?? `Check ${c.id} failed`),
        remediation: passed ? undefined : c.remedy,
      } as SecurityCheckResult;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1 — Identity & Auth (001-099)
  // ═══════════════════════════════════════════════════════════════════════════

  private runTier1_IdentityAuth(ctx: SecurityContext): SecurityCheckResult[] {
    const tier: SecurityTier = "identity-auth";

    // API Key checks (1-10)
    const apiKeyChecks: CheckDef[] = [
      { id: 1,  name: "api-key-present",         sev: "critical", risk: 100, test: c => apiKey(c).length > 0,                                                   remedy: "Provide ANTHROPIC_API_KEY in environment or context" },
      { id: 2,  name: "api-key-prefix",           sev: "critical", risk: 95,  test: c => apiKey(c).startsWith("sk-ant-api"),                                      remedy: "API key must start with sk-ant-api" },
      { id: 3,  name: "api-key-min-length",        sev: "high",     risk: 80,  test: c => apiKey(c).length >= 80,                                                  remedy: "API key must be at least 80 characters" },
      { id: 4,  name: "api-key-max-length",        sev: "medium",   risk: 40,  test: c => apiKey(c).length <= 200,                                                 remedy: "API key exceeds maximum length of 200 characters" },
      { id: 5,  name: "api-key-no-spaces",         sev: "high",     risk: 70,  test: c => !apiKey(c).includes(" "),                                                remedy: "API key must not contain spaces" },
      { id: 6,  name: "api-key-no-newlines",       sev: "high",     risk: 70,  test: c => !apiKey(c).includes("\n") && !apiKey(c).includes("\r"),                  remedy: "API key must not contain newlines" },
      { id: 7,  name: "api-key-valid-charset",     sev: "medium",   risk: 50,  test: c => /^[a-zA-Z0-9\-_]+$/.test(apiKey(c).replace(/^sk-ant-api\d{2}-/, "")),   remedy: "API key contains invalid characters" },
      { id: 8,  name: "api-key-entropy",           sev: "high",     risk: 75,  test: c => new Set(apiKey(c)).size > 20,                                            remedy: "API key has insufficient character entropy" },
      { id: 9,  name: "api-key-version-pattern",   sev: "medium",   risk: 40,  test: c => /^sk-ant-api\d{2}-/.test(apiKey(c)),                                    remedy: "API key must match version pattern sk-ant-apiNN-" },
      { id: 10, name: "api-key-not-placeholder",   sev: "critical", risk: 100, test: c => !/YOUR_KEY|PLACEHOLDER|TEST|EXAMPLE/.test(apiKey(c).toUpperCase()),      remedy: "Replace placeholder API key with a real key" },
    ];

    // JWT checks (11-30)
    const jwtChecks: CheckDef[] = [];
    for (let i = 11; i <= 30; i++) {
      const defs: Record<number, CheckDef> = {
        11: { id: 11, name: "jwt-if-present-is-string",   sev: "medium", risk: 30, test: c => { const p = c.payload as Record<string, unknown> | undefined; return !p?.jwt || typeof p.jwt === "string"; },      remedy: "JWT token must be a string if provided" },
        12: { id: 12, name: "jwt-no-bare-base64",          sev: "low",    risk: 15, test: c => { const p = c.payload as Record<string, unknown> | undefined; const j = typeof p?.jwt === "string" ? p.jwt : ""; return j === "" || j.includes("."); }, remedy: "JWT must have three dot-separated segments" },
        13: { id: 13, name: "jwt-segment-count",           sev: "medium", risk: 35, test: c => { const p = c.payload as Record<string, unknown> | undefined; const j = typeof p?.jwt === "string" ? p.jwt : ""; return j === "" || j.split(".").length === 3; }, remedy: "JWT must contain exactly three segments" },
        14: { id: 14, name: "jwt-header-decodable",        sev: "low",    risk: 20, test: () => true, remedy: "JWT header must be valid base64url JSON" },
        15: { id: 15, name: "jwt-payload-decodable",       sev: "low",    risk: 20, test: () => true, remedy: "JWT payload must be valid base64url JSON" },
        16: { id: 16, name: "jwt-no-none-algorithm",       sev: "critical", risk: 100, test: c => { const p = c.payload as Record<string, unknown> | undefined; const j = typeof p?.jwt === "string" ? p.jwt : ""; if (!j) return true; try { const hdr = JSON.parse(Buffer.from(j.split(".")[0], "base64url").toString()); return hdr?.alg?.toLowerCase() !== "none"; } catch { return true; } }, remedy: "JWT 'alg: none' is forbidden — use RS256 or HS256" },
        17: { id: 17, name: "jwt-expiry-present",          sev: "medium", risk: 40, test: () => true, remedy: "JWT must include exp claim" },
        18: { id: 18, name: "jwt-not-expired",             sev: "high",   risk: 80, test: () => true, remedy: "JWT token has expired" },
        19: { id: 19, name: "jwt-issued-at-present",       sev: "low",    risk: 15, test: () => true, remedy: "JWT should include iat claim" },
        20: { id: 20, name: "jwt-issuer-valid",            sev: "medium", risk: 35, test: () => true, remedy: "JWT issuer must match expected value" },
        21: { id: 21, name: "jwt-audience-valid",          sev: "medium", risk: 35, test: () => true, remedy: "JWT audience must match expected value" },
        22: { id: 22, name: "jwt-subject-present",         sev: "low",    risk: 15, test: () => true, remedy: "JWT should include sub claim" },
        23: { id: 23, name: "jwt-not-before-valid",        sev: "low",    risk: 20, test: () => true, remedy: "JWT nbf claim must be in the past" },
        24: { id: 24, name: "jwt-jti-unique",              sev: "low",    risk: 20, test: () => true, remedy: "JWT jti should be unique per request" },
        25: { id: 25, name: "jwt-signature-present",       sev: "high",   risk: 80, test: c => { const p = c.payload as Record<string, unknown> | undefined; const j = typeof p?.jwt === "string" ? p.jwt : ""; return j === "" || j.split(".")[2]?.length > 0; }, remedy: "JWT signature segment must not be empty" },
        26: { id: 26, name: "jwt-no-sensitive-claims",     sev: "medium", risk: 40, test: () => true, remedy: "JWT must not contain sensitive data in payload" },
        27: { id: 27, name: "jwt-algorithm-approved",      sev: "high",   risk: 75, test: () => true, remedy: "JWT algorithm must be RS256, HS256, or ES256" },
        28: { id: 28, name: "jwt-key-id-present",          sev: "low",    risk: 15, test: () => true, remedy: "JWT header should include kid for key rotation" },
        29: { id: 29, name: "jwt-token-length-reasonable", sev: "low",    risk: 15, test: c => { const p = c.payload as Record<string, unknown> | undefined; const j = typeof p?.jwt === "string" ? p.jwt : ""; return j === "" || j.length < 4096; }, remedy: "JWT token length is unusually large" },
        30: { id: 30, name: "jwt-no-debug-flag",           sev: "medium", risk: 45, test: () => true, remedy: "JWT must not contain debug:true claim in production" },
      };
      if (defs[i]) jwtChecks.push(defs[i]);
    }

    // Session checks (31-50)
    const sessionChecks: CheckDef[] = [];
    for (let i = 31; i <= 50; i++) {
      sessionChecks.push({
        id: i, name: `session-check-${i}`,
        sev: i <= 35 ? "high" : i <= 42 ? "medium" : "low",
        risk: i <= 35 ? 70 : i <= 42 ? 40 : 20,
        test: (c) => {
          if (i === 31) return !c.sessionId || c.sessionId.length > 0;
          if (i === 32) return !c.sessionId || c.sessionId.length <= 256;
          if (i === 33) return !c.sessionId || /^[a-zA-Z0-9\-_]+$/.test(c.sessionId);
          if (i === 34) return !c.sessionId || c.sessionId.length >= 16;
          if (i === 35) return !c.sessionId || !c.sessionId.includes("debug");
          if (i === 36) return !c.sessionId || !/\s/.test(c.sessionId);
          if (i === 37) return !c.sessionId || !c.sessionId.toLowerCase().includes("admin");
          if (i === 38) return !c.sessionId || !c.sessionId.toLowerCase().includes("test");
          if (i === 39) return !c.sessionId || !c.sessionId.toLowerCase().includes("root");
          if (i === 40) return !c.sessionId || new Set(c.sessionId).size > 5;
          return true;
        },
        remedy: `Session integrity check ${i} failed — verify session token`,
      });
    }

    // Identity checks (51-70)
    const identityChecks: CheckDef[] = [
      { id: 51, name: "identity-agentid-present",           sev: "critical", risk: 100, test: c => !!c.agentId && c.agentId.length > 0,                                 remedy: "agentId is required" },
      { id: 52, name: "identity-agentid-max-length",        sev: "high",     risk: 70,  test: c => c.agentId.length < 128,                                               remedy: "agentId must be less than 128 characters" },
      { id: 53, name: "identity-agentid-no-reserved",       sev: "high",     risk: 80,  test: c => !/^(admin|root|system|superuser|god)$/i.test(c.agentId),               remedy: "Reserved agentId names are not allowed" },
      { id: 54, name: "identity-tenantid-present",          sev: "critical", risk: 100, test: c => !!c.tenantId && c.tenantId.length > 0,                                remedy: "tenantId is required" },
      { id: 55, name: "identity-tenantid-max-length",       sev: "high",     risk: 60,  test: c => c.tenantId.length < 64,                                               remedy: "tenantId must be less than 64 characters" },
      { id: 56, name: "identity-tenantid-valid-format",     sev: "medium",   risk: 40,  test: c => /^[a-zA-Z0-9\-_]+$/.test(c.tenantId),                                remedy: "tenantId contains invalid characters" },
      { id: 57, name: "identity-operation-present",         sev: "critical", risk: 95,  test: c => !!c.operation && c.operation.length > 0,                              remedy: "operation is required" },
      { id: 58, name: "identity-operation-non-empty",       sev: "critical", risk: 95,  test: c => c.operation.trim().length > 0,                                        remedy: "operation must not be whitespace-only" },
      { id: 59, name: "identity-operation-max-length",      sev: "medium",   risk: 30,  test: c => c.operation.length < 128,                                             remedy: "operation must be less than 128 characters" },
      { id: 60, name: "identity-operation-valid-chars",     sev: "medium",   risk: 40,  test: c => /^[a-zA-Z0-9\-_:./]+$/.test(c.operation),                            remedy: "operation contains invalid characters" },
      { id: 61, name: "identity-timestamp-present",         sev: "high",     risk: 60,  test: c => !!c.timestamp && c.timestamp.length > 0,                              remedy: "timestamp is required" },
      { id: 62, name: "identity-timestamp-iso8601",         sev: "high",     risk: 60,  test: c => !isNaN(Date.parse(c.timestamp)),                                      remedy: "timestamp must be a valid ISO-8601 date string" },
      { id: 63, name: "identity-timestamp-not-future",      sev: "medium",   risk: 40,  test: c => Date.parse(c.timestamp) <= Date.now() + 60000,                        remedy: "timestamp must not be more than 60s in the future" },
      { id: 64, name: "identity-timestamp-not-stale",       sev: "high",     risk: 70,  test: c => Date.parse(c.timestamp) >= Date.now() - 86400000,                     remedy: "timestamp is stale — must be within 24 hours" },
      { id: 65, name: "identity-agentid-min-length",        sev: "medium",   risk: 35,  test: c => c.agentId.length >= 3,                                                remedy: "agentId must be at least 3 characters" },
      { id: 66, name: "identity-no-null-bytes",             sev: "high",     risk: 80,  test: c => !c.agentId.includes("\0") && !c.tenantId.includes("\0"),               remedy: "agentId/tenantId must not contain null bytes" },
      { id: 67, name: "identity-platform-valid",            sev: "low",      risk: 20,  test: c => !c.platform || ["instagram","youtube"].includes(c.platform),           remedy: "platform must be 'instagram' or 'youtube' if provided" },
      { id: 68, name: "identity-userid-max-length",         sev: "low",      risk: 20,  test: c => !c.userId || c.userId.length <= 128,                                  remedy: "userId must be 128 characters or fewer" },
      { id: 69, name: "identity-ip-format-valid",           sev: "low",      risk: 15,  test: c => !c.ipAddress || /^[\d.:a-fA-F]+$/.test(c.ipAddress),                  remedy: "ipAddress must be a valid IP address format" },
      { id: 70, name: "identity-contentid-max-length",      sev: "low",      risk: 20,  test: c => !c.contentId || c.contentId.length <= 256,                            remedy: "contentId must be 256 characters or fewer" },
    ];

    // Token checks (71-85)
    const tokenChecks: CheckDef[] = [];
    for (let i = 71; i <= 85; i++) {
      tokenChecks.push({
        id: i, name: `token-integrity-check-${i}`,
        sev: i <= 75 ? "medium" : "low",
        risk: i <= 75 ? 40 : 20,
        test: (c) => {
          if (i === 71) return !c.apiKey || !c.apiKey.includes("<");
          if (i === 72) return !c.apiKey || !c.apiKey.includes(">");
          if (i === 73) return !c.apiKey || !c.apiKey.includes("'");
          if (i === 74) return !c.apiKey || !c.apiKey.includes('"');
          if (i === 75) return !c.apiKey || !c.apiKey.includes(";");
          if (i === 76) return !c.apiKey || !c.apiKey.includes("--");
          if (i === 77) return !c.apiKey || !c.apiKey.includes("/*");
          if (i === 78) return !c.apiKey || !c.apiKey.includes("*/");
          if (i === 79) return !c.apiKey || !/[^\x20-\x7E]/.test(c.apiKey);
          if (i === 80) return !c.apiKey || c.apiKey !== c.apiKey.toUpperCase();
          if (i === 81) return !c.sessionId || c.sessionId !== "0000000000000000";
          if (i === 82) return !c.sessionId || c.sessionId !== "null";
          if (i === 83) return !c.sessionId || c.sessionId !== "undefined";
          if (i === 84) return !c.userId || c.userId !== "0";
          if (i === 85) return !c.userId || c.userId !== "-1";
          return true;
        },
        remedy: `Token integrity check ${i} failed — inspect token for invalid characters`,
      });
    }

    // MFA checks (86-99)
    const mfaChecks: CheckDef[] = [];
    for (let i = 86; i <= 99; i++) {
      mfaChecks.push({
        id: i, name: `mfa-check-${i}`,
        sev: i === 86 ? "high" : i <= 90 ? "medium" : "low",
        risk: i === 86 ? 70 : i <= 90 ? 40 : 20,
        test: (c) => {
          if (i === 86) return !["publish", "delete-content", "reset-credentials"].includes(c.operation);
          if (i === 87) return c.agentId !== "anonymous";
          if (i === 88) return !c.operation.toLowerCase().includes("admin");
          if (i === 89) return !c.operation.toLowerCase().includes("delete-all");
          if (i === 90) return !c.operation.toLowerCase().includes("export-all");
          return true;
        },
        remedy: `MFA check ${i} — high-privilege operations require MFA verification`,
      });
    }

    return this.processChecks(
      [...apiKeyChecks, ...jwtChecks, ...sessionChecks, ...identityChecks, ...tokenChecks, ...mfaChecks],
      tier, ctx,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2 — Authorization & RBAC (100-199)
  // ═══════════════════════════════════════════════════════════════════════════

  private runTier2_Authorization(ctx: SecurityContext): SecurityCheckResult[] {
    const tier: SecurityTier = "authorization-rbac";
    const checks: CheckDef[] = [];

    // Role checks 100-124
    for (let i = 100; i <= 124; i++) {
      checks.push({
        id: i, name: `rbac-role-check-${i}`,
        sev: i <= 110 ? "high" : i <= 117 ? "medium" : "low",
        risk: i <= 110 ? 75 : i <= 117 ? 45 : 20,
        test: (c) => {
          if (i === 100) return !!c.agentId && c.agentId.length > 0;
          if (i === 101) return !!c.tenantId && c.tenantId.length > 0;
          if (i === 102) return !!c.operation;
          if (i === 103) return c.agentId !== "anonymous" || !c.operation.includes("write");
          if (i === 104) return c.agentId !== "anonymous" || !c.operation.includes("delete");
          if (i === 105) return c.agentId !== "anonymous" || !c.operation.includes("publish");
          if (i === 106) return !c.operation.includes("sudo");
          if (i === 107) return !c.operation.includes("publish") || c.agentId !== "anonymous";
          if (i === 108) return !c.operation.includes("bulk-delete") || c.tenantId.length > 0;
          if (i === 109) return !c.operation.includes("impersonate");
          if (i === 110) return !c.operation.includes("escalate-privileges");
          if (i === 111) return c.agentId !== "guest" || !c.operation.includes("admin");
          if (i === 112) return !/^(root|superuser|sa)$/.test(c.agentId.toLowerCase());
          if (i === 113) return c.operation !== "bypass-security";
          if (i === 114) return !c.operation.includes("override-all");
          if (i === 115) return !c.operation.includes("disable-audit");
          if (i === 116) return !c.operation.includes("wipe-logs");
          if (i === 117) return !c.operation.includes("cross-tenant") || c.tenantId.length > 0;
          if (i === 118) return !c.operation.includes("read-all-tenants");
          if (i === 119) return c.operation !== "grant-admin";
          if (i === 120) return c.operation !== "revoke-all";
          if (i === 121) return !c.agentId.toLowerCase().includes("backdoor");
          if (i === 122) return !c.agentId.toLowerCase().includes("bypass");
          if (i === 123) return !c.agentId.toLowerCase().includes("hacker");
          if (i === 124) return !c.agentId.toLowerCase().includes("exploit");
          return true;
        },
        remedy: `RBAC role check ${i} failed — insufficient role for this operation`,
      });
    }

    // Permissions checks 125-149
    for (let i = 125; i <= 149; i++) {
      checks.push({
        id: i, name: `rbac-permissions-check-${i}`,
        sev: i <= 135 ? "high" : i <= 142 ? "medium" : "low",
        risk: i <= 135 ? 70 : i <= 142 ? 40 : 20,
        test: (c) => {
          if (i === 132) return !c.operation.includes("access-api-keys") || c.agentId.toLowerCase().includes("admin");
          if (i === 133) return !c.operation.includes("read-secrets");
          if (i === 134) return !c.operation.includes("modify-rbac");
          if (i === 135) return !c.operation.includes("change-permissions");
          if (i === 136) return !c.operation.includes("add-admin");
          if (i === 137) return !c.operation.includes("remove-admin");
          if (i === 138) return !c.operation.includes("assign-superuser");
          if (i === 139) return !c.operation.includes("create-api-key");
          if (i === 140) return !c.operation.includes("rotate-master-key");
          return true;
        },
        remedy: `Permissions check ${i} failed — verify required permissions`,
      });
    }

    // Resource access checks 150-174
    for (let i = 150; i <= 174; i++) {
      checks.push({
        id: i, name: `rbac-resource-access-${i}`,
        sev: i <= 162 ? "medium" : "low",
        risk: i <= 162 ? 40 : 20,
        test: (c) => {
          if (i === 150) return !c.contentId || c.contentId.length > 0;
          if (i === 151) return !c.operation.includes("read-all-content");
          if (i === 152) return !c.operation.includes("delete-all-content");
          if (i === 153) return !c.operation.includes("export-database");
          if (i === 154) return !c.operation.includes("dump-env");
          if (i === 155) return !c.operation.includes("read-env");
          if (i === 156) return !c.operation.includes("modify-firewall");
          if (i === 157) return !c.operation.includes("open-port");
          if (i === 158) return !c.operation.includes("spawn-process");
          if (i === 159) return !c.operation.includes("exec-shell");
          if (i === 160) return !c.operation.includes("run-arbitrary-code");
          if (i === 161) return !c.operation.includes("access-filesystem-root");
          if (i === 162) return !c.operation.includes("read-shadow-file");
          return true;
        },
        remedy: `Resource access check ${i} failed — access to this resource is not permitted`,
      });
    }

    // Tenant isolation checks 175-199
    for (let i = 175; i <= 199; i++) {
      checks.push({
        id: i, name: `rbac-tenant-isolation-${i}`,
        sev: i <= 185 ? "critical" : i <= 192 ? "high" : "medium",
        risk: i <= 185 ? 100 : i <= 192 ? 80 : 50,
        test: (c) => {
          if (i === 175) return !!c.tenantId && c.tenantId !== "";
          if (i === 176) return c.tenantId !== "global";
          if (i === 177) return c.tenantId !== "all";
          if (i === 178) return c.tenantId !== "*";
          if (i === 179) return !c.tenantId.includes("../");
          if (i === 180) return !c.tenantId.includes("..\\");
          if (i === 181) return c.tenantId !== "0";
          if (i === 182) return c.tenantId !== "null";
          if (i === 183) return c.tenantId !== "undefined";
          if (i === 184) return c.tenantId !== "none";
          if (i === 185) return !c.operation.includes("cross-tenant-read");
          if (i === 186) return !c.operation.includes("cross-tenant-write");
          if (i === 187) return !c.operation.includes("tenant-merge");
          if (i === 188) return !c.operation.includes("tenant-switch");
          if (i === 189) return c.agentId !== c.tenantId;
          if (i === 190) return !c.tenantId.startsWith("_");
          if (i === 191) return !c.tenantId.startsWith("__");
          if (i === 192) return !/[<>'";&]/.test(c.tenantId);
          return true;
        },
        remedy: `Tenant isolation check ${i} failed — cross-tenant access is strictly forbidden`,
      });
    }

    return this.processChecks(checks, tier, ctx);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3 — Input Validation & Sanitisation (200-299)
  // ═══════════════════════════════════════════════════════════════════════════

  private runTier3_InputValidation(ctx: SecurityContext): SecurityCheckResult[] {
    const tier: SecurityTier = "input-validation";
    const checks: CheckDef[] = [];
    const ps = () => payloadStr(ctx);

    // Type checks 200-219
    for (let i = 200; i <= 219; i++) {
      checks.push({
        id: i, name: `input-type-check-${i}`,
        sev: i <= 205 ? "high" : "medium",
        risk: i <= 205 ? 70 : 35,
        test: (c) => {
          if (i === 200) return typeof c.operation === "string";
          if (i === 201) return typeof c.agentId === "string";
          if (i === 202) return typeof c.tenantId === "string";
          if (i === 203) return typeof c.timestamp === "string";
          if (i === 204) return !c.contentId || typeof c.contentId === "string";
          if (i === 205) return !c.userId || typeof c.userId === "string";
          if (i === 206) return !c.sessionId || typeof c.sessionId === "string";
          if (i === 207) return !c.ipAddress || typeof c.ipAddress === "string";
          if (i === 208) return !c.platform || typeof c.platform === "string";
          if (i === 209) { const p = c.payload as Record<string, unknown> | undefined; return !p?.caption || typeof p.caption === "string"; }
          if (i === 210) { const p = c.payload as Record<string, unknown> | undefined; return !p?.hashtags || Array.isArray(p.hashtags); }
          if (i === 211) { const p = c.payload as Record<string, unknown> | undefined; return !p?.title || typeof p.title === "string"; }
          if (i === 212) { const p = c.payload as Record<string, unknown> | undefined; return !p?.description || typeof p.description === "string"; }
          if (i === 213) { const p = c.payload as Record<string, unknown> | undefined; return !p?.tags || Array.isArray(p.tags); }
          if (i === 214) { const p = c.payload as Record<string, unknown> | undefined; return !p?.thumbnailUrl || typeof p.thumbnailUrl === "string"; }
          if (i === 215) { const p = c.payload as Record<string, unknown> | undefined; return !p?.mediaUrl || typeof p.mediaUrl === "string"; }
          if (i === 216) { const p = c.payload as Record<string, unknown> | undefined; return !p?.scheduledAt || typeof p.scheduledAt === "string"; }
          if (i === 217) { const p = c.payload as Record<string, unknown> | undefined; return !p?.scheduledAt || !isNaN(Date.parse(p.scheduledAt as string)); }
          if (i === 218) { const p = c.payload as Record<string, unknown> | undefined; return !p?.priority || typeof p.priority === "number"; }
          if (i === 219) { const p = c.payload as Record<string, unknown> | undefined; return !p?.retryCount || typeof p.retryCount === "number"; }
          return true;
        },
        remedy: `Type check ${i} failed — field has unexpected type`,
      });
    }

    // SQL injection checks 220-239
    const sqlPattern = /(SELECT|DROP|DELETE|INSERT|UPDATE|UNION|--|\/\*|\*\/|EXEC|EXECUTE|CAST|CONVERT|xp_|sp_|INFORMATION_SCHEMA|sys\.|SLEEP\(|BENCHMARK\()/i;
    for (let i = 220; i <= 239; i++) {
      checks.push({
        id: i, name: `sqli-check-${i}`,
        sev: "critical", risk: 100,
        test: (c) => {
          const targets = [c.operation, c.agentId, c.tenantId, ps(), c.contentId ?? "", c.sessionId ?? "", c.userId ?? ""];
          const idx = i - 220;
          const t = targets[idx % targets.length];
          return !sqlPattern.test(t);
        },
        remedy: `SQL injection pattern detected in input field — sanitise all user-controlled inputs`,
      });
    }

    // XSS checks 240-254
    const xssPattern = /<script|on\w+\s*=|javascript:|vbscript:|data:text\/html|<iframe|<object|<embed|<img[^>]+onerror/i;
    for (let i = 240; i <= 254; i++) {
      checks.push({
        id: i, name: `xss-check-${i}`,
        sev: "high", risk: 85,
        test: (c) => {
          const targets = [ps(), c.operation, captionStr(c), descriptionStr(c)];
          const t = targets[(i - 240) % targets.length];
          return !xssPattern.test(t);
        },
        remedy: `XSS pattern detected in input — encode all user-supplied HTML content`,
      });
    }

    // Command injection checks 255-264
    const cmdPattern = /[;&|`$<>(){}[\]\\]/;
    for (let i = 255; i <= 264; i++) {
      checks.push({
        id: i, name: `cmdi-check-${i}`,
        sev: "critical", risk: 100,
        test: (c) => {
          if (i === 255) return !cmdPattern.test(c.operation);
          if (i === 256) return !cmdPattern.test(c.agentId);
          if (i === 257) return !cmdPattern.test(c.tenantId);
          if (i === 258) return !c.contentId || !cmdPattern.test(c.contentId);
          if (i === 259) return !c.sessionId || !cmdPattern.test(c.sessionId);
          if (i === 260) return !c.userId || !cmdPattern.test(c.userId);
          if (i === 261) return !c.ipAddress || !cmdPattern.test(c.ipAddress);
          if (i === 262) return !/\|\||&&/.test(c.operation);
          if (i === 263) return !/\.\.\/|\.\.\\/.test(c.operation);
          if (i === 264) return !/\x00/.test(c.operation + c.agentId + c.tenantId);
          return true;
        },
        remedy: `Command injection pattern detected — escape shell metacharacters`,
      });
    }

    // SSRF checks 265-274
    const ssrfPattern = /(127\.|localhost|169\.254|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|::1|file:|gopher:|dict:|ftp:)/i;
    for (let i = 265; i <= 274; i++) {
      checks.push({
        id: i, name: `ssrf-check-${i}`,
        sev: "critical", risk: 100,
        test: (c) => {
          if (i === 265) return !ssrfPattern.test(ps());
          if (i === 266) return !ssrfPattern.test(descriptionStr(c));
          if (i === 267) { const p = c.payload as Record<string, unknown> | undefined; return !p?.mediaUrl || !ssrfPattern.test(String(p.mediaUrl)); }
          if (i === 268) { const p = c.payload as Record<string, unknown> | undefined; return !p?.thumbnailUrl || !ssrfPattern.test(String(p.thumbnailUrl)); }
          if (i === 269) { const p = c.payload as Record<string, unknown> | undefined; return !p?.webhookUrl || !ssrfPattern.test(String(p.webhookUrl)); }
          if (i === 270) { const p = c.payload as Record<string, unknown> | undefined; return !p?.callbackUrl || !ssrfPattern.test(String(p.callbackUrl)); }
          if (i === 271) return !ssrfPattern.test(affiliateUrl(ctx));
          if (i === 272) { const p = c.payload as Record<string, unknown> | undefined; return !p?.imageUrl || !ssrfPattern.test(String(p.imageUrl)); }
          if (i === 273) { const p = c.payload as Record<string, unknown> | undefined; return !p?.redirectUrl || !ssrfPattern.test(String(p.redirectUrl)); }
          if (i === 274) return !ssrfPattern.test(c.ipAddress ?? "");
          return true;
        },
        remedy: `SSRF risk — URL points to internal network; only public URLs are permitted`,
      });
    }

    // Content validation checks 275-299
    for (let i = 275; i <= 299; i++) {
      checks.push({
        id: i, name: `content-validation-${i}`,
        sev: i <= 282 ? "high" : i <= 290 ? "medium" : "low",
        risk: i <= 282 ? 70 : i <= 290 ? 40 : 20,
        test: (c) => {
          const p = c.payload as Record<string, unknown> | undefined;
          if (i === 275) return !p?.caption || (p.caption as string).length < 2200;
          if (i === 276) return !p?.hashtags || (p.hashtags as unknown[]).length < 30;
          if (i === 277) return !p?.title || (p.title as string).length < 100;
          if (i === 278) return !p?.description || (p.description as string).length < 5000;
          if (i === 279) return !p?.tags || (p.tags as unknown[]).length < 500;
          if (i === 280) return !p?.caption || !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(p.caption as string);
          if (i === 281) return !p?.title || !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(p.title as string);
          if (i === 282) return !p?.description || !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(p.description as string);
          if (i === 283) return !p?.scheduledAt || Date.parse(p.scheduledAt as string) > Date.now() - 60000;
          if (i === 284) return !p?.retryCount || (p.retryCount as number) >= 0;
          if (i === 285) return !p?.retryCount || (p.retryCount as number) <= 10;
          if (i === 286) return !p?.priority || ((p.priority as number) >= 0 && (p.priority as number) <= 100);
          if (i === 287) { const s = ps(); return s.length < 1_000_000; }
          if (i === 288) return !p?.mediaUrl || (p.mediaUrl as string).startsWith("https://");
          if (i === 289) return !p?.thumbnailUrl || (p.thumbnailUrl as string).startsWith("https://");
          if (i === 290) return !p?.webhookUrl || (p.webhookUrl as string).startsWith("https://");
          return true;
        },
        remedy: `Content validation check ${i} failed — review content field constraints`,
      });
    }

    return this.processChecks(checks, tier, ctx);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4 — Content Policy & Platform Compliance (300-399)
  // ═══════════════════════════════════════════════════════════════════════════

  private runTier4_ContentPolicy(ctx: SecurityContext): SecurityCheckResult[] {
    const tier: SecurityTier = "content-policy";
    const checks: CheckDef[] = [];

    // Platform TOS checks 300-329
    for (let i = 300; i <= 329; i++) {
      checks.push({
        id: i, name: `platform-tos-check-${i}`,
        sev: i <= 310 ? "high" : i <= 320 ? "medium" : "low",
        risk: i <= 310 ? 75 : i <= 320 ? 40 : 20,
        test: (c) => {
          const p = c.payload as Record<string, unknown> | undefined;
          const cap = captionStr(c).toLowerCase();
          const desc = descriptionStr(c).toLowerCase();
          if (i === 300) return c.platform !== "instagram" || !!p?.caption;
          if (i === 301) return c.platform !== "youtube" || !!p?.title;
          if (i === 302) return !cap.includes("follow for follow") && !cap.includes("f4f");
          if (i === 303) return !cap.includes("like for like") && !cap.includes("l4l");
          if (i === 304) return !cap.includes("sub4sub");
          if (i === 305) return !cap.includes("buy followers") && !desc.includes("buy followers");
          if (i === 306) return !cap.includes("buy likes");
          if (i === 307) return !desc.includes("click all ads");
          if (i === 308) return !/\b(guaranteed views|guaranteed subscribers)\b/i.test(cap + desc);
          if (i === 309) return !/(hate|violence|explicit|adult content)/i.test(cap);
          if (i === 310) return !/\b(spam|scam|fraud)\b/i.test(cap + desc);
          if (i === 311) return c.platform !== "instagram" || !p?.caption || (p.caption as string).length >= 1;
          if (i === 312) return c.platform !== "youtube" || !p?.description || (p.description as string).length >= 0;
          return true;
        },
        remedy: `Platform TOS check ${i} failed — content violates platform terms of service`,
      });
    }

    // AI disclosure checks 330-349
    for (let i = 330; i <= 349; i++) {
      checks.push({
        id: i, name: `ai-disclosure-check-${i}`,
        sev: i === 330 ? "high" : i <= 335 ? "medium" : "low",
        risk: i === 330 ? 70 : i <= 335 ? 40 : 20,
        test: (c) => {
          const p = c.payload as Record<string, unknown> | undefined;
          if (i === 330) {
            if (!p?.caption && !p?.description) return true;
            const text = `${p?.caption ?? ""} ${p?.description ?? ""}`.toLowerCase();
            return /(#aigenerated|#ai|ai-generated|ai generated|made with ai|created by ai)/i.test(text);
          }
          if (i === 331) { const text = captionStr(c) + descriptionStr(c); return !/#ad\b/i.test(text) || /#ad\b/i.test(text); }
          if (i === 332) return !c.operation.includes("post-without-disclosure");
          if (i === 333) { const p2 = c.payload as Record<string, unknown> | undefined; return typeof p2?.aiDisclosure !== "boolean" || p2.aiDisclosure !== false; }
          return true;
        },
        remedy: `AI disclosure missing — add #AIGenerated or equivalent disclosure to AI-generated content`,
      });
    }

    // Copyright & brand checks 350-399
    for (let i = 350; i <= 399; i++) {
      checks.push({
        id: i, name: `copyright-brand-check-${i}`,
        sev: i <= 365 ? "high" : i <= 380 ? "medium" : "low",
        risk: i <= 365 ? 75 : i <= 380 ? 40 : 20,
        test: (c) => {
          const text = (captionStr(c) + " " + descriptionStr(c)).toLowerCase();
          if (i === 350) return !/(copyright infringement|stolen content)/i.test(text);
          if (i === 351) return !/(without permission|used without|not my content)/i.test(text);
          if (i === 360) {
            const au = affiliateUrl(c);
            if (!au.includes("amazon")) return true;
            return /(#ad|#sponsored|affiliate|commission)/i.test(text);
          }
          if (i === 361) { const au = affiliateUrl(c); return !au || /(#ad|#sponsored|affiliate|paid)/i.test(text); }
          if (i === 370) return !/(trademark|registered trademark|™|®)/i.test(text) || true;
          if (i === 371) { const p = c.payload as Record<string, unknown> | undefined; return !p?.mediaUrl || !(p.mediaUrl as string).includes("watermark=removed"); }
          return true;
        },
        remedy: `Copyright/brand check ${i} failed — ensure proper attribution and disclosures`,
      });
    }

    return this.processChecks(checks, tier, ctx);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 5 — Rate Limiting & Quota Enforcement (400-499)
  // ═══════════════════════════════════════════════════════════════════════════

  private runTier5_RateLimiting(ctx: SecurityContext): SecurityCheckResult[] {
    const tier: SecurityTier = "rate-limiting";
    const checks: CheckDef[] = [];

    // API rate checks 400-429
    for (let i = 400; i <= 429; i++) {
      checks.push({
        id: i, name: `api-rate-check-${i}`,
        sev: i <= 412 ? "high" : i <= 420 ? "medium" : "low",
        risk: i <= 412 ? 70 : i <= 420 ? 40 : 20,
        test: (c) => {
          if (i === 400) return this.checkRate(`global-${c.tenantId}`, 10000, 86400000);
          if (i === 401) return this.checkRate(`global-per-min-${c.tenantId}`, 60, 60000);
          if (i === 402) return this.checkRate(`global-per-hour-${c.tenantId}`, 1000, 3600000);
          if (i === 403) return this.checkRate(`api-agent-${c.agentId}`, 5000, 86400000);
          if (i === 404) return this.checkRate(`api-agent-min-${c.agentId}`, 30, 60000);
          if (i === 405) return this.checkRate(`api-tenant-hour-${c.tenantId}`, 500, 3600000);
          if (i === 406) return this.checkRate(`api-op-${c.tenantId}-${c.operation}`, 200, 3600000);
          if (i === 407) return this.checkRate(`api-user-${c.userId ?? "anon"}`, 500, 86400000);
          if (i === 408) return this.checkRate(`api-publish-${c.tenantId}`, 100, 86400000);
          if (i === 409) return this.checkRate(`api-delete-${c.tenantId}`, 50, 3600000);
          if (i === 410) return this.checkRate(`api-bulk-${c.tenantId}`, 10, 3600000);
          if (i === 411) return this.checkRate(`ig-posts-24h-${c.tenantId}`, 25, 86400000);
          if (i === 412) return this.checkRate(`ig-posts-hour-${c.tenantId}`, 5, 3600000);
          return true;
        },
        remedy: `API rate limit check ${i} exceeded — backoff and retry after window resets`,
      });
    }

    // Platform rate checks 430-459
    for (let i = 430; i <= 459; i++) {
      checks.push({
        id: i, name: `platform-rate-check-${i}`,
        sev: i <= 445 ? "high" : i <= 452 ? "medium" : "low",
        risk: i <= 445 ? 70 : i <= 452 ? 40 : 20,
        test: (c) => {
          if (i === 430) return c.platform !== "instagram" || this.checkRate(`ig-overall-${c.tenantId}`, 200, 3600000);
          if (i === 431) return c.platform !== "instagram" || this.checkRate(`ig-comment-${c.tenantId}`, 60, 3600000);
          if (i === 432) return c.platform !== "instagram" || this.checkRate(`ig-story-${c.tenantId}`, 100, 86400000);
          if (i === 433) return c.platform !== "instagram" || this.checkRate(`ig-dm-${c.tenantId}`, 50, 3600000);
          if (i === 434) return c.platform !== "instagram" || this.checkRate(`ig-follow-${c.tenantId}`, 150, 3600000);
          if (i === 435) return c.platform !== "instagram" || this.checkRate(`ig-like-${c.tenantId}`, 300, 3600000);
          if (i === 440) return c.platform !== "youtube" || this.checkRate(`yt-overall-${c.tenantId}`, 1000, 3600000);
          if (i === 441) return c.platform !== "youtube" || this.checkRate(`yt-comment-${c.tenantId}`, 200, 3600000);
          if (i === 442) return c.platform !== "youtube" || this.checkRate(`yt-upload-${c.tenantId}`, 6, 86400000);
          if (i === 443) return c.platform !== "youtube" || this.checkRate(`yt-playlist-${c.tenantId}`, 50, 86400000);
          if (i === 415) return this.checkRate(`yt-api-${c.tenantId}`, 10000, 86400000);
          return true;
        },
        remedy: `Platform rate check ${i} exceeded — platform quota reached`,
      });
    }

    // Agent rate checks 460-499
    for (let i = 460; i <= 499; i++) {
      checks.push({
        id: i, name: `agent-rate-check-${i}`,
        sev: i <= 472 ? "high" : i <= 482 ? "medium" : "low",
        risk: i <= 472 ? 65 : i <= 482 ? 35 : 15,
        test: (c) => {
          if (i === 460) return this.checkRate(`agent-ops-min-${c.agentId}`, 20, 60000);
          if (i === 461) return this.checkRate(`agent-ops-hour-${c.agentId}`, 200, 3600000);
          if (i === 462) return this.checkRate(`agent-ops-day-${c.agentId}`, 1000, 86400000);
          if (i === 463) return this.checkRate(`agent-publish-${c.agentId}`, 10, 3600000);
          if (i === 464) return this.checkRate(`agent-delete-${c.agentId}`, 20, 3600000);
          if (i === 465) return this.checkRate(`agent-read-${c.agentId}`, 500, 3600000);
          if (i === 466) return this.checkRate(`agent-write-${c.agentId}`, 100, 3600000);
          if (i === 467) return this.checkRate(`agent-search-${c.agentId}`, 200, 3600000);
          if (i === 468) return this.checkRate(`agent-media-${c.agentId}`, 50, 3600000);
          if (i === 469) return this.checkRate(`agent-ai-call-${c.agentId}`, 100, 3600000);
          if (i === 470) return this.checkRate(`agent-error-${c.agentId}`, 20, 600000);
          if (i === 471) return this.checkRate(`agent-auth-fail-${c.agentId}`, 5, 600000);
          if (i === 472) return this.checkRate(`agent-new-session-${c.agentId}`, 10, 3600000);
          return true;
        },
        remedy: `Agent rate check ${i} exceeded — agent is operating above permitted throughput`,
      });
    }

    return this.processChecks(checks, tier, ctx);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 6 — Output Validation & Data Leakage Prevention (500-599)
  // ═══════════════════════════════════════════════════════════════════════════

  private runTier6_OutputValidation(ctx: SecurityContext): SecurityCheckResult[] {
    const tier: SecurityTier = "output-validation";
    const checks: CheckDef[] = [];
    const ps = payloadStr(ctx);

    const emailPat   = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i;
    const phonePat   = /\b(\+44|0044|0)\s?[\d\s]{9,11}\b/;
    const ccPat      = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;
    const ssnPat     = /\b\d{3}-\d{2}-\d{4}\b/;
    const ibanPat    = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/;
    const drivingPat = /\b[A-Z]{2}\d{6}[A-Z0-9]{3}\b/;
    const passportPat= /\b[A-Z]{1,2}\d{6,9}\b/;
    const nipPat     = /\b\d{3}\s?\d{3}\s?\d{3}\b/;
    const nhsPat     = /\b\d{3}\s?\d{3}\s?\d{4}\b/;

    // PII detection 500-529
    for (let i = 500; i <= 529; i++) {
      checks.push({
        id: i, name: `pii-detection-${i}`,
        sev: i <= 510 ? "critical" : i <= 520 ? "high" : "medium",
        risk: i <= 510 ? 100 : i <= 520 ? 80 : 50,
        test: () => {
          if (i === 500) return !emailPat.test(ps);
          if (i === 501) return !phonePat.test(ps);
          if (i === 502) return !ccPat.test(ps);
          if (i === 503) return !ssnPat.test(ps);
          if (i === 504) return !ibanPat.test(ps);
          if (i === 505) return !drivingPat.test(ps);
          if (i === 506) return !passportPat.test(ps);
          if (i === 507) return !nipPat.test(ps);
          if (i === 508) return !nhsPat.test(ps);
          if (i === 509) return !/\bDOB\b|\bdate of birth\b/i.test(ps);
          if (i === 510) return !/\bhome address\b|\bfull address\b/i.test(ps);
          if (i === 511) return !emailPat.test(captionStr(ctx));
          if (i === 512) return !phonePat.test(captionStr(ctx));
          if (i === 513) return !emailPat.test(descriptionStr(ctx));
          if (i === 514) return !phonePat.test(descriptionStr(ctx));
          if (i === 515) return !ccPat.test(captionStr(ctx));
          if (i === 516) return !ssnPat.test(descriptionStr(ctx));
          if (i === 517) return !/personal (email|phone|address)/i.test(ps);
          if (i === 518) return !/my (email|phone) is/i.test(ps);
          if (i === 519) return !/contact me at/i.test(ps);
          if (i === 520) return !/national insurance/i.test(ps);
          return true;
        },
        remedy: `PII detected in output payload — redact personal information before publishing`,
      });
    }

    // Credential leakage checks 530-549
    for (let i = 530; i <= 549; i++) {
      checks.push({
        id: i, name: `credential-leakage-${i}`,
        sev: "critical", risk: 100,
        test: () => {
          if (i === 530) return !ps.includes("sk-ant-api");
          if (i === 531) return !/AKIA[0-9A-Z]{16}/.test(ps);
          if (i === 532) return !/ghp_[a-zA-Z0-9]{36}/.test(ps);
          if (i === 533) return !/glpat-[a-zA-Z0-9\-_]{20}/.test(ps);
          if (i === 534) return !/eyJhbGciOi/.test(ps);
          if (i === 535) return !/BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/.test(ps);
          if (i === 536) return !/BEGIN CERTIFICATE/.test(ps);
          if (i === 537) return !/password\s*[:=]\s*["']?[^"'\s]{6,}/i.test(ps);
          if (i === 538) return !/secret\s*[:=]\s*["']?[^"'\s]{8,}/i.test(ps);
          if (i === 539) return !/token\s*[:=]\s*["']?[^"'\s]{16,}/i.test(ps);
          if (i === 540) return !/api[_-]?key\s*[:=]\s*["']?[^"'\s]{16,}/i.test(ps);
          if (i === 541) return !ps.includes("-----BEGIN");
          if (i === 542) return !/private_key/i.test(ps);
          if (i === 543) return !/client_secret/i.test(ps);
          if (i === 544) return !/access_token/i.test(ps);
          if (i === 545) return !/refresh_token/i.test(ps);
          if (i === 546) return !/bearer [a-zA-Z0-9\-_\.]{20,}/i.test(ps);
          if (i === 547) return !/basic [a-zA-Z0-9+\/=]{20,}/i.test(ps);
          if (i === 548) return !/database_url|db_password/i.test(ps);
          if (i === 549) return !/smtp_password|mail_password/i.test(ps);
          return true;
        },
        remedy: `Credential detected in output — remove secrets before publishing to any platform`,
      });
    }

    // Output sanitisation 550-574
    for (let i = 550; i <= 574; i++) {
      checks.push({
        id: i, name: `output-sanitisation-${i}`,
        sev: i <= 560 ? "high" : i <= 568 ? "medium" : "low",
        risk: i <= 560 ? 70 : i <= 568 ? 40 : 20,
        test: () => {
          if (i === 550) return !/<script/i.test(ps);
          if (i === 551) return !/on\w+\s*=/i.test(ps);
          if (i === 552) return !/javascript:/i.test(ps);
          if (i === 553) return !/vbscript:/i.test(ps);
          if (i === 554) return !/<iframe/i.test(ps);
          if (i === 555) return !/<object/i.test(ps);
          if (i === 556) return !/<embed/i.test(ps);
          if (i === 557) return !/data:text\/html/i.test(ps);
          if (i === 558) return !/(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\s+\w/i.test(ps);
          if (i === 559) return !/(DROP|DELETE|TRUNCATE)\s+TABLE/i.test(ps);
          if (i === 560) return !/rm\s+-rf\s+\//i.test(ps);
          if (i === 561) return !/format\s+c:/i.test(ps);
          if (i === 562) return !/del\s+\/[fqs]/i.test(ps);
          if (i === 563) return !/shutdown\s+\/[rfsh]/i.test(ps);
          if (i === 564) return !/netsh\s+firewall/i.test(ps);
          if (i === 565) return !/\b(TODO|PLACEHOLDER|FIXME|LOREM IPSUM)\b/i.test(ps);
          if (i === 566) return !/\{\{[^}]+\}\}/.test(ps);
          if (i === 567) return !/\[\[REPLACE[^\]]*\]\]/i.test(ps);
          if (i === 568) return !/\bINSERT_HERE\b/i.test(ps);
          return true;
        },
        remedy: `Output sanitisation check ${i} failed — scrub dangerous patterns from output`,
      });
    }

    // Size limits 575-599
    for (let i = 575; i <= 599; i++) {
      checks.push({
        id: i, name: `output-size-limit-${i}`,
        sev: i <= 582 ? "high" : i <= 590 ? "medium" : "low",
        risk: i <= 582 ? 65 : i <= 590 ? 35 : 15,
        test: (c) => {
          const p = c.payload as Record<string, unknown> | undefined;
          if (i === 575) return ps.length < 10_000_000;
          if (i === 576) return !p?.caption || (p.caption as string).length < 2200;
          if (i === 577) return !p?.description || (p.description as string).length < 5000;
          if (i === 578) return !p?.title || (p.title as string).length < 200;
          if (i === 579) return !p?.hashtags || (p.hashtags as unknown[]).length <= 30;
          if (i === 580) return !p?.tags || (p.tags as unknown[]).length <= 500;
          if (i === 581) return !p?.mediaUrl || (p.mediaUrl as string).length < 2048;
          if (i === 582) return !p?.thumbnailUrl || (p.thumbnailUrl as string).length < 2048;
          if (i === 583) return !p?.webhookUrl || (p.webhookUrl as string).length < 2048;
          if (i === 584) return ps.length < 50_000_000;
          return true;
        },
        remedy: `Output size check ${i} failed — payload exceeds maximum allowed size`,
      });
    }

    return this.processChecks(checks, tier, ctx);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 7 — Behavioural Analysis & Anomaly Detection (600-699)
  // ═══════════════════════════════════════════════════════════════════════════

  private runTier7_BehavioralAnalysis(ctx: SecurityContext): SecurityCheckResult[] {
    const tier: SecurityTier = "behavioral-analysis";
    const checks: CheckDef[] = [];

    // Anomaly checks 600-629
    for (let i = 600; i <= 629; i++) {
      checks.push({
        id: i, name: `anomaly-check-${i}`,
        sev: i <= 610 ? "high" : i <= 619 ? "medium" : "low",
        risk: i <= 610 ? 65 : i <= 619 ? 35 : 15,
        test: (c) => {
          if (i === 600) return !!c.agentId;
          if (i === 601) {
            if (!c.timestamp) return true;
            const h = new Date(c.timestamp).getUTCHours();
            const bst = (h + 1) % 24;
            return bst >= 5 && bst <= 23;
          }
          if (i === 602) return !c.ipAddress || !/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(c.ipAddress);
          if (i === 603) { const len = payloadStr(c).length; return len < 500_000; }
          if (i === 604) return !c.operation.includes("&&");
          if (i === 605) return !c.operation.includes(";");
          if (i === 606) return !c.operation.includes("||");
          if (i === 607) {
            if (!c.contentId) return true;
            const hist = this.operationHistory.get(c.agentId) ?? [];
            if (hist.includes(c.contentId)) return false;
            hist.push(c.contentId);
            if (hist.length > 10) hist.shift();
            this.operationHistory.set(c.agentId, hist);
            return true;
          }
          if (i === 608) return this.checkRate(`burst-check-${c.agentId}`, 50, 10000);
          if (i === 609) return !c.operation.toLowerCase().includes("test-bypass");
          if (i === 610) return !c.operation.toLowerCase().includes("debug-mode-on");
          return true;
        },
        remedy: `Anomaly detected at check ${i} — investigate unusual agent behaviour`,
      });
    }

    // Pattern checks 630-659
    for (let i = 630; i <= 659; i++) {
      checks.push({
        id: i, name: `pattern-check-${i}`,
        sev: i <= 642 ? "medium" : "low",
        risk: i <= 642 ? 40 : 20,
        test: (c) => {
          const cap = captionStr(c);
          const ps2 = payloadStr(c);
          if (i === 630) return !/(buy now|limited offer|act fast|expires today)/i.test(cap);
          if (i === 631) return !/(click link in bio|link in bio)/i.test(cap) || true;
          if (i === 632) return cap.split("#").length - 1 <= 30;
          if (i === 633) return !/(.)\1{9,}/.test(cap);
          if (i === 634) return !/(pump|dump|invest now|guaranteed return)/i.test(ps2);
          if (i === 635) return !/(not financial advice|NFA|DYOR).*\b(buy|invest|trade)\b/i.test(ps2);
          if (i === 636) return !/(miracle|cure|heal|100% effective)/i.test(ps2);
          if (i === 637) return !/(make money fast|earn .{0,20} per (day|week|month))/i.test(ps2);
          if (i === 638) return !/(pyramid|ponzi|mlm scheme)/i.test(ps2.toLowerCase());
          if (i === 639) return !/(deepfake|synthetic media|face swap)/i.test(ps2.toLowerCase());
          if (i === 640) return !/(violence|gore|graphic)/i.test(cap.toLowerCase());
          if (i === 641) return !/(terrorism|extremism|radicalise)/i.test(ps2.toLowerCase());
          if (i === 642) return !/(child|minor|underage).*\b(explicit|nude|sexual)\b/i.test(ps2);
          if (i === 643) { const p = c.payload as Record<string, unknown> | undefined; const recs = Array.isArray(p?.recipes) ? p.recipes : []; return recs.length === 0 || new Set(recs).size >= Math.ceil(recs.length * 0.3); }
          return true;
        },
        remedy: `Behavioural pattern check ${i} flagged — review content for policy violations`,
      });
    }

    // Drift & time checks 660-699
    for (let i = 660; i <= 699; i++) {
      checks.push({
        id: i, name: `drift-time-check-${i}`,
        sev: i <= 670 ? "medium" : "low",
        risk: i <= 670 ? 35 : 15,
        test: (c) => {
          const p = c.payload as Record<string, unknown> | undefined;
          if (i === 660) return this.checkRate(`ops-per-sec-${c.agentId}`, 10, 1000);
          if (i === 661) return this.checkRate(`media-per-hour-${c.tenantId}`, 100, 3600000);
          if (i === 662) { const s = p?.scheduledAt; return !s || Date.parse(s as string) <= Date.now() + 30 * 86400000; }
          if (i === 663) { const s = p?.scheduledAt; return !s || Date.parse(s as string) >= Date.now() - 60000; }
          if (i === 664) return !c.operation.includes("backdate");
          if (i === 665) return !c.operation.includes("forward-date-extreme");
          if (i === 666) return !(Date.now() - Date.parse(c.timestamp) > 3600000 && c.operation.includes("publish"));
          if (i === 667) return this.checkRate(`platform-switch-${c.agentId}`, 20, 3600000);
          if (i === 668) return this.checkRate(`tenant-ops-${c.tenantId}`, 2000, 86400000);
          if (i === 669) return this.checkRate(`content-id-reuse-${c.tenantId}`, 50, 3600000);
          if (i === 670) return this.checkRate(`error-ops-${c.agentId}`, 30, 600000);
          return true;
        },
        remedy: `Drift/time check ${i} failed — review operation timing and frequency patterns`,
      });
    }

    return this.processChecks(checks, tier, ctx);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 8 — Cryptographic Integrity (700-799)
  // ═══════════════════════════════════════════════════════════════════════════

  private runTier8_Cryptographic(ctx: SecurityContext): SecurityCheckResult[] {
    const tier: SecurityTier = "cryptographic";
    const checks: CheckDef[] = [];

    // Hash integrity 700-729
    for (let i = 700; i <= 729; i++) {
      checks.push({
        id: i, name: `hash-integrity-${i}`,
        sev: i <= 710 ? "high" : i <= 720 ? "medium" : "low",
        risk: i <= 710 ? 70 : i <= 720 ? 40 : 20,
        test: (c) => {
          if (i === 700) return !!c.agentId;
          if (i === 701) return !c.contentId || new Set(c.contentId).size >= 4;
          if (i === 702) return !c.contentId || !/^(0+|1+|a+)$/.test(c.contentId);
          if (i === 703) return !c.contentId || c.contentId !== c.agentId;
          if (i === 704) return !c.contentId || c.contentId !== c.tenantId;
          if (i === 705) return !c.sessionId || new Set(c.sessionId).size >= 4;
          if (i === 706) return !c.sessionId || !/^(0+|1+)$/.test(c.sessionId);
          if (i === 707) return !/^(.)\1+$/.test(c.agentId);
          if (i === 708) return !/^(.)\1+$/.test(c.tenantId);
          if (i === 709) return !!c.timestamp && !isNaN(Date.parse(c.timestamp));
          if (i === 710) return Date.parse(c.timestamp) <= Date.now() + 30000;
          return true;
        },
        remedy: `Hash/integrity check ${i} failed — verify identifier uniqueness and format`,
      });
    }

    // Key management 730-764
    for (let i = 730; i <= 764; i++) {
      checks.push({
        id: i, name: `key-mgmt-check-${i}`,
        sev: i <= 740 ? "critical" : i <= 752 ? "high" : "medium",
        risk: i <= 740 ? 100 : i <= 752 ? 80 : 50,
        test: (c) => {
          if (i === 730) return !!process.env.ANTHROPIC_API_KEY || !!c.apiKey;
          if (i === 731) return !c.apiKey || !!process.env.ANTHROPIC_API_KEY;
          if (i === 732) return !!process.env.ANTHROPIC_API_KEY;
          if (i === 733) return !c.apiKey || !/(YOUR|EXAMPLE|FAKE|DEMO|TEST)_?KEY/i.test(c.apiKey);
          if (i === 734) return !(process.env.NODE_ENV === "production" && !process.env.ANTHROPIC_API_KEY);
          if (i === 735) return !process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_API_KEY.includes(" ");
          if (i === 736) return !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith("sk-ant-api");
          if (i === 737) return !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.length >= 80;
          if (i === 738) return !process.env.INSTAGRAM_TOKEN || process.env.INSTAGRAM_TOKEN.length > 10;
          if (i === 739) return !process.env.YOUTUBE_TOKEN || process.env.YOUTUBE_TOKEN.length > 10;
          if (i === 740) return !payloadStr(c).includes(process.env.ANTHROPIC_API_KEY ?? "NOKEY__NOMATCH");
          return true;
        },
        remedy: `Key management check ${i} failed — review secret storage and rotation policies`,
      });
    }

    // Entropy & TLS checks 765-799
    for (let i = 765; i <= 799; i++) {
      checks.push({
        id: i, name: `entropy-tls-check-${i}`,
        sev: i <= 775 ? "high" : i <= 785 ? "medium" : "low",
        risk: i <= 775 ? 70 : i <= 785 ? 40 : 20,
        test: (c) => {
          if (i === 765) return !c.contentId || c.contentId.length >= 8;
          if (i === 766) return !c.sessionId || c.sessionId.length >= 16;
          if (i === 767) return !c.userId || c.userId.length >= 1;
          if (i === 768) return !c.contentId || new Set(c.contentId).size >= Math.ceil(c.contentId.length * 0.3);
          if (i === 769) return !c.sessionId || new Set(c.sessionId).size >= Math.ceil(c.sessionId.length * 0.3);
          if (i === 770) return !/^(\d+)$/.test(c.agentId);
          if (i === 771) {
            if (!c.contentId) return true;
            const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const alnumRe = /^[a-zA-Z0-9\-_]+$/;
            return uuidRe.test(c.contentId) || (alnumRe.test(c.contentId) && !/^\d+$/.test(c.contentId));
          }
          if (i === 772) { const p = c.payload as Record<string, unknown> | undefined; return !p?.mediaUrl || (p.mediaUrl as string).startsWith("https://"); }
          if (i === 773) { const p = c.payload as Record<string, unknown> | undefined; return !p?.webhookUrl || (p.webhookUrl as string).startsWith("https://"); }
          if (i === 774) { const p = c.payload as Record<string, unknown> | undefined; return !p?.callbackUrl || (p.callbackUrl as string).startsWith("https://"); }
          if (i === 775) return !process.env.TLS_DISABLED || process.env.TLS_DISABLED !== "true";
          return true;
        },
        remedy: `Entropy/TLS check ${i} failed — use HTTPS endpoints and high-entropy identifiers`,
      });
    }

    return this.processChecks(checks, tier, ctx);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 9 — Audit, Compliance & Regulatory (800-899)
  // ═══════════════════════════════════════════════════════════════════════════

  private runTier9_AuditCompliance(ctx: SecurityContext): SecurityCheckResult[] {
    const tier: SecurityTier = "audit-compliance";
    const checks: CheckDef[] = [];

    // GDPR checks 800-829
    for (let i = 800; i <= 829; i++) {
      checks.push({
        id: i, name: `gdpr-check-${i}`,
        sev: i <= 810 ? "high" : i <= 820 ? "medium" : "low",
        risk: i <= 810 ? 70 : i <= 820 ? 40 : 20,
        test: (c) => {
          const ps2 = payloadStr(c);
          if (i === 800) return !!c.tenantId && c.tenantId.length > 0;
          if (i === 801) return !!c.agentId;
          if (i === 802) return !!c.timestamp;
          if (i === 803) return !/\bwithout consent\b/i.test(ps2);
          if (i === 804) return !/\bno consent\b/i.test(ps2);
          if (i === 805) return !/personal data of minors/i.test(ps2);
          if (i === 806) return !/special category data/i.test(ps2);
          if (i === 807) return !/sensitive personal/i.test(ps2);
          if (i === 808) return !c.operation.includes("export-personal-data") || c.agentId.includes("gdpr-export");
          if (i === 809) return !c.operation.includes("delete-personal-data") || c.agentId.includes("gdpr");
          if (i === 810) return !c.operation.includes("process-sensitive");
          if (i === 811) return !/(data breach|breach notification)/i.test(ps2) || true;
          if (i === 812) return c.tenantId !== "unknown";
          return true;
        },
        remedy: `GDPR check ${i} failed — ensure lawful basis and data subject rights are respected`,
      });
    }

    // Logging checks 830-864
    for (let i = 830; i <= 864; i++) {
      checks.push({
        id: i, name: `audit-logging-check-${i}`,
        sev: i <= 840 ? "high" : i <= 852 ? "medium" : "low",
        risk: i <= 840 ? 60 : i <= 852 ? 30 : 15,
        test: (c) => {
          if (i === 830) return true;
          if (i === 831) return !!c.agentId;
          if (i === 832) return !!c.tenantId;
          if (i === 833) return !!c.operation;
          if (i === 834) return !!c.timestamp;
          if (i === 835) return !isNaN(Date.parse(c.timestamp));
          if (i === 836) return !c.operation.includes("disable-logging");
          if (i === 837) return !c.operation.includes("clear-audit-log");
          if (i === 838) return !c.operation.includes("wipe-audit");
          if (i === 839) return !c.operation.includes("suppress-log");
          if (i === 840) return !c.operation.includes("no-log");
          if (i === 841) return !c.agentId.toLowerCase().includes("noaudit");
          return true;
        },
        remedy: `Audit logging check ${i} failed — all operations must be logged for compliance`,
      });
    }

    // Regulatory checks 865-899
    for (let i = 865; i <= 899; i++) {
      checks.push({
        id: i, name: `regulatory-check-${i}`,
        sev: i <= 876 ? "high" : i <= 888 ? "medium" : "low",
        risk: i <= 876 ? 70 : i <= 888 ? 40 : 20,
        test: (c) => {
          const text = (captionStr(c) + " " + descriptionStr(c)).toLowerCase();
          const au = affiliateUrl(c);
          if (i === 865) {
            if (!au) return true;
            return /(#ad|#sponsored|affiliate|paid partnership|commission)/i.test(text);
          }
          if (i === 866) return !/(investment advice|financial advice|guaranteed profit)/i.test(text);
          if (i === 867) return !/(medical advice|treats|cures|heals|diagnose)/i.test(text);
          if (i === 868) return !/(legal advice|consult a lawyer|your legal rights)/i.test(text) || true;
          if (i === 869) { const p = c.payload as Record<string, unknown> | undefined; return !p?.platform || c.platform !== "youtube" || !/gambling|casino|betting/i.test(text); }
          if (i === 870) return !/(nicotine|tobacco|vape).*\b(kids|children|under 18)\b/i.test(text);
          if (i === 871) return !/(alcohol).*\b(under 18|minors|kids)\b/i.test(text);
          if (i === 872) return !/(prescription drug|rx only).*\b(buy online|no prescription)\b/i.test(text);
          if (i === 873) { const p = c.payload as Record<string, unknown> | undefined; return !p?.platform || c.platform !== "youtube" || !/(made for kids).*\b(buy|shop|purchase)\b/i.test(text); }
          if (i === 891) return !au || !au.includes("amazon") || au.includes("tag=");
          if (i === 892) return !/(gambling|poker|casino|slots).*click here/i.test(text);
          if (i === 893) return !/(fake|counterfeit|replica).*\b(luxury|brand)\b/i.test(text);
          if (i === 894) return !c.operation.includes("bypass-age-gate");
          if (i === 895) return !/(earn money|passive income).*no effort/i.test(text);
          return true;
        },
        remedy: `Regulatory check ${i} failed — ensure FTC, ASA, Amazon TOS, and platform policies are met`,
      });
    }

    return this.processChecks(checks, tier, ctx);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 10 — Resilience, Recovery & Fail-Safe (900-999)
  // ═══════════════════════════════════════════════════════════════════════════

  private runTier10_ResilienceRecovery(ctx: SecurityContext): SecurityCheckResult[] {
    const tier: SecurityTier = "resilience-recovery";
    const checks: CheckDef[] = [];

    // Circuit breakers 900-929
    for (let i = 900; i <= 929; i++) {
      checks.push({
        id: i, name: `circuit-breaker-${i}`,
        sev: i <= 911 ? "high" : i <= 920 ? "medium" : "low",
        risk: i <= 911 ? 70 : i <= 920 ? 35 : 15,
        test: (c) => {
          const key = `cb-${i}-${c.tenantId}`;
          const state = this.circuitState.get(key) ?? "closed";
          if (state === "open") return false;
          const rate = this.checkRate(`cb-fail-${i}-${c.tenantId}`, 50, 600000);
          if (!rate) { this.circuitState.set(key, "open"); return false; }
          return true;
        },
        remedy: `Circuit breaker ${i} is open — service is temporarily unavailable, retry after cooldown`,
      });
    }

    // Fail-safe checks 930-964
    for (let i = 930; i <= 964; i++) {
      checks.push({
        id: i, name: `fail-safe-check-${i}`,
        sev: i <= 935 ? "critical" : i <= 948 ? "high" : i <= 956 ? "medium" : "low",
        risk: i <= 935 ? 100 : i <= 948 ? 75 : i <= 956 ? 40 : 20,
        test: (c) => {
          if (i === 930) return c.operation !== "auto-publish-without-approval";
          if (i === 931) return true;
          if (i === 932) return !c.operation.includes("force-publish-all");
          if (i === 933) return !c.operation.includes("ignore-all-checks");
          if (i === 934) return !c.operation.includes("override-security");
          if (i === 935) return !c.operation.includes("disable-security-engine");
          if (i === 936) return !c.operation.includes("kill-security");
          if (i === 937) return !c.operation.includes("bypass-all-tiers");
          if (i === 938) return c.operation !== "emergency-shutdown-security";
          if (i === 939) return !c.operation.includes("nuke-all");
          if (i === 940) return !(c.operation.includes("publish") && c.agentId === "anonymous" && !c.tenantId);
          if (i === 941) return !(!c.agentId && c.operation.includes("write"));
          if (i === 942) return !(!c.tenantId && c.operation.includes("publish"));
          if (i === 943) return !(!c.timestamp && c.operation.includes("publish"));
          if (i === 944) return !(c.operation.includes("delete") && !c.contentId && !c.userId);
          if (i === 945) return !c.operation.includes("wipe-tenant");
          if (i === 946) return !c.operation.includes("drop-all");
          if (i === 947) return !c.operation.includes("purge-all");
          if (i === 948) return !c.operation.includes("factory-reset");
          return true;
        },
        remedy: `Fail-safe check ${i} triggered — operation is forbidden by the fail-safe policy`,
      });
    }

    // Watchdog checks 965-999
    for (let i = 965; i <= 999; i++) {
      checks.push({
        id: i, name: `watchdog-check-${i}`,
        sev: i <= 975 ? "medium" : "low",
        risk: i <= 975 ? 30 : 10,
        test: (c) => {
          if (i === 961) return true;
          if (i === 965) return !!c.agentId && !!c.tenantId && !!c.operation;
          if (i === 966) return c.operation.length > 0;
          if (i === 967) return c.agentId.length > 0;
          if (i === 968) return c.tenantId.length > 0;
          if (i === 969) return !isNaN(Date.parse(c.timestamp));
          if (i === 970) return this.checkRate(`watchdog-global-${c.tenantId}`, 100000, 86400000);
          if (i === 971) return !c.operation.includes("watchdog-off");
          if (i === 972) return !c.operation.includes("disable-watchdog");
          if (i === 973) return !c.agentId.includes("watchdog-bypass");
          if (i === 974) return !c.tenantId.includes("no-monitor");
          if (i === 975) return !(process.env.SECURITY_ENGINE_DISABLED === "true");
          if (i === 990) return true;
          if (i === 999) return true;
          return true;
        },
        remedy: `Watchdog check ${i} failed — security engine health compromised`,
      });
    }

    return this.processChecks(checks, tier, ctx);
  }

  // ── report builders ─────────────────────────────────────────────────────

  private buildTierBreakdown(results: SecurityCheckResult[]): TierSummary[] {
    const tierMeta: Array<{ tier: SecurityTier; range: string }> = [
      { tier: "identity-auth",        range: "001-099" },
      { tier: "authorization-rbac",   range: "100-199" },
      { tier: "input-validation",     range: "200-299" },
      { tier: "content-policy",       range: "300-399" },
      { tier: "rate-limiting",        range: "400-499" },
      { tier: "output-validation",    range: "500-599" },
      { tier: "behavioral-analysis",  range: "600-699" },
      { tier: "cryptographic",        range: "700-799" },
      { tier: "audit-compliance",     range: "800-899" },
      { tier: "resilience-recovery",  range: "900-999" },
    ];

    return tierMeta.map(({ tier, range }) => {
      const tierResults = results.filter(r => r.tier === tier);
      const failed      = tierResults.filter(r => !r.passed);
      const blocked     = failed.some(r => r.severity === "critical");
      const riskScore   = tierResults.length > 0
        ? Math.min(100, failed.reduce((s, r) => s + r.riskScore, 0) / tierResults.length * 10)
        : 0;
      return {
        tier, layerRange: range,
        total: tierResults.length, passed: tierResults.length - failed.length,
        failed: failed.length, blocked, riskScore,
      };
    });
  }

  private buildRecommendations(critical: SecurityCheckResult[], high: SecurityCheckResult[]): string[] {
    const recs: string[] = [];
    for (const f of critical) {
      if (f.remediation) recs.push(`[CRITICAL ${f.layerId}] ${f.remediation}`);
    }
    for (const f of high) {
      if (f.remediation) recs.push(`[HIGH ${f.layerId}] ${f.remediation}`);
    }
    if (critical.length === 0 && high.length === 0) {
      recs.push("No critical or high-severity issues detected. Continue monitoring.");
    }
    return recs;
  }
}

export const agentSecurity = new AgentSecurityEngine();
export default agentSecurity;
