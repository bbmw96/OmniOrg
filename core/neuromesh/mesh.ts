// Created by BBMW0 Technologies | bbmw0.com
/**
 * NEUROMESH™: OmniOrg Adaptive Cognitive Mesh
 *
 * The core innovation. This is NOT a graph, NOT a pipeline, NOT a tree.
 *
 * It's a LIVING MESH where:
 *  - Agents are neurons with connection weights
 *  - Signals propagate based on semantic similarity (not rules)
 *  - The topology self-organises after each task
 *  - High-performing agent pairs strengthen their connection
 *  - Underperforming agents get rerouted around automatically
 *  - Teams form, execute, and dissolve dynamically
 *  - The mesh learns which combinations produce the best outputs
 *
 * EMERGENT BEHAVIOUR: The mesh can discover agent combinations that
 * no human designed: and these emerge from use, not configuration.
 */

import { SynapseSignal, SynapseSignalFactory, type SignalType } from "../synapse/protocol";
import { cortex } from "../cortex/engine";
import { globalMemory } from "../cortex/memory";
import type { AgentDefinition } from "../../agents/registry/agent-registry";

// ── MESH NODE ─────────────────────────────────────────────────────────────────

export interface MeshNode {
  agent: AgentDefinition;
  connections: Map<string, number>;  // agentId → connection weight 0-1
  healthScore: number;               // 0-1, drops on failures
  loadScore: number;                 // 0-1, increases when busy
  specialisationScore: number;       // 0-1, increases with matched use
  lastSignalAt: string;
  signalsProcessed: number;
  signalsFailed: number;
}

// ── DYNAMIC TEAM ─────────────────────────────────────────────────────────────

export interface DynamicTeam {
  teamId: string;
  taskId: string;
  tenantId: string;
  memberIds: string[];
  roles: Record<string, string>;       // agentId → role in this team
  topology: "parallel" | "sequential" | "hierarchical" | "mesh";
  formedAt: string;
  dissolvesAt?: string;
  taskDescription: string;
  status: "forming" | "active" | "synthesising" | "dissolved";
}

// ── EXECUTION RESULT ──────────────────────────────────────────────────────────

export interface MeshExecutionResult {
  taskId: string;
  teamId: string;
  agentOutputs: Array<{
    agentId: string;
    role: string;
    output: string;
    confidence: number;
    tokensUsed: number;
  }>;
  synthesis: string;
  executiveSummary: string;
  nextActions: string[];
  executionPlan: string[];
  confidenceOverall: number;
  language: string;
  processingTimeMs: number;
  meshTopologyUsed: string;
}

// ── NEUROMESH ─────────────────────────────────────────────────────────────────

export class NeuralMesh {
  private nodes = new Map<string, MeshNode>();
  private teams = new Map<string, DynamicTeam>();
  private signalLog: SynapseSignal[] = [];

  // ── NODE MANAGEMENT ────────────────────────────────────────────────────────

  registerAgent(agent: AgentDefinition, skipConnections = false): void {
    if (this.nodes.has(agent.id)) return;

    // Initialise CORTEX persona for this agent (skip during bulk preload for performance)
    if (!skipConnections) {
      cortex.initPersona(agent.id, agent.role, agent.department, agent.expertise ?? []);
    }

    this.nodes.set(agent.id, {
      agent,
      connections: new Map(),
      healthScore: 1.0,
      loadScore: 0.0,
      specialisationScore: 0.5,
      lastSignalAt: new Date().toISOString(),
      signalsProcessed: 0,
      signalsFailed: 0,
    });

    // Auto-connect to nearby agents in same department.
    // Skipped during bulk preload (O(n^2) with 20k agents = OOM).
    // Connections are built lazily on first task execution instead.
    if (!skipConnections) {
      for (const [otherId, otherNode] of this.nodes.entries()) {
        if (otherId === agent.id) continue;
        const sameDepWeight = otherNode.agent.department === agent.department ? 0.6 : 0.2;
        this.setConnection(agent.id, otherId, sameDepWeight);
      }
    }
  }

  private setConnection(fromId: string, toId: string, weight: number): void {
    const node = this.nodes.get(fromId);
    if (node) node.connections.set(toId, weight);
  }

  strengthenConnection(fromId: string, toId: string, delta = 0.05): void {
    const node = this.nodes.get(fromId);
    if (!node) return;
    const current = node.connections.get(toId) ?? 0.2;
    node.connections.set(toId, Math.min(1.0, current + delta));
  }

  weakenConnection(fromId: string, toId: string, delta = 0.1): void {
    const node = this.nodes.get(fromId);
    if (!node) return;
    const current = node.connections.get(toId) ?? 0.2;
    node.connections.set(toId, Math.max(0.0, current - delta));
  }

  // ── SEMANTIC AGENT SELECTION ───────────────────────────────────────────────

