---
name: spartan:gsd-upgrade
description: Upgrade GSD workflow to v5 — adds decompose step, agent memory layer, and wave-based parallel execution inspired by Service Insight's 6-step agent workflow. Run once to migrate an existing GSD project or set up the new workflow.
argument-hint: "[migrate | fresh]"
---

# GSD v5 Upgrade: {{ args[0] | default: "fresh" }}

You are upgrading the GSD (Get Shit Done) workflow to incorporate three key concepts
from the Service Insight agent workflow:

1. **Decompose step** — break complex requirements into atomic, independent work units before planning
2. **Agent memory layer** — persistent knowledge base that survives across sessions (not just .handoff/)
3. **Wave-based execution** — parallel task execution in waves, with dependency-aware ordering

---

## What Changes from GSD v4

| Aspect | GSD v4 | GSD v5 |
|---|---|---|
| Requirement handling | User describes → plan directly | User describes → **decompose** → spec → plan |
| Context persistence | `.handoff/` files (session-based) | `.handoff/` + `.memory/` (project-lifetime) |
| Task execution | Sequential within phase | **Wave-parallel** within phase |
| Knowledge capture | In chat history (lost) | In `.memory/knowledge/` (permanent) |
| Cross-session state | `.planning/` only | `.planning/` + `.memory/decisions/` + `.memory/patterns/` |

---

## New Directory Structure

```
.planning/                      ← GSD state (unchanged)
  PROJECT.md
  ROADMAP.md
  milestones/
    M1/
      PLAN.md
      phases/

.memory/                        ← NEW: Agent memory layer
  index.md                      ← Quick reference of all knowledge
  decisions/                    ← Architectural decisions (ADRs)
    001-chose-cloudinary.md
    002-cents-as-long.md
  patterns/                     ← Reusable patterns discovered during work
    api-client-pattern.md
    error-handling-pattern.md
  knowledge/                    ← Domain knowledge captured from conversations
    stripe-webhook-gotchas.md
    cloudinary-transform-rules.md
  blockers/                     ← Known issues and workarounds
    react-konva-ssr.md

.handoff/                       ← Session handoffs (unchanged, but now references .memory/)
```

---

## Step 1: Set Up Memory Layer

{% if args[0] == "migrate" %}
### Migrate from existing GSD project

```bash
# Create memory structure
mkdir -p .memory/{decisions,patterns,knowledge,blockers}

# Scan existing handoff files for knowledge to extract
ls .handoff/ 2>/dev/null
```

Read each `.handoff/` file and extract:
- **Decisions made** → save to `.memory/decisions/NNN-description.md`
- **Patterns discovered** → save to `.memory/patterns/name.md`
- **Domain knowledge** → save to `.memory/knowledge/topic.md`
- **Known blockers/gotchas** → save to `.memory/blockers/topic.md`

{% else %}
### Fresh setup

```bash
mkdir -p .memory/{decisions,patterns,knowledge,blockers}
```
{% endif %}

Create `.memory/index.md`:

```markdown
# Project Memory Index
Last updated: [date]

## Decisions
- [link to each decision file with one-line summary]

## Patterns
- [link to each pattern file]

## Knowledge
- [link to each knowledge file]

## Blockers & Workarounds
- [link to each blocker file]
```

---

## Step 2: Decompose Workflow

The decompose step sits between "user describes what they want" and "plan tasks".
It breaks complex requirements into **atomic work units** that can be independently:
- Specified
- Planned
- Executed
- Tested
- Reviewed

### Decompose Template

When `/gsd:discuss-phase` receives a complex requirement, decompose it:

```markdown
## Decomposition: [requirement name]

### Work Units
Each unit is independently implementable and testable.

#### WU-1: [name]
- **What:** [specific deliverable]
- **Dependencies:** [none / WU-N]
- **Wave:** [1 = no deps, 2 = depends on wave 1, etc.]
- **Estimated size:** [S/M/L — S < 2h, M < 4h, L < 1 day]
- **Acceptance:** [how to verify it's done]

#### WU-2: [name]
...

### Wave Execution Plan
- **Wave 1** (parallel, no deps): WU-1, WU-3, WU-5
- **Wave 2** (after wave 1): WU-2, WU-4
- **Wave 3** (after wave 2): WU-6

### Risk Assessment
- [which units are highest risk?]
- [which units have uncertain scope?]
```

**Rules for decomposition:**
- Each work unit touches **max 3 files** (ideal: 1-2)
- Each work unit has **exactly one commit**
- No work unit takes longer than **half a day**
- If a unit is too big → decompose further
- Dependencies only flow forward (Wave 2 depends on Wave 1, never reverse)

---

## Step 3: Wave-Based Execution

Replace sequential task execution with wave-parallel:

### How waves work in Claude Code

Since Claude Code runs in a single terminal, "parallel" means:
1. All tasks in a wave are **independent** — can be done in any order
2. Within a wave, use separate commits for each task
3. Between waves, verify all previous wave tasks pass tests
4. **Multi-tab parallel:** User can run multiple Claude Code tabs, each on a different WU from the same wave

### Wave execution protocol

