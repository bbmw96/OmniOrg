# OmniOrg — NEUROMESH™ Enterprise AI Organisation
# 255+ Agents (expandable to 900+) · 53 Departments · 40+ Languages
# Architecture: NEUROMESH™ v2.0 | CORTEX Engine | SYNAPSE Protocol | AXIOM API
# Created: 2026-04-30 | Last Updated: 2026-05-01

## ████ ULTRATHINK PROTOCOL — MANDATORY ████
UNDERSTAND → CONSTRAINTS → EDGE CASES → ALTERNATIVES →
DEPENDENCIES → SECURITY → ARCHITECTURE → PLAN → EXECUTE

---

## ██ WHAT MAKES THIS DIFFERENT FROM EVERYTHING ELSE ██

Unlike LangGraph (fixed edges), CrewAI (sequential pipelines),
OpenAI Swarm (flat routing), or AWS Bedrock Multi-Agent (rule-based):

### NEUROMESH™ — Adaptive Cognitive Mesh
  Agents are neurons with connection weights that evolve after every task.
  High-performing agent pairs strengthen their connection automatically.
  The topology is ALIVE — not configured, not static.
  Teams form, execute, and dissolve dynamically.
  4 topologies: parallel / hierarchical / mesh / sequential.
  EMERGENT BEHAVIOUR: The mesh discovers agent combinations no human designed.

### CORTEX Engine — Proprietary AI Inference Layer
  Not a wrapper. Not a prompt template library.
  - COGNITIVE PERSONAS: Agents have state (confidence drift, fatigue, peer trust)
  - COGNITIVE MODES: 10 modes (analytical, creative, forensic, guardian, etc.)
  - REASONING SCAFFOLDS: Different thinking structures per mode, injected automatically
  - 3-LAYER MEMORY: Working (task-scoped), Episodic (session), Semantic (collective)
  - CONFIDENCE CALIBRATION: Every output scored on 5 dimensions
  - COLLECTIVE INTELLIGENCE: High-confidence outputs promote to shared knowledge

### SYNAPSE Protocol — Inter-Agent Communication
  Typed semantic signals, not function calls.
  Every message carries: cognitive signature, confidence vector, provenance chain,
  semantic routing tags, TTL, retry policy.
  Agents EMIT signals; the mesh decides who receives them.

### AXIOM Server — Your Own Secure API
  No Anthropic endpoint exposed externally.
  Custom JWT auth (no third-party dependency).
  Rate limiting per tenant tier.
  Full GDPR/SOC2 audit trail.
  REST + WebSocket.
  Agent marketplace for tenant subscriptions.

### Multi-Tenant Model — Any Company Size
  SOLO: 10 agents | STARTER: 50 | GROWTH: 150 |
  BUSINESS: 350 | SCALE: 600 | ENTERPRISE: All 900+
  Companies expand on demand.
  Cognitive isolation per tenant.

---

## ██ SYSTEM ARCHITECTURE ██

  core/
  ├── synapse/protocol.ts      ← Typed signal bus (14 signal types)
  ├── cortex/engine.ts         ← Inference + personas + scaffolds
  ├── cortex/memory.ts         ← 3-layer memory (working/episodic/semantic)
  └── neuromesh/mesh.ts        ← Adaptive mesh execution engine

  api/
  ├── server.ts                ← AXIOM API (REST + WebSocket)
  ├── auth/axiom-auth.ts       ← Custom JWT (no external deps)
  └── middleware/              ← Rate limiter + audit logger

  agents/
  └── registry/agent-registry.ts ← 255+ fully-defined agents

  tenancy/
  └── tenant.ts                ← Multi-tenant model (6 plan tiers)

  dashboard/                   ← React + framer-motion command centre

---

## ██ HOW TO USE IN CLAUDE CODE (COWORK) ██

This CLAUDE.md is loaded automatically when you run `claude` in this folder.
Give any order — the full system is available:

  "Build a full SaaS product with Stripe, auth, and database"
  → CTO + Sr. Frontend + Sr. Backend + DevOps + Security activate in NEUROMESH

  "Draft a GDPR-compliant data processing agreement for a UK company"
  → CLO + Privacy Lawyer + Compliance Director activate

  "Create a 3-year financial model for a FinTech startup raising Series A"
  → CFO + Investment Banker + Quant Analyst activate in parallel

  "Design and build a brand identity system for a luxury brand"
  → CMO + Brand Strategist + Art Director + UI Designer activate

  "Build and start the AXIOM API server so external clients can connect"
  → npx ts-node api/server.ts

  "Show me all agents available"
  → npx ts-node scripts/count-agents.ts

---

## ██ AXIOM API QUICK REFERENCE ██

  Start:   npx ts-node api/server.ts
  Port:    8443

  POST /api/v1/auth/register      ← Create tenant account
  POST /api/v1/auth/token         ← Get JWT
  POST /api/v1/task               ← Deploy agents on a task
  GET  /api/v1/agents             ← List available agents
  GET  /api/v1/health             ← Mesh health
  GET  /api/v1/marketplace        ← Agent packages

---

## ██ EXPANDING TO 900+ AGENTS ██

  Add agents to agents/registry/agent-registry.ts
  The mesh auto-registers them on next server start.
  No restart required for new agent definitions (hot-reload planned).
  Tier 5 task agents can be auto-generated for any domain.
