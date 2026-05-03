// Created by BBMW0 Technologies | bbmw0.com
/**
 * AGENT ORCHESTRATOR
 *
 * OmniOrg agent multiplication and orchestration system.
 * When one agent is not enough, this spawns armies of parallel specialist agents.
 *
 * Capabilities:
 *   - Spawn individual specialist agents (researcher, writer, coder, analyst, etc.)
 *   - Plan a high-level goal into parallelizable task groups (Claude Opus)
 *   - Execute orchestration plans: sequential groups, parallel tasks within groups
 *   - One-shot orchestrate() - plan then execute in a single call
 *   - spawnSpecialistArmy() - maximum parallelism, no dependency ordering
 *
 * Auth: ANTHROPIC_API_KEY from env
 * Model (agents): claude-haiku-4-5-20251001 (speed)
 * Model (planner): claude-opus-4-5 (intelligence)
 */

import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AGENT_MODEL   = "claude-haiku-4-5-20251001";
const PLANNER_MODEL = "claude-opus-4-5";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentRole =
  | "researcher"
  | "writer"
  | "coder"
  | "analyst"
  | "security"
  | "video"
  | "audio"
  | "search";

export interface AgentTask {
  id:       string;
  role:     AgentRole;
  task:     string;
  context?: string;
  priority: 1 | 2 | 3;
}

export interface AgentResult {
  taskId:      string;
  role:        AgentRole;
  result:      string;
  tokensUsed:  number;
  completedAt: string;
  success:     boolean;
  error?:      string;
}

export interface OrchestrationPlan {
  goal:           string;
  tasks:          AgentTask[];
  parallelGroups: AgentTask[][];
}

// ── System prompts by role ─────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<AgentRole, string> = {
  researcher: "You are an expert research agent. Find facts, summarise information, and return structured findings.",
  writer:     "You are an expert content writer. Produce clear, engaging, well-structured content.",
  coder:      "You are an expert TypeScript/Node.js developer. Write clean, typed, secure code.",
  analyst:    "You are a data analyst. Identify patterns, trends, and insights. Return structured analysis.",
  security:   "You are a cybersecurity expert. Identify threats, vulnerabilities, and recommend mitigations.",
  video:      "You are a video production specialist. Plan video scripts, shot lists, and production workflows.",
  audio:      "You are an audio/voice production specialist. Plan voice scripts and audio production.",
  search:     "You are a web research specialist. Search for and synthesise information from multiple sources.",
};

// ── Core functions ─────────────────────────────────────────────────────────────

/**
 * Spawn a single specialist agent to complete a task.
 * Uses claude-haiku-4-5-20251001 for fast, cost-efficient execution.
 */
