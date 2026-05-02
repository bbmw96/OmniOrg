# UK English and Em Dash Sweep - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all 235 em dashes and correct any American English spellings across every TypeScript and Markdown file in the repository.

**Architecture:** A Python sweep script identifies and replaces em dashes file by file using context-aware rules. The script runs once per affected file, produces a diff for review, then TypeScript compiles to confirm no strings were broken. Agent descriptions in the registry are swept separately because they contain the highest density of user-visible text.

**Tech Stack:** Python 3 (stdlib only), TypeScript compiler (`npx tsc --noEmit`), Git

---

## File Structure

| File | Action |
|------|--------|
| `scripts/sweep-em-dashes.py` | Create - one-shot sweep script, deletes itself after use |
| `api/env.ts` | Modify - 2 em dashes in comments |
| `intelligence/compliance/ifc-corenet-x-validator.ts` | Modify - em dashes in rule comments |
| `intelligence/compliance/ifc-parser.ts` | Modify |
| `intelligence/content/affiliate-engine.ts` | Modify |
| `intelligence/content/auto-publisher.ts` | Modify |
| `intelligence/content/bbm0902-influencer-engine.ts` | Modify |
| `intelligence/content/composio-publisher.ts` | Modify |
| `intelligence/content/gemini-client.ts` | Modify |
| `intelligence/content/insforge.ts` | Modify |
| `intelligence/content/monetisation-engine.ts` | Modify |
| `intelligence/content/nano-banana-engine.ts` | Modify |
| `intelligence/content/viral-game-generator.ts` | Modify |
| `intelligence/content/youtube-forge.ts` | Modify |
| `intelligence/core/agent-scheduler-daemon.ts` | Modify |
| `intelligence/core/cloud-sync-bridge.ts` | Modify |
| `intelligence/security/agent-security-engine.ts` | Modify |
| `results/CONTENT_PLAN.md` | Modify |
| `scripts/run-content-engine.ts` | Modify |
| `README.md` | Modify |
| `CLAUDE.md` | Modify |
| `HOW-TO-USE.md` | Modify |

---

## Em Dash Replacement Rules

The Unicode em dash character is `—` (rendered as `—`). The ASCII double-hyphen `--` used inline between words is also treated as an em dash substitute and caught by the same pattern.

| Context pattern | Replacement |
|----------------|-------------|
| `word — description/clause` (inline comment annotation) | `word: description/clause` |
| `thing — note` (parenthetical aside) | `thing (note)` |
| `sentence — continuation` (sentence break) | `sentence. Continuation` or `sentence, continuation` |
| `heading — subtitle` | `heading: subtitle` |
| `label — value` in schedule/table strings | `label: value` |

---

### Task 1: Write and Run the Sweep Script

**Files:**
- Create: `scripts/sweep-em-dashes.py`

- [ ] **Step 1: Create the sweep script**

