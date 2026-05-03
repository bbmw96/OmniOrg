// Created by BBMW0 Technologies | bbmw0.com
/**
 * OMNIORG CLI DASHBOARD
 *
 * Interactive menu-driven CLI for the OmniOrg Intelligence Platform.
 * Run with: npx ts-node scripts/omniorg-cli.ts
 */

import * as readline from "readline";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../.env") });

// ── ANSI colours ──────────────────────────────────────────────────────────────

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  blue:   "\x1b[34m",
  dim:    "\x1b[2m",
};

function c(colour: keyof typeof C, text: string): string {
  return `${C[colour]}${text}${C.reset}`;
}

// ── readline helpers ──────────────────────────────────────────────────────────

const rl = readline.createInterface({
  input:  process.stdin,
  output: process.stdout,
});

function ask(prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, resolve));
}

function pause(): Promise<string> {
  return ask(c("dim", "\nPress Enter to continue..."));
}

// ── Header ────────────────────────────────────────────────────────────────────

function printHeader(): void {
  console.clear();
  console.log(c("cyan", "╔══════════════════════════════════════════════════╗"));
  console.log(c("cyan", "║") + c("bold", "          OMNIORG INTELLIGENCE PLATFORM           ") + c("cyan", "║"));
  console.log(c("cyan", "║") + c("blue",  "      NEUROMESH v2.0 | Powered by BBMW0           ") + c("cyan", "║"));
  console.log(c("cyan", "╚══════════════════════════════════════════════════╝"));
  console.log();
}

// ── Main menu ─────────────────────────────────────────────────────────────────

function printMenu(): void {
  console.log(c("bold", "  Main Menu"));
  console.log(c("dim",  "  ─────────────────────────────────────"));
  console.log(`  ${c("cyan", "1.")} System Status`);
  console.log(`  ${c("cyan", "2.")} Search (Perplexity+)`);
  console.log(`  ${c("cyan", "3.")} Generate Content`);
  console.log(`  ${c("cyan", "4.")} Security Status`);
  console.log(`  ${c("cyan", "5.")} List AI Models`);
  console.log(`  ${c("cyan", "6.")} RAG Knowledge Base`);
  console.log(`  ${c("cyan", "7.")} Exit`);
  console.log();
}

// ── Option 1: System Status ───────────────────────────────────────────────────

async function showSystemStatus(): Promise<void> {
  console.log(c("bold", "\n  System Status\n"));

  const uptimeSecs = os.uptime();
  const hours   = Math.floor(uptimeSecs / 3600);
  const minutes = Math.floor((uptimeSecs % 3600) / 60);
  const secs    = Math.floor(uptimeSecs % 60);
  console.log(`  Uptime      : ${c("green", `${hours}h ${minutes}m ${secs}s`)}`);
  console.log(`  Node        : ${c("green", process.version)}`);

  const mem        = process.memoryUsage();
  const totalMb    = (os.totalmem() / 1024 / 1024).toFixed(0);
  const usedMb     = (mem.rss / 1024 / 1024).toFixed(1);
  const heapMb     = (mem.heapUsed / 1024 / 1024).toFixed(1);
  console.log(`  Memory RSS  : ${c("green", `${usedMb} MB`)} / ${totalMb} MB total`);
  console.log(`  Heap used   : ${c("green", `${heapMb} MB`)}`);
  console.log(`  Platform    : ${c("green", `${os.platform()} ${os.arch()}`)}`);

  try {
    const { proxyStatus } = await import("../core/proxy-fetch");
    console.log(`  Proxy       : ${c("green", proxyStatus())}`);
  } catch {
    console.log(`  Proxy       : ${c("yellow", "proxy-fetch not available")}`);
  }

  process.stdout.write(`  Ollama      : `);
  try {
    const resp = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      const data = await resp.json() as { models?: Array<{ name: string }> };
      const count = data.models?.length ?? 0;
      console.log(c("green", `running (${count} model${count !== 1 ? "s" : ""} loaded)`));
    } else {
      console.log(c("yellow", `responded with HTTP ${resp.status}`));
    }
  } catch {
    console.log(c("red", "not running"));
  }

  await pause();
}

// ── Option 2: Search (Perplexity+) ───────────────────────────────────────────

async function runSearch(): Promise<void> {
  console.log(c("bold", "\n  Search (Perplexity+)\n"));
  const query = (await ask("  Enter query: ")).trim();
  if (!query) { console.log(c("yellow", "  No query entered.")); await pause(); return; }

  console.log(c("dim", "\n  Searching...\n"));

  try {
    const { search } = await import("../core/search/perplexity-plus-engine");
    const result = await search(query);

    console.log(c("bold", "  Answer:\n"));
    const lines = result.answer.split("\n");
    for (const line of lines) console.log(`  ${line}`);

    if (result.sources.length > 0) {
      console.log(c("bold", "\n  Sources:\n"));
      result.sources.slice(0, 8).forEach((src, i) => {
        console.log(`  ${c("cyan", `[${i + 1}]`)} ${src.title}`);
        console.log(`      ${c("dim", src.url)}`);
      });
    }
  } catch (err) {
    console.log(c("red", `  Search failed: ${err instanceof Error ? err.message : String(err)}`));
  }

  await pause();
}

