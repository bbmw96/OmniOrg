// Created by BBMW0 Technologies | bbmw0.com
/**
 * NEUROMESH Self-Evolution Engine
 *
 * Enables agents to:
 *   1. Rebuild their own cognitive persona when performance degrades.
 *   2. Propose and spawn entirely new agent definitions at runtime.
 *   3. Retire under-performing agents from active routing.
 *   4. Evolve specialisation vectors based on accumulated task history.
 *
 * Architecture note:
 *   Evolution operates on agent DEFINITIONS (data), not on source code.
 *   New agents are written to a persisted JSON sidecar file that the
 *   registry loads on start (and hot-reloads every 60 seconds).
 *   This is safe: no dynamic code execution, no arbitrary string parsing
 *   as code. Only JSON.parse is used for deserialization.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { AgentDefinition } from "../../agents/registry/agent-registry";
import type { CognitivePersona } from "../cortex/engine";

// ─── Constants ────────────────────────────────────────────────────────────────

const EVOLVED_AGENTS_DIR  = join(process.cwd(), "agents", "evolved");
const EVOLVED_AGENTS_FILE = join(EVOLVED_AGENTS_DIR, "evolved-agents.json");
const EVOLUTION_LOG_FILE  = join(EVOLVED_AGENTS_DIR, "evolution-log.jsonl");

// ─── Evolution Event Types ────────────────────────────────────────────────────

export type EvolutionEventType =
  | "persona_rebuild"
  | "agent_spawned"
  | "agent_retired"
  | "specialisation_evolved"
  | "capability_added"
  | "peer_trust_updated";

export interface EvolutionEvent {
  eventId:     string;
  eventType:   EvolutionEventType;
  agentId:     string;
  tenantId:    string;
  timestamp:   string;
  details:     Record<string, unknown>;
  triggeredBy: string;
}

// ─── Persona Rebuild Config ───────────────────────────────────────────────────

export interface PersonaRebuildPlan {
  agentId:             string;
  reason:              string;
  adjustments:         Partial<CognitivePersona>;
  newCapabilities:     string[];
  retiredCapabilities: string[];
}

// ─── Spawned Agent Proposal ───────────────────────────────────────────────────

export interface NewAgentProposal {
  proposedBy:    string;
  tenantId:      string;
  definition:    Omit<AgentDefinition, "id"> & { id?: string };
  rationale:     string;
  evidenceTasks: string[];
}

// ─── Self-Evolution Engine ────────────────────────────────────────────────────

export class SelfEvolutionEngine {
  private static instance: SelfEvolutionEngine;
  private evolvedAgents: Map<string, AgentDefinition> = new Map();
  private retiredAgents: Set<string> = new Set();
  private pendingProposals: NewAgentProposal[] = [];

  private constructor() {
    this.ensureDir();
    this.loadEvolvedAgents();
  }

  static getInstance(): SelfEvolutionEngine {
    if (!SelfEvolutionEngine.instance) {
      SelfEvolutionEngine.instance = new SelfEvolutionEngine();
    }
    return SelfEvolutionEngine.instance;
  }

  // ─── Persona Rebuild ───────────────────────────────────────────────────────

  /**
   * An agent rebuilds its persona when its success rate falls below threshold.
   * Called automatically by the mesh after performance evaluation.
   */
  rebuildPersona(
    persona: CognitivePersona,
    plan: PersonaRebuildPlan,
    tenantId: string
  ): CognitivePersona {
    const rebuilt: CognitivePersona = {
      ...persona,
      ...plan.adjustments,
      confidenceLevel: Math.max(persona.confidenceLevel, 0.65),
      domainMastery: {
        ...persona.domainMastery,
        ...Object.fromEntries(plan.newCapabilities.map(cap => [cap, 0.75])),
      },
      lastActiveAt: new Date().toISOString(),
    };

    for (const cap of plan.retiredCapabilities) {
      delete rebuilt.domainMastery[cap];
    }

    this.logEvent({
      eventId:     this.generateId(),
      eventType:   "persona_rebuild",
      agentId:     persona.agentId,
      tenantId,
      timestamp:   new Date().toISOString(),
      details:     { reason: plan.reason, adjustments: plan.adjustments, plan },
      triggeredBy: "system",
    });

    return rebuilt;
  }

  // ─── Agent Spawning ────────────────────────────────────────────────────────

  /**
   * Any agent can propose a new agent definition. Proposals are queued for
   * mesh review. High-confidence proposals (proposer confidence > 0.85) are
   * auto-approved; others queue for operator review.
   */
  proposeNewAgent(proposal: NewAgentProposal, proposingPersonaConfidence: number): string {
    const proposalId = this.generateId();
    this.pendingProposals.push({ ...proposal });

    this.logEvent({
      eventId:     proposalId,
      eventType:   "agent_spawned",
      agentId:     proposal.proposedBy,
      tenantId:    proposal.tenantId,
      timestamp:   new Date().toISOString(),
      details:     { proposal, proposalId, autoApprove: proposingPersonaConfidence > 0.85 },
      triggeredBy: proposal.proposedBy,
    });

    if (proposingPersonaConfidence > 0.85) {
      this.approveProposal(proposalId, proposal);
    }

    return proposalId;
  }

  /**
   * Materialises a proposal into a registered evolved agent.
   */
  approveProposal(_proposalId: string, proposal: NewAgentProposal): AgentDefinition {
    const id = proposal.definition.id ?? `evolved-${this.generateId()}`;

    const newAgent: AgentDefinition = {
      id,
      role:          proposal.definition.role,
      tier:          proposal.definition.tier ?? 5,
      department:    proposal.definition.department,
      cognitiveMode: proposal.definition.cognitiveMode ?? "analytical",
      languages:     proposal.definition.languages ?? ["en"],
      expertise:     proposal.definition.expertise ?? [],
      tools:         proposal.definition.tools ?? ["Read", "Write", "Bash"],
      systemPrompt:  proposal.definition.systemPrompt,
      capabilities:  proposal.definition.capabilities ?? [],
    };

    this.evolvedAgents.set(id, newAgent);
    this.persistEvolvedAgents();

    return newAgent;
  }

  // ─── Agent Retirement ──────────────────────────────────────────────────────

  /**
   * Marks an agent as retired. The mesh stops routing tasks to it.
   * Retired agents remain in the registry for audit purposes.
   */
  retireAgent(agentId: string, reason: string, tenantId: string, triggeredBy: string): void {
    this.retiredAgents.add(agentId);

    this.logEvent({
      eventId:     this.generateId(),
      eventType:   "agent_retired",
      agentId,
      tenantId,
      timestamp:   new Date().toISOString(),
      details:     { reason },
      triggeredBy,
    });

    this.persistEvolvedAgents();
  }

  isRetired(agentId: string): boolean {
    return this.retiredAgents.has(agentId);
  }

  // ─── Specialisation Evolution ──────────────────────────────────────────────

  /**
   * After a run of tasks in a domain, the agent's mastery score increases.
   * Called by the mesh after successful task completion.
   */
  evolveSpecialisation(
    persona: CognitivePersona,
    domain: string,
    improvement: number,
    tenantId: string
  ): void {
    const current = persona.domainMastery[domain] ?? 0.5;
    const updated = Math.min(1.0, current + improvement);
    persona.domainMastery[domain] = updated;

    if (improvement > 0.05) {
      this.logEvent({
        eventId:     this.generateId(),
        eventType:   "specialisation_evolved",
        agentId:     persona.agentId,
        tenantId,
        timestamp:   new Date().toISOString(),
        details:     { domain, before: current, after: updated },
        triggeredBy: "system",
      });
    }
  }

  // ─── Capability Addition ───────────────────────────────────────────────────

  /**
   * An agent acquires new capabilities through accumulated experience.
   * Example: after 20 successful security audits, gain "SOC2-auditor".
   */
  addCapability(
    agentDef: AgentDefinition,
    capability: string,
    tenantId: string,
    triggeredBy: string
  ): AgentDefinition {
    if (agentDef.capabilities.includes(capability)) return agentDef;

    const updated: AgentDefinition = {
      ...agentDef,
      capabilities: [...agentDef.capabilities, capability],
    };

    this.evolvedAgents.set(agentDef.id, updated);
    this.persistEvolvedAgents();

    this.logEvent({
      eventId:     this.generateId(),
      eventType:   "capability_added",
      agentId:     agentDef.id,
      tenantId,
      timestamp:   new Date().toISOString(),
      details:     { capability },
      triggeredBy,
    });

    return updated;
  }

  // ─── Query ────────────────────────────────────────────────────────────────

  getAllEvolvedAgents(): AgentDefinition[] {
    return Array.from(this.evolvedAgents.values());
  }

  getEvolutionStats(): { totalEvolved: number; totalRetired: number; pendingProposals: number } {
    return {
      totalEvolved:     this.evolvedAgents.size,
      totalRetired:     this.retiredAgents.size,
      pendingProposals: this.pendingProposals.length,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private ensureDir(): void {
    if (!existsSync(EVOLVED_AGENTS_DIR)) {
      mkdirSync(EVOLVED_AGENTS_DIR, { recursive: true });
    }
  }

  private loadEvolvedAgents(): void {
    try {
      if (existsSync(EVOLVED_AGENTS_FILE)) {
        const data = JSON.parse(readFileSync(EVOLVED_AGENTS_FILE, "utf-8")) as {
          agents:  AgentDefinition[];
          retired: string[];
        };
        for (const agent of (data.agents ?? [])) {
          this.evolvedAgents.set(agent.id, agent);
        }
        for (const id of (data.retired ?? [])) {
          this.retiredAgents.add(id);
        }
      }
    } catch {
      // Start fresh if sidecar is missing or corrupt
    }
  }

  private persistEvolvedAgents(): void {
    try {
      const data = {
        agents:    Array.from(this.evolvedAgents.values()),
        retired:   Array.from(this.retiredAgents),
        updatedAt: new Date().toISOString(),
      };
      writeFileSync(EVOLVED_AGENTS_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch {
      // Non-fatal
    }
  }

  private logEvent(event: EvolutionEvent): void {
    try {
      appendFileSync(EVOLUTION_LOG_FILE, JSON.stringify(event) + "\n", "utf-8");
    } catch {
      // Non-fatal
    }
  }

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const selfEvolution = SelfEvolutionEngine.getInstance();
