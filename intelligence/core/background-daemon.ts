// Created by BBMW0 Technologies | bbmw0.com
/**
 * OMNIORG BACKGROUND DAEMON
 *
 * 24/7 orchestration engine that:
 * 1. Runs all 20,000+ agents in rolling concurrent worker pools
 * 2. Picks up queued social publish jobs and executes them
 * 3. Routes incoming content-generation tasks to best available engine
 * 4. Monitors engine health, auto-switches on failure
 * 5. Logs all activity to output/daemon/daemon-YYYY-MM-DD.jsonl
 * 6. Self-heals: restarts failed workers, clears stuck jobs
 *
 * Start: ts-node intelligence/core/background-daemon.ts
 * Or:    node -r ts-node/register intelligence/core/background-daemon.ts
 */

import { config as loadEnv } from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as crypto from "crypto";

import type { RouteRequest } from "../../core/engine-router";

// ── TYPES ──────────────────────────────────────────────────────────────────────

export type AgentStatus = "idle" | "running" | "completed" | "failed" | "cooldown";
export type TaskType =
  | "content-generate"
  | "social-publish"
  | "research"
  | "analysis"
  | "code-gen"
  | "video-gen"
  | "voice-gen"
  | "seo"
  | "moderation"
  | "monitoring";
export type TaskPriority = "critical" | "high" | "normal" | "low" | "background";

export interface AgentWorker {
  id:            string;
  department:    string;
  speciality:    string;
  status:        AgentStatus;
  currentTask?:  string;
  lastActiveAt:  number;
  completedJobs: number;
  failedJobs:    number;
  cooldownUntil?: number;
}

export interface DaemonTask {
  id:           string;
  type:         TaskType;
  priority:     TaskPriority;
  payload:      Record<string, unknown>;
  assignedTo?:  string;
  createdAt:    number;
  startedAt?:   number;
  completedAt?: number;
  status:       "queued" | "running" | "done" | "failed";
  retries:      number;
  error?:       string;
}

export interface DaemonStats {
  uptime:           number;
  totalAgents:      number;
  activeAgents:     number;
  idleAgents:       number;
  tasksQueued:      number;
  tasksCompleted:   number;
  tasksFailed:      number;
  engineHealthMap:  Record<string, boolean>;
  throughputPerMin: number;
  lastHeartbeatAt:  number;
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────────

const DAEMON_VERSION          = "3.0.0";
const MAX_CONCURRENT_WORKERS  = 50;
const TASK_POLL_INTERVAL_MS   = 2_000;
const HEALTH_CHECK_INTERVAL_MS = 30_000;
const LOG_FLUSH_INTERVAL_MS   = 10_000;
const MAX_TASK_RETRIES        = 3;
const WORKER_COOLDOWN_MS      = 5_000;
const QUEUE_FILE              = "output/daemon/task-queue.json";
const STATS_FILE              = "output/daemon/daemon-stats.json";
const STUCK_WORKER_TIMEOUT_MS = 5 * 60 * 1_000; // 5 minutes

// ── AGENT POOL DEFINITION ─────────────────────────────────────────────────────

const AGENT_DEPARTMENTS = [
  "VIDEO_CONTENT", "RESEARCH",      "CODE",        "MARKETING",  "SECURITY",
  "FINANCE",       "LEGAL",         "MEDICAL",     "EDUCATION",  "ANALYTICS",
  "AUTOMATION",    "SOCIAL_MEDIA",  "SEO",         "TRANSLATION","MODERATION",
  "DATA_SCIENCE",  "DEVOPS",        "PRODUCT",     "DESIGN",     "CUSTOMER_SUCCESS",
  "HR",            "COMPLIANCE",    "RISK",        "LOGISTICS",  "MANUFACTURING",
  "AGRICULTURE",   "ENERGY",        "PHARMA",      "BIOTECH",    "QUANTUM",
] as const; // 30 departments

const AGENT_SPECIALITIES_PER_DEPT = [
  "director",    "writer",      "analyst",     "researcher",  "builder",
  "reviewer",    "optimizer",   "publisher",   "monitor",     "auditor",
  "trainer",     "deployer",    "tester",      "architect",   "strategist",
  "specialist",  "coordinator", "executor",    "planner",     "validator",
  "transformer", "extractor",   "classifier",  "predictor",   "generator",
] as const; // 25 specialities

// 30 × 25 = 750 templates. Each instantiated 27 times → 750 × 27 = 20,250 agents
const INSTANCES_PER_TEMPLATE = 27;

function buildAgentPool(): AgentWorker[] {
  const pool: AgentWorker[] = [];
  const now = Date.now();

  for (const dept of AGENT_DEPARTMENTS) {
    for (const spec of AGENT_SPECIALITIES_PER_DEPT) {
      for (let instance = 0; instance < INSTANCES_PER_TEMPLATE; instance++) {
        pool.push({
          id:            `${dept.toLowerCase()}-${spec}-${String(instance).padStart(3, "0")}`,
          department:    dept,
          speciality:    spec,
          status:        "idle",
          lastActiveAt:  now,
          completedJobs: 0,
          failedJobs:    0,
        });
      }
    }
  }

  return pool;
}

const AGENT_POOL: AgentWorker[] = buildAgentPool();

// ── LOGGING ───────────────────────────────────────────────────────────────────

type LogLevel = "info" | "warn" | "error" | "debug";

const logBuffer: string[] = [];

const LEVEL_COLOURS: Record<LogLevel, string> = {
  info:  "\x1b[36m",   // cyan
  warn:  "\x1b[33m",   // yellow
  error: "\x1b[31m",   // red
  debug: "\x1b[90m",   // grey
};
const RESET = "\x1b[0m";

function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  const entry = JSON.stringify({ ts, level, message, ...(data ? { data } : {}) });
  logBuffer.push(entry);

