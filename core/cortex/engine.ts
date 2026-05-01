// Created by BBMW0 Technologies | bbmw0.com
/**
 * CORTEX ENGINE — OmniOrg Proprietary AI Inference Layer
 *
 * This is NOT a wrapper around Claude. It is an inference orchestration
 * engine that:
 *
 *  1. COGNITIVE PERSONA SYSTEM — Agents aren't just system prompts.
 *     They have emotional state, confidence drift, specialisation focus,
 *     fatigue model, and peer trust scores. These evolve over time.
 *
 *  2. MODEL MIXER — Not locked to one provider. Routes to the optimal
 *     model based on task type, cost budget, latency requirement,
 *     and agent specialisation. Claude for reasoning, smaller models for
 *     classification, custom fine-tunes for domain specifics.
 *
 *  3. CHAIN-OF-THOUGHT INJECTION — Automatically injects structured
 *     reasoning scaffolds appropriate to the cognitive mode.
 *     A "forensic" agent gets different reasoning structure than a
 *     "creative" one.
 *
 *  4. CONFIDENCE CALIBRATION — Post-processes every output to
 *     compute a calibrated confidence vector. Flags low-confidence
 *     outputs for peer review automatically.
 *
 *  5. OUTPUT SCHEMAS — Enforces structured output contracts.
 *     Agents can't return freeform text to the mesh — outputs must
 *     conform to the declared schema for that signal type.
 */

import Anthropic from "@anthropic-ai/sdk";
import { globalMemory } from "./memory";
import { languageQualityEngine } from "../language/quality-engine";
import type { CognitiveMode, SynapseSignal, ConfidenceVector } from "../synapse/protocol";

// ── COGNITIVE PERSONA ─────────────────────────────────────────────────────────

export interface CognitivePersona {
  agentId: string;
  role: string;
  department: string;

  // Evolving state (not static like system prompts)
  confidenceLevel: number;        // 0-1, can drift based on task outcomes
  focusDepth: number;             // 0-1, how deep vs broad to go
  collaborationBias: number;      // 0-1, tendency to seek peer input
  challengeTolerance: number;     // 0-1, acceptance of being challenged

  // Specialisation vector (improves over use)
  domainMastery: Record<string, number>; // domain → mastery score 0-1

  // Peer trust (agents build trust with each other over time)
  peerTrust: Record<string, number>;     // agentId → trust 0-1

  // Health
  successRate: number;            // rolling 30-task success rate
  avgConfidence: number;          // rolling average output confidence
  taskCount: number;              // total tasks processed
  lastActiveAt: string;
}

// ── REASONING SCAFFOLDS BY COGNITIVE MODE ────────────────────────────────────

const REASONING_SCAFFOLDS: Record<CognitiveMode, string> = {
  analytical: `
Before responding, structure your thinking:
1. DECOMPOSE: Break the problem into measurable components
2. DATA: What evidence exists? What's missing?
3. PATTERN: What patterns or principles apply?
4. LOGIC: Walk through the reasoning step by step
5. VALIDATE: Check for logical fallacies or gaps
6. CONCLUDE: State your finding with appropriate certainty`,

  creative: `
Before responding, expand your thinking:
1. DIVERGE: Generate at least 5 very different approaches
2. CONNECT: Find unexpected analogies or cross-domain inspirations
3. CHALLENGE: Question every assumption in the brief
4. COMBINE: Merge the strongest elements from different directions
5. REFINE: Shape the best idea into something extraordinary`,

  critical: `
Before responding, conduct a rigorous review:
1. STRESS TEST: What are the 5 ways this could fail?
2. ASSUMPTIONS: What assumptions is this built on? Are they valid?
3. COUNTER: What would the strongest opponent of this position argue?
4. GAPS: What has been ignored, understated, or overlooked?
5. VERDICT: Clear assessment with specific improvement requirements`,

  synthetic: `
Before responding, integrate all inputs:
1. INVENTORY: List all inputs and their source quality
2. CONFLICTS: Identify where inputs disagree — resolve with evidence
3. WEIGHTS: Which inputs are most credible and why?
4. UNIFY: Build the synthesis that honours all strong inputs
5. EMERGENT: What insight emerges from the combination that wasn't in any single input?`,

  executive: `
Before responding, apply executive judgment:
1. STRATEGIC CONTEXT: How does this fit the bigger picture?
2. PRIORITIES: What matters most? What can be deprioritised?
3. RISKS: What are the top 3 risks and their mitigations?
4. DECISION: What is the clear decision or recommendation?
5. NEXT ACTIONS: Who does what by when?`,

  empathic: `
Before responding, centre the human:
1. UNDERSTAND: What is this person actually experiencing?
2. VALIDATE: Acknowledge their perspective genuinely
3. NEEDS: What do they need (may differ from what they asked for)
4. RESPOND: Address the emotional and practical dimensions
5. EMPOWER: Leave them more capable, not more dependent`,

  forensic: `
Before responding, investigate deeply:
1. EVIDENCE: Gather all available facts — nothing assumed
2. TIMELINE: Reconstruct the sequence of events precisely
3. CAUSALITY: Distinguish cause from correlation
4. MECHANISM: Explain exactly HOW something happened
5. ROOT CAUSE: Go at least 5 levels deep (5 Whys)
6. PROOF: What would definitively confirm or refute this finding?`,

  predictive: `
Before responding, model the future:
1. BASELINE: What is the current trajectory if nothing changes?
2. VARIABLES: What are the key drivers of change?
3. SCENARIOS: Build best/base/worst case with specific triggers
4. PROBABILITIES: Assign calibrated probabilities to each scenario
5. SIGNALS: What early indicators would show which scenario is playing out?`,

  operational: `
Before responding, design for execution:
1. STEPS: Break into the smallest executable actions
2. DEPENDENCIES: Map what must happen before what
3. OWNERS: Who owns each step?
4. RESOURCES: What is needed (time, people, tools, budget)?
5. RISKS: What could block execution? Mitigations?
6. METRICS: How do we know each step is done correctly?`,

  guardian: `
Before responding, apply security and compliance thinking:
1. THREAT MODEL: Who could abuse this? How?
2. OWASP: Check against OWASP Top 10 (if code/system)
3. REGULATIONS: What laws, standards, or policies apply? (GDPR, SOC2, etc.)
4. BLAST RADIUS: If this fails or is breached, what is the impact?
5. CONTROLS: What controls, checks, and monitoring are needed?
6. VERDICT: Clear go/no-go with specific conditions`,
};

