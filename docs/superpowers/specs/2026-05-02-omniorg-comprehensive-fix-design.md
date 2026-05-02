# OmniOrg Comprehensive Fix - Design Specification

**Date:** 2026-05-02
**Author:** BBMW0 Technologies
**Status:** Approved
**Scope:** Four sequential sub-projects covering language compliance, runability, social publishing, and dashboard completion

---

## Global Constraint: UK English and Punctuation

This constraint applies to every file in the repository, to every agent description, every console output string, every README, every comment, and every piece of generated content. It applies to all future code produced by any agent, engine, or script.

**Rules:**
- No em dashes (--) anywhere. Replace with: a comma, a colon, a hyphen, or a full stop as appropriate for the sentence
- UK spellings throughout: colour, behaviour, organisation, realise, optimise, licence (noun), practise (verb), centre, defence, analyse, catalogue, programme, favour, honour, neighbour
- UK punctuation: punctuation inside quotes only when it is part of the quoted material; single quotes for quotations within text; Oxford comma optional but consistent
- No irregular characters between words or in headings

---

## Sub-project 1: UK English and Em Dash Sweep

### Goal

Remove all 233 em dashes from 18 files and correct any American English spellings in user-visible strings, comments, console output, and documentation.

### Files in Scope

- `api/env.ts`
- `intelligence/compliance/ifc-corenet-x-validator.ts`
- `intelligence/compliance/ifc-parser.ts`
- `intelligence/content/affiliate-engine.ts`
- `intelligence/content/auto-publisher.ts`
- `intelligence/content/bbm0902-influencer-engine.ts`
- `intelligence/content/composio-publisher.ts`
- `intelligence/content/gemini-client.ts`
- `intelligence/content/insforge.ts`
- `intelligence/content/monetisation-engine.ts`
- `intelligence/content/nano-banana-engine.ts`
- `intelligence/content/viral-game-generator.ts`
- `intelligence/content/youtube-forge.ts`
- `intelligence/core/agent-scheduler-daemon.ts`
- `intelligence/core/cloud-sync-bridge.ts`
- `intelligence/security/agent-security-engine.ts`
- `results/CONTENT_PLAN.md`
- `scripts/run-content-engine.ts`
- `README.md`, `CLAUDE.md`, `HOW-TO-USE.md`
- `agents/registry/` (all agent description strings)

### Replacement Rules

| Pattern | Replacement approach |
|---------|----------------------|
| `word -- word` (em dash between clauses) | Replace with `: ` or `, ` depending on context |
| `word -- word` (em dash as parenthetical) | Replace with ` (` and `) ` |
| `word -- word` (em dash before list) | Replace with `:` |
| American spelling in comments/strings | Replace with UK equivalent |

### Acceptance Criteria

- `grep -r " -- " --include="*.ts" --include="*.md" .` returns zero results (excluding node_modules)
- TypeScript compiles cleanly after changes
- No functional behaviour changes - only text strings and comments modified

---

## Sub-project 2: End-to-End Runability

### Goal

Every `npm run` script starts without errors, connects to Claude (Anthropic) and Gemini with the correct API keys, and produces real AI output rather than local-mode fallbacks.

### Issues to Fix

**2a. `bbm0902:influencer` package.json inline eval**

The current script uses `node -e "require(...)"` which bypasses the `api/env.ts` bootstrap entirely. Replace it with a proper script file.

- Create `scripts/run-influencer.ts` with `import "../api/env"` as the first line, then calls `bbm0902Engine.generateInfluencerShort()`
- Update `package.json` `bbm0902:influencer` to: `node --max-old-space-size=4096 -r ts-node/register scripts/run-influencer.ts`

**2b. GeminiClient dotenv ordering**

`GeminiClient` reads `process.env.GEMINI_API_KEY` inside its constructor, which is called when the module-level singleton is created. This has the same TypeScript CJS hoisting issue as the previous fixes. The singleton in `gemini-client.ts` must not read the key at construction time; it should read it lazily on first use, or the module must be imported after `api/env.ts` has run.

Fix: Move the `process.env.GEMINI_API_KEY` read from the constructor into the first method call (lazy initialisation), so it runs after dotenv has loaded.

**2c. Verify end-to-end**

