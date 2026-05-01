// Created by BBMW0 Technologies | bbmw0.com
/**
 * SYNAPSE PROTOCOL — OmniOrg Proprietary Inter-Agent Communication
 *
 * Unlike LangGraph (fixed edges) or CrewAI (sequential pipelines),
 * SYNAPSE uses typed semantic contracts. Every message has:
 *  - A cognitive signature (what type of thinking is needed)
 *  - A confidence vector (how certain the sender is)
 *  - A semantic embedding slot (for intelligent routing)
 *  - A provenance chain (full audit of who said what)
 *  - An urgency/priority score
 *
 * Agents don't "call" each other — they EMIT signals into the mesh.
 * The mesh decides who receives them based on semantic matching.
 */

export type CognitiveMode =
  | "analytical"   // logical reasoning, data analysis
  | "creative"     // ideation, design, writing
  | "critical"     // review, challenge, adversarial
  | "synthetic"    // combining multiple inputs
  | "executive"    // decision-making, strategy
  | "empathic"     // human-facing, emotional intelligence
  | "forensic"     // deep investigation, root cause
  | "predictive"   // forecasting, modelling
  | "operational"  // execution, implementation
  | "guardian";    // security, compliance, risk

export type SignalType =
  | "TASK_EMIT"         // New task entering the mesh
  | "TASK_FRAGMENT"     // Sub-task split for parallel processing
  | "AGENT_RESPONSE"    // Agent completed work
  | "PEER_CHALLENGE"    // Agent challenging another's output
  | "SYNTHESIS_REQUEST" // Asking for outputs to be unified
  | "MEMORY_STORE"      // Persist to long-term memory
  | "MEMORY_RECALL"     // Retrieve from memory layers
  | "ESCALATION"        // Needs higher-tier agent
  | "HANDOFF"           // Transfer context to another agent
  | "HEARTBEAT"         // Agent health signal
  | "CIRCUIT_OPEN"      // Agent reporting failure
  | "HOT_RELOAD"        // Agent definition updated
  | "TENANT_ISOLATE"    // Enforce tenant boundary
  | "AUDIT_LOG"         // Compliance record
  | "COLLECTIVE_LEARN"; // Broadcast learning to all agents

export interface ConfidenceVector {
  factualAccuracy: number;    // 0-1: how factually grounded
  domainExpertise: number;    // 0-1: alignment to agent's speciality
  contextRelevance: number;   // 0-1: how relevant to the task
  linguisticQuality: number;  // 0-1: clarity and precision of language
  completeness: number;       // 0-1: how complete the response is
  overall: number;            // 0-1: weighted composite
}

export interface ProvenanceLink {
  agentId: string;
  agentRole: string;
  timestamp: string;
  action: string;
  inputHash: string;  // hash of what this agent received
  outputHash: string; // hash of what this agent produced
}

export interface SynapseSignal {
  // Identity
  signalId: string;
  tenantId: string;
  sessionId: string;
  correlationId: string; // groups related signals together

  // Classification
  type: SignalType;
  cognitiveMode: CognitiveMode;
  priority: 1 | 2 | 3 | 4 | 5; // 1=critical, 5=background

  // Content
  payload: {
    content: string;
    language: string;   // ISO 639-1
    metadata: Record<string, unknown>;
    attachments?: { type: string; data: string }[];
  };

  // Routing
  sourceAgentId: string;
  targetAgentIds?: string[];  // empty = broadcast to mesh
  excludeAgentIds?: string[];
  requiredExpertise?: string[];  // semantic tags

  // Quality
  confidence: ConfidenceVector;

  // Audit
  provenance: ProvenanceLink[];
  parentSignalId?: string;  // for tracing task fragments back to origin

  // Lifecycle
  ttl: number;         // ms before signal expires
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    fallbackAgentId?: string;
  };

  createdAt: string;
  expiresAt: string;
}

// ── SIGNAL FACTORY ────────────────────────────────────────────────────────────

export class SynapseSignalFactory {
  static create(
    partial: Partial<SynapseSignal> & {
      tenantId: string;
      sessionId: string;
      type: SignalType;
      content: string;
      sourceAgentId: string;
    }
  ): SynapseSignal {
    const now = new Date().toISOString();
    const ttl = partial.ttl ?? 300_000; // 5 min default

    return {
      signalId: `sig-${Date.now()}-${Math.random().toString(36).slice(2,10)}`,
      correlationId: partial.correlationId ?? `corr-${Date.now()}`,
      cognitiveMode: partial.cognitiveMode ?? "analytical",
      priority: partial.priority ?? 3,
      payload: {
        content: partial.content,
        language: partial.payload?.language ?? "en",
        metadata: partial.payload?.metadata ?? {},
        attachments: partial.payload?.attachments,
      },
      targetAgentIds: partial.targetAgentIds,
      excludeAgentIds: partial.excludeAgentIds ?? [],
      requiredExpertise: partial.requiredExpertise ?? [],
      confidence: partial.confidence ?? {
        factualAccuracy: 0, domainExpertise: 0,
        contextRelevance: 0, linguisticQuality: 0,
        completeness: 0, overall: 0,
      },
      provenance: partial.provenance ?? [],
      parentSignalId: partial.parentSignalId,
      ttl,
      retryPolicy: partial.retryPolicy ?? { maxRetries: 3, backoffMs: 1000 },
      createdAt: now,
      expiresAt: new Date(Date.now() + ttl).toISOString(),
      ...partial,
    } as SynapseSignal;
  }

  /** Measure semantic match between a signal and an agent's expertise */
  static semanticMatch(signal: SynapseSignal, agentExpertise: string[]): number {
    const required = signal.requiredExpertise ?? [];
    if (required.length === 0) return 0.5; // open broadcast
    const matches = required.filter(tag =>
      agentExpertise.some(exp =>
        exp.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(exp.toLowerCase())
      )
    );
    return matches.length / required.length;
  }
}

export default SynapseSignalFactory;