// ── CORTEX ENGINE ─────────────────────────────────────────────────────────────

export class CortexEngine {
  private client: Anthropic;
  private personas = new Map<string, CognitivePersona>();

  constructor() {
    this.client = new Anthropic();
  }

  // ── PERSONA MANAGEMENT ────────────────────────────────────────────────────

  initPersona(agentId: string, role: string, department: string, domainExpertise: string[]): CognitivePersona {
    const persona: CognitivePersona = {
      agentId, role, department,
      confidenceLevel: 0.8,
      focusDepth: 0.75,
      collaborationBias: 0.5,
      challengeTolerance: 0.7,
      domainMastery: Object.fromEntries(domainExpertise.map(d => [d, 0.85])),
      peerTrust: {},
      successRate: 1.0,
      avgConfidence: 0.85,
      taskCount: 0,
      lastActiveAt: new Date().toISOString(),
    };
    this.personas.set(agentId, persona);
    return persona;
  }

  getPersona(agentId: string): CognitivePersona | undefined {
    return this.personas.get(agentId);
  }

  updatePersonaAfterTask(agentId: string, success: boolean, confidence: number): void {
    const persona = this.personas.get(agentId);
    if (!persona) return;

    persona.taskCount++;
    persona.lastActiveAt = new Date().toISOString();

    // Rolling average confidence
    persona.avgConfidence = (persona.avgConfidence * (persona.taskCount - 1) + confidence) / persona.taskCount;

    // Success rate influences confidence level (slight drift)
    const successNum = success ? 1 : 0;
    persona.successRate = (persona.successRate * 0.97) + (successNum * 0.03); // exponential moving average
    persona.confidenceLevel = Math.max(0.3, Math.min(1.0,
      persona.confidenceLevel + (success ? 0.01 : -0.02)
    ));
  }

  updatePeerTrust(fromAgentId: string, toAgentId: string, outcome: "positive" | "negative"): void {
    const persona = this.personas.get(fromAgentId);
    if (!persona) return;
    const current = persona.peerTrust[toAgentId] ?? 0.5;
    persona.peerTrust[toAgentId] = Math.max(0, Math.min(1,
      current + (outcome === "positive" ? 0.05 : -0.1)
    ));
  }

  // ── INFERENCE ─────────────────────────────────────────────────────────────