  const colour  = LEVEL_COLOURS[level];
  const label   = `${colour}[${level.toUpperCase()}]${RESET}`;
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  console.log(`${ts} ${label} ${message}${dataStr}`);
}

function flushLogs(): void {
  if (logBuffer.length === 0) return;

  const dateStr  = new Date().toISOString().slice(0, 10);
  const logDir   = "output/daemon";
  const logFile  = path.join(logDir, `daemon-${dateStr}.jsonl`);

  try {
    ensureDir(logDir);
    fs.appendFileSync(logFile, logBuffer.join("\n") + "\n", "utf8");
  } catch (err) {
    console.error("[Daemon] Failed to flush logs:", err);
  }

  logBuffer.length = 0;
}

// ── FILE HELPERS ──────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ── TASK QUEUE ────────────────────────────────────────────────────────────────

let taskQueue: DaemonTask[] = [];

// Completed/failed counters for throughput tracking
let completedTotal = 0;
let failedTotal    = 0;
let completedInLastMinute = 0;
let throughputPerMin      = 0;

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical:   0,
  high:       1,
  normal:     2,
  low:        3,
  background: 4,
};

function loadTaskQueue(): DaemonTask[] {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      const raw = fs.readFileSync(QUEUE_FILE, "utf8");
      const parsed = JSON.parse(raw) as DaemonTask[];
      // Reset any stale "running" tasks back to "queued" on restart
      return parsed.map((t) =>
        t.status === "running" ? { ...t, status: "queued" } : t
      );
    }
  } catch (err) {
    log("warn", "Could not load task queue from disk, starting fresh", { err: String(err) });
  }
  return [];
}

function saveTaskQueue(tasks: DaemonTask[]): void {
  try {
    ensureDir(path.dirname(QUEUE_FILE));
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(tasks, null, 2), "utf8");
  } catch (err) {
    log("error", "Failed to save task queue", { err: String(err) });
  }
}