- `npm run mesh:status` must log `hasApiKey: true` and show agent count
- `npm run server` must start on port 8443 and respond to `GET /api/v1/health`
- `npm run content:run` must reach the AI synthesis stage (not fall back to local mode)

### Acceptance Criteria

- `npm run mesh:status` output contains `"hasApiKey": true`
- Server starts and `curl http://localhost:8443/api/v1/health` returns HTTP 200
- Content run log contains no `[Local mode:` lines

---

## Sub-project 3: Composio Social Publishing

### Goal

Wire `composio-publisher.ts` so that content approved by the scheduler actually posts to Instagram and YouTube via the `@bbm0902` Composio connection, rather than printing a warning.

### Current State

`composio-publisher.ts` detects whether Composio is configured and falls through to a `console.warn("not yet set up")` path. The `@bbm0902` Composio connection was authorised earlier in this session (YouTube added via `composio add youtube`).

### Changes Required

**3a. Confirm active Composio connections**

Check which apps are connected under `@bbm0902` using the Composio CLI or MCP. Confirm `youtube` and `instagram` (or equivalent) are active.

**3b. Replace stub dispatch in composio-publisher.ts**

Replace the warning path with real Composio action calls:
- YouTube: use the `YOUTUBE_UPLOAD_VIDEO` or `YOUTUBE_CREATE_VIDEO` Composio action
- Instagram: use the `INSTAGRAM_MEDIA_PUBLISH` or equivalent action
- Wrap each call in try/catch with structured error logging in UK English
- Add a `dryRun: boolean` parameter (default `false`) that logs the payload without sending

**3c. Connect scheduler to publisher**

In `content-scheduler.ts`, when a post is approved (`status === "approved"`), call `composioPublisher.dispatch(post)` rather than just updating the status field.

**3d. Dry-run test**

Add an `npm run publish:dry-run` script that runs the publisher against the most recent approved post with `dryRun: true` to confirm the payload is correct before live posting.

### Acceptance Criteria

- `npm run publish:dry-run` completes without errors and logs a valid payload
- A live test post succeeds on at least one platform
- No "not yet set up" warnings appear in logs

---

## Sub-project 4: Dashboard Completion

### Goal

Audit the `dashboard/` React application and wire every panel that currently shows placeholder or static data to the live AXIOM API at `http://localhost:8443`.

### Panels to Audit

Based on the AXIOM API routes (`/api/v1/health`, `/api/v1/agents`, `/api/v1/marketplace`, `/api/v1/task`):

| Panel | Expected data source | Current state |
|-------|---------------------|---------------|
| Mesh health | `GET /api/v1/health` | Unknown |
| Agent list | `GET /api/v1/agents` | Unknown |
| Task queue | WebSocket stream | Unknown |
| Content pipeline status | `GET /api/v1/...` | Unknown |
| Monetisation milestones | Static or API | Unknown |
| Tenant management | `GET /api/v1/...` | Unknown |

### Approach

1. Audit every React component in `dashboard/src/` for hardcoded data or missing API connections
2. Wire each panel to the correct AXIOM endpoint using `fetch` with the JWT from local storage
3. Add loading and error states to every panel
4. Ensure all text in the dashboard uses UK English with no em dashes

### Acceptance Criteria

- `cd dashboard && npm run dev` starts without errors
- Every panel shows live data when the AXIOM server is running
- All text passes the UK English and no em dash rules

---

## Execution Order

1. Sub-project 1 (UK sweep) - runs first, cross-cutting, affects all files
2. Sub-project 2 (runability) - foundation, must pass before 3 and 4 are testable
3. Sub-project 3 (Composio) - value delivery, depends on 2 being stable
4. Sub-project 4 (dashboard) - visibility layer, depends on AXIOM server from 2

Each sub-project is committed and pushed separately so progress is visible on GitHub.

---

## Testing Strategy

- TypeScript compile check (`npx tsc --noEmit`) after every sub-project
- Manual end-to-end smoke test after sub-project 2
- Dry-run test after sub-project 3 before any live posts
- Browser visual check after sub-project 4

---

## Out of Scope

- New agent definitions beyond fixing existing ones
- AWS deployment or cloud infrastructure
- Monetisation configuration changes
- Any breaking changes to the AXIOM API contract
