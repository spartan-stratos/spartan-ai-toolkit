---
name: spartan:phase
description: Manage project phases — discuss requirements, plan tasks, execute work, verify results. This is the Spartan wrapper for GSD phase commands. Use after /spartan:project new.
argument-hint: "[discuss | plan | execute | verify] [phase number]"
---

# Phase {{ args[1] | default: "?" }}: {{ args[0] | default: "discuss" }}

You are managing a phase in the current GSD project.
The user does NOT need to know about `/gsd:*` commands — everything runs through `/spartan:*`.

---

{% if args[0] == "discuss" %}
## Discuss Phase {{ args[1] | default: "N" }}

Gathering requirements for this phase. But first — Office Hours.

**MANDATORY: Ask these 3 forcing questions BEFORE gathering requirements:**

1. **"What pain are we actually solving?"** (not the feature — the underlying pain)
2. **"What's the narrowest version we can ship to learn?"** (force MVP thinking)
3. **"What assumption are we making that could be wrong?"** (surface hidden risks)

**Auto mode on?** → Still ask these 3 questions. They prevent building the wrong thing.

Only after the user answers all 3 → proceed:

**Run:** `/gsd:discuss-phase {{ args[1] | default: "N" }}`

After discussion, decompose requirements into work units (WUs) per GSD v5:
- Each WU: max 3 files, max half-day, one commit
- Group into waves by dependency

Then tell the user:
"Requirements gathered and decomposed into [N] work units across [N] waves. Next step: `/spartan:phase plan {{ args[1] | default: "N" }}`"

{% elif args[0] == "plan" %}
## Plan Phase {{ args[1] | default: "N" }}

Generating the execution plan with wave-parallel tasks.

**Before planning, check `.memory/index.md`** for relevant patterns, decisions, and knowledge from previous phases.

**Run:** `/gsd:plan-phase {{ args[1] | default: "N" }}`

The plan should include:
- Work units grouped into waves
- Wave 1 = independent tasks (can run in parallel tabs)
- Wave 2+ = depends on previous wave
- Each task has: files to touch, test to write first, commit message

Then tell the user:
"Plan ready with [N] waves. Next step: `/spartan:phase execute {{ args[1] | default: "N" }}`"

If the user has multiple Claude Code tabs available, suggest:
"Wave 1 has [N] independent tasks — you can run them in parallel tabs for speed."

{% elif args[0] == "execute" %}
## Execute Phase {{ args[1] | default: "N" }}

Running the planned tasks wave by wave.

### Auto-parallelize with Agent Teams

```bash
echo "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-not_set}"
```

**If Agent Teams is enabled AND the current wave has 2+ parallel work units:** Use Agent Teams automatically. Don't ask — just do it. This replaces manual multi-tab work.

Run `/spartan:team wave` internally. This:
1. Creates a team from the wave plan
2. Spawns one agent per WU with worktree isolation
3. Passes design docs to any UI-related WUs (check `.planning/designs/`)
4. Verifies tests pass between waves
5. Auto-advances to the next wave

**If Agent Teams is NOT enabled** (env var not set) → continue with default execution:

**Run:** `/gsd:execute-phase {{ args[1] | default: "N" }}`

During execution:
- Follow TDD: test first → implement → verify
- Respect safety guardrails if active (careful/freeze/guard)
- After each wave, verify all tests pass before starting next wave
- Capture new knowledge to `.memory/` as you go

After execution, tell the user:
"Phase {{ args[1] | default: "N" }} executed. [N] commits made."

Suggest next step based on phase complexity:
- If phase had 3+ tasks: "Run `/spartan:gate-review {{ args[1] | default: "N" }}` for a dual-agent review, then `/spartan:phase verify {{ args[1] | default: "N" }}`"
- If phase was simple (1-2 tasks): "Next step: `/spartan:phase verify {{ args[1] | default: "N" }}`"

{% elif args[0] == "verify" %}
## Verify Phase {{ args[1] | default: "N" }}

Running acceptance criteria checks and UAT.

**Run:** `/gsd:verify-work {{ args[1] | default: "N" }}`

After verification:
1. Check all acceptance criteria from the discuss phase
2. Run full test suite
3. Extract decisions made → `.memory/decisions/`
4. Extract patterns discovered → `.memory/patterns/`
5. Update `.memory/index.md`

Then tell the user:
- If passed: "Phase {{ args[1] | default: "N" }} verified ✅. Next: `/spartan:phase discuss [N+1]` for the next phase, or `/spartan:project milestone-complete` if milestone is done."
- If failed: "Phase {{ args[1] | default: "N" }} has [N] issues. Fix them, then re-run `/spartan:phase verify {{ args[1] | default: "N" }}`."

{% else %}
## Unknown action: {{ args[0] }}

Available actions:
- `/spartan:phase discuss N` — Gather requirements (starts with Office Hours)
- `/spartan:phase plan N` — Generate wave-parallel execution plan
- `/spartan:phase execute N` — Execute tasks wave by wave
- `/spartan:phase verify N` — Run acceptance criteria + UAT

Example: `/spartan:phase discuss 1`
{% endif %}

---

## Phase Lifecycle (for reference)

```
/spartan:phase discuss N     ← Office Hours → requirements → decompose
       ↓
/spartan:phase plan N        ← Wave-parallel plan from .memory/ context
       ↓
/spartan:phase execute N     ← TDD, wave by wave, safety guardrails
       ↓
/spartan:gate-review N       ← Dual-agent review (Gate 3.5) — optional but recommended
       ↓
/spartan:phase verify N      ← UAT + capture knowledge to .memory/
       ↓
  [next phase or milestone complete]
```