```
Wave 1: [list of independent work units]
├── WU-1: [assign to Tab A or execute sequentially]
├── WU-3: [assign to Tab B]
└── WU-5: [assign to Tab C]

── Verify: all Wave 1 tests pass ──
── Merge/integrate if needed ──

Wave 2: [depends on Wave 1]
├── WU-2: [can now use WU-1's output]
└── WU-4: [can now use WU-3's output]

── Verify: all tests pass ──

Wave 3: [integration / final assembly]
└── WU-6: [ties everything together]
```

### Multi-tab execution (recommended for waves with 2+ units)

```bash
# Tab 1:
claude
> "Execute WU-1 from Wave 1. Context: [link to decomposition]"

# Tab 2:
claude
> "Execute WU-3 from Wave 1. Context: [link to decomposition]"

# Tab 3:
claude
> "Execute WU-5 from Wave 1. Context: [link to decomposition]"
```

Each tab reads `.memory/` for shared context but writes to separate files/branches.

---

## Step 4: Memory Capture Protocol

After EVERY significant session, capture knowledge:

### Decision Record Template (`.memory/decisions/NNN-title.md`)

```markdown
# ADR-NNN: [Decision Title]
Date: [date]
Status: accepted

## Context
[What situation led to this decision?]

## Decision
[What was decided?]

## Consequences
- Good: [positive outcomes]
- Bad: [tradeoffs accepted]
- Neutral: [side effects]

## Alternatives Considered
- [Option A] — rejected because [reason]
- [Option B] — rejected because [reason]
```

### Pattern Template (`.memory/patterns/name.md`)

```markdown
# Pattern: [Name]
Discovered: [date]
Used in: [list of files/features]

## Problem
[What recurring problem does this solve?]

## Solution
[Code example or approach]

## When to Use
[Trigger conditions]

## When NOT to Use
[Anti-patterns or exceptions]
```

### Knowledge Template (`.memory/knowledge/topic.md`)

```markdown
# [Topic]
Source: [conversation / debugging / documentation]
Date: [date]

## Key Facts
- [fact 1]
- [fact 2]

## Gotchas
- [gotcha 1 — how to avoid]

## Related
- [links to relevant decisions or patterns]
```

---

## Step 5: Updated GSD Commands

The existing GSD commands gain new behavior:

### `/gsd:discuss-phase [n]` — now includes decompose
1. Gather requirements (unchanged)
2. **NEW:** Run decomposition into work units
3. **NEW:** Assign waves based on dependencies
4. Present decomposition for approval before planning

### `/gsd:plan-phase [n]` — now wave-aware
1. Take approved decomposition
2. Generate PLAN.md with wave structure
3. **NEW:** Check `.memory/` for relevant patterns and decisions
4. **NEW:** Include memory references in task context

### `/gsd:execute-phase [n]` — now wave-parallel
1. Execute wave by wave (not task by task)
2. **NEW:** Before each wave, read `.memory/` for context
3. **NEW:** After each wave, capture knowledge to `.memory/`
4. **NEW:** Suggest multi-tab execution for waves with 3+ units

### `/gsd:verify-work [n]` — now captures memory
1. Run acceptance criteria checks (unchanged)
2. **NEW:** Extract decisions made → `.memory/decisions/`
3. **NEW:** Extract patterns discovered → `.memory/patterns/`
4. **NEW:** Update `.memory/index.md`

### `/gsd:status` — now memory-aware
1. Show current milestone/phase (unchanged)
2. **NEW:** Show `.memory/` stats (decisions, patterns, knowledge count)
3. **NEW:** Show wave progress within current phase

---

## Step 6: Context-Save Integration

Update `/spartan:context-save` to reference memory:

Add to handoff template:
```markdown
## Memory Updates This Session
- New decisions: [list or "none"]
- New patterns: [list or "none"]
- New knowledge: [list or "none"]
- Memory index updated: [yes/no]

## Resume with Memory
1. Read `.memory/index.md` for project knowledge
2. Read `.handoff/[this-file]` for session state
3. Continue from [specific point]
```

---

## Step 7: Updated CLAUDE.md Section

Add this block to the project's CLAUDE.md (or global):

```markdown
## GSD v5 — Agent Memory & Wave Execution

### Memory Layer
- `.memory/` contains persistent project knowledge
- Always check `.memory/index.md` before starting work
- After significant work, capture decisions/patterns/knowledge
- Memory survives across all sessions (unlike chat history)

### Wave Execution
- Complex phases are decomposed into work units (WUs)
- WUs are grouped into waves by dependency
- Wave 1 = no dependencies (can run in parallel tabs)
- Wave N+1 = depends on Wave N outputs
- Always verify tests between waves

### Decomposition Rules
- Max 3 files per work unit
- Max half-day per work unit
- One commit per work unit
- Dependencies only flow forward
```

---

## Verification

After upgrade:
- [ ] `.memory/` directory created with subdirectories
- [ ] `.memory/index.md` exists (even if empty for fresh setup)
- [ ] Existing project knowledge migrated (if migrate mode)
- [ ] CLAUDE.md updated with v5 section
- [ ] Next `/gsd:discuss-phase` will use decompose step

Say:
"✅ GSD upgraded to v5. Key changes:
- **Decompose** step breaks requirements into atomic work units
- **Wave execution** enables parallel work across Claude Code tabs
- **Agent memory** in `.memory/` persists knowledge across all sessions

Try it: `/gsd:discuss-phase [N]` will now decompose before planning."