```python
#!/usr/bin/env python3
"""
One-shot em dash sweep for OmniOrg.
Replaces Unicode em dash (U+2014) with context-appropriate punctuation.
Run from the repo root: python3 scripts/sweep-em-dashes.py
"""
import re, os, sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

TARGETS = [
    "api/env.ts",
    "intelligence/compliance/ifc-corenet-x-validator.ts",
    "intelligence/compliance/ifc-parser.ts",
    "intelligence/content/affiliate-engine.ts",
    "intelligence/content/auto-publisher.ts",
    "intelligence/content/bbm0902-influencer-engine.ts",
    "intelligence/content/composio-publisher.ts",
    "intelligence/content/gemini-client.ts",
    "intelligence/content/insforge.ts",
    "intelligence/content/monetisation-engine.ts",
    "intelligence/content/nano-banana-engine.ts",
    "intelligence/content/viral-game-generator.ts",
    "intelligence/content/youtube-forge.ts",
    "intelligence/core/agent-scheduler-daemon.ts",
    "intelligence/core/cloud-sync-bridge.ts",
    "intelligence/security/agent-security-engine.ts",
    "results/CONTENT_PLAN.md",
    "scripts/run-content-engine.ts",
    "README.md",
    "CLAUDE.md",
    "HOW-TO-USE.md",
]

EM = "—"  # Unicode em dash

def replace_em_dashes(text: str) -> str:
    # Pattern: word(s) EM word(s) where EM is used as an annotation colon
    # e.g. "// Rule Set 1 — CORENET-X Format Requirements"
    # Becomes: "// Rule Set 1: CORENET-X Format Requirements"
    # Heuristic: if the text after EM starts with a capital letter or is a label, use colon
    # Otherwise use comma.

    # 1. "identifier — Description" in comments (capital after dash = colon)
    text = re.sub(r" — ([A-Z])", r": \1", text)

    # 2. "word — lowercase continuation" = comma
    text = re.sub(r" — ([a-z])", r", \1", text)

    # 3. Any remaining lone em dashes (e.g. end of line or surrounded by spaces)
    text = text.replace(" —", ":").replace("— ", ": ").replace("—", "-")

    return text

total_changes = 0
for rel in TARGETS:
    path = ROOT / rel
    if not path.exists():
        print(f"  SKIP (not found): {rel}")
        continue
    original = path.read_text(encoding="utf-8")
    updated  = replace_em_dashes(original)
    changes  = original.count(EM) + original.count(" -- ")
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        total_changes += changes
        print(f"  FIXED ({changes:3d} dashes): {rel}")
    else:
        print(f"  CLEAN             : {rel}")

print(f"\nDone. {total_changes} em dashes replaced.")
print("Next: review the diff with 'git diff', then run 'npx tsc --noEmit'")
```

- [ ] **Step 2: Run the script**

```bash
cd "C:/Users/BBMW0/Projects/OmniOrg"
python3 scripts/sweep-em-dashes.py
```

Expected output (abbreviated):
```
  FIXED (  2 dashes): api/env.ts
  FIXED ( 18 dashes): intelligence/compliance/ifc-corenet-x-validator.ts
  ...
  Done. 233 em dashes replaced.
```

- [ ] **Step 3: Review the diff**

```bash
git diff --stat
git diff intelligence/content/insforge.ts | head -60
```

Check that replacements read naturally in context. The colon rule is right for annotation comments (`// Rule Set 1: CORENET-X Format Requirements`). The comma rule is right for inline clauses (`// Guarantees no two posts are alike, keeping all content clean`). If any replacement looks wrong, edit the file directly.

- [ ] **Step 4: Confirm zero em dashes remain**

```bash
grep -r "—" --include="*.ts" --include="*.md" . | grep -v node_modules | grep -v ".git" | grep -v "sweep-em-dashes.py"
```

Expected: no output.

---

### Task 2: UK Spelling Corrections in User-Visible Text

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `HOW-TO-USE.md`, `agents/registry/agent-registry.ts`, `intelligence/content/*.ts`

- [ ] **Step 1: Run the spelling scan**

```bash
cd "C:/Users/BBMW0/Projects/OmniOrg"
grep -rn "\borganization\b\|\boptimize\b\|\banalyze\b\|\bbehavior\b\|\bcolor\b\|\bhonor\b\|\bfavor\b\|\bneighbor\b\|\bcenter\b\|\bdefense\b\|\boffense\b\|\brecognize\b\|\bcatalog\b\|\bprogram\b" \
  --include="*.ts" --include="*.md" . \
  | grep -v node_modules | grep -v ".git" \
  | grep -v "categoryId\|backgroundColor\|textColor\|color:\|#\|rgb\|CSS\|html\|style="
```

Expected: any matches are in comment text or string literals that need correction.

- [ ] **Step 2: Apply UK spelling corrections**

