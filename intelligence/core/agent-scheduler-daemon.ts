// Created by BBMW0 Technologies | bbmw0.com

import { agentQueue, AgentTask } from "./offline-agent-queue";
import { cloudSyncBridge } from "./cloud-sync-bridge";
import * as path from "path";

export class AgentSchedulerDaemon {
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  async start(): Promise<void> {
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║  [OmniOrg Daemon] Starting NEUROMESH Agent Scheduler  ║");
    console.log("╚══════════════════════════════════════════════════════╝");
    console.log(`[OmniOrg Daemon] PID: ${process.pid} | Started: ${new Date().toISOString()}`);

    this.running = true;

    // Graceful shutdown handlers
    process.on("SIGTERM", () => this.shutdown("SIGTERM"));
    process.on("SIGINT", () => this.shutdown("SIGINT"));

    // Run immediately on start
    await this.tick();

    // Tick every 60 seconds
    this.tickInterval = setInterval(async () => {
      if (this.running) await this.tick();
    }, 60_000);

    // Cloud sync every 5 minutes
    this.syncInterval = setInterval(async () => {
      if (this.running) await this.cloudSync();
    }, 300_000);

    console.log("[OmniOrg Daemon] Scheduler running. Tick: 60s | Cloud sync: 5m");
  }

  async tick(): Promise<void> {
    try {
      // Process due recurring tasks first
      const recurring = agentQueue.processDueRecurring();
      if (recurring.length > 0) {
        console.log(`[OmniOrg Daemon] Enqueued ${recurring.length} recurring task(s)`);
      }

      // Dequeue up to 5 tasks
      const tasks = agentQueue.dequeue(5);
      if (tasks.length > 0) {
        console.log(`[OmniOrg Daemon] Processing ${tasks.length} task(s)`);
      }

      for (const task of tasks) {
        agentQueue.markRunning(task.id);
        try {
          const result = await this.executeTask(task);
          agentQueue.markCompleted(task.id, result);
          console.log(`[OmniOrg Daemon] Task ${task.id} (${task.agentId}/${task.operation}) completed`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          agentQueue.markFailed(task.id, msg);
          console.error(`[OmniOrg Daemon] Task ${task.id} failed: ${msg}`);
        }
      }

      // Log stats
      const stats = agentQueue.getStats();
      console.log(
        `[OmniOrg Daemon] Stats, pending: ${stats.pending} | running: ${stats.running} | ` +
        `completed: ${stats.completed} | failed: ${stats.failed} | cloud: ${stats.pushed_to_cloud}` +
        (stats.oldestPendingAgeMs !== null
          ? ` | oldest pending: ${Math.round(stats.oldestPendingAgeMs / 1000)}s`
          : "")
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[OmniOrg Daemon] tick() error: ${msg}`);
    }
  }

  async executeTask(task: AgentTask): Promise<unknown> {
    // payload is already Record<string, unknown> after dequeue deserializes it
    const payload = task.payload;

    switch (task.agentId) {
      case "content-engine": {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const mod = require("../content/run-content-engine-programmatic");
          if (typeof mod?.run === "function") {
            return await mod.run(task.operation, payload);
          }
          console.warn("[OmniOrg Daemon] content-engine: run() not found in module");
          return null;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[OmniOrg Daemon] content-engine module not found: ${msg}`);
          return null;
        }
      }

      case "bbm0902-influencer-engine": {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { bbm0902Engine } = require("../agents/bbm0902-influencer-engine");
          const influencerName: string = String(payload?.influencerName ?? payload?.name ?? "unknown");
          return await bbm0902Engine.generateInfluencerShort(influencerName);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[OmniOrg Daemon] bbm0902-influencer-engine not found: ${msg}`);
          return null;
        }
      }

      case "game-generator": {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { viralGameGenerator } = require("../content/viral-game-generator");
          if (task.operation === "generate-and-save-game-package") {
            const outputDir: string = String(payload?.outputDir ?? path.join(__dirname, "../../results/games"));
            const pkg = await viralGameGenerator.generateGamePackage();
            viralGameGenerator.saveGamePackage(pkg, outputDir);
            return { status: "completed", packageId: pkg.id, quarter: pkg.quarter, title: pkg.concept.title };
          }
          console.warn(`[OmniOrg Daemon] game-generator: unknown operation "${task.operation}"`);
          return null;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[OmniOrg Daemon] game-generator error: ${msg}`);
          return null;
        }
      }

      default: {
        console.warn(`[OmniOrg Daemon] Unknown agent: ${task.agentId}`);
        return null;
      }
    }
  }

  async cloudSync(): Promise<void> {
    try {
      await cloudSyncBridge.syncBothDirections(agentQueue);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[OmniOrg Daemon] cloudSync() error: ${msg}`);
    }
  }

  installAsWindowsService(): void {
    let Service: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeWindows = require("node-windows");
      Service = nodeWindows.Service;
    } catch {
      console.error("[OmniOrg Daemon] node-windows not available. Install with: npm install node-windows");
      return;
    }

    const scriptPath = path.resolve(__dirname, "../../scripts/start-agent-daemon.ts");

    const svc = new Service({
      name: "OmniOrg-AgentDaemon",
      description: "NEUROMESH Agent Scheduler, runs content agents on schedule",
      script: scriptPath,
      nodeOptions: ["--require", "ts-node/register"],
      env: [
        { name: "NODE_ENV", value: process.env.NODE_ENV ?? "production" },
      ],
    });

    svc.on("install", () => {
      console.log("[OmniOrg Daemon] Windows service installed successfully.");
      console.log("[OmniOrg Daemon] Starting service...");
      svc.start();
    });

    svc.on("alreadyinstalled", () => {
      console.log("[OmniOrg Daemon] Service is already installed.");
    });

    svc.on("error", (err: Error) => {
      console.error(`[OmniOrg Daemon] Service install error: ${err.message}`);
    });

    console.log("[OmniOrg Daemon] Installing Windows service 'OmniOrg-AgentDaemon' (auto-start on boot)...");
    svc.install();
  }

  uninstallWindowsService(): void {
    let Service: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeWindows = require("node-windows");
      Service = nodeWindows.Service;
    } catch {
      console.error("[OmniOrg Daemon] node-windows not available.");
      return;
    }

    const scriptPath = path.resolve(__dirname, "../../scripts/start-agent-daemon.ts");

    const svc = new Service({
      name: "OmniOrg-AgentDaemon",
      script: scriptPath,
    });

    svc.on("uninstall", () => {
      console.log("[OmniOrg Daemon] Windows service uninstalled successfully.");
    });

    svc.on("error", (err: Error) => {
      console.error(`[OmniOrg Daemon] Service uninstall error: ${err.message}`);
    });

    console.log("[OmniOrg Daemon] Uninstalling Windows service 'OmniOrg-AgentDaemon'...");
    svc.uninstall();
  }

  private shutdown(signal: string): void {
    console.log(`\n[OmniOrg Daemon] Received ${signal}, shutting down gracefully...`);
    this.running = false;
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.syncInterval) clearInterval(this.syncInterval);
    agentQueue.close();
    console.log("[OmniOrg Daemon] Shutdown complete.");
    process.exit(0);
  }
}

export const agentDaemon = new AgentSchedulerDaemon();
export default agentDaemon;
