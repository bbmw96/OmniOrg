// Created by BBMW0 Technologies | bbmw0.com

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

export interface AgentTask {
  id: string;
  agentId: string;
  operation: string;
  payload: Record<string, unknown>;
  priority: number;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  result: string | null;
  cloudTaskId: string | null;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  pushed_to_cloud: number;
  oldestPendingAgeMs: number | null;
}

export interface RecurringTaskDef {
  id: string;
  cronExpression: string;
  agentId: string;
  operation: string;
  payload: Record<string, unknown>;
  lastRun?: string | null;
  enabled: boolean;
}

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS agent_tasks (
    id TEXT PRIMARY KEY,
    agentId TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    priority INTEGER DEFAULT 5,
    status TEXT DEFAULT 'pending',
    scheduledFor TEXT,
    createdAt TEXT NOT NULL,
    startedAt TEXT,
    completedAt TEXT,
    retryCount INTEGER DEFAULT 0,
    maxRetries INTEGER DEFAULT 3,
    lastError TEXT,
    result TEXT,
    cloudTaskId TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_status ON agent_tasks(status);
  CREATE INDEX IF NOT EXISTS idx_scheduled ON agent_tasks(scheduledFor);

  CREATE TABLE IF NOT EXISTS recurring_tasks (
    id TEXT PRIMARY KEY,
    cronExpression TEXT NOT NULL,
    agentId TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    lastRun TEXT,
    enabled INTEGER DEFAULT 1
  );
`;

export class OfflineAgentQueue {
  private db: Database.Database;

  constructor() {
    const dir = path.join(os.homedir(), ".omniorg");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const dbPath = path.join(dir, "agent-queue.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    // Run DDL synchronously via better-sqlite3
    this.db.exec(CREATE_TABLES_SQL);
  }

  enqueue(task: {
    agentId: string;
    operation: string;
    payload: Record<string, unknown>;
    priority?: number;
    scheduledFor?: string | null;
    maxRetries?: number;
  }): string {
    const id = uuidv4();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO agent_tasks
        (id, agentId, operation, payload, priority, status, scheduledFor,
         createdAt, startedAt, completedAt, retryCount, maxRetries, lastError, result, cloudTaskId)
      VALUES
        (@id, @agentId, @operation, @payload, @priority, 'pending', @scheduledFor,
         @createdAt, NULL, NULL, 0, @maxRetries, NULL, NULL, NULL)
    `).run({
      id,
      agentId: task.agentId,
      operation: task.operation,
      payload: JSON.stringify(task.payload),
      priority: task.priority ?? 5,
      scheduledFor: task.scheduledFor ?? null,
      createdAt: now,
      maxRetries: task.maxRetries ?? 3,
    });
    return id;
  }

  dequeue(limit = 10): AgentTask[] {
    const now = new Date().toISOString();
    const rows = this.db.prepare(`
      SELECT * FROM agent_tasks
      WHERE status = 'pending'
        AND (scheduledFor IS NULL OR scheduledFor <= @now)
      ORDER BY priority ASC, createdAt ASC
      LIMIT @limit
    `).all({ now, limit }) as (Omit<AgentTask, "payload"> & { payload: string })[];
    return rows.map(r => ({ ...r, payload: this._parsePayload(r.payload) }));
  }

  private _parsePayload(raw: string): Record<string, unknown> {
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
  }

  markRunning(id: string): void {
    const now = new Date().toISOString();
    this.db.prepare(
      `UPDATE agent_tasks SET status = 'running', startedAt = @now WHERE id = @id`
    ).run({ id, now });
  }

  markCompleted(id: string, result: unknown): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE agent_tasks
      SET status = 'completed', completedAt = @now, result = @result
      WHERE id = @id
    `).run({ id, now, result: JSON.stringify(result) });
  }

  markFailed(id: string, error: string): void {
    const row = this.db.prepare(
      `SELECT retryCount, maxRetries FROM agent_tasks WHERE id = @id`
    ).get({ id }) as Pick<AgentTask, "retryCount" | "maxRetries"> | undefined;
    if (!row) return;

    const newRetryCount = row.retryCount + 1;
    if (newRetryCount >= row.maxRetries) {
      this.db.prepare(`
        UPDATE agent_tasks SET status = 'failed', retryCount = @newRetryCount, lastError = @error
        WHERE id = @id
      `).run({ id, newRetryCount, error });
    } else {
      this.db.prepare(`
        UPDATE agent_tasks SET status = 'pending', retryCount = @newRetryCount, lastError = @error
        WHERE id = @id
      `).run({ id, newRetryCount, error });
    }
  }

  markPushedToCloud(id: string, cloudTaskId: string): void {
    this.db.prepare(`
      UPDATE agent_tasks SET status = 'pushed_to_cloud', cloudTaskId = @cloudTaskId
      WHERE id = @id
    `).run({ id, cloudTaskId });
  }

  getStats(): QueueStats {
    const counts = this.db.prepare(
      `SELECT status, COUNT(*) as count FROM agent_tasks GROUP BY status`
    ).all() as { status: string; count: number }[];

    const statsMap: Record<string, number> = {};
    for (const row of counts) statsMap[row.status] = row.count;

    const oldest = this.db.prepare(`
      SELECT createdAt FROM agent_tasks
      WHERE status = 'pending'
      ORDER BY createdAt ASC
      LIMIT 1
    `).get() as { createdAt: string } | undefined;

    return {
      pending: statsMap["pending"] ?? 0,
      running: statsMap["running"] ?? 0,
      completed: statsMap["completed"] ?? 0,
      failed: statsMap["failed"] ?? 0,
      pushed_to_cloud: statsMap["pushed_to_cloud"] ?? 0,
      oldestPendingAgeMs: oldest
        ? Date.now() - new Date(oldest.createdAt).getTime()
        : null,
    };
  }

  scheduleRecurring(task: RecurringTaskDef): void {
    this.db.prepare(`
      INSERT INTO recurring_tasks (id, cronExpression, agentId, operation, payload, lastRun, enabled)
      VALUES (@id, @cronExpression, @agentId, @operation, @payload, @lastRun, @enabled)
      ON CONFLICT(id) DO UPDATE SET
        cronExpression = excluded.cronExpression,
        agentId = excluded.agentId,
        operation = excluded.operation,
        payload = excluded.payload,
        enabled = excluded.enabled
    `).run({
      id: task.id,
      cronExpression: task.cronExpression,
      agentId: task.agentId,
      operation: task.operation,
      payload: JSON.stringify(task.payload),
      lastRun: task.lastRun ?? null,
      enabled: task.enabled ? 1 : 0,
    });
  }

  processDueRecurring(): AgentTask[] {
    type RawRecurring = { id: string; cronExpression: string; agentId: string; operation: string; payload: string; lastRun: string | null; enabled: number };
    const rows = this.db.prepare(
      `SELECT * FROM recurring_tasks WHERE enabled = 1`
    ).all() as RawRecurring[];

    const created: AgentTask[] = [];
    const now = new Date();

    for (const rec of rows) {
      if (!this.isCronDue(rec.cronExpression, rec.lastRun ?? null)) continue;

      const id = this.enqueue({
        agentId: rec.agentId,
        operation: rec.operation,
        payload: this._parsePayload(rec.payload),
        priority: 5,
        scheduledFor: null,
        maxRetries: 3,
      });

      this.db.prepare(
        `UPDATE recurring_tasks SET lastRun = @now WHERE id = @id`
      ).run({ id: rec.id, now: now.toISOString() });

      const task = this.db.prepare(
        `SELECT * FROM agent_tasks WHERE id = @id`
      ).get({ id }) as AgentTask;
      if (task) created.push(task);
    }

    return created;
  }

  /**
   * Minimal cron-due checker supporting @hourly/@daily/@weekly
   * and "every N minutes" patterns (written as: star-slash-N space-star x4).
   */
  private isCronDue(cron: string, lastRun: string | null): boolean {
    if (!lastRun) return true;
    const elapsed = Date.now() - new Date(lastRun).getTime();
    if (cron === "@hourly") return elapsed >= 3_600_000;
    if (cron === "@daily")  return elapsed >= 86_400_000;
    if (cron === "@weekly") return elapsed >= 604_800_000;
    // Pattern: */N * * * *
    const m = cron.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
    if (m) return elapsed >= parseInt(m[1], 10) * 60_000;
    return elapsed >= 3_600_000;
  }

  cleanup(olderThanDays = 30): number {
    const cutoff = new Date(Date.now() - olderThanDays * 86_400_000).toISOString();
    return this.db.prepare(`
      DELETE FROM agent_tasks
      WHERE status IN ('completed', 'failed') AND createdAt < @cutoff
    `).run({ cutoff }).changes;
  }

  close(): void {
    this.db.close();
  }
}

export const agentQueue = new OfflineAgentQueue();