function enqueueTask(
  type: TaskType,
  payload: Record<string, unknown>,
  priority: TaskPriority = "normal"
): DaemonTask {
  const task: DaemonTask = {
    id:        crypto.randomUUID(),
    type,
    priority,
    payload,
    createdAt: Date.now(),
    status:    "queued",
    retries:   0,
  };
  taskQueue.push(task);
  saveTaskQueue(taskQueue);
  log("debug", `Task enqueued: ${task.id}`, { type, priority });
  return task;
}

function getNextTask(): DaemonTask | undefined {
  const queued = taskQueue
    .filter((t) => t.status === "queued")
    .sort((a, b) => {
      const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pd !== 0) return pd;
      return a.createdAt - b.createdAt; // FIFO within same priority
    });
  return queued[0];
}

// ── WORKER DISPATCH ───────────────────────────────────────────────────────────

function getIdleWorker(dept?: string): AgentWorker | undefined {
  const now = Date.now();
  const candidates = AGENT_POOL.filter((w) => {
    if (w.status === "cooldown" && w.cooldownUntil !== undefined && now < w.cooldownUntil) {
      return false;
    }
    // Worker has exited cooldown  -  reset to idle
    if (w.status === "cooldown") {
      w.status = "idle";
      w.cooldownUntil = undefined;
    }
    if (w.status !== "idle") return false;
    if (dept && w.department !== dept) return false;
    return true;
  });

  if (candidates.length === 0) return undefined;
  // Prefer workers with fewer failed jobs for reliability
  candidates.sort((a, b) => a.failedJobs - b.failedJobs);
  return candidates[0];
}

function markWorkerBusy(worker: AgentWorker, taskId: string): void {
  worker.status      = "running";
  worker.currentTask = taskId;
  worker.lastActiveAt = Date.now();
}

function markWorkerIdle(worker: AgentWorker, succeeded: boolean): void {
  if (succeeded) {
    worker.completedJobs++;
    worker.status = "idle";
  } else {
    worker.failedJobs++;
    worker.status       = "cooldown";
    worker.cooldownUntil = Date.now() + WORKER_COOLDOWN_MS;
  }
  worker.currentTask = undefined;
  worker.lastActiveAt = Date.now();
}

// ── TASK EXECUTION ────────────────────────────────────────────────────────────

