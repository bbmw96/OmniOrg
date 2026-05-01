# OmniOrg: NEUROMESH™ Enterprise AI Platform

> **Created by BBMW0 Technologies | [bbmw0.com](https://bbmw0.com)**

---

## What is OmniOrg?

OmniOrg is a production-ready, open-source AI agent platform powering **20,000+ specialist AI agents** across every profession, sector, and discipline on Earth. Built on the **NEUROMESH™** engine, it is designed for companies of any size: from startups to global enterprises: and can be deployed on any infrastructure.

Every agent is:
- PhD + Super-Senior Executive level in their domain
- Fluent in 40+ human languages
- Capable of writing and executing scripts in 28 programming languages (TypeScript, Python, PowerShell, CMD, Bash, Go, Rust, Java, C#, Ruby, PHP, Swift, Kotlin, R, Lua, Perl, Elixir, Dart, Zig, C/C++, and more)
- Wired to 56 MCP servers and 80+ Claude plugins at startup
- Autonomous: self-enhancing, self-scripting, and self-executing

---

## Agent Count

| Layer | Agents |
|-------|--------|
| 28 Universal Sub-Types × 212 Profession Domains × 3 Tiers | 17,808 |
| 252 Sector-Specific Sub-Specialties × 3 Tiers | 756 |
| 212 World Profession Domains (PhD/Executive) | 636 |
| IT & Cybersecurity Department | ~1,200 |
| Core Tier 1–5 + Engineering/Medicine/Law/Finance/Science | ~195 |
| **Total (unique, deduplicated)** | **20,595+** |

---

## Architecture

```
OmniOrg/
├── agents/
│   ├── registry/
│   │   ├── agent-registry.ts          # Central registry: 20,000+ agents
│   │   └── departments/
│   │       ├── world-professions.ts   # 212 profession domains
│   │       ├── world-sub-professions.ts # 28 universal templates + 252 specific
│   │       └── it-cybersecurity.ts    # IT & Cybersecurity department
│   └── orchestrator/
│       └── orchestrator.ts            # Multi-agent orchestration engine
├── core/
│   ├── capabilities/
│   │   ├── universal-capabilities.ts  # 150+ tools auto-injected into every agent
│   │   ├── self-scripting.ts          # 28-language script execution engine
│   │   ├── plugin-manifest.ts         # 56 MCP servers + 80+ plugins manifest
│   │   ├── file-engine.ts             # File I/O for all agents
│   │   ├── server-access.ts           # Server/device access layer
│   │   └── screen-reader.ts           # Screen/UI reading capability
│   ├── neuromesh/
│   │   └── mesh.ts                    # NEUROMESH™ communication fabric
│   ├── cortex/
│   │   ├── engine.ts                  # Cognitive processing engine
│   │   └── memory.ts                  # Persistent agent memory
│   ├── synapse/
│   │   └── protocol.ts                # Agent-to-agent protocol
│   ├── language/
│   │   └── quality-engine.ts          # 40+ language quality control
│   ├── access/
│   │   └── universal-access.ts        # Universal access layer
│   └── evolution/
│       └── self-evolution.ts          # Agent self-improvement engine
└── package.json
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- TypeScript 5.4+

### Install

```bash
git clone https://github.com/BBMW0/OmniOrg.git
cd OmniOrg
npm install
```

### Type Check

```bash
npm run typecheck
```

### Start the API Server

```bash
npm run server
```

---

## Self-Scripting: Every Agent Can Write & Run Code

Every agent in OmniOrg has full self-scripting capability. Any agent can:

```typescript
// Example: Agent writes and executes a PowerShell script
const script = agent.writeSelfEnhancementScript({
  language: "powershell",
  goal: "Fetch system metrics and log to file"
});

// Executes via mcp__commands__execute
agent.executeScript(script);
```

Supported languages: TypeScript, JavaScript, Python, PowerShell, CMD, Bash, SQL, Rust, Go, Java, C#, Ruby, PHP, Swift, Kotlin, Scala, R, Matlab, Lua, Perl, Haskell, Elixir, Clojure, F#, Dart, Zig, C, C++

---

## Universal Capabilities (Auto-Injected)

Every registered agent automatically receives 150+ capabilities at instantiation:

| Category | Tools |
|----------|-------|
| MCP Servers | 56 servers (filesystem, memory, sequential-thinking, context7, playwright, docker, kubernetes, postgres, redis, git, and 46 more) |
| Claude Plugins | 80+ plugins (AWS, Azure, Firebase, GitHub, Stripe, Figma, and more) |
| Agent Skills | 13 skills (ARIA+, FRAMER+, KLEO+, BLAZE+, OMNI+, FULLSTACK_ENGINEER, and more) |
| Native Tools | 29 Claude Code native tools |
| Languages | 40+ human languages |
| Script Execution | 28 programming languages |

---

## Deployment

OmniOrg is infrastructure-agnostic. Deploy on:

- **Cloud**: AWS, Azure, Google Cloud, Vercel, Railway, Netlify
- **Self-hosted**: Any Linux/Windows/macOS server with Node.js 18+
- **Docker**: Containerise with the included Dockerfile (coming soon)
- **Enterprise**: Multi-tenant with department-level isolation

---

## For Companies of Any Size

| Company Size | How to Use OmniOrg |
|---|---|
| **Startup (1–50)** | Deploy the full registry; assign a subset of agents to your product domain |
| **SME (50–500)** | Use department-level filtering; integrate with your existing tools via MCP servers |
| **Enterprise (500–10,000)** | Multi-tenant deployment; custom agent tiers; enterprise SSO; full audit logging |
| **Global Corporation (10,000+)** | NEUROMESH fabric handles inter-agent communication at scale; all 20,000+ agents active |

---

## License

MIT, free for commercial and non-commercial use worldwide.

---

> **Created by BBMW0 Technologies | [bbmw0.com](https://bbmw0.com)**
> For enterprise enquiries: hello@bbmw0.com
