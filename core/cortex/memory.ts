// Created by BBMW0 Technologies | bbmw0.com
/**
 * CORTEX MEMORY ARCHITECTURE: OmniOrg Proprietary
 *
 * 3-layer cognitive memory system.
 * No other agent framework implements memory at this level.
 *
 * Layer 1: WORKING MEMORY
 *   Active context for the current task. Fast, volatile.
 *   Analogous to RAM. Cleared when task completes.
 *
 * Layer 2: EPISODIC MEMORY
 *   Records of past interactions, decisions, and outcomes.
 *   Survives sessions. Used for learning from experience.
 *   "I handled a similar legal contract request for TechCorp in March..."
 *
 * Layer 3: SEMANTIC MEMORY
 *   Accumulated factual knowledge, domain expertise, and collective learning.
 *   Shared across agents (with tenant isolation).
 *   "GDPR Article 17 requires data erasure within 30 days..."
 *
 * COLLECTIVE INTELLIGENCE: When an agent produces high-confidence output,
 * key facts are promoted to Semantic Memory and become available to all agents.
 */

export interface WorkingMemoryEntry {
  key: string;
  value: unknown;
  agentId: string;
  taskId: string;
  createdAt: string;
  accessCount: number;
}

export interface EpisodicMemoryEntry {
  episodeId: string;
  tenantId: string;
  agentId: string;
  agentRole: string;
  taskDescription: string;
  taskOutcome: "success" | "partial" | "failure";
  keyInsights: string[];
  confidenceScore: number;
  durationMs: number;
  createdAt: string;
  tags: string[];
}

export interface SemanticMemoryEntry {
  factId: string;
  tenantId: string | "global"; // global = shared across all tenants
  domain: string;
  fact: string;
  confidence: number;
  sourceAgentIds: string[];
  verificationCount: number;  // how many agents have confirmed this
  createdAt: string;
  lastVerifiedAt: string;
  expiresAt?: string;         // some facts become stale
}

export class CortexMemory {
  private working = new Map<string, WorkingMemoryEntry>();
  private episodic: EpisodicMemoryEntry[] = [];
  private semantic: SemanticMemoryEntry[] = [];

  // ── WORKING MEMORY ──────────────────────────────────────────────────────────

  setWorking(key: string, value: unknown, agentId: string, taskId: string): void {
    const existing = this.working.get(key);
    this.working.set(key, {
      key, value, agentId, taskId,
      createdAt: new Date().toISOString(),
      accessCount: existing ? existing.accessCount : 0,
    });
  }

  getWorking(key: string): unknown | undefined {
    const entry = this.working.get(key);
    if (entry) {
      entry.accessCount++;
      return entry.value;
    }
    return undefined;
  }

  clearWorking(taskId: string): void {
    for (const [key, entry] of this.working.entries()) {
      if (entry.taskId === taskId) this.working.delete(key);
    }
  }

  // ── EPISODIC MEMORY ─────────────────────────────────────────────────────────

  recordEpisode(episode: Omit<EpisodicMemoryEntry, "episodeId">): string {
    const episodeId = `ep-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    this.episodic.push({ ...episode, episodeId });

    // Auto-promote high-confidence insights to semantic memory
    if (episode.confidenceScore > 0.85) {
      episode.keyInsights.forEach(insight => {
        this.promoteFact({
          tenantId: episode.tenantId,
          domain: episode.agentRole,
          fact: insight,
          confidence: episode.confidenceScore,
          sourceAgentIds: [episode.agentId],
        });
      });
    }
    return episodeId;
  }

  recallEpisodes(
    tenantId: string,
    filters: { agentId?: string; tags?: string[]; minConfidence?: number; limit?: number }
  ): EpisodicMemoryEntry[] {
    return this.episodic
      .filter(e => e.tenantId === tenantId)
      .filter(e => !filters.agentId || e.agentId === filters.agentId)
      .filter(e => !filters.minConfidence || e.confidenceScore >= filters.minConfidence)
      .filter(e => !filters.tags?.length || filters.tags.some(t => e.tags.includes(t)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, filters.limit ?? 20);
  }

  // ── SEMANTIC MEMORY ─────────────────────────────────────────────────────────

  promoteFact(partial: Omit<SemanticMemoryEntry, "factId" | "verificationCount" | "createdAt" | "lastVerifiedAt">): string {
    // Check if similar fact already exists: if so, strengthen it
    const existing = this.semantic.find(
      f => f.tenantId === partial.tenantId &&
           f.fact.toLowerCase().includes(partial.fact.toLowerCase().slice(0, 40))
    );

    if (existing) {
      existing.verificationCount++;
      existing.confidence = Math.min(1, (existing.confidence + partial.confidence) / 2 + 0.05);
      existing.lastVerifiedAt = new Date().toISOString();
      existing.sourceAgentIds = Array.from(new Set([...existing.sourceAgentIds, ...partial.sourceAgentIds]));
      return existing.factId;
    }

    const factId = `fact-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const now = new Date().toISOString();
    this.semantic.push({
      ...partial,
      factId,
      verificationCount: 1,
      createdAt: now,
      lastVerifiedAt: now,
    });
    return factId;
  }

  querySemanticMemory(
    tenantId: string,
    query: string,
    domain?: string,
    limit = 10
  ): SemanticMemoryEntry[] {
    const queryLower = query.toLowerCase();
    return this.semantic
      .filter(f => f.tenantId === tenantId || f.tenantId === "global")
      .filter(f => !domain || f.domain.toLowerCase().includes(domain.toLowerCase()))
      .filter(f => f.fact.toLowerCase().includes(queryLower.slice(0, 30)))
      .filter(f => !f.expiresAt || new Date(f.expiresAt) > new Date())
      .sort((a, b) => (b.confidence * b.verificationCount) - (a.confidence * a.verificationCount))
      .slice(0, limit);
  }

  // ── COLLECTIVE LEARNING BROADCAST ───────────────────────────────────────────

  broadcastLearning(fact: string, domain: string, agentId: string, confidence: number): void {
    this.promoteFact({
      tenantId: "global",
      domain,
      fact,
      confidence,
      sourceAgentIds: [agentId],
    });
  }

  // ── MEMORY STATS ────────────────────────────────────────────────────────────

  getStats() {
    return {
      working:  this.working.size,
      episodic: this.episodic.length,
      semantic: this.semantic.length,
      globalFacts: this.semantic.filter(f => f.tenantId === "global").length,
    };
  }
}

// Singleton: shared across all agents in the runtime
export const globalMemory = new CortexMemory();
export default CortexMemory;
