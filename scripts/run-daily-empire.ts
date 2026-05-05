// Created by BBMW0 Technologies | bbmw0.com
import "../api/env"; // MUST be first: loads .env before any singleton reads process.env

import { autonomousPublisher } from "../intelligence/content/autonomous-publisher";
import { runDailyProduction } from "../intelligence/content/production-runner";

async function main(): Promise<void> {
  const now = new Date();
  console.log(`[Empire] ═══════════════════════════════════════════`);
  console.log(`[Empire] Daily Content Empire: ${now.toISOString()}`);
  console.log(`[Empire] ═══════════════════════════════════════════\n`);

  // Stage 1: Legacy autonomous publisher (existing content cycle)
  console.log("[Empire] Stage 1: Autonomous publisher cycle...");
  try {
    const result = await autonomousPublisher.runDailyCycle();
    console.log("[Empire] Stage 1 complete:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("[Empire] Stage 1 error (non-fatal, continuing):", err);
  }

  // Stage 2: NanoBanana production runner: all 4 channels, all AI engines
  console.log("\n[Empire] Stage 2: NanoBanana production runner...");
  try {
    await runDailyProduction();
    console.log("[Empire] Stage 2 complete.");
  } catch (err) {
    console.error("[Empire] Stage 2 error:", err);
    process.exit(1);
  }

  // Stage 3: On 1st of month, send monthly report
  if (now.getDate() === 1) {
    console.log("\n[Empire] Stage 3: Monthly report (1st of month)...");
    try {
      const { runMonthlyReport } = await import("../intelligence/reporting/monthly-report-agent");
      await runMonthlyReport();
      console.log("[Empire] Monthly report sent to up866106@gmail.com");
    } catch (err) {
      console.error("[Empire] Monthly report error (non-fatal):", err);
    }
  }

  console.log("\n[Empire] ═══════════════════════════════════════════");
  console.log("[Empire] All stages complete. Good work agents.");
  console.log("[Empire] ═══════════════════════════════════════════");
}

main().catch(err => {
  console.error("[Empire] Fatal error:", err);
  process.exit(1);
});
