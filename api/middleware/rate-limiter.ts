/**
 * AXIOM Rate Limiter — sliding window per tenant
 */
const windows = new Map<string, { count: number; resetAt: number }>();

const PLAN_LIMITS: Record<string, number> = {
  solo: 10, starter: 60, growth: 200, business: 600, scale: 2000, enterprise: 10000
};

export class RateLimiter {
  static check(tenantId: string, plan: string): { allowed: boolean; limit: number; resetAt: number } {
    const limit = PLAN_LIMITS[plan] ?? 60;
    const now = Date.now();
    const key = tenantId;
    const window = windows.get(key);

    if (!window || now > window.resetAt) {
      windows.set(key, { count: 1, resetAt: now + 60_000 });
      return { allowed: true, limit, resetAt: now + 60_000 };
    }

    if (window.count >= limit) {
      return { allowed: false, limit, resetAt: window.resetAt };
    }

    window.count++;
    return { allowed: true, limit, resetAt: window.resetAt };
  }
}
