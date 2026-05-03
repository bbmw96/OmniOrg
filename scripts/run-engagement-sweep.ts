// Created by BBMW0 Technologies | bbmw0.com
// Run manually: npm run engage:sweep
// Called automatically from the daily empire cycle at 07:00 each day.
//
// No manual configuration needed.
// Google Play package names are auto-discovered from results/ folder.
// YouTube and Instagram IDs are pulled from the upload log automatically.

import * as fs   from "fs";
import * as path from "path";
import "../api/env";
import { engagementAgent } from "../intelligence/content/engagement-agent";

const RESULTS_DIR      = path.join(__dirname, "../results");
const UPLOAD_LOG_PATH  = path.join(RESULTS_DIR, "upload-log.json");

interface UploadLogEntry {
  contentHash: string;
  titleSlug:   string;
  platform:    string;
  uploadedAt:  string;
  contentId:   string;
}

function loadUploadLog(): UploadLogEntry[] {
  if (!fs.existsSync(UPLOAD_LOG_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(UPLOAD_LOG_PATH, "utf8")) as UploadLogEntry[]; }
  catch { return []; }
}

function discoverGooglePlayPackages(): string[] {
  if (!fs.existsSync(RESULTS_DIR)) return [];
  try {
    return fs.readdirSync(RESULTS_DIR)
      .map(entry => {
        const p = path.join(RESULTS_DIR, entry, "capacitor-manifest.json");
        if (!fs.existsSync(p)) return "";
        try {
          const m = JSON.parse(fs.readFileSync(p, "utf8")) as { appId?: string };
          return m.appId ?? "";
        } catch { return ""; }
      })
      .filter(Boolean);
  } catch { return []; }
}

async function main(): Promise<void> {
  console.log("[EngageSweep] Starting engagement sweep...");

  const uploadLog   = loadUploadLog();
  const cutoff      = new Date(Date.now() - 30 * 86400000).toISOString();
  const recentLog   = uploadLog.filter(e => e.uploadedAt >= cutoff);

  const ytMainIds   = recentLog
    .filter(e => e.platform === "youtube" && e.contentId.startsWith("bbmw0-main"))
    .map(e => e.contentId);

  const ytGamesIds  = recentLog
    .filter(e => e.platform === "youtube" && e.contentId.startsWith("bbmw0-games"))
    .map(e => e.contentId);

  const igIds       = recentLog
    .filter(e => e.platform === "instagram")
    .map(e => e.contentId);

  const playPkgs    = discoverGooglePlayPackages();

  console.log(`[EngageSweep] YouTube Main:  ${ytMainIds.length} recent videos`);
  console.log(`[EngageSweep] YouTube Games: ${ytGamesIds.length} recent videos`);
  console.log(`[EngageSweep] Instagram:     ${igIds.length} recent posts`);
  console.log(`[EngageSweep] Google Play:   ${playPkgs.length} apps (${playPkgs.join(", ") || "none yet"})`);

  const result = await engagementAgent.runDailySweep({
    youtubeMainVideoIds:  ytMainIds,
    youtubeGamesVideoIds: ytGamesIds,
    instagramMediaIds:    igIds,
    googlePlayPackages:   playPkgs,
  });

  console.log("\n[EngageSweep] Results:");
  console.log(`  Run ID:        ${result.runId}`);
  console.log(`  Replied:       ${result.totalReplied}`);
  console.log(`  Skipped:       ${result.totalSkipped}`);
  console.log(`  YouTube Main:  ${result.byPlatform.youtube_main.replied} replies`);
  console.log(`  YouTube Games: ${result.byPlatform.youtube_games.replied} replies`);
  console.log(`  Instagram:     ${result.byPlatform.instagram.replied} replies`);
  console.log(`  Google Play:   ${result.byPlatform.google_play.replied} replies`);

  if (result.errors.length > 0) {
    console.error("\n[EngageSweep] Errors:");
    result.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log("\n[EngageSweep] Done.");
  process.exit(0);
}

main().catch(err => {
  console.error("[EngageSweep] Fatal:", err);
  process.exit(1);
});
