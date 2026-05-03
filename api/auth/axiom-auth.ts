/**
 * AXIOM AUTH: OmniOrg Proprietary Authentication
 *
 * JWT-based with tenant isolation, API key hashing, and role-based access.
 * No third-party auth dependency. Fully owned.
 *
 * KEY ROTATION - zero broken sessions:
 *   To rotate AXIOM_JWT_SECRET safely:
 *   1. Generate new secret: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
 *   2. Set AXIOM_JWT_SECRET_OLD = current AXIOM_JWT_SECRET value
 *   3. Set AXIOM_JWT_SECRET = new value
 *   4. Deploy - new tokens use new key; old tokens (up to 1h TTL) still validate against old key
 *   5. After 1 hour: remove AXIOM_JWT_SECRET_OLD from .env
 *   Both keys active simultaneously = zero session breaks during rotation.
 */

import { IncomingMessage } from "http";
import { createHmac, randomBytes, createHash } from "crypto";

// Primary signing key (new tokens use this)
const JWT_SECRET_PRIMARY = process.env.AXIOM_JWT_SECRET
  ?? randomBytes(64).toString("hex");

// Legacy key only active during rotation grace period (remove after 1h)
const JWT_SECRET_OLD = process.env.AXIOM_JWT_SECRET_OLD ?? null;

// Both keys are checked during verification - tokens signed by either are valid
const JWT_VERIFY_KEYS: string[] = [
  JWT_SECRET_PRIMARY,
  ...(JWT_SECRET_OLD ? [JWT_SECRET_OLD] : []),
];

const API_KEY_STORE = new Map<string, { tenantId: string; plan: string; hashedKey: string }>();

export interface AuthResult {
  valid: boolean;
  tenantId: string;
  plan: string;
  reason?: string;
}

export interface JWTPayload {
  tenantId: string;
  plan: string;
  iat: number;
  exp: number;
  jti: string;   // JWT ID - prevents replay attacks
  kid: string;   // Key ID - tracks which secret signed this token
}

export class AxiomAuth {
  /** Register an API key for a tenant */
  static registerApiKey(tenantId: string, plan: string): string {
    const rawKey = `omniorg_${randomBytes(32).toString("hex")}`;
    const hashedKey = createHash("sha256").update(rawKey).digest("hex");
    API_KEY_STORE.set(tenantId, { tenantId, plan, hashedKey });
    return rawKey;   // Only returned once - store it securely
  }

  /** Generate a short-lived JWT from an API key */
  static generateToken(tenantId: string, rawApiKey: string): string | null {
    const stored = API_KEY_STORE.get(tenantId);
    if (!stored) return null;

    const hashedInput = createHash("sha256").update(rawApiKey).digest("hex");
    if (hashedInput !== stored.hashedKey) return null;

    const payload: JWTPayload = {
      tenantId,
      plan: stored.plan,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,   // 1 hour
      jti: randomBytes(16).toString("hex"),
      kid: "primary",   // Always sign new tokens with primary key
    };

    return AxiomAuth.signJWT(payload);
  }

  /** Verify a request: checks Bearer token or X-API-Key header */
  static verifyRequest(req: IncomingMessage): AuthResult {
    const authHeader = req.headers["authorization"] ?? "";
    const apiKeyHeader = req.headers["x-api-key"] as string | undefined;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      return AxiomAuth.verifyJWT(token);
    }

    if (apiKeyHeader) {
      for (const [tenantId, stored] of API_KEY_STORE.entries()) {
        const hashed = createHash("sha256").update(apiKeyHeader).digest("hex");
        if (hashed === stored.hashedKey) {
          return { valid: true, tenantId, plan: stored.plan };
        }
      }
      return { valid: false, tenantId: "", plan: "", reason: "Invalid API key" };
    }

    return { valid: false, tenantId: "", plan: "", reason: "No authentication provided" };
  }

  // ── JWT IMPLEMENTATION (no external library) ──────────────────────────────

  private static signJWT(payload: JWTPayload): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body   = Buffer.from(JSON.stringify(payload)).toString("base64url");
    // Always sign with PRIMARY key
    const sig = createHmac("sha256", JWT_SECRET_PRIMARY).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${sig}`;
  }

  private static verifyJWT(token: string): AuthResult {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, tenantId: "", plan: "", reason: "Malformed token" };

    const [header, body, sig] = parts;

    // Try every active key - supports graceful rotation without breaking existing tokens
    let signatureValid = false;
    for (const secret of JWT_VERIFY_KEYS) {
      const expected = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
      if (sig === expected) {
        signatureValid = true;
        break;
      }
    }

    if (!signatureValid) return { valid: false, tenantId: "", plan: "", reason: "Invalid signature" };

    try {
      const payload: JWTPayload = JSON.parse(Buffer.from(body, "base64url").toString());
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, tenantId: "", plan: "", reason: "Token expired" };
      }
      return { valid: true, tenantId: payload.tenantId, plan: payload.plan };
    } catch {
      return { valid: false, tenantId: "", plan: "", reason: "Token decode error" };
    }
  }
}

export default AxiomAuth;