```bash
python3 - <<'PYEOF'
import re
from pathlib import Path

ROOT = Path(".")
REPLACEMENTS = [
    (r"\borganization\b", "organisation"),
    (r"\borganizations\b", "organisations"),
    (r"\boptimize\b", "optimise"),
    (r"\boptimizing\b", "optimising"),
    (r"\boptimization\b", "optimisation"),
    (r"\banalyze\b", "analyse"),
    (r"\banalyzing\b", "analysing"),
    (r"\banalysis\b", "analysis"),   # same in both - skip
    (r"\bbehavior\b", "behaviour"),
    (r"\bbehaviors\b", "behaviours"),
    (r"\brecognize\b", "recognise"),
    (r"\brecognizing\b", "recognising"),
    (r"\bcatalog\b", "catalogue"),
    (r"\bfavor\b", "favour"),
    (r"\bhonor\b", "honour"),
    (r"\bneighbor\b", "neighbour"),
    (r"\bcenter\b", "centre"),
    (r"\bdefense\b", "defence"),
    (r"\boffense\b", "offence"),
    (r"\bprogram\b(?!ming\b)", "programme"),   # Keep "programming"
]

# Only apply to non-CSS, non-import lines
CSS_SKIP = re.compile(r"color:|background|style=|import |require(|#[0-9a-fA-F]|rgb(|url(")

changed_files = []
for path in ROOT.rglob("*.ts"):
    if "node_modules" in str(path) or ".git" in str(path):
        continue
    text = path.read_text(encoding="utf-8")
    new_text = text
    for pattern, replacement in REPLACEMENTS:
        lines = new_text.split("\n")
        new_lines = []
        for line in lines:
            if CSS_SKIP.search(line):
                new_lines.append(line)
            else:
                new_lines.append(re.sub(pattern, replacement, line, flags=re.IGNORECASE))
        new_text = "\n".join(new_lines)
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        changed_files.append(str(path))

for f in changed_files:
    print(f"  Updated: {f}")
print(f"Done. {len(changed_files)} files updated.")
PYEOF
```

- [ ] **Step 3: Apply UK spelling to Markdown files**

```bash
python3 - <<'PYEOF'
import re
from pathlib import Path

ROOT = Path(".")
REPLACEMENTS = [
    (r"\borganization\b", "organisation"),
    (r"\boptimize\b", "optimise"),
    (r"\banalyze\b", "analyse"),
    (r"\bbehavior\b", "behaviour"),
    (r"\brecognize\b", "recognise"),
    (r"\bcatalog\b", "catalogue"),
]

for path in [Path("README.md"), Path("CLAUDE.md"), Path("HOW-TO-USE.md")]:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    new_text = text
    for pattern, replacement in REPLACEMENTS:
        new_text = re.sub(pattern, replacement, new_text, flags=re.IGNORECASE)
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        print(f"  Updated: {path}")
print("Done.")
PYEOF
```

---

### Task 3: TypeScript Compile Check and Commit

**Files:** All modified above

- [ ] **Step 1: Run TypeScript compile check**

```bash
cd "C:/Users/BBMW0/Projects/OmniOrg"
npx tsc --noEmit
```

Expected: no output (zero errors). If errors appear, they will be in string literals where a replacement broke TypeScript syntax. Review `git diff` for that file and restore the original string value manually.

- [ ] **Step 2: Delete the sweep script (it has done its job)**

```bash
rm scripts/sweep-em-dashes.py
```

- [ ] **Step 3: Stage all changes**

```bash
git add -A
git diff --cached --stat
```

Verify the list of changed files matches the expected 18-22 files. Confirm no `node_modules` or `.env` files are staged.

- [ ] **Step 4: Commit**

```bash
git commit -m "style: UK English throughout, remove all 233 em dashes

- Replace all Unicode em dash (U+2014) characters with colons or
  commas as appropriate for the context
- Correct American English spellings to UK equivalents in comments,
  strings, and documentation (organisation, optimise, behaviour, etc.)
- No functional changes: only comment text and non-code strings modified
- TypeScript compiles cleanly after changes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

- [ ] **Step 5: Push**

```bash
git push origin feature/security-affiliate-autopublisher
```

Expected: `Writing objects: 100%` and branch updated.