async function executeTask(task: DaemonTask, worker: AgentWorker): Promise<void> {
  task.startedAt = Date.now();
  task.status    = "running";
  task.assignedTo = worker.id;
  saveTaskQueue(taskQueue);

  log("info", `Executing task ${task.id} (${task.type}) on worker ${worker.id}`);

  try {
    switch (task.type) {
      case "content-generate": {
        const { routeGenerate } = require("../../core/engine-router") as typeof import("../../core/engine-router");
        const req: RouteRequest = {
          capability: "chat",
          prompt:     String(task.payload.prompt ?? "Generate content"),
          maxTokens:  Number(task.payload.maxTokens ?? 1024),
        };
        const result = await routeGenerate(req);
        log("debug", `content-generate done via ${result.engine}`, { taskId: task.id });
        break;
      }

      case "social-publish": {
        const { processQueue } = require("../../intelligence/social/social-publisher") as typeof import("../../intelligence/social/social-publisher");
        await processQueue();
        log("debug", "social-publish queue processed", { taskId: task.id });
        break;
      }

      case "research": {
        const { routeGenerate } = require("../../core/engine-router") as typeof import("../../core/engine-router");
        const req: RouteRequest = {
          capability: "chat",
          prompt:     String(task.payload.prompt ?? "Research this topic"),
          maxTokens:  Number(task.payload.maxTokens ?? 2048),
        };
        const result = await routeGenerate(req);
        log("debug", `research done via ${result.engine}`, { taskId: task.id });
        break;
      }

      case "analysis": {
        const { routeGenerate } = require("../../core/engine-router") as typeof import("../../core/engine-router");
        const req: RouteRequest = {
          capability: "reasoning",
          prompt:     String(task.payload.prompt ?? "Analyse the provided data"),
          maxTokens:  Number(task.payload.maxTokens ?? 2048),
        };
        const result = await routeGenerate(req);
        log("debug", `analysis done via ${result.engine}`, { taskId: task.id });
        break;
      }

      case "code-gen": {
        const { routeGenerate } = require("../../core/engine-router") as typeof import("../../core/engine-router");
        const req: RouteRequest = {
          capability: "code",
          prompt:     String(task.payload.prompt ?? "Generate code"),
          maxTokens:  Number(task.payload.maxTokens ?? 4096),
        };
        const result = await routeGenerate(req);
        log("debug", `code-gen done via ${result.engine}`, { taskId: task.id });
        break;
      }

      case "video-gen":
      case "voice-gen": {
        // Placeholder: route to chat engine for script/prompt generation
        const { routeGenerate } = require("../../core/engine-router") as typeof import("../../core/engine-router");
        const req: RouteRequest = {
          capability: "chat",
          prompt:     String(task.payload.prompt ?? `Generate ${task.type} script`),
          maxTokens:  Number(task.payload.maxTokens ?? 1024),
        };
        const result = await routeGenerate(req);
        log("debug", `${task.type} script generated via ${result.engine}`, { taskId: task.id });
        break;
      }

      case "seo": {
        const { routeGenerate } = require("../../core/engine-router") as typeof import("../../core/engine-router");
        const req: RouteRequest = {
          capability: "fast",
          prompt:     String(task.payload.prompt ?? "Optimise SEO for this content"),
          maxTokens:  Number(task.payload.maxTokens ?? 512),
        };
        const result = await routeGenerate(req);
        log("debug", `seo done via ${result.engine}`, { taskId: task.id });
        break;
      }

      case "moderation": {
        const content = String(task.payload.content ?? "");
        const BLOCKED_PATTERNS = [
          /\b(spam|phishing|malware|exploit|hack|ddos)\b/i,
          /\b(nude|explicit|nsfw|xxx|adult)\b/i,
          /\b(hate|racist|slur|bigot)\b/i,
        ];
        const flagged = BLOCKED_PATTERNS.some((p) => p.test(content));
        log(flagged ? "warn" : "debug", `moderation ${flagged ? "FLAGGED" : "passed"}`, {
          taskId: task.id,
          flagged,
        });
        break;
      }

      case "monitoring": {
        const stats = getDaemonStats();
        log("info", "Monitoring heartbeat", {
          uptime:       stats.uptime,
          activeAgents: stats.activeAgents,
          tasksQueued:  stats.tasksQueued,
          throughput:   stats.throughputPerMin,
        });
        break;
      }

      default: {
        const { routeGenerate } = require("../../core/engine-router") as typeof import("../../core/engine-router");
        const req: RouteRequest = {
          capability: "chat",
          prompt:     String(task.payload.prompt ?? "Process task"),
          maxTokens:  Number(task.payload.maxTokens ?? 1024),
        };
        const result = await routeGenerate(req);
        log("debug", `default task done via ${result.engine}`, { taskId: task.id });
        break;
      }
    }

    // Success path
    task.status      = "done";
    task.completedAt = Date.now();
    completedTotal++;
    completedInLastMinute++;
    markWorkerIdle(worker, true);
    log("info", `Task ${task.id} completed successfully`);

  } catch (err) {
    task.retries++;
    if (task.retries < MAX_TASK_RETRIES) {
      task.status = "queued";
      log("warn", `Task ${task.id} failed (attempt ${task.retries}/${MAX_TASK_RETRIES}), re-queuing`, {
        error: String(err),
      });
    } else {
      task.status = "failed";
      task.error  = String(err);
      failedTotal++;
      log("error", `Task ${task.id} permanently failed after ${task.retries} retries`, {
        error: String(err),
      });
    }
    markWorkerIdle(worker, false);
  }

  saveTaskQueue(taskQueue);
}

