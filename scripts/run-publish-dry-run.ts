// Created by BBMW0 Technologies | bbmw0.com
import "../api/env"; // MUST be first: loads .env before any singleton reads process.env

import { composioPublisher } from "../intelligence/content/composio-publisher";
import type { ScheduledPost } from "../intelligence/content/content-scheduler";

async function dryRun(): Promise<void> {
  console.log("[PublishDryRun] Building a test approved post...\n");

  // Build the post directly as approved, bypassing contentScheduler.approve()
  // which would trigger a real (non-dry) internal dispatch.
  const post: ScheduledPost = {
    postId:                "dry-run-test-" + Date.now(),
    platform:              "instagram",
    tenantId:              "bbmw0-internal",
    format:                "reels",
    topic:                 "AI game development, how I built a viral game in 24 hours",
    caption:               "Built a full viral game using AI in 24 hours. Here is exactly how.\n\n#AIGames #GameDev #IndieGame #Shorts",
    hashtags:              ["#AIGames", "#GameDev", "#IndieGame", "#Shorts"],
    scheduledFor:          new Date(Date.now() + 3600_000).toISOString(),
    timezone:              "Europe/London",
    bestTimeScore:         87,
    status:                "approved",
    approvedBy:            "bbmw0-dry-run",
    approvedAt:            new Date().toISOString(),
    policyChecks:          [],
    allPolicyChecksPassed: true,
    createdAt:             new Date().toISOString(),
    updatedAt:             new Date().toISOString(),
  };

  console.log("[PublishDryRun] Post:", post.postId, "status:", post.status);
  console.log("[PublishDryRun] Dispatching DRY RUN to Composio...\n");

  const result = await composioPublisher.dispatch(post, true);

  console.log("\n[PublishDryRun] Result:", JSON.stringify(result, null, 2));

  if (result.success) {
    console.log("\n[PublishDryRun] Dry run PASSED. Payload is valid.");
    console.log("[PublishDryRun] To post live: call composioPublisher.dispatch(post, false) with a real COMPOSIO_API_KEY set.");
  } else {
    console.error("\n[PublishDryRun] Dry run FAILED:", result.error);
    process.exit(1);
  }
}

dryRun().catch(err => {
  console.error("[PublishDryRun] Fatal error:", err);
  process.exit(1);
});
