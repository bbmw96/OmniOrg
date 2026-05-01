/**
 * OMNIORG MULTI-TENANT MODEL
 *
 * Any company, any size. They start with a plan, expand when ready.
 * The 900 agents exist for everyone: companies just unlock more over time.
 *
 * Plans:
 *  SOLO      → 1 user, 10 agents (free tier)
 *  STARTER   → 5 users, 50 agents ($99/mo)
 *  GROWTH    → 20 users, 150 agents ($499/mo)
 *  BUSINESS  → 100 users, 350 agents ($1499/mo)
 *  SCALE     → 500 users, 600 agents ($3999/mo)
 *  ENTERPRISE→ Unlimited, all 900+ agents, custom SLA ($9999/mo+)
 */

import { randomBytes, createHash } from "crypto";
import { AxiomAuth } from "../api/auth/axiom-auth";
import { AGENT_REGISTRY } from "../agents/registry/agent-registry";

export type TenantPlan = "solo" | "starter" | "growth" | "business" | "scale" | "enterprise";

export interface TenantUsage {
  tasksThisMonth: number;
  tokensThisMonth: number;
  agentCallsThisMonth: number;
  lastTaskAt?: string;
}

export interface Tenant {
  tenantId: string;
  companyName: string;
  email: string;
  plan: TenantPlan;
  apiKey: string;           // stored hashed in auth, raw given once at registration
  unlockedAgentIds: string[];
  subscribedPackages: string[];
  maxUsers: number;
  usage: TenantUsage;
  webhookUrl?: string;      // where to POST async results
  preferredLanguage: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

// ── PLAN DEFINITIONS ──────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<TenantPlan, { maxUsers: number; maxAgents: number; tasksPerMonth: number; tokensPerMonth: number }> = {
  solo:       { maxUsers: 1,         maxAgents: 10,  tasksPerMonth: 50,      tokensPerMonth: 100_000 },
  starter:    { maxUsers: 5,         maxAgents: 50,  tasksPerMonth: 500,     tokensPerMonth: 1_000_000 },
  growth:     { maxUsers: 20,        maxAgents: 150, tasksPerMonth: 2000,    tokensPerMonth: 5_000_000 },
  business:   { maxUsers: 100,       maxAgents: 350, tasksPerMonth: 10_000,  tokensPerMonth: 20_000_000 },
  scale:      { maxUsers: 500,       maxAgents: 600, tasksPerMonth: 50_000,  tokensPerMonth: 100_000_000 },
  enterprise: { maxUsers: Infinity,  maxAgents: 999, tasksPerMonth: Infinity, tokensPerMonth: Infinity },
};

// Default agents per plan (always includes C-Suite leadership layer)
const PLAN_DEFAULT_AGENT_IDS: Record<TenantPlan, string[]> = {
  solo:       ["ceo-001", "cto-001", "eng-fe-001", "eng-be-001", "cre-ux-001",
                "law-corp-001", "fin-ib-001", "sci-mat-001", "med-gp-001", "cre-cpy-001"],
  starter:    [], // resolved dynamically: first 50 by score
  growth:     [], // first 150
  business:   [], // first 350
  scale:      [], // first 600
  enterprise: [], // all
};

// ── TENANT MANAGER ────────────────────────────────────────────────────────────

const tenantStore = new Map<string, Tenant>();

export class TenantManager {

