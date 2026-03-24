# Spartan AI Toolkit — Comprehensive Usage Guide

> This document covers all updates and usage instructions from A to Z.
> Reading time: ~15 minutes. After reading, use `docs/CHEATSHEET.md` as a quick reference.

---

## Table of Contents

1. [Overview — What's in the toolkit?](#1-overview)
2. [Installation](#2-installation)
3. [Core Principle — Command or Chat?](#3-core-principle)
4. [3 Journeys — Where to start?](#4-three-journeys)
5. [Smart Router — Single entry point](#5-smart-router)
6. [Auto Mode — Run without confirmations](#6-auto-mode)
7. [Safety Guardrails — Protection from destructive errors](#7-safety-guardrails)
8. [Context Management — Never lose state](#8-context-management)
9. [GSD v5 — For large projects](#9-gsd-v5)
10. [All 29 commands — Quick reference](#10-all-commands)
11. [Changelog — v1 to v4](#11-changelog)

---

## 1. Overview

Spartan AI Toolkit is a workflow system for Engineering Managers using Claude Code CLI.
It consists of **3 layers** working together:

**Layer 1: Superpowers** (always on, automatic)
When you say "review this", "debug this", "help me plan" — Claude auto-triggers the right skill.
No command needed. This is the invisible layer.

**Layer 2: Spartan Commands** (29 commands, type when needed)
Pre-built, high-quality prompts for structured workflows: scaffold projects, create PRs, deploy, systematic debugging, Figma design-to-code, etc.

**Layer 3: GSD v5** (for projects > 3 days)
Full lifecycle: decompose → plan → wave-execute → verify.
With agent memory (`.memory/`) that persists knowledge across all sessions.

### Supported Stack

- Backend: Kotlin + Micronaut
- Frontend: React + Next.js 15 (App Router) + TypeScript
- Infra: Docker, Kubernetes, Terraform
- Platforms: Railway (staging), AWS (production), GCP
- CI/CD: GitHub Actions
- Integrations: Cloudinary, Figma MCP

### Company Rules & Skills (synced across all projects)

The setup script automatically installs 9 rule files + 8 skills + 2 agents into every project, ensuring:
- All devs in the company use the same coding conventions
- Claude Code follows company rules in every project
- No need to manually copy/paste rules when creating new projects

**Rules** (mandatory — Claude MUST follow these):
- `CORE_RULES` — `!!` banned, Either error handling, null safety, controller patterns
- `ARCHITECTURE_RULES` — Controller → Manager → Service/Repository
- `API_RULES` — Query params only, RPC-style URLs, no path params
- `DATABASE_RULES` — No FK, TEXT not VARCHAR, soft deletes, `uuid_generate_v4()`
- `FRONTEND_RULES` — Build check before commit, cleanup imports, null safety
- `CONTROLLER_TEST_STANDARDS` — `@MicronautTest` patterns, AbstractControllerTest
- `NAMING_CONVENTIONS` — snake_case DB/JSON, camelCase Kotlin/TypeScript
- `RETROFIT_CLIENT_PLACEMENT` — Kapt + Retrofit module conflict prevention
- `TRANSACTION_RULES` — Multi-table operations must use `transaction(db.primary)`

**Skills** (Claude Code slash commands for common tasks):
- `/api-endpoint-creator` — Generate full Controller → Manager → Repository
- `/database-table-creator` — SQL → Exposed Table → Entity → Repository → Tests
- `/kotlin-best-practices` — Quick reference for Kotlin conventions
- `/testing-strategies` — `@MicronautTest` integration test patterns
- `/security-checklist` — Auth, validation, OWASP
- `/ui-ux-pro-max` — Design system (67 styles, 96 palettes, 13 stacks)

**Agents** (specialized expert guidance):
- `micronaut-backend-expert` — Deep Micronaut expertise, DB design, API architecture
- `solution-architect-cto` — Strategic tech decisions, system design

---

## 2. Installation

```bash
git clone https://github.com/spartan-stratos/spartan-ai-toolkit.git
cd spartan-ai-toolkit/spartan-ai-toolkit
chmod +x scripts/setup.sh
./scripts/setup.sh --global
```

The script installs in 8 steps:
1. Check prerequisites (Node >= 18, npm, git, claude CLI)
2. Guide Superpowers installation in Claude Code
3. Install GSD via `npx get-shit-done-cc@latest --global`
4. Copy CLAUDE.md to `~/.claude/CLAUDE.md` (asks backup if already exists)
5. Copy smart router + 25 subcommands to `~/.claude/commands/`
6. Copy 9 company rule files to `~/.claude/rules/project/` (asks backup if already exists)
7. Copy 8 company skills to `~/.claude/skills/` (asks backup if already exists)
8. Copy 2 agents to `~/.claude/agents/`

Then **restart Claude Code** (required for Superpowers).

### Where does everything go?

After setup, everything lives in `~/.claude/` — Claude reads these files automatically in every project:

```
~/.claude/
├── CLAUDE.md              ← The "brain" — Claude reads this every session
│                            All workflow rules, conventions, and routing logic
├── commands/
│   ├── spartan.md         ← Smart router (/spartan)
│   └── spartan/           ← 25 subcommands (/spartan:quickplan, etc.)
├── rules/project/         ← 9 coding rule files (enforced automatically)
├── skills/                ← 8 skill sets (/api-endpoint-creator, etc.)
└── agents/                ← 2 expert agents
```

**Key file:** `~/.claude/CLAUDE.md` is the instructions file that controls Claude's behavior. To customize Spartan for your team, edit this file.

### Verify

```bash
cd ~/any-project && claude
# Type: /spartan
# → Smart router asks what you need = success
```

---

## 3. Core Principle — Command or Chat?

This is the most important rule:

```
What do you need?
│
├─ Ask / explain / brainstorm → Talk to Claude normally
├─ Small code (< 30 min, ≤ 3 files) → Talk to Claude normally (Superpowers handles it)
├─ Structured workflow with checklist → Use /spartan: command
└─ Not sure which command → Type /spartan
```

### Examples: NO command needed
- "Explain how Next.js App Router works" → ask directly
- "Fix the typo on line 42" → Claude fixes it
- "Add a field to the DTO" → Claude does it
- "Review this code" → paste code, Superpowers auto-triggers review

### Examples: NEED a command
- "Create a new Micronaut service" → `/spartan:kotlin-service`
- "Prepare PR" → `/spartan:pr-ready` (6-step checklist, devs usually forget 3 steps)
- "Deploy to Railway" → `/spartan:deploy` (pre-flight checks + post-deploy verify)
- "Plan task for tomorrow" → `/spartan:quickplan "description"`

**Rule of thumb:** Commands are for multi-step workflows needing checklists. Everything else — just chat.

---

## 4. Three Journeys — Where to start?

### Journey A: New Project (no code yet)

```
Step 1: /spartan:init-project [name]          Generate CLAUDE.md for the project
Step 2: /spartan:kotlin-service [name]        Scaffold backend
   or   /spartan:next-app [name]              Scaffold frontend
Step 3: /spartan:gsd-upgrade fresh            Setup agent memory + wave execution
Step 4: /spartan:project new                  If project > 3 days → full lifecycle
Step 5: → Enter Daily Task cycle
```

### Journey B: Existing Project (has codebase)

```
Step 1: /spartan:brownfield [service]         Map codebase, create CONTEXT-MAP.md
Step 2: /spartan:init-project                 Generate CLAUDE.md from code scan
Step 3: /spartan:gsd-upgrade migrate          If you want agent memory
Step 4: → Enter Daily Task cycle
```

### Journey C: Daily Tasks (daily loop — most used)

```
/spartan:daily                     Standup: what's done, what's next
       ↓
/spartan:quickplan "task"          Spec + plan + branch (task < 1 day)
  or /spartan:phase execute N        If inside large project
       ↓
  [Code — Superpowers auto-triggers TDD, debug, review]
       ↓
/spartan:pr-ready                  Checklist + create PR
       ↓
/spartan:deploy [svc] [target]     Deploy + smoke test
```

**Top 5 most used commands:** `quickplan`, `pr-ready`, `debug`, `context-save`, `/spartan` (router).

---

## 5. Smart Router — Single entry point

Type `/spartan` (no subcommand) at any time.

Claude will:
1. Silently scan project context (has CLAUDE.md? has .planning/? what stack?)
2. Ask you **1 question** based on context
3. Route to the right command + explain why
4. Execute immediately — no "shall I proceed?"

Examples:
- You're in an empty repo → Claude asks "Backend or frontend?" → routes to `kotlin-service` or `next-app`
- You're in an active GSD project → Claude says "Project X is at phase 3. Continue?" → routes to `gsd:status`
- You say "I need to debug this error" → routes to `/spartan:debug`

**Experienced users still type commands directly** — `/spartan:quickplan`, `/spartan:pr-ready`, etc. The smart router helps newcomers or when you're unsure which command to use.

---

## 6. Auto Mode — Run without confirmations

Many commands pause for confirmation mid-execution ("Does this spec match? y/n"). When you're in a good flow, this is annoying.

```
"auto on"    → Claude runs straight through, skips all confirmations
"auto off"   → Back to default, asks for confirmation each step
"stop"       → Stop immediately mid-execution
```

### Auto mode STILL STOPS when:
- Destructive operations (if careful mode is active) — always requires "I confirm"
- 3 Office Hours questions in `/spartan:phase discuss` — cannot be skipped

### Who should use auto mode?
- **Newcomers:** Keep auto off (default) — read output at each step, understand the workflow
- **Experienced users:** Turn auto on — quickplan → execute → pr-ready flows seamlessly

---

## 7. Safety Guardrails — Protection from destructive errors

3 protection levels, activated on-demand:

### `/spartan:careful` — Warn before destructive ops

When active, Claude detects and warns before:
- **Filesystem:** `rm -rf`, overwriting files, `chmod 777`
- **Git:** `force push`, `reset --hard`, `clean -fd`, branch deletion
- **Database:** `DROP TABLE`, `TRUNCATE`, `DELETE FROM` (no WHERE), overwriting migrations
- **Infrastructure:** `terraform destroy`, `docker system prune`, removing Railway services

Claude prints a warning + requires typing "I confirm". No confirm = no execution.

### `/spartan:freeze <dir>` — Lock edits to one directory

Claude can only modify files inside the specified directory + its corresponding test directory.
All files outside scope → Claude refuses.

Use cases:
- Debugging `auth/` module → don't want Claude "fixing" `payments/` too
- Working on a migration → don't want Claude changing application code

### `/spartan:guard <dir>` — Careful + Freeze combined

Maximum safety. Use when:
- Editing production config
- Running database migrations
- Hotfixing on main branch

**Important:** Careful mode overrides auto mode. Even with auto on, destructive ops still require confirmation.

---

## 8. Context Management — Never lose state

### Claude self-manages context (new in v3)

You don't need to monitor context % anymore. Claude self-monitors and acts:

| Signal | Claude automatically does |
|---|---|
| Starting to forget earlier context | Runs `/compact`, notifies you |
| Already compacted but still heavy | Runs `/spartan:context-save` full, asks for new session |
| Response quality dropping | Warns before taking action |

Claude **always notifies** — never silently degrades quality.

### Agent Memory (`.memory/`)

Long-term knowledge that persists across the entire project lifetime:

```
.memory/
  index.md         ← Index of all knowledge
  decisions/       ← Why we chose Cloudinary over S3
  patterns/        ← Reusable API client pattern
  knowledge/       ← Stripe webhook gotchas, Cloudinary transform rules
  blockers/        ← React Konva doesn't support SSR
```

Unlike `.handoff/` (only for one session), `.memory/` lives throughout the project.

---

## 9. GSD v5 — For large projects (> 3 days)

### When to use GSD?

| Task size | Use |
|---|---|
| < 30 min | Just chat |
| < 1 day | `/spartan:quickplan` |
| 1-3 days | `/spartan:project new` (lightweight lifecycle) |
| > 3 days | `/spartan:project new` (full lifecycle) |

### What's new in GSD v5?

**1. Decompose step** — Before planning, break requirements into work units (WUs):
- Each WU: max 3 files, max half-day, 1 commit
- WUs are arranged into waves by dependency

**2. Wave execution** — Parallel instead of sequential:
```
Wave 1 (parallel): WU-1, WU-3, WU-5   ← no dependencies
  ── run tests ──
Wave 2 (after wave 1): WU-2, WU-4     ← need wave 1 output
  ── run tests ──
Wave 3 (final): WU-6                   ← integration
```

Each WU can run in a separate Claude Code tab → true parallelism.

**3. Office Hours** — 3 mandatory questions before each `discuss-phase`:
1. "What pain are we actually solving?" (not the feature, the pain)
2. "What's the narrowest version we can ship to learn?" (force MVP)
3. "What assumption are we making that could be wrong?" (surface risk)

Cannot be skipped, even in auto mode. Purpose: prevent building the wrong thing.

**4. Workstreams** — parallel milestone work (new in GSD v1.28):
- `/spartan:workstreams create <name>` — spin up an independent work track
- `/spartan:workstreams switch <name>` — change active context
- `/spartan:workstreams progress` — see all workstreams at a glance
- Each workstream has its own milestones, phases, and progress

**5. Workspaces** — isolated repo copies:
- Each workspace gets its own `.planning/` directory
- No interference between concurrent work tracks
- Managed via GSD under the hood

**6. Forensics** — post-mortem investigation:
- `/spartan:forensics "what went wrong"` — diagnose failed workflows
- Analyzes git history, planning artifacts, and project state
- Read-only diagnostic — does not modify anything

**7. Milestone Summary & Manager**:
- `/spartan:project milestone-summary` — generate onboarding doc from completed milestone
- `/spartan:project manager` — interactive command center for overseeing all phases

---

## 10. All 29 Commands

### Start (project setup, one-time)
| Command | Description |
|---|---|
| `/spartan` | Smart router — asks what you need, routes to right command |
| `/spartan:project [action]` | Large project lifecycle: `new`, `status`, `milestone-new`, `milestone-complete`, `milestone-summary`, `manager` |
| `/spartan:phase [action] [N]` | Phase lifecycle: `discuss`, `plan`, `execute`, `verify` |
| `/spartan:init-project [name]` | Scan code → auto-generate CLAUDE.md |
| `/spartan:brownfield [svc]` | Quick overview of unfamiliar codebase → CONTEXT-MAP.md |
| `/spartan:map-codebase` | Deep codebase analysis → 7 docs in .planning/codebase/ |
| `/spartan:kotlin-service [name]` | Scaffold Micronaut microservice |
| `/spartan:next-app [name]` | Scaffold Next.js app |
| `/spartan:gsd-upgrade [mode]` | Upgrade GSD v5 (memory + waves) |
| `/spartan:workstreams [action]` | Parallel workstreams: `list`, `create`, `switch`, `progress`, `complete` |
| `/spartan:forensics "problem"` | Post-mortem investigation for failed workflows |

### Build (daily task work)
| Command | Description |
|---|---|
| `/spartan:quickplan "task"` | Spec + plan + branch (< 1 day) |
| `/spartan:next-feature [name]` | Add feature to Next.js app |
| `/spartan:debug "symptom"` | 4-phase root cause investigation |
| `/spartan:figma-to-code [url]` | Figma MCP → production React (1 screen/session) |
| `/spartan:migration "desc"` | Create Flyway migration |

### Ship (review + deploy)
| Command | Description |
|---|---|
| `/spartan:pr-ready` | 6-step pre-PR checklist + create PR |
| `/spartan:review` | PR review with Kotlin/Micronaut conventions |
| `/spartan:fe-review` | PR review with Next.js conventions |
| `/spartan:deploy [svc] [target]` | Deploy + smoke test |

### Setup (integration, as-needed)
| Command | Description |
|---|---|
| `/spartan:e2e [feature]` | Playwright E2E testing |
| `/spartan:testcontainer [type]` | Testcontainers (postgres/kafka/redis) |
| `/spartan:env-setup [svc]` | Audit env vars across environments |

### Ops (routine)
| Command | Description |
|---|---|
| `/spartan:daily` | Standup summary |
| `/spartan:context-save` | Smart context save (compact first, full save if needed) |
| `/spartan:update` | Check for updates and upgrade Spartan to latest version |

### Safety (guardrails)
| Command | Description |
|---|---|
| `/spartan:careful` | Warn before destructive ops |
| `/spartan:freeze <dir>` | Lock edits to one directory |
| `/spartan:unfreeze` | Remove directory lock |
| `/spartan:guard <dir>` | Careful + freeze combined |

---

## 11. Changelog — v1 to v4

### v1 → v2 (original → consolidated)
- Combined Superpowers + GSD + Spartan commands into 1 toolkit
- 15 custom commands initially
- One-command setup script
- FIRST-RUN.md step-by-step guide

### v2 → v3 (9 new commands + UX refactor + rules/skills/agents)

**New commands:**
- `/spartan` — Smart router (single entry point)
- `/spartan:figma-to-code` — Figma MCP → production React
- `/spartan:e2e` — Playwright E2E testing
- `/spartan:init-project` — Auto-generate CLAUDE.md from codebase
- `/spartan:gsd-upgrade` — GSD v5 (decompose + memory + waves)
- `/spartan:careful` — Destructive operation warnings
- `/spartan:freeze` / `unfreeze` — Directory edit lock
- `/spartan:guard` — Maximum safety mode

**UX refactor:**
- CLAUDE.md restructured: "Why Spartan" → "Command or Chat?" → 3 Journeys → commands by phase
- No more flat list of 29 commands — grouped by Start/Build/Ship/Setup/Ops/Safety
- CHEATSHEET.md: 1-page quick reference, print and pin next to monitor
- Clear decision tree: when to use commands vs. when to just chat

**Behavior upgrades:**
- Auto mode ("auto on") — skip confirmations, max velocity
- Auto context management — Claude self-compacts/saves, no user monitoring needed
- Office Hours — 3 forcing questions before each GSD discuss-phase
- Safety guardrails — careful/freeze/guard for production work
- Agent memory (`.memory/`) — persistent knowledge across sessions
- Wave-parallel execution — multi-tab Claude Code for independent tasks

**Company sync:**
- 9 company rules synced to all projects via setup script
- 8 company skills synced to all projects
- 2 expert agents (micronaut-backend-expert, solution-architect-cto)
- Setup script handles existing files: asks backup+overwrite or skip

### v3 → v4 (GSD v1.28 features + 2 new commands)

**New commands:**
- `/spartan:workstreams` — Manage parallel workstreams for concurrent milestone work
- `/spartan:forensics` — Post-mortem investigation for failed or stuck workflows

**New project actions:**
- `/spartan:project milestone-summary` — Generate onboarding doc from completed milestone
- `/spartan:project manager` — Interactive command center for managing multiple phases

**GSD v1.28 features wrapped:**
- Workstream namespacing — run multiple milestones in parallel
- Workspace isolation — isolated repo copies with independent `.planning/`
- Forensics — post-mortem workflow investigation
- Milestone summary — team onboarding after milestone completion
- Manager — interactive command center for power users
- New settings: `workflow.skip_discuss`, `workflow.discuss_mode`

**Total commands:** 26 → 28

---

## Tips for Newcomers

1. **Start with `/spartan`** — it will guide you
2. **Only remember 3 commands:** `quickplan`, `pr-ready`, `context-save`
3. **Not sure?** Just chat with Claude normally — it's smart enough
4. **Print CHEATSHEET.md** and pin it next to your monitor
5. **Auto mode** when comfortable: `"auto on"` at session start

## Tips for Power Users

1. **Multi-tab GSD:** Each Claude Code tab handles one work unit in the same wave
2. **Guard mode for migrations:** `/spartan:guard db/migration/` before editing schemas
3. **Figma budget:** 1 screen/session, `context-save` between screens
4. **`.memory/`** is the secret weapon — Claude reads it every session, accumulates knowledge

---

*Spartan AI Toolkit — 29 commands, 3 layers, 1 workflow.*
*Type `/spartan` to get started.*