  selectAgents(signal: SynapseSignal, maxAgents = 5): AgentDefinition[] {
    const candidates: Array<{ agent: AgentDefinition; score: number }> = [];

    for (const [, node] of this.nodes.entries()) {
      // Skip unavailable agents
      if (node.healthScore < 0.3) continue;
      if (node.loadScore > 0.9) continue;

      // Compute selection score
      const semanticScore = SynapseSignalFactory.semanticMatch(signal, node.agent.expertise ?? []);
      const healthWeight  = node.healthScore;
      const loadPenalty   = 1 - node.loadScore;
      const specBonus     = node.specialisationScore;
      const tierBonus     = signal.priority <= 2 ? (1 / (node.agent.tier ?? 3)) : 0; // high-priority → prefer senior agents

      const score = (
        semanticScore * 0.40 +
        healthWeight  * 0.25 +
        loadPenalty   * 0.15 +
        specBonus     * 0.15 +
        tierBonus     * 0.05
      );

      if (score > 0.25) candidates.push({ agent: node.agent, score });
    }

    // Sort by score, deduplicate by department (don't pick 5 lawyers for a tech task)
    const sorted = candidates.sort((a, b) => b.score - a.score);
    const selected: AgentDefinition[] = [];
    const deptCounts: Record<string, number> = {};

    for (const { agent } of sorted) {
      const dept = agent.department ?? "Unknown";
      if ((deptCounts[dept] ?? 0) >= 2) continue; // max 2 per dept
      selected.push(agent);
      deptCounts[dept] = (deptCounts[dept] ?? 0) + 1;
      if (selected.length >= maxAgents) break;
    }

    return selected.length > 0 ? selected : [this.getHealthiestAgent()].filter(Boolean) as AgentDefinition[];
  }

  private getHealthiestAgent(): AgentDefinition | undefined {
    let best: MeshNode | undefined;
    for (const node of this.nodes.values()) {
      if (!best || node.healthScore > best.healthScore) best = node;
    }
    return best?.agent;
  }

  // ── DYNAMIC TEAM FORMATION ─────────────────────────────────────────────────