  static create(params: { companyName: string; email: string; plan?: TenantPlan; country?: string; language?: string }): Tenant & { apiKey: string } {
    const plan = params.plan ?? "starter";
    const tenantId = `tenant-${createHash("sha256").update(params.email + Date.now()).digest("hex").slice(0, 16)}`;
    const limits = PLAN_LIMITS[plan];

    // Assign initial agent access
    const allAgents = AGENT_REGISTRY.getAllAgents();
    const sortedByTier = [...allAgents].sort((a, b) => (a.tier ?? 5) - (b.tier ?? 5));
    const defaultIds = PLAN_DEFAULT_AGENT_IDS[plan].length > 0
      ? PLAN_DEFAULT_AGENT_IDS[plan]
      : sortedByTier.slice(0, limits.maxAgents).map(a => a.id);

    // Generate API key
    const rawApiKey = AxiomAuth.registerApiKey(tenantId, plan);

    const tenant: Tenant = {
      tenantId,
      companyName: params.companyName,
      email: params.email,
      plan,
      apiKey: rawApiKey, // stored raw here: in production, hash before storing to DB
      unlockedAgentIds: defaultIds,
      subscribedPackages: [],
      maxUsers: limits.maxUsers,
      usage: { tasksThisMonth: 0, tokensThisMonth: 0, agentCallsThisMonth: 0 },
      webhookUrl: undefined,
      preferredLanguage: params.language ?? "en",
      country: params.country,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tenantStore.set(tenantId, tenant);
    console.log(`[TenantManager] Created tenant ${tenantId} (${plan}): ${defaultIds.length} agents unlocked`);
    return tenant;
  }

  static get(tenantId: string): Tenant | undefined {
    return tenantStore.get(tenantId);
  }

  static expandAgents(
    tenantId: string,
    criteria: { agentIds?: string[]; department?: string; tier?: number }
  ): { added: number; total: number; newAgentIds: string[] } {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) return { added: 0, total: 0, newAgentIds: [] };

    const limits = PLAN_LIMITS[tenant.plan];
    const allAgents = AGENT_REGISTRY.getAllAgents();

    let candidates = allAgents.filter(a => !tenant.unlockedAgentIds.includes(a.id));
    if (criteria.agentIds?.length)  candidates = candidates.filter(a => criteria.agentIds!.includes(a.id));
    if (criteria.department)        candidates = candidates.filter(a => a.department === criteria.department);
    if (criteria.tier)              candidates = candidates.filter(a => a.tier === criteria.tier);

    const canAdd = limits.maxAgents - tenant.unlockedAgentIds.length;
    const toAdd = candidates.slice(0, Math.max(0, canAdd)).map(a => a.id);

    tenant.unlockedAgentIds = [...new Set([...tenant.unlockedAgentIds, ...toAdd])];
    tenant.updatedAt = new Date().toISOString();

    return { added: toAdd.length, total: tenant.unlockedAgentIds.length, newAgentIds: toAdd };
  }

  static subscribeToPackage(tenantId: string, packageId: string): { success: boolean; agentsAdded: number; message: string } {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) return { success: false, agentsAdded: 0, message: "Tenant not found" };
    if (tenant.subscribedPackages.includes(packageId)) {
      return { success: false, agentsAdded: 0, message: "Already subscribed to this package" };
    }

    const PACKAGE_DEPARTMENTS: Record<string, string[]> = {
      "engineering-suite": ["Engineering"],
      "legal-suite":       ["Legal"],
      "finance-suite":     ["Finance"],
      "medical-suite":     ["Medicine"],
      "science-suite":     ["Science"],
      "creative-suite":    ["Creative"],
      "csuite-pack":       ["Executive"],
      "full-org":          [], // all departments
    };

    const depts = PACKAGE_DEPARTMENTS[packageId];
    if (depts === undefined) return { success: false, agentsAdded: 0, message: "Unknown package" };

    const allAgents = AGENT_REGISTRY.getAllAgents();
    const newIds = allAgents
      .filter(a => depts.length === 0 || depts.includes(a.department ?? ""))
      .filter(a => !tenant.unlockedAgentIds.includes(a.id))
      .map(a => a.id);

    tenant.unlockedAgentIds = [...new Set([...tenant.unlockedAgentIds, ...newIds])];
    tenant.subscribedPackages.push(packageId);
    if (packageId === "full-org") tenant.plan = "enterprise";
    tenant.updatedAt = new Date().toISOString();

    return { success: true, agentsAdded: newIds.length, message: `Package "${packageId}" activated. ${newIds.length} new agents unlocked.` };
  }

  static recordUsage(tenantId: string, tokens: number, agentCalls: number): void {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) return;
    tenant.usage.tasksThisMonth++;
    tenant.usage.tokensThisMonth += tokens;
    tenant.usage.agentCallsThisMonth += agentCalls;
    tenant.usage.lastTaskAt = new Date().toISOString();
  }

  static upgradePlan(tenantId: string, newPlan: TenantPlan): void {
    const tenant = tenantStore.get(tenantId);
    if (!tenant) return;
    tenant.plan = newPlan;
    tenant.maxUsers = PLAN_LIMITS[newPlan].maxUsers;
    // Unlock more agents up to new plan limit
    TenantManager.expandAgents(tenantId, {});
    tenant.updatedAt = new Date().toISOString();
  }

  static getAllTenants(): Tenant[] {
    return Array.from(tenantStore.values());
  }
}

export default TenantManager;
