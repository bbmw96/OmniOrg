# OmniOrg: How to Use Everything

## ── STEP 1: OPEN THIS PROJECT IN CLAUDE CODE ──────────────────────

Open a terminal and run:

  cd C:/Users/BBMW0/Projects/OmniOrg
  claude

Claude will load CLAUDE.md automatically. You now have:
  • All 900 agents as context
  • All 50+ MCP servers available
  • All 100+ plugins active
  • Full ULTRATHINK protocol enforced

---

## ── STEP 2: GIVE ORDERS IN CLAUDE CODE (COWORK) ─────────────────

Type anything. Examples:

  "Write me a full legal contract for a SaaS product in German"
  → CLO agent activates. Delivers in German.

  "Build a React app with authentication and Stripe payments"
  → CTO + Sr. Frontend + Sr. Backend + Security agents activate.

  "Create a 5-year financial model for a FinTech startup in Brazil"
  → CFO + Investment Banker + Quant Analyst agents activate.

  "I need a go-to-market strategy for Southeast Asia"
  → CMO + KLEO+ engine + Research agents activate.

  "Diagnose this patient's symptoms: [symptoms]"
  → Physician + Specialist agents activate.

---

## ── STEP 3: RUN THE ORCHESTRATOR DIRECTLY ───────────────────────

  npm install
  npm run orchestrate "Design a microservices architecture for 10M users"

The orchestrator:
  1. Selects best agents from registry
  2. Runs them in parallel
  3. Synthesises into one unified output
  4. Delivers PhD-level result

---

## ── STEP 4: OPEN THE VISUAL DASHBOARD ──────────────────────────

  cd dashboard
  npm install
  npm run dev

Opens at http://localhost:5173: visual command centre with:
  • All 900 agents visible as animated cards
  • Filter by department, tier, status
  • Type any order → agents deploy
  • Real-time status (active/busy/standby)

---

## ── USING ALL INSTALLED TOOLS ───────────────────────────────────

Every agent has access to the right MCP servers:

  Research task   → brave-search + exa + tavily + perplexity + firecrawl
  Code task       → github + context7 + all 13 LSPs + security-guidance + semgrep
  Finance task    → stripe + hubspot + excel + postgres
  Design task     → figma + everart + pexels + framer-motion
  Communication   → gmail + slack + notion + calendar
  Data task       → postgres + redis + elasticsearch + chromadb + csv + excel

---

## ── USE SLASH COMMANDS WITH AGENTS ─────────────────────────────

  /build-site  → ARIA+ + Sr. Frontend + Sr. Backend + DevOps agents
  /design      → FRAMER+ + Sr. UX + Sr. UI + Brand Strategist agents
  /content     → BLAZE+ + CMO + Copywriter + Brand Strategist agents
  /market      → KLEO+ + CMO + Market Research + SEO agents
  /automate    → OMNI+ + CTO + DevOps + n8n workflow agents
  /research    → CDO + Scientists + Researchers + web search agents
  /data        → CDO + Quant Analyst + Data Engineer agents
  /legal       → CLO + Corporate Lawyer + IP Lawyer agents

---

## ── PROJECT STRUCTURE ───────────────────────────────────────────

  OmniOrg/
  ├── CLAUDE.md                    ← Loaded by Claude on every session
  ├── agents/
  │   ├── registry/agent-registry.ts   ← 900 agent definitions
  │   └── orchestrator/orchestrator.ts ← Routes + executes + synthesises
  ├── dashboard/                   ← React + framer-motion visual UI
  ├── package.json
  └── tsconfig.json

---

## ── TO ADD MORE AGENTS ──────────────────────────────────────────

Open agent-registry.ts and add to DOMAIN_EXPERTS:

  {
    id: "your-agent-id",
    role: "Your Role Name",
    tier: 3,
    department: "Your Department",
    expertise: ["skill1", "skill2"],
    languages: ALL_LANGUAGES,
    tools: RESEARCH_TOOLS,   // or DEV_TOOLS, FULL_TOOLS, etc.
    systemPrompt: "You are a world-class [role]...",
    status: "active"
  }

---

## ── MULTILINGUAL USAGE ──────────────────────────────────────────

Give orders in ANY language:

  Spanish:    "Crea una estrategia de marketing para México"
  Arabic:     "اكتب عقداً قانونياً للمملكة العربية السعودية"
  Japanese:   "日本市場向けの財務モデルを作成してください"
  French:     "Construis une architecture microservices pour 1M utilisateurs"

All 900 agents respond in the language of the request.