// ── Option 3: Generate Content ────────────────────────────────────────────────

async function generateContentMenu(): Promise<void> {
  console.log(c("bold", "\n  Generate Content\n"));

  const topic = (await ask("  Topic: ")).trim();
  if (!topic) { console.log(c("yellow", "  No topic entered.")); await pause(); return; }

  console.log("  Formats: 1) blog  2) social  3) email");
  const fmtChoice = (await ask("  Choose format (1-3): ")).trim();
  const fmtMap: Record<string, "blog_post" | "linkedin" | "email"> = {
    "1": "blog_post",
    "2": "linkedin",
    "3": "email",
  };
  const format = fmtMap[fmtChoice] ?? "blog_post";

  console.log(c("dim", "\n  Generating content...\n"));

  try {
    const { generateContent } = await import("../intelligence/content/content-pipeline");
    const pkg = await generateContent({
      topic,
      format,
      tone:           "professional",
      targetAudience: "general",
    }, 1);

    const variant = pkg.variants[0];
    if (variant) {
      console.log(c("bold", `  ${format.replace("_", " ").toUpperCase()}\n`));
      const lines = variant.content.split("\n");
      for (const line of lines) console.log(`  ${line}`);
      if (pkg.savedPath) console.log(c("dim", `\n  Saved to: ${pkg.savedPath}`));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Cannot find module") || msg.includes("MODULE_NOT_FOUND")) {
      console.log(c("yellow", "  Module not available yet: content-pipeline not installed."));
    } else {
      console.log(c("red", `  Error: ${msg}`));
    }
  }

  await pause();
}

// ── Option 4: Security Status ─────────────────────────────────────────────────

async function showSecurityStatus(): Promise<void> {
  console.log(c("bold", "\n  Security Status\n"));

  const secDir = path.resolve(__dirname, "../logs/security");

  if (!fs.existsSync(secDir)) {
    console.log(c("yellow", `  Security log directory not found: ${secDir}`));
    await pause();
    return;
  }

  const files = fs.readdirSync(secDir)
    .filter(f => f.endsWith(".jsonl"))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(secDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    console.log(c("yellow", "  No security log files found."));
    await pause();
    return;
  }

  const latest = path.join(secDir, files[0].name);
  console.log(`  Log file: ${c("cyan", files[0].name)}\n`);

  const raw   = fs.readFileSync(latest, "utf-8");
  const lines = raw.split("\n").filter(l => l.trim().length > 0);
  const last10 = lines.slice(-10);

  console.log(c("bold", `  Last ${last10.length} events:\n`));

  const blockedIPs = new Set<string>();

  for (const line of last10) {
    try {
      const evt = JSON.parse(line) as Record<string, unknown>;
      const ts      = typeof evt["timestamp"] === "string" ? evt["timestamp"].slice(11, 19) : "?";
      const type    = typeof evt["type"] === "string"      ? evt["type"]                   : "event";
      const ip      = typeof evt["ip"] === "string"        ? evt["ip"]                     : null;
      const detail  = typeof evt["detail"] === "string"    ? evt["detail"]                 : "";
      const blocked = evt["blocked"] === true;

      if (ip && blocked) blockedIPs.add(ip);

      const icon = blocked ? c("red", "[BLOCK]") : c("green", "[ALLOW]");
      console.log(`  ${c("dim", ts)} ${icon} ${c("cyan", type)} ${ip ? `from ${ip}` : ""} ${detail}`);
    } catch {
      console.log(`  ${c("dim", line.slice(0, 80))}`);
    }
  }

  // Count all blocked IPs from full log
  for (const line of lines) {
    try {
      const evt = JSON.parse(line) as Record<string, unknown>;
      if (evt["blocked"] === true && typeof evt["ip"] === "string") blockedIPs.add(evt["ip"] as string);
    } catch { /* skip malformed */ }
  }

  console.log(`\n  Total events in log : ${c("cyan", String(lines.length))}`);
  console.log(`  Blocked IPs         : ${c("red", String(blockedIPs.size))}`);

  await pause();
}

// ── Option 5: List AI Models ──────────────────────────────────────────────────

