// Created by BBMW0 Technologies | bbmw0.com
/**
 * OmniOrg Master Orchestrator
 * Routes any request to the right agent(s), runs parallel when needed,
 * synthesises results, and delivers PhD-level output.
 *
 * Built on: @anthropic-ai/claude-agent-sdk + @anthropic-ai/sdk
 */

import Anthropic from "@anthropic-ai/sdk";
import { AGENT_REGISTRY, AgentDefinition } from "../registry/agent-registry";

const client = new Anthropic();

// ── TYPES ─────────────────────────────────────────────────────────────────────

interface OrchestratorRequest {
  task: string;
  language?: string;      // auto-detected if omitted
  department?: string;    // hint to narrow agent selection
  urgency?: "high" | "medium" | "low";
  outputFormat?: "detailed" | "executive-summary" | "action-plan" | "code";
}

interface AgentResponse {
  agentId: string;
  agentRole: string;
  output: string;
  confidence: number;     // 0-1
  tokensUsed: number;
}

interface OrchestratorResult {
  requestId: string;
  agentsUsed: string[];
  synthesisedOutput: string;
  executiveSummary: string;
  nextActions: string[];
  language: string;
  processingTimeMs: number;
}

// ── CORE ORCHESTRATOR CLASS ───────────────────────────────────────────────────

export class OmniOrgOrchestrator {

  /**
   * Main entry point — give any order, get world-class output
   */
  async execute(request: OrchestratorRequest): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

    console.log(`\n🌐 OmniOrg Orchestrator activated — Request ${requestId}`);
    console.log(`📋 Task: ${request.task}\n`);

    // Step 1: Select best agent(s)
    const selectedAgents = await this.selectAgents(request);
    console.log(`✅ Selected ${selectedAgents.length} agent(s): ${selectedAgents.map(a => a.role).join(", ")}`);

    // Step 2: Execute in parallel if multiple agents
    const agentResponses = await this.executeAgents(selectedAgents, request);

    // Step 3: Synthesise all outputs into one unified response
    const synthesis = await this.synthesise(request, agentResponses);

    const result: OrchestratorResult = {
      requestId,
      agentsUsed: selectedAgents.map(a => a.id),
      synthesisedOutput: synthesis.output,
      executiveSummary: synthesis.summary,
      nextActions: synthesis.nextActions,
      language: request.language ?? "en",
      processingTimeMs: Date.now() - startTime
    };

