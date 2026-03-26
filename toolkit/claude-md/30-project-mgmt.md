
---

## Project Management Commands

| Command | Purpose |
|---|---|
| `/spartan:epic "name"` | Break big work into ordered features → each goes through spec → plan → build |
| `/spartan:project [action]` | Manage large projects: `new`, `status`, `milestone-new`, `milestone-complete`, `milestone-summary`, `manager` |
| `/spartan:phase [action] [N]` | Manage phases: `discuss`, `plan`, `execute`, `verify` |
| `/spartan:workstreams [action]` | Parallel workstreams: `list`, `create`, `switch`, `status`, `progress`, `complete`, `resume` |
| `/spartan:gsd-upgrade [mode]` | Upgrade GSD to v5 (decompose + memory + waves) |
| `/spartan:forensics "problem"` | Post-mortem investigation — diagnose failed workflows |
| `/spartan:brownfield [svc]` | Map existing codebase; generates CONTEXT-MAP.md |
| `/spartan:map-codebase` | Deep codebase analysis and architecture mapping |
| `/spartan:team [action]` | Agent Teams: `create`, `status`, `wave`, `review`, `research`, `build`, `clean` |

### Office Hours (GSD Discuss Phase)
When running `/spartan:phase discuss N`, Claude MUST ask these 3 forcing questions BEFORE gathering requirements:

1. **"What pain are we actually solving?"** (not the feature — the underlying pain)
2. **"What's the narrowest version we can ship to learn?"** (force MVP thinking)
3. **"What assumption are we making that could be wrong?"** (surface hidden risks)

Only after user answers all 3 → proceed to normal requirement gathering.
**Auto mode on?** → Still ask these 3 questions. They exist to prevent building the wrong thing — skipping them defeats the purpose.

---

## GSD v5 — Decompose + Agent Memory + Wave Execution

### Decompose Step
Complex requirements are broken into **work units (WUs)** before planning:
- Each WU: max 3 files, max half-day, one commit
- WUs are grouped into **waves** by dependency
- Wave 1 = no dependencies → can run in parallel Claude Code tabs
- Wave N+1 = depends on Wave N outputs

### Agent Memory (`.memory/`)
Persistent project knowledge that survives all sessions:
```
.memory/
  index.md            ← Quick reference to all knowledge
  decisions/          ← ADRs (architectural decision records)
  patterns/           ← Reusable code patterns discovered
  knowledge/          ← Domain facts, API gotchas, business rules
  blockers/           ← Known issues and workarounds
```
- **Always** check `.memory/index.md` at session start
- **Always** capture new decisions/patterns after significant work
- `/spartan:context-save` now also updates `.memory/`

### Wave Execution
```
Wave 1 (parallel): WU-1, WU-3, WU-5  ← no dependencies
  ── verify tests ──
Wave 2 (after 1):  WU-2, WU-4        ← depends on wave 1
  ── verify tests ──
Wave 3 (final):    WU-6              ← integration
```
Multi-tab: each Claude Code tab handles one WU from the same wave.

### Workstreams & Workspaces

**Workstreams** (`/spartan:workstreams`) — run multiple milestones in parallel:
- `create <name>` — spin up an independent work track
- `switch <name>` — change active context between workstreams
- `progress` — see all workstreams' completion at a glance

**Workspaces** — isolated repo copies for safe parallel work:
- Each workspace gets its own `.planning/` directory
- No interference between concurrent work tracks
- GSD manages workspace lifecycle automatically

### Project Lifecycle Commands (wraps GSD under the hood)
```
/spartan:project new               Create project → PROJECT.md → ROADMAP.md
/spartan:project status             Where are we? Current milestone/phase
/spartan:project milestone-new      Start next milestone
/spartan:project milestone-complete Archive milestone + git tag
/spartan:project milestone-summary  Generate onboarding doc from milestone
/spartan:project manager            Interactive command center for power users

/spartan:phase discuss N            Office Hours (3 questions) → decompose → requirements
/spartan:phase plan N               Generate wave-parallel execution plan
/spartan:phase execute N            Execute tasks wave by wave (TDD, safety)
/spartan:phase verify N             UAT + acceptance criteria + capture to .memory/

/spartan:workstreams [action]       Manage parallel workstreams (list/create/switch/complete)
/spartan:forensics "problem"        Post-mortem investigation for failed workflows
```

Users never need to type `/gsd:*` commands — the wrappers handle everything.

### Agent Teams (Experimental)

**Requires:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env var set to `1`.

Agent Teams replace manual multi-tab parallelism with automated multi-agent coordination. Multiple Claude Code sessions share a task list, communicate via messages, and work in parallel.

| Command | What it does |
|---|---|
| `/spartan:team create` | Create a team with smart defaults for a task |
| `/spartan:team status` | Show team progress and teammate states |
| `/spartan:team wave` | Execute a GSD wave plan using Agent Teams |
| `/spartan:team review` | Quick-spawn: parallel review team (quality + tests + security) |
| `/spartan:team research` | Quick-spawn: research swarm (breadth + depth + contrarian) |
| `/spartan:team build` | Quick-spawn: parallel implementation team |
| `/spartan:team clean` | Shut down teammates and clean up |

**How it bridges waves:**
```
Wave plan (.planning/)  →  /spartan:team wave  →  Agent Teams
  WU-1, WU-3, WU-5         TeamCreate              Teammate per WU
  (was: manual tabs)        TaskCreate per WU       Worktree isolation
                            Spawn agents            Auto-advance waves
```

Teams store state in `~/.claude/teams/` and `~/.claude/tasks/`. Clean up with `/spartan:team clean`.