async function listAIModels(): Promise<void> {
  console.log(c("bold", "\n  Configured AI Engines\n"));

  type EngineRow = { engine: string; keyEnv: string; status: string };

  const engines: EngineRow[] = [
    { engine: "Anthropic Claude",  keyEnv: "ANTHROPIC_API_KEY",   status: "" },
    { engine: "Google Gemini",     keyEnv: "GEMINI_API_KEY",       status: "" },
    { engine: "HeyGen",            keyEnv: "HEYGEN_API_KEY",       status: "" },
    { engine: "Higgsfield AI",     keyEnv: "HIGGSFIELD_API_KEY",   status: "" },
    { engine: "ElevenLabs",        keyEnv: "ELEVENLABS_API_KEY",   status: "" },
    { engine: "Pika Labs",         keyEnv: "PIKA_API_KEY",         status: "" },
    { engine: "Runway ML",         keyEnv: "RUNWAY_API_KEY",       status: "" },
    { engine: "Kling AI",          keyEnv: "KLING_API_KEY",        status: "" },
    { engine: "Ollama (local)",    keyEnv: "OLLAMA",               status: "" },
  ];

  for (const row of engines) {
    if (row.keyEnv === "OLLAMA") {
      row.status = c("green", "always available");
    } else {
      const val = process.env[row.keyEnv];
      row.status = val && val.length > 0
        ? c("green", "configured")
        : c("red",   "not set");
    }
  }

  const colW = [20, 26, 20];
  const hr   = c("dim", "  " + "-".repeat(colW[0] + colW[1] + colW[2] + 6));

  console.log(hr);
  console.log(
    "  " +
    c("bold", "Engine".padEnd(colW[0])) +
    c("bold", "Env Variable".padEnd(colW[1])) +
    c("bold", "Status"),
  );
  console.log(hr);

  for (const row of engines) {
    console.log(
      "  " +
      row.engine.padEnd(colW[0]) +
      c("dim", row.keyEnv.padEnd(colW[1])) +
      row.status,
    );
  }
  console.log(hr);

  await pause();
}

// ── Option 6: RAG Knowledge Base ─────────────────────────────────────────────

async function ragSubmenu(): Promise<void> {
  let ragMod: {
    listKnowledgeBases: () => Promise<string[]>;
    ingestFile:         (kb: string, file: string) => Promise<number>;
    ragQuery:           (kb: string, q: string) => Promise<{ answer: string; sources: string[] }>;
  } | null = null;

  try {
    ragMod = (await import("../core/knowledge/rag-engine")) as unknown as typeof ragMod;
  } catch {
    console.log(c("yellow", "\n  Module not available yet: rag-engine requires Ollama + nomic-embed-text."));
    await pause();
    return;
  }

  let inSubmenu = true;
  while (inSubmenu) {
    printHeader();
    console.log(c("bold", "  RAG Knowledge Base\n"));
    console.log(`  ${c("cyan", "1.")} List knowledge bases`);
    console.log(`  ${c("cyan", "2.")} Ingest file`);
    console.log(`  ${c("cyan", "3.")} Query knowledge base`);
    console.log(`  ${c("cyan", "4.")} Back`);
    console.log();

    const choice = (await ask("  Choice: ")).trim();

    if (choice === "1") {
      const kbs = await ragMod!.listKnowledgeBases();
      console.log(c("bold", `\n  Knowledge Bases (${kbs.length}):\n`));
      if (kbs.length === 0) {
        console.log(c("dim", "  No knowledge bases found."));
      } else {
        kbs.forEach((kb, i) => console.log(`  ${c("cyan", `${i + 1}.`)} ${kb}`));
      }
      await pause();

    } else if (choice === "2") {
      const kbName = (await ask("  Knowledge base name: ")).trim();
      const filePath = (await ask("  File path to ingest: ")).trim();
      if (!kbName || !filePath) { console.log(c("yellow", "  Cancelled.")); await pause(); continue; }
      try {
        console.log(c("dim", "\n  Ingesting..."));
        const chunks = await ragMod!.ingestFile(kbName, filePath);
        console.log(c("green", `\n  Ingested ${chunks} chunks into "${kbName}".`));
      } catch (err) {
        console.log(c("red", `  Error: ${err instanceof Error ? err.message : String(err)}`));
      }
      await pause();

    } else if (choice === "3") {
      const kbName = (await ask("  Knowledge base name: ")).trim();
      const query  = (await ask("  Query: ")).trim();
      if (!kbName || !query) { console.log(c("yellow", "  Cancelled.")); await pause(); continue; }
      try {
        console.log(c("dim", "\n  Querying..."));
        const result = await ragMod!.ragQuery(kbName, query);
        console.log(c("bold", "\n  Answer:\n"));
        result.answer.split("\n").forEach(l => console.log(`  ${l}`));
        if (result.sources.length > 0) {
          console.log(c("bold", "\n  Sources:"));
          result.sources.forEach((s, i) => console.log(`  ${c("cyan", `[${i + 1}]`)} ${s}`));
        }
      } catch (err) {
        console.log(c("red", `  Error: ${err instanceof Error ? err.message : String(err)}`));
      }
      await pause();

    } else {
      inSubmenu = false;
    }
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  let running = true;

  while (running) {
    printHeader();
    printMenu();

    const choice = (await ask("  Select option: ")).trim();

    switch (choice) {
      case "1": await showSystemStatus();    break;
      case "2": await runSearch();           break;
      case "3": await generateContentMenu(); break;
      case "4": await showSecurityStatus();  break;
      case "5": await listAIModels();        break;
      case "6": await ragSubmenu();          break;
      case "7":
        console.log(c("cyan", "\n  Goodbye.\n"));
        running = false;
        break;
      default:
        console.log(c("yellow", "  Invalid option."));
        await pause();
    }
  }

  rl.close();
}

main().catch(err => {
  console.error(c("red", `Fatal: ${err instanceof Error ? err.message : String(err)}`));
  rl.close();
  process.exit(1);
});