    console.log(`\n✨ Complete in ${result.processingTimeMs}ms | Agents: ${result.agentsUsed.length}`);
    return result;
  }

  /**
   * Select the best agent(s) from the registry for this request
   */
  private async selectAgents(request: OrchestratorRequest): Promise<AgentDefinition[]> {
    const selectionPrompt = `You are the OmniOrg agent selector.

AGENT REGISTRY contains 900 specialist agents. Given this task, identify the best 1-5 agents to handle it.
Return a JSON array of agent IDs.

AVAILABLE AGENTS (sample):
${JSON.stringify([
  ...AGENT_REGISTRY.csuite.map(a => ({ id: a.id, role: a.role, dept: a.department, expertise: a.expertise.slice(0,3) })),
  ...AGENT_REGISTRY.domainExperts.map(a => ({ id: a.id, role: a.role, dept: a.department, expertise: (a.expertise ?? []).slice(0,3) }))
], null, 2)}

TASK: ${request.task}
DEPARTMENT HINT: ${request.department ?? "none"}

Return ONLY valid JSON: { "agentIds": ["id1", "id2", ...], "reasoning": "why" }`;

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: selectionPrompt }]
    });

    try {
      const text = response.content[0].type === "text" ? response.content[0].text : "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const ids: string[] = parsed.agentIds ?? [];

        // Resolve agent definitions from IDs
        const allAgents = [
          AGENT_REGISTRY.orchestrator,
          ...AGENT_REGISTRY.csuite,
          ...(AGENT_REGISTRY.domainExperts as AgentDefinition[])
        ];
        const selected = ids
          .map(id => allAgents.find(a => a.id === id))
          .filter(Boolean) as AgentDefinition[];

        // Fallback: use CEO + relevant domain expert if selection fails
        if (selected.length === 0) {
          return [AGENT_REGISTRY.csuite[0]]; // CEO as fallback
        }
        return selected;
      }
    } catch {}

    return [AGENT_REGISTRY.csuite[0]]; // Safe fallback
  }

  /**
   * Execute agents — in parallel for multi-agent tasks
   */
  private async executeAgents(
    agents: AgentDefinition[],
    request: OrchestratorRequest
  ): Promise<AgentResponse[]> {
    const executions = agents.map(agent => this.runAgent(agent, request));
    return Promise.all(executions);
  }

  /**
   * Run a single agent with its system prompt and the task
   */
  private async runAgent(
    agent: AgentDefinition,
    request: OrchestratorRequest
  ): Promise<AgentResponse> {
    console.log(`  🤖 Running: ${agent.role}...`);

    const userMessage = request.outputFormat === "code"
      ? `${request.task}\n\nRespond with production-ready code. Include all imports, types, error handling.`
      : `${request.task}\n\nRespond at PhD / Super-Senior Executive level. Be comprehensive, precise, and actionable.`;

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: agent.systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    });

    const output = response.content[0].type === "text" ? response.content[0].text : "";
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    return {
      agentId: agent.id,
      agentRole: agent.role,
      output,
      confidence: 0.95,
      tokensUsed
    };
  }

  /**
   * Synthesise multiple agent outputs into one unified response
   */
  private async synthesise(
    request: OrchestratorRequest,
    responses: AgentResponse[]
  ): Promise<{ output: string; summary: string; nextActions: string[] }> {

    if (responses.length === 1) {
      // Single agent — extract next actions and return directly
      return {
        output: responses[0].output,
        summary: responses[0].output.split("\n")[0],
        nextActions: []
      };
    }

    const synthesisPrompt = `You are the OmniOrg synthesis engine.

Multiple specialist agents have worked on this task. Synthesise their outputs into
one unified, world-class response that is greater than the sum of its parts.

ORIGINAL TASK: ${request.task}

AGENT OUTPUTS:
${responses.map(r => `\n## ${r.agentRole}\n${r.output}`).join("\n\n---")}

Produce:
1. A unified synthesis that integrates all expert perspectives
2. A 2-sentence executive summary
3. 3-5 concrete next actions

Format as JSON: { "output": "...", "summary": "...", "nextActions": ["..."] }`;

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: synthesisPrompt }]
    });

    try {
      const text = response.content[0].type === "text" ? response.content[0].text : "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          output: parsed.output ?? text,
          summary: parsed.summary ?? "",
          nextActions: parsed.nextActions ?? []
        };
      }
    } catch {}

    return {
      output: responses.map(r => `**${r.agentRole}:**\n${r.output}`).join("\n\n---\n\n"),
      summary: "Multi-agent synthesis complete.",
      nextActions: []
    };
  }
}

// ── CLI ENTRY POINT ───────────────────────────────────────────────────────────
async function main() {
  const orchestrator = new OmniOrgOrchestrator();

  // Example: give any order here
  const result = await orchestrator.execute({
    task: process.argv.slice(2).join(" ") || "What is OmniOrg's strategic priority for Q1?",
    outputFormat: "detailed"
  });

  console.log("\n" + "═".repeat(60));
  console.log("OMNIORG OUTPUT");
  console.log("═".repeat(60));
  console.log(result.synthesisedOutput);
  console.log("\n📌 EXECUTIVE SUMMARY:", result.executiveSummary);
  if (result.nextActions.length > 0) {
    console.log("\n✅ NEXT ACTIONS:");
    result.nextActions.forEach((a, i) => console.log(`  ${i+1}. ${a}`));
  }
  console.log("═".repeat(60));
}

main().catch(console.error);

export default OmniOrgOrchestrator;