export async function spawnAgent(task: AgentTask): Promise<AgentResult> {
  const systemPrompt = SYSTEM_PROMPTS[task.role];
  const userPrompt   = task.context
    ? `Context:\n${task.context}\n\nTask:\n${task.task}`
    : task.task;

  try {
    const message = await client.messages.create({
      model:      AGENT_MODEL,
      max_tokens: 2048,
      system:     systemPrompt,
      messages:   [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find(b => b.type === "text");
    const result    = textBlock?.type === "text" ? textBlock.text : "";
    const tokens    = (message.usage.input_tokens ?? 0) + (message.usage.output_tokens ?? 0);

    console.log(`[Orchestrator] Agent [${task.role}] task "${task.id}" completed (${tokens} tokens)`);

    return {
      taskId:      task.id,
      role:        task.role,
      result,
      tokensUsed:  tokens,
      completedAt: new Date().toISOString(),
      success:     true,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Orchestrator] Agent [${task.role}] task "${task.id}" failed: ${errorMsg}`);

    return {
      taskId:      task.id,
      role:        task.role,
      result:      "",
      tokensUsed:  0,
      completedAt: new Date().toISOString(),
      success:     false,
      error:       errorMsg,
    };
  }
}

/**
 * Use Claude Opus to break a high-level goal into a parallelizable task plan.
 * Returns a structured OrchestrationPlan with grouped tasks ready for execution.
 */
export async function planOrchestration(
  goal:     string,
  context?: string,
): Promise<OrchestrationPlan> {
  const validRoles: AgentRole[] = ["researcher", "writer", "coder", "analyst", "security", "video", "audio", "search"];

  const systemPrompt = `You are a master AI orchestrator. Break high-level goals into parallelizable specialist agent tasks.

Valid roles: ${validRoles.join(", ")}
Valid priorities: 1 (high), 2 (medium), 3 (low)

Return ONLY a valid JSON object matching this exact schema - no markdown, no explanation:
{
  "goal": "string",
  "tasks": [
    { "id": "string", "role": "AgentRole", "task": "string", "context": "string or omitted", "priority": 1|2|3 }
  ],
  "parallelGroups": [
    [ { same task shape } ]
  ]
}

Rules:
- parallelGroups are executed sequentially (group 0 first, then group 1, etc.)
- Tasks within a group run in parallel - no dependencies between them
- Group tasks by dependency stage (e.g. research first, then writing, then review)
- Keep tasks focused and actionable (one clear deliverable per task)
- Maximum 3 groups, maximum 6 tasks per group`;

  const userPrompt = context
    ? `Goal: ${goal}\n\nAdditional context:\n${context}`
    : `Goal: ${goal}`;

  const message = await client.messages.create({
    model:      PLANNER_MODEL,
    max_tokens: 4096,
    system:     systemPrompt,
    messages:   [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find(b => b.type === "text");
  const raw       = textBlock?.type === "text" ? textBlock.text.trim() : "{}";

  let plan: OrchestrationPlan;
  try {
    plan = JSON.parse(raw) as OrchestrationPlan;
  } catch {
    throw new Error(`[Orchestrator] Planner returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  console.log(`[Orchestrator] Plan created: ${plan.tasks.length} tasks in ${plan.parallelGroups.length} groups`);
  return plan;
}

/**
 * Execute an orchestration plan.
 * Parallel groups run sequentially; tasks within each group run in parallel.
 * Returns all AgentResult objects in completion order.
 */
export async function executeOrchestration(
  plan: OrchestrationPlan,
): Promise<AgentResult[]> {
  const allResults: AgentResult[] = [];

  console.log(`[Orchestrator] Executing plan: "${plan.goal}" (${plan.parallelGroups.length} groups)`);

  for (let i = 0; i < plan.parallelGroups.length; i++) {
    const group = plan.parallelGroups[i];
    console.log(`[Orchestrator] Group ${i + 1}/${plan.parallelGroups.length}: spawning ${group.length} parallel agents`);

    const groupResults = await Promise.all(group.map(task => spawnAgent(task)));
    allResults.push(...groupResults);

    const succeeded = groupResults.filter(r => r.success).length;
    console.log(`[Orchestrator] Group ${i + 1} done: ${succeeded}/${group.length} succeeded`);
  }

  console.log(`[Orchestrator] Orchestration complete: ${allResults.filter(r => r.success).length}/${allResults.length} tasks succeeded`);
  return allResults;
}

/**
 * One-shot: plan then execute for a given goal.
 * Main entry point for most use cases.
 */
export async function orchestrate(
  goal:     string,
  context?: string,
): Promise<AgentResult[]> {
  const plan    = await planOrchestration(goal, context);
  const results = await executeOrchestration(plan);
  return results;
}

/**
 * Spawn ALL tasks in parallel with no grouping or dependency ordering.
 * Maximum parallelism - use when all tasks are fully independent.
 */
export async function spawnSpecialistArmy(
  tasks: AgentTask[],
): Promise<AgentResult[]> {
  console.log(`[Orchestrator] Spawning specialist army: ${tasks.length} agents in parallel`);
  const results = await Promise.all(tasks.map(task => spawnAgent(task)));
  const succeeded = results.filter(r => r.success).length;
  console.log(`[Orchestrator] Army done: ${succeeded}/${results.length} agents succeeded`);
  return results;
}