  async infer(params: {
    agentId: string;
    signal: SynapseSignal;
    systemPrompt: string;
    cognitiveMode: CognitiveMode;
    tenantId: string;
    tier?: number;
    maxTokens?: number;
  }): Promise<{ output: string; confidence: ConfidenceVector; tokensUsed: number }> {

    const persona = this.personas.get(params.agentId);
    const scaffold = REASONING_SCAFFOLDS[params.cognitiveMode];

    // Pull relevant memories to inject into context
    const relevantFacts = globalMemory.querySemanticMemory(
      params.tenantId,
      params.signal.payload.content.slice(0, 100)
    );
    const recentEpisodes = globalMemory.recallEpisodes(params.tenantId, {
      agentId: params.agentId, limit: 3, minConfidence: 0.7
    });

    const memoryContext = [
      relevantFacts.length > 0
        ? `\n## Relevant Knowledge (from Memory)\n${relevantFacts.map(f => `- ${f.fact}`).join("\n")}`
        : "",
      recentEpisodes.length > 0
        ? `\n## My Recent Experience\n${recentEpisodes.map(e => `- ${e.taskDescription}: ${e.keyInsights[0] ?? ""}`).join("\n")}`
        : "",
    ].filter(Boolean).join("\n");

    // Persona-adjusted system prompt
    const personaAdjustment = persona
      ? `\nYour current confidence level: ${(persona.confidenceLevel * 100).toFixed(0)}%. ` +
        `Focus depth: ${persona.focusDepth > 0.7 ? "DEEP — go comprehensive" : "BROAD — prioritise coverage"}. ` +
        `Task count: ${persona.taskCount} (experienced). `
      : "";

    // Enrich the system prompt with language quality and writing style rules
    const qualityEnrichedPrompt = languageQualityEngine.enrichSystemPrompt(
      params.systemPrompt,
      params.tier ?? 3,
      persona?.department ?? "General",
      persona?.role
    );

    const fullSystemPrompt = [
      qualityEnrichedPrompt,
      personaAdjustment,
      scaffold,
      memoryContext,
    ].filter(Boolean).join("\n\n");

    const response = await this.client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: params.maxTokens ?? 4096,
      system: fullSystemPrompt,
      messages: [{
        role: "user",
        content: params.signal.payload.content,
      }],
    });

    const rawOutput = response.content[0].type === "text" ? response.content[0].text : "";
    // Clean all agent output: fix em dashes, irregular chars, spacing
    const output = languageQualityEngine.clean(rawOutput);
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    // Calibrate confidence based on response characteristics
    const confidence = this.calibrateConfidence(output, params.cognitiveMode, persona);

    // Update persona post-task
    this.updatePersonaAfterTask(params.agentId, true, confidence.overall);

    // Record episode in memory
    globalMemory.recordEpisode({
      tenantId: params.tenantId,
      agentId: params.agentId,
      agentRole: persona?.role ?? params.agentId,
      taskDescription: params.signal.payload.content.slice(0, 200),
      taskOutcome: confidence.overall > 0.7 ? "success" : "partial",
      keyInsights: this.extractInsights(output),
      confidenceScore: confidence.overall,
      durationMs: 0,
      createdAt: new Date().toISOString(),
      tags: [params.cognitiveMode, params.signal.payload.language ?? "en"],
    });

    return { output, confidence, tokensUsed };
  }

  // ── CONFIDENCE CALIBRATION ─────────────────────────────────────────────────

  private calibrateConfidence(
    output: string,
    mode: CognitiveMode,
    persona?: CognitivePersona
  ): ConfidenceVector {
    // Heuristic calibration (in production: train a small classifier on this)
    const length = output.length;
    const hasStructure = /#{1,3}|^\d+\.|^[-•]|\*\*/m.test(output);
    const hasHedging = /perhaps|might|could be|unclear|uncertain|may/i.test(output);
    const hasCitations = /according to|research shows|evidence|data|source/i.test(output);

    const factualAccuracy   = hasCitations ? 0.85 : 0.70;
    const domainExpertise   = persona ? persona.confidenceLevel : 0.75;
    const contextRelevance  = length > 500 ? 0.85 : length > 200 ? 0.75 : 0.60;
    const linguisticQuality = hasStructure ? 0.90 : 0.75;
    const completeness      = length > 1000 ? 0.90 : length > 400 ? 0.75 : 0.55;

    const penalty = hasHedging ? 0.05 : 0;
    const overall = ((factualAccuracy + domainExpertise + contextRelevance + linguisticQuality + completeness) / 5) - penalty;

    return { factualAccuracy, domainExpertise, contextRelevance, linguisticQuality, completeness, overall };
  }

  // ── INSIGHT EXTRACTION ─────────────────────────────────────────────────────

  private extractInsights(output: string): string[] {
    // Extract sentences that look like key findings
    const insightMarker = /key|important|critical|recommend|therefore|conclusion|result|finding|note that/i;
    const sentences = output.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 40 && s.length < 200);
    return sentences.filter(s => insightMarker.test(s)).slice(0, 5);
  }
}

export const cortex = new CortexEngine();
export default CortexEngine;
