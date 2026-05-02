// Created by BBMW0 Technologies | bbmw0.com
import "../api/env"; // MUST be first: loads .env before any singleton reads process.env

import { autonomousPublisher } from "../intelligence/content/autonomous-publisher";

async function main(): Promise<void> {
  console.log("[Empire] Starting daily content empire run...\n");

  const result = await autonomousPublisher.runDailyCycle();

  console.log("\n[Empire] Run complete:");
  console.log(JSON.stringify(result, null, 2));

  if (result.errors.length > 0) {
    console.error("\n[Empire] Errors encountered:", result.errors);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("[Empire] Fatal error:", err);
  process.exit(1);
});
