// Created by BBMW0 Technologies | bbmw0.com
import "../api/env"; // ← MUST be first: loads .env before any singleton reads process.env

import * as path from "path";
import * as fs from "fs";
import { agentQueue } from "../intelligence/core/offline-agent-queue";

async function setupGameScheduler(): Promise<void> {
  console.log("[GameScheduler] Setting up 3-month viral game generation schedule...");

  // Ensure results/games output directory exists
  const gamesOutputDir = path.join(__dirname, "..", "results", "games");
  fs.mkdirSync(gamesOutputDir, { recursive: true });
  console.log(`[GameScheduler] Output directory ready: ${gamesOutputDir}`);

  // Schedule game generation every 90 days (quarterly)
  agentQueue.scheduleRecurring({
    id: "quarterly-game-generation",
    cronExpression: "0 9 1 1,4,7,10 *",   // 9am on Jan 1, Apr 1, Jul 1, Oct 1
    agentId: "game-generator",
    operation: "generate-and-save-game-package",
    payload: { outputDir: gamesOutputDir },
    enabled: true,
  });

  // Schedule weekly @bbm0902 influencer batch
  agentQueue.scheduleRecurring({
    id: "weekly-bbm0902-influencer-batch",
    cronExpression: "0 7 * * 1",   // 7am every Monday
    agentId: "bbm0902-influencer-engine",
    operation: "generate-weekly-batch",
    payload: {},
    enabled: true,
  });

  // Schedule daily content engine run
  agentQueue.scheduleRecurring({
    id: "daily-content-engine",
    cronExpression: "0 6 * * *",   // 6am every day
    agentId: "content-engine",
    operation: "full-run",
    payload: {},
    enabled: true,
  });

  const stats = agentQueue.getStats();
  console.log("[GameScheduler] Recurring tasks registered.");
  console.log("[GameScheduler] Queue stats:", stats);

  // Enqueue first game generation immediately (for testing)
  const immediateTaskId = agentQueue.enqueue({
    agentId: "game-generator",
    operation: "generate-and-save-game-package",
    payload: { outputDir: gamesOutputDir, immediate: true },
    priority: 3,
    maxRetries: 2,
  });
  console.log(`[GameScheduler] Immediate game generation queued: ${immediateTaskId}`);
  console.log(`[GameScheduler] Next quarterly date: see viral-game-generator.getNextScheduledDate()`);
  console.log("");
  console.log("[GameScheduler] To start the daemon (processes queue automatically):");
  console.log("  npx ts-node scripts/start-agent-daemon.ts");
  console.log("  npx ts-node scripts/start-agent-daemon.ts install   # install as Windows service");
}

setupGameScheduler().catch(console.error);
