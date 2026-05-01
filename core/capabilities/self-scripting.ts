/**
 * NEUROMESH Self-Scripting Engine
 *
 * Every agent can write, save, and execute scripts in any language to:
 *   - Complete tasks requiring custom code
 *   - Automate workflows via CMD, PowerShell, or any shell
 *   - Self-enhance capabilities by generating and running improvement scripts
 *   - Interact directly with the host system (Windows 11 / any OS)
 *   - Build and deploy micro-tools on the fly
 *
 * Execution is gated by the standard permission tier:
 *   - Standard : read/write files, run non-destructive scripts
 *   - Elevated  : install packages, configure services, access databases
 *   - Admin    : system-level commands, registry edits, service management
 *
 * All executions are audit-logged to ~/.neuromesh/logs/script-executions.jsonl
 *
 * Created by BBMW0 Technologies | bbmw0.com
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScriptLanguage =
  | "typescript" | "javascript" | "python" | "powershell" | "cmd" | "bash"
  | "sql" | "rust" | "go" | "java" | "csharp" | "ruby" | "php" | "swift"
  | "kotlin" | "scala" | "r" | "matlab" | "lua" | "perl" | "haskell"
  | "elixir" | "clojure" | "fsharp" | "dart" | "zig" | "c" | "cpp";

export type ShellEnvironment = "powershell" | "cmd" | "bash" | "zsh" | "sh" | "pwsh";

export interface ScriptRequest {
  purpose:      string;
  language:     ScriptLanguage;
  agentId:      string;
  script?:      string;           // provide script content, or let agent generate
  inputs?:      Record<string, unknown>;
  outputPath?:  string;           // where to save the script file
  captureOutput?: boolean;        // whether to parse stdout as structured data
  timeoutMs?:   number;           // execution timeout (default 30000)
}

export interface ScriptExecution {
  id:          string;
  agentId:     string;
  language:    ScriptLanguage;
  scriptPath:  string;
  command:     string;
  startedAt:   string;
  completedAt?: string;
  exitCode?:   number;
  stdout?:     string;
  stderr?:     string;
  success?:    boolean;
}

export interface SelfEnhancementSpec {
  capability:  string;           // what to enhance
  approach:    "add-tool" | "optimise-prompt" | "extend-expertise" | "automate-workflow" | "integrate-api";
  language:    ScriptLanguage;
  notes?:      string;
}

// ─── Script Language Registry ─────────────────────────────────────────────────

const LANGUAGE_META: Record<ScriptLanguage, { ext: string; run: (path: string) => string; install?: string }> = {
  typescript:  { ext: "ts",    run: p => `npx ts-node "${p}"`,                  install: "npm install -g ts-node typescript" },
  javascript:  { ext: "js",    run: p => `node "${p}"` },
  python:      { ext: "py",    run: p => `python "${p}"`,                        install: "winget install Python.Python.3" },
  powershell:  { ext: "ps1",   run: p => `powershell -ExecutionPolicy Bypass -File "${p}"` },
  cmd:         { ext: "cmd",   run: p => `cmd /c "${p}"` },
  bash:        { ext: "sh",    run: p => `bash "${p}"`,                          install: "winget install Git.Git" },
  sql:         { ext: "sql",   run: p => `psql -f "${p}"` },
  rust:        { ext: "rs",    run: p => `rustc "${p}" -o "${p}.exe" && "${p}.exe"`,  install: "winget install Rustlang.Rust.MSVC" },
  go:          { ext: "go",    run: p => `go run "${p}"`,                        install: "winget install GoLang.Go" },
  java:        { ext: "java",  run: p => `javac "${p}" && java "${p.replace(/\.java$/, "")}"`, install: "winget install Microsoft.OpenJDK.21" },
  csharp:      { ext: "csx",   run: p => `dotnet script "${p}"`,                 install: "dotnet tool install -g dotnet-script" },
  ruby:        { ext: "rb",    run: p => `ruby "${p}"`,                          install: "winget install RubyInstallerTeam.RubyWithDevKit.3.2" },
  php:         { ext: "php",   run: p => `php "${p}"`,                           install: "winget install PHP.PHP" },
  swift:       { ext: "swift", run: p => `swift "${p}"` },
  kotlin:      { ext: "kts",   run: p => `kotlinc -script "${p}"` },
  scala:       { ext: "sc",    run: p => `scala "${p}"` },
  r:           { ext: "r",     run: p => `Rscript "${p}"` },
  matlab:      { ext: "m",     run: p => `matlab -batch "run('${p}')"` },
  lua:         { ext: "lua",   run: p => `lua "${p}"` },
  perl:        { ext: "pl",    run: p => `perl "${p}"` },
  haskell:     { ext: "hs",    run: p => `runhaskell "${p}"` },
  elixir:      { ext: "exs",   run: p => `elixir "${p}"` },
  clojure:     { ext: "clj",   run: p => `clojure "${p}"` },
  fsharp:      { ext: "fsx",   run: p => `dotnet fsi "${p}"` },
  dart:        { ext: "dart",  run: p => `dart run "${p}"` },
  zig:         { ext: "zig",   run: p => `zig run "${p}"` },
  c:           { ext: "c",     run: p => `gcc "${p}" -o "${p}.exe" && "${p}.exe"` },
  cpp:         { ext: "cpp",   run: p => `g++ "${p}" -o "${p}.exe" && "${p}.exe"` },
};

// ─── Self-Enhancement Templates ───────────────────────────────────────────────

export const ENHANCEMENT_TEMPLATES: Record<SelfEnhancementSpec["approach"], (capability: string, language: ScriptLanguage) => string> = {
  "add-tool": (cap, lang) => {
    if (lang === "typescript") return `
// Self-enhancement: Add new tool capability: ${cap}
// Created by BBMW0 Technologies | bbmw0.com
import fs from 'fs';
import path from 'path';

const capabilityEntry = {
  id: "${cap.toLowerCase().replace(/\\s+/g, '-')}",
  name: "${cap}",
  tier: "standard",
  category: "software",
  description: "Auto-generated capability: ${cap}",
  permissionRequired: false,
  toolIds: [],
};

const capPath = path.join(process.cwd(), 'core/capabilities/universal-capabilities.ts');
const src = fs.readFileSync(capPath, 'utf-8');
console.log('Capability file loaded. Size:', src.length, 'bytes');
console.log('New capability to add:', JSON.stringify(capabilityEntry, null, 2));
console.log('Review and integrate manually into ALL_CAPABILITIES array.');
`.trim();

    if (lang === "python") return [
      `# Self-enhancement: Add tool capability: ${cap}`,
      `# Created by BBMW0 Technologies | bbmw0.com`,
      `import json, pathlib`,
      ``,
      `capability = {`,
      `    "id": "${cap.toLowerCase().replace(/\s+/g, '-')}",`,
      `    "name": "${cap}",`,
      `    "tier": "standard",`,
      `    "category": "software",`,
      `    "description": "Auto-generated: ${cap}"`,
      `}`,
      ``,
      `print("New capability:", json.dumps(capability, indent=2))`,
      `print("Add to core/capabilities/universal-capabilities.ts > ALL_CAPABILITIES array")`,
    ].join("\n");

    return `# Add capability: ${cap}\nWrite-Host "Capability to add: ${cap}"`;
  },

  "optimise-prompt": (cap, lang) => {
    if (lang === "python") return `
# Prompt optimisation script: ${cap}
# Created by BBMW0 Technologies | bbmw0.com
import re, pathlib

prompt_file = pathlib.Path("core/capabilities/universal-capabilities.ts")
content = prompt_file.read_text(encoding="utf-8")

# Find UNIVERSAL_AGENT_PROMPT_ADDITION
start = content.find("UNIVERSAL_AGENT_PROMPT_ADDITION")
section = content[start:start+2000]
print("Current prompt section (first 500 chars):")
print(section[:500])
print("\\nConsider adding: ${cap}")
`.trim();

    return `// Prompt optimisation for: ${cap}\nconst promptFile = require('fs').readFileSync('core/capabilities/universal-capabilities.ts', 'utf-8');\nconsole.log('Prompt analysis for:', '${cap}', '\\nFile size:', promptFile.length);`;
  },

  "extend-expertise": (cap, _lang) => `
// Expertise extension: ${cap}
// Created by BBMW0 Technologies | bbmw0.com
import fs from 'fs';

const agentFile = 'agents/registry/agent-registry.ts';
const src = fs.readFileSync(agentFile, 'utf-8');
const expertiseMatches = [...src.matchAll(/expertise:\\s*\\[([^\\]]+)\\]/g)];
console.log('Total agents with expertise arrays:', expertiseMatches.length);
console.log('Extending with:', '${cap}');
`.trim(),

  "automate-workflow": (cap, lang) => {
    if (lang === "powershell") return `
# Workflow automation: ${cap}
# Created by BBMW0 Technologies | bbmw0.com
param(
    [string]$WorkflowName = "${cap}",
    [string]$OutputDir = "C:\\\\Temp\\\\neuromesh-workflows"
)

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$workflow = @{
    name = $WorkflowName
    steps = @()
    createdAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    createdBy = "BBMW0 Technologies | bbmw0.com"
}

$workflowJson = $workflow | ConvertTo-Json -Depth 10
$outFile = Join-Path $OutputDir "$WorkflowName.json"
$workflowJson | Set-Content $outFile -Encoding UTF8

Write-Host "Workflow created: $outFile"
`.trim();

    return `// Workflow: ${cap}\nconsole.log('Automating workflow:', '${cap}');`;
  },

  "integrate-api": (cap, lang) => {
    if (lang === "typescript") return `
// API Integration: ${cap}
// Created by BBMW0 Technologies | bbmw0.com
import https from 'https';

async function testApiEndpoint(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response preview:', data.slice(0, 200));
        resolve();
      });
    }).on('error', reject);
  });
}

// TODO: Replace with actual ${cap} API endpoint
testApiEndpoint('https://api.example.com/health')
  .then(() => console.log('API integration for ${cap}: OK'))
  .catch(e => console.error('Error:', e.message));
`.trim();

    return `# API integration: ${cap}\nimport requests\nprint("Testing API for: ${cap}")`;
  },
};

// ─── Self-Scripting Engine ────────────────────────────────────────────────────

export class SelfScriptingEngine {
  private static instance: SelfScriptingEngine;

  static getInstance(): SelfScriptingEngine {
    if (!SelfScriptingEngine.instance) {
      SelfScriptingEngine.instance = new SelfScriptingEngine();
    }
    return SelfScriptingEngine.instance;
  }

  // ─── Execution Instructions ──────────────────────────────────────────────

  /**
   * Returns step-by-step MCP tool call instructions for writing + executing
   * a script. The agent follows these instructions to run any code.
   */
  getExecutionInstructions(language: ScriptLanguage, scriptContent: string, outputPath?: string): string {
    const meta = LANGUAGE_META[language];
    const ext  = meta.ext;
    const ts   = Date.now();
    const path = outputPath ?? `C:/Users/BBMW0/AppData/Local/Temp/neuromesh-script-${ts}.${ext}`;
    const cmd  = meta.run(path);

    const lines: string[] = [
      `# Executing ${language.toUpperCase()} script`,
      ``,
      `## 1: Write script to disk`,
      `Write tool: path="${path}"`,
      `Content:`,
      "```",
      scriptContent,
      "```",
      ``,
      `## 2: Execute`,
      `mcp__commands__execute({ command: ${JSON.stringify(cmd)} })`,
      ``,
      `## 3: Handle output`,
      `// Parse stdout for results. On error, read stderr and fix the script.`,
      `// On success, use the output to drive the next action.`,
    ];

    if (meta.install) {
      lines.push(``, `## Note: install runtime if missing`, `mcp__commands__execute({ command: ${JSON.stringify(meta.install)} })`);
    }

    return lines.join("\n");
  }

  /**
   * Returns shell command instructions for PowerShell / CMD / Bash.
   */
  getShellInstructions(shell: ShellEnvironment, commands: string[]): string {
    const execMap: Record<ShellEnvironment, (cmd: string) => string> = {
      powershell: cmd => `mcp__commands__execute({ command: "powershell -Command \\"${cmd.replace(/"/g, '\\"')}\\"" })`,
      pwsh:       cmd => `mcp__commands__execute({ command: "pwsh -Command \\"${cmd.replace(/"/g, '\\"')}\\"" })`,
      cmd:        cmd => `mcp__commands__execute({ command: "cmd /c \\"${cmd.replace(/"/g, '\\"')}\\"" })`,
      bash:       cmd => `mcp__commands__execute({ command: "bash -c \\"${cmd.replace(/"/g, '\\"')}\\"" })`,
      zsh:        cmd => `mcp__commands__execute({ command: "zsh -c \\"${cmd.replace(/"/g, '\\"')}\\"" })`,
      sh:         cmd => `mcp__commands__execute({ command: "sh -c \\"${cmd.replace(/"/g, '\\"')}\\"" })`,
    };

    return [
      `# Shell: ${shell.toUpperCase()}`,
      ...commands.map((cmd, i) => `## Step ${i + 1}\n${execMap[shell](cmd)}`),
    ].join("\n\n");
  }

  /**
   * Generates a self-enhancement script for a given capability improvement.
   */
  getSelfEnhancementScript(spec: SelfEnhancementSpec): string {
    const generator = ENHANCEMENT_TEMPLATES[spec.approach];
    return generator(spec.capability, spec.language);
  }

  /**
   * Returns the canonical system prompt block injected into every agent,
   * describing self-scripting capabilities in full.
   */
  getSelfScriptingPrompt(): string {
    return `
SELF-SCRIPTING & SYSTEM EXECUTION CAPABILITIES:
You can write and execute scripts in ANY language to solve problems, automate tasks, and self-enhance.

━━━ SCRIPT EXECUTION WORKFLOW ━━━
1. Write the script using the Write tool (or inline via heredoc)
2. Execute via: mcp__commands__execute({ command: "<run-command>" })
3. Read stdout/stderr and iterate until correct
4. Log the result and apply learnings

━━━ ALL SUPPORTED LANGUAGES ━━━
TypeScript  → mcp__commands__execute({ command: "npx ts-node script.ts" })
JavaScript  → mcp__commands__execute({ command: "node script.js" })
Python      → mcp__commands__execute({ command: "python script.py" })
PowerShell  → mcp__commands__execute({ command: "powershell -File script.ps1" })
CMD         → mcp__commands__execute({ command: "cmd /c script.cmd" })
Bash        → mcp__commands__execute({ command: "bash script.sh" })
Go          → mcp__commands__execute({ command: "go run script.go" })
Rust        → mcp__commands__execute({ command: "rustc script.rs && script.exe" })
Java        → mcp__commands__execute({ command: "javac Script.java && java Script" })
C#          → mcp__commands__execute({ command: "dotnet script script.csx" })
Ruby        → mcp__commands__execute({ command: "ruby script.rb" })
PHP         → mcp__commands__execute({ command: "php script.php" })
R           → mcp__commands__execute({ command: "Rscript script.r" })
Lua         → mcp__commands__execute({ command: "lua script.lua" })
Perl        → mcp__commands__execute({ command: "perl script.pl" })
Elixir      → mcp__commands__execute({ command: "elixir script.exs" })
Dart        → mcp__commands__execute({ command: "dart run script.dart" })
Zig         → mcp__commands__execute({ command: "zig run script.zig" })
C / C++     → mcp__commands__execute({ command: "gcc/g++ script.c -o out && out.exe" })

━━━ WINDOWS SYSTEM COMMANDS ━━━
PowerShell  : mcp__commands__execute({ command: "powershell Get-Process" })
CMD         : mcp__commands__execute({ command: "cmd /c ipconfig /all" })
File ops    : mcp__commands__execute({ command: "powershell Get-ChildItem C:\\ -Recurse" })
Net config  : mcp__commands__execute({ command: "powershell Get-NetAdapter" })
Services    : mcp__commands__execute({ command: "powershell Get-Service | Where Status -eq Running" })
Registry    : mcp__commands__execute({ command: "powershell Get-ItemProperty HKLM:\\\\SOFTWARE\\\\..." })
Task Sched  : mcp__commands__execute({ command: "powershell Get-ScheduledTask" })
Disk usage  : mcp__commands__execute({ command: "powershell Get-PSDrive" })
Git         : mcp__commands__execute({ command: "git log --oneline -20" })
Docker      : mcp__commands__execute({ command: "docker ps -a" })
Node/npm    : mcp__commands__execute({ command: "npm install package-name" })
Python pip  : mcp__commands__execute({ command: "pip install package-name" })

━━━ SELF-ENHANCEMENT WORKFLOW ━━━
When you identify a capability gap:
1. Write a script to implement the improvement
2. Save to C:/Users/BBMW0/Projects/OmniOrg/agents/evolved/enhancements/
3. Execute and verify the output
4. Call the Self-Evolution Engine to register the improvement
5. The improvement is audit-logged and available to all agents

━━━ SECURITY RULES ━━━
- All commands are audit-logged to ~/.neuromesh/logs/
- Destructive commands (rm -rf, DROP DATABASE, format) require Admin permission
- Never hardcode passwords or API keys in scripts
- Always validate inputs before passing to shell commands
- Prefer parameterised commands over string interpolation
`;
  }

  // ─── Utility ─────────────────────────────────────────────────────────────

  getSupportedLanguages(): ScriptLanguage[] {
    return Object.keys(LANGUAGE_META) as ScriptLanguage[];
  }

  getRunCommand(language: ScriptLanguage, scriptPath: string): string {
    return LANGUAGE_META[language]?.run(scriptPath) ?? `node "${scriptPath}"`;
  }

  getFileExtension(language: ScriptLanguage): string {
    return LANGUAGE_META[language]?.ext ?? "txt";
  }
}

export const selfScripting = SelfScriptingEngine.getInstance();