// ── ENGINE HEALTH ─────────────────────────────────────────────────────────────

const engineHealthMap: Record<string, boolean> = {
  anthropic: false,
  openai:    false,
  groq:      false,
  deepseek:  false,
  glm:       false,
  gemini:    false,
  ollama:    false,
};

function checkEngineHealth(): void {
  const envKeyMap: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai:    "OPENAI_API_KEY",
    groq:      "GROQ_API_KEY",
    deepseek:  "DEEPSEEK_API_KEY",
    glm:       "GLM_API_KEY",
    gemini:    "GEMINI_API_KEY",
    ollama:    "OLLAMA_BASE_URL",
  };

  let anyHealthy = false;
  for (const [engine, envKey] of Object.entries(envKeyMap)) {
    const healthy = Boolean(process.env[envKey]);
    engineHealthMap[engine] = healthy;
    if (healthy) anyHealthy = true;
  }

  if (!anyHealthy) {
    log("warn", "No AI engines are healthy  -  check environment variables");
  } else {
    const healthyList = Object.entries(engineHealthMap)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ");
    log("debug", `Engine health check passed. Healthy: ${healthyList}`);
  }
}

function resetStuckWorkers(): void {
  const now         = Date.now();
  let resetCount    = 0;

  for (const worker of AGENT_POOL) {
    if (worker.status === "running" && now - worker.lastActiveAt > STUCK_WORKER_TIMEOUT_MS) {
      log("warn", `Resetting stuck worker ${worker.id} (task: ${worker.currentTask ?? "unknown"})`);

      // Mark the assigned task as re-queued if we can find it
      if (worker.currentTask) {
        const task = taskQueue.find((t) => t.id === worker.currentTask);
        if (task && task.status === "running") {
          task.retries++;
          if (task.retries < MAX_TASK_RETRIES) {
            task.status = "queued";
          } else {
            task.status = "failed";
            task.error  = "Timed out: worker was stuck";
            failedTotal++;
          }
        }
      }

      worker.status       = "cooldown";
      worker.cooldownUntil = now + WORKER_COOLDOWN_MS;
      worker.currentTask  = undefined;
      worker.failedJobs++;
      resetCount++;
    }
  }

  if (resetCount > 0) {
    log("info", `Reset ${resetCount} stuck worker(s)`);
    saveTaskQueue(taskQueue);
  }
}

// ── STATS ─────────────────────────────────────────────────────────────────────

const daemonStartedAt = Date.now();

export function getDaemonStats(): DaemonStats {
  const activeAgents = AGENT_POOL.filter((w) => w.status === "running").length;
  const idleAgents   = AGENT_POOL.filter((w) => w.status === "idle").length;
  const tasksQueued  = taskQueue.filter((t) => t.status === "queued").length;

  return {
    uptime:           Math.floor((Date.now() - daemonStartedAt) / 1_000),
    totalAgents:      AGENT_POOL.length,
    activeAgents,
    idleAgents,
    tasksQueued,
    tasksCompleted:   completedTotal,
    tasksFailed:      failedTotal,
    engineHealthMap:  { ...engineHealthMap },
    throughputPerMin,
    lastHeartbeatAt:  Date.now(),
  };
}

function saveStats(): void {
  try {
    ensureDir(path.dirname(STATS_FILE));
    const stats = getDaemonStats();
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), "utf8");
  } catch (err) {
    log("error", "Failed to save daemon stats", { err: String(err) });
  }
}

// ── CONTROL LOOPS ─────────────────────────────────────────────────────────────

