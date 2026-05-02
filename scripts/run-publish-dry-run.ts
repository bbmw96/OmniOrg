// Created by BBMW0 Technologies | bbmw0.com
import "../api/env"; // MUST be first: loads .env before any singleton reads process.env

import { contentScheduler } from "../intelligence/content/content-scheduler";
import { composioPublisher } from "../intelligence/content/composio-publisher";

async function dryRun(): Promise<void> {
  console.log("[PublishDryRun] Building a test approved post...\n");

  const post = contentScheduler.schedule({
    platform:      "instagram",
    tenantId:      "bbmw0-internal",
    format:        "reels",
    topic:         "AI game development, how I built a viral game in 24 hours",
    caption:       "Built a full viral game using AI in 24 hours. Here is exactly how.\n\n#AIGames #GameDev #IndieGame #Shorts",
    hashtags:      ["#AIGames", "#GameDev", "#IndieGame", "#Shorts"],
    scheduledFor:  new Date(Date.now() + 3600_000).toISOString(),
    timezone:      "Europe/London",
    bestTimeScore: 87,
    status:        "pending-approval",
  });

  console.log("[PublishDryRun] Post created:", post.postId, "— status:", post.status);

  const approved = contentScheduler.approve(post.postId, "bbmw0-dry-run", "Dry-run approval for testing");
  if (!approved) {
    console.error("[PublishDryRun] Approval failed — post not found in queue.");
    process.exit(1);
  }

  console.log("[PublishDryRun] Post approved, dispatching DRY RUN to Composio...\n");

  const result = await composioPublisher.dispatch(approved, true);

  console.log("\n[PublishDryRun] Result:", JSON.stringify(result, null, 2));

  if (result.success) {
    console.log("\n[PublishDryRun] Dry run PASSED. Payload is valid.");
  } else {
    console.error("\n[PublishDryRun] Dry run FAILED:", result.error);
    process.exit(1);
  }
}

dryRun().catch(err => {
  console.error("[PublishDryRun] Fatal error:", err);
  process.exit(1);
});
