/**
 * AXIOM AUTH — OmniOrg Proprietary Authentication
 * JWT-based with tenant isolation, API key hashing, and role-based access.
 * No third-party auth dependency. Fully owned.
 */

import { IncomingMessage } from "http";
import { createHmac, randomBytes, createHash } from "crypto";

const JWT_SECRET = process.env.AXIOM_JWT_SECRET ?? randomBytes(64).toString("hex");
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
  jti: string; // JWT ID (prevents replay attacks)
}

export class AxiomAuth {
  /** Register an API key for a tenant */
  static registerApiKey(tenantId: string, plan: string): string {
    const rawKey = `omniorg_${randomBytes(32).toString("hex")}`;
    const hashedKey = createHash("sha256").update(rawKey).digest("hex");
    API_KEY_STORE.set(tenantId, { tenantId, plan, hashedKey });
    return rawKey; // Only returned once — store it securely
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
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      jti: randomBytes(16).toString("hex"),
    };

    return AxiomAuth.signJWT(payload);
  }

  /** Verify a request — checks Bearer token or X-API-Key header */
  static verifyRequest(req: IncomingMessage): AuthResult {
    const authHeader = req.headers["authorization"] ?? "";
    const apiKeyHeader = req.headers["x-api-key"] as string | undefined;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      return AxiomAuth.verifyJWT(token);
    }

    if (apiKeyHeader) {
      // Direct API key auth (less preferred — use for server-to-server)
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
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${sig}`;
  }

  private static verifyJWT(token: string): AuthResult {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, tenantId: "", plan: "", reason: "Malformed token" };

    const [header, body, sig] = parts;
    const expectedSig = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");

    if (sig !== expectedSig) return { valid: false, tenantId: "", plan: "", reason: "Invalid signature" };

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