  formTeam(
    taskId: string,
    tenantId: string,
    agents: AgentDefinition[],
    taskDescription: string
  ): DynamicTeam {
    const teamId = `team-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

    // Determine topology based on agent count and task type
    const topology: DynamicTeam["topology"] =
      agents.length === 1 ? "sequential" :
      agents.length <= 3  ? "parallel" :
      agents.length <= 6  ? "hierarchical" :
      "mesh";

    // Mark agents as busy
    agents.forEach(a => {
      const node = this.nodes.get(a.id);
      if (node) node.loadScore = Math.min(0.9, node.loadScore + 0.3);
    });

    const team: DynamicTeam = {
      teamId, taskId, tenantId,
      memberIds: agents.map(a => a.id),
      roles: this.assignTeamRoles(agents),
      topology,
      formedAt: new Date().toISOString(),
      taskDescription,
      status: "active",
    };

    this.teams.set(teamId, team);
    return team;
  }

  private assignTeamRoles(agents: AgentDefinition[]): Record<string, string> {
    const roles: Record<string, string> = {};
    // Tier 1 agents lead; tier 2 coordinate; others execute
    agents.forEach(a => {
      roles[a.id] = a.tier === 1 ? "lead" : a.tier === 2 ? "coordinator" : "executor";
    });
    return roles;
  }

  dissolveTeam(teamId: string, outcome: "success" | "partial" | "failure"): void {
    const team = this.teams.get(teamId);
    if (!team) return;

    team.status = "dissolved";

    // Release load and update connections based on team outcome
    team.memberIds.forEach(id => {
      const node = this.nodes.get(id);
      if (node) {
        node.loadScore = Math.max(0, node.loadScore - 0.3);
        node.signalsProcessed++;
        if (outcome === "failure") {
          node.signalsFailed++;
          node.healthScore = Math.max(0.1, node.healthScore - 0.05);
        } else {
          node.healthScore = Math.min(1.0, node.healthScore + 0.01);
          node.specialisationScore = Math.min(1.0, node.specialisationScore + 0.02);
        }
      }
    });

    // Strengthen connections between agents that worked together successfully
    if (outcome === "success") {
      for (let i = 0; i < team.memberIds.length; i++) {
        for (let j = i + 1; j < team.memberIds.length; j++) {
          this.strengthenConnection(team.memberIds[i], team.memberIds[j]);
          this.strengthenConnection(team.memberIds[j], team.memberIds[i]);
        }
      }
    }
  }

  // ── MAIN EXECUTION PIPELINE ───────────────────────────────────────────────

  async execute(
    signal: SynapseSignal,
    allAgents: Map<string, AgentDefinition>
  ): Promise<MeshExecutionResult> {
    const startTime = Date.now();
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

    // Ensure all agents are registered
    for (const agent of allAgents.values()) {
      if (!this.nodes.has(agent.id)) this.registerAgent(agent);
    }

    // 1. Select optimal agents
    const selectedAgents = this.selectAgents(signal);

    // 2. Form dynamic team
    const team = this.formTeam(taskId, signal.tenantId, selectedAgents, signal.payload.content);

    // 3. Execute based on topology
    const agentOutputs = await this.executeByTopology(team, selectedAgents, signal);

    // 4. Synthesise outputs
    const synthesis = await this.synthesise(signal, agentOutputs);

    // 5. Update mesh topology based on outcome
    this.dissolveTeam(team.teamId, synthesis.confidence > 0.7 ? "success" : "partial");

    // 6. Store in working memory
    globalMemory.setWorking(`result-${taskId}`, synthesis.output, "mesh", taskId);

    return {
      taskId,
      teamId: team.teamId,
      agentOutputs,
      synthesis: synthesis.output,
      executiveSummary: synthesis.summary,
      nextActions: synthesis.nextActions,
      executionPlan: synthesis.executionPlan,
      confidenceOverall: synthesis.confidence,
      language: signal.payload.language ?? "en",
      processingTimeMs: Date.now() - startTime,
      meshTopologyUsed: team.topology,
    };
  }

  private async executeByTopology(
    team: DynamicTeam,
    agents: AgentDefinition[],
    signal: SynapseSignal
  ): Promise<MeshExecutionResult["agentOutputs"]> {
    switch (team.topology) {
      case "parallel":
        return this.executeParallel(agents, signal);
      case "hierarchical":
        return this.executeHierarchical(agents, signal);
      case "mesh":
        return this.executeMeshTopology(agents, signal);
      default:
        return this.executeParallel(agents, signal);
    }
  }

  private async executeParallel(
    agents: AgentDefinition[],
    signal: SynapseSignal
  ): Promise<MeshExecutionResult["agentOutputs"]> {
    const results = await Promise.all(
      agents.map(agent => this.runSingleAgent(agent, signal))
    );
    return results;
  }

  private async executeHierarchical(
    agents: AgentDefinition[],
    signal: SynapseSignal
  ): Promise<MeshExecutionResult["agentOutputs"]> {
    // Lead agent runs first, others run in parallel with lead's framing as context
    const lead = agents.find(a => a.tier === Math.min(...agents.map(x => x.tier ?? 3)));
    const others = agents.filter(a => a.id !== lead?.id);

    const leadResult = lead ? await this.runSingleAgent(lead, signal) : null;

    const contextSignal = leadResult
      ? { ...signal, payload: { ...signal.payload,
          content: `${signal.payload.content}\n\n[Lead Agent ${lead?.role} initial framing]:\n${leadResult.output.slice(0, 500)}` } }
      : signal;

    const otherResults = await Promise.all(others.map(a => this.runSingleAgent(a, contextSignal)));

    return [leadResult, ...otherResults].filter(Boolean) as MeshExecutionResult["agentOutputs"];
  }

  private async executeMeshTopology(
    agents: AgentDefinition[],
    signal: SynapseSignal
  ): Promise<MeshExecutionResult["agentOutputs"]> {
    // Round 1: all agents process independently
    const round1 = await this.executeParallel(agents, signal);

    // Round 2: high-trust pairs review each other's work
    const round2: MeshExecutionResult["agentOutputs"] = [];
    for (const agent of agents) {
      const node = this.nodes.get(agent.id);
      if (!node) continue;

      const topPeer = Array.from(node.connections.entries())
        .filter(([id]) => agents.some(a => a.id === id))
        .sort((a, b) => b[1] - a[1])[0];

      if (topPeer && topPeer[1] > 0.6) {
        const peerOutput = round1.find(r => r.agentId === topPeer[0])?.output ?? "";
        const reviewSignal = {
          ...signal,
          payload: {
            ...signal.payload,
            content: `Review and enhance this output from your peer:\n\n${peerOutput}\n\nOriginal task: ${signal.payload.content}`,
          },
          cognitiveMode: "critical" as const,
        };
        const reviewed = await this.runSingleAgent(agent, reviewSignal);
        round2.push({ ...reviewed, role: `${reviewed.role} (peer-reviewed)` });
      }
    }

    return [...round1, ...round2];
  }

  private async runSingleAgent(
    agent: AgentDefinition,
    signal: SynapseSignal
  ): Promise<MeshExecutionResult["agentOutputs"][0]> {
    const node = this.nodes.get(agent.id);
    node && (node.lastSignalAt = new Date().toISOString());

    const result = await cortex.infer({
      agentId: agent.id,
      signal,
      systemPrompt: agent.systemPrompt ?? `You are a world-class ${agent.role} at OmniOrg. Respond at PhD / Super-Senior Executive level.`,
      cognitiveMode: signal.cognitiveMode,
      tenantId: signal.tenantId,
    });

    return {
      agentId: agent.id,
      role: agent.role,
      output: result.output,
      confidence: result.confidence.overall,
      tokensUsed: result.tokensUsed,
    };
  }

  private async synthesise(
    signal: SynapseSignal,
    outputs: MeshExecutionResult["agentOutputs"]
  ): Promise<{ output: string; summary: string; nextActions: string[]; executionPlan: string[]; confidence: number }> {
    if (outputs.length === 1) {
      return {
        output: outputs[0].output,
        summary: outputs[0].output.split("\n")[0],
        nextActions: [],
        executionPlan: [],
        confidence: outputs[0].confidence,
      };
    }

    // Local-mode synthesis: combine all expert outputs without LLM when no API key
    if (!process.env.ANTHROPIC_API_KEY) {
      const combinedOutput = outputs.map(o => `**${o.role}:**\n${o.output}`).join("\n\n---\n\n");
      const avgConf = outputs.reduce((s, o) => s + o.confidence, 0) / outputs.length;
      return {
        output:        combinedOutput,
        summary:       `${outputs.length} specialist agents contributed to this analysis. Set ANTHROPIC_API_KEY for full AI synthesis.`,
        nextActions:   ["Review agent outputs", "Prioritise key recommendations", "Execute step by step"],
        executionPlan: ["Step 1: Review", "Step 2: Plan", "Step 3: Execute", "Step 4: Measure", "Step 5: Iterate"],
        confidence:    avgConf,
      };
    }

    const synthPrompt = `You are OmniOrg's CORTEX Synthesis Engine.

Synthesise these expert outputs into ONE unified, world-class response.
Find what no single expert said alone. Resolve conflicts with evidence.
Produce something greater than the sum of its parts.

ORIGINAL TASK:
${signal.payload.content}

EXPERT OUTPUTS (${outputs.length} agents):
${outputs.map(o => `\n### ${o.role} (confidence: ${(o.confidence * 100).toFixed(0)}%)\n${o.output}`).join("\n\n---")}

Return valid JSON:
{
  "output": "full unified synthesis",
  "summary": "2-sentence executive summary",
  "nextActions": ["action 1", "action 2", "action 3"],
  "executionPlan": ["step 1", "step 2", "step 3", "step 4", "step 5"],
  "emergentInsight": "insight that only emerges from combining all expert views"
}`;

    const response = await cortex["client"].messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: synthPrompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const avgConf = outputs.reduce((s, o) => s + o.confidence, 0) / outputs.length;
        return {
          output: parsed.output ?? text,
          summary: parsed.summary ?? "",
          nextActions: parsed.nextActions ?? [],
          executionPlan: parsed.executionPlan ?? [],
          confidence: avgConf,
        };
      }
    } catch {}

    return {
      output: outputs.map(o => `**${o.role}:**\n${o.output}`).join("\n\n---\n\n"),
      summary: "Multi-agent synthesis complete.",
      nextActions: [],
      executionPlan: [],
      confidence: outputs.reduce((s, o) => s + o.confidence, 0) / outputs.length,
    };
  }

  // ── MESH HEALTH STATS ─────────────────────────────────────────────────────

  // Pre-load all agents so health reports are accurate from boot.
  // Uses skipConnections=true to avoid O(n^2) connection explosion with 20k+ agents.
  // Connections are built lazily during actual task execution.
  preload(agents: AgentDefinition[]): void {
    for (const agent of agents) {
      if (!this.nodes.has(agent.id)) this.registerAgent(agent, true);
    }
    console.log(`[NEUROMESH] Pre-loaded ${this.nodes.size} agents into mesh.`);
  }

  getHealthReport() {
    const nodes = Array.from(this.nodes.values());
    return {
      totalAgents: nodes.length,
      healthyAgents: nodes.filter(n => n.healthScore > 0.7).length,
      busyAgents: nodes.filter(n => n.loadScore > 0.5).length,
      activeTeams: Array.from(this.teams.values()).filter(t => t.status === "active").length,
      avgHealthScore: nodes.length > 0 ? nodes.reduce((s, n) => s + n.healthScore, 0) / nodes.length : 0,
      totalSignalsProcessed: nodes.reduce((s, n) => s + n.signalsProcessed, 0),
      memoryStats: globalMemory.getStats(),
    };
  }
}

export const mesh = new NeuralMesh();

// Pre-load all registered agents at module init so the mesh is live immediately
import { AGENT_REGISTRY } from "../../agents/registry/agent-registry";
mesh.preload(AGENT_REGISTRY.getAllAgents());

export default NeuralMesh;