function startDispatchLoop(): void {
  setInterval(async () => {
    const activeCount = AGENT_POOL.filter((w) => w.status === "running").length;
    if (activeCount >= MAX_CONCURRENT_WORKERS) return;

    const slots = MAX_CONCURRENT_WORKERS - activeCount;
    const tasks: DaemonTask[] = [];

    for (let i = 0; i < slots; i++) {
      const task = getNextTask();
      if (!task) break;
      // Mark as running in-memory immediately to prevent double-dispatch
      task.status = "running";
      tasks.push(task);
    }

    for (const task of tasks) {
      const worker = getIdleWorker();
      if (!worker) {
        // No worker available  -  put task back in queue
        task.status = "queued";
        continue;
      }
      markWorkerBusy(worker, task.id);
      executeTask(task, worker).catch((err) => {
        log("error", `Unhandled executeTask error: ${err}`);
      });
    }
  }, TASK_POLL_INTERVAL_MS);
}

function startHealthLoop(): void {
  // Run once immediately, then on interval
  checkEngineHealth();
  resetStuckWorkers();

  setInterval(() => {
    checkEngineHealth();
    resetStuckWorkers();
    log("debug", "Health check cycle complete");
  }, HEALTH_CHECK_INTERVAL_MS);
}

function startLogLoop(): void {
  setInterval(() => {
    flushLogs();
  }, LOG_FLUSH_INTERVAL_MS);
}

function startStatsLoop(): void {
  // Track throughput: reset the minute counter every 60s
  setInterval(() => {
    throughputPerMin        = completedInLastMinute;
    completedInLastMinute   = 0;
    saveStats();
    log("debug", `Stats saved. Throughput last min: ${throughputPerMin} tasks`);
  }, 60_000);
}

// ── STARTUP & SHUTDOWN ────────────────────────────────────────────────────────

let daemonRunning = false;

export async function startDaemon(): Promise<void> {
  if (daemonRunning) {
    log("warn", "Daemon is already running");
    return;
  }
  daemonRunning = true;

  // 1. Load environment variables
  loadEnv({ path: path.resolve(__dirname, "../../.env") });

  // 2. Ensure output directories exist
  ensureDir("output/daemon");
  ensureDir("output/social");
  ensureDir("output/logs");

  // 3. Log startup banner
  log("info", "═══════════════════════════════════════════════════════════");
  log("info", `  OmniOrg Background Daemon v${DAEMON_VERSION}  -  STARTING`);
  log("info", `  Agents loaded   : ${AGENT_POOL.length.toLocaleString()}`);
  log("info", `  Max concurrency : ${MAX_CONCURRENT_WORKERS} workers`);
  log("info", `  Host            : ${os.hostname()} (${os.platform()}/${os.arch()})`);
  log("info", `  Node.js         : ${process.version}`);
  log("info", "═══════════════════════════════════════════════════════════");

  // 4. Load existing task queue from disk
  taskQueue = loadTaskQueue();
  const pending = taskQueue.filter((t) => t.status === "queued").length;
  log("info", `Task queue loaded: ${taskQueue.length} total, ${pending} queued`);

  // 5. Start all 4 control loops
  startDispatchLoop();
  startHealthLoop();
  startLogLoop();
  startStatsLoop();

  // 6. Seed 5 monitoring tasks into the queue
  for (let i = 0; i < 5; i++) {
    enqueueTask("monitoring", { seedIndex: i }, "background");
  }
  log("info", "Seeded 5 monitoring tasks into the queue");

  // 7. Register graceful shutdown handlers
  const shutdown = (signal: string) => {
    log("info", `Received ${signal}  -  shutting down gracefully...`);
    stopDaemon();
    process.exit(0);
  };

  process.on("SIGINT",  () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // 8. Ready
  log("info", "Daemon ready. Waiting for tasks...");
}

export function stopDaemon(): void {
  log("info", "Daemon stopping...");
  saveStats();
  saveTaskQueue(taskQueue);
  flushLogs();
  daemonRunning = false;
  log("info", "Daemon stopped cleanly");
  // Final flush after the stop message
  flushLogs();
}

// ── CLI ENTRY POINT ───────────────────────────────────────────────────────────

if (require.main === module) {
  startDaemon().catch((err) => {
    console.error("[Daemon] Fatal startup error:", err);
    process.exit(1);
  });
}
