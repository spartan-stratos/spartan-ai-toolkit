<p align="center">
  <h1 align="center">Spartan AI Toolkit</h1>
  <p align="center">
    <strong>Turn Claude Code from a smart assistant into a disciplined engineering team</strong>
    <br />
    26 commands &middot; 9 coding rules &middot; 8 skills &middot; 2 expert agents
  </p>
  <p align="center">
    <a href="#quick-start">Quick Start</a> &middot;
    <a href="spartan-ai-toolkit/docs/GUIDE.md">Full Guide</a> &middot;
    <a href="spartan-ai-toolkit/docs/CHEATSHEET.md">Cheatsheet</a> &middot;
    <a href="spartan-ai-toolkit/docs/FIRST-RUN.md">First Run</a>
  </p>
</p>

---

## Why Spartan?

Claude Code is powerful. It can write code, debug issues, and answer complex questions. But if you've used it on real projects, you've seen the pattern:

**Claude is like a brilliant junior dev who knows everything but follows no process.**

It writes code without tests. It pushes PRs without rebasing. It "helpfully" edits files you didn't ask it to touch. It forgets decisions from 20 minutes ago. And every developer on your team gets different code style from the same AI.

Spartan fixes this. It's an **engineering discipline layer** &mdash; slash commands, coding rules, and persistent memory that make Claude Code reliable for production work.

### Before & After

| Scenario | Claude Code alone | With Spartan |
|----------|------------------|-------------|
| **"Create a PR"** | Pushes code. Forgets to rebase, skips tests, no PR description. | `/spartan:pr-ready` &rarr; 6-step checklist: rebase, tests, lint, architecture check, security scan, auto-generated PR description. |
| **"Debug this error"** | Guesses a fix, applies it, hopes for the best. | `/spartan:debug` &rarr; 4-phase investigation: reproduce, isolate, root-cause, verify fix. Produces a Debug Report. |
| **Long coding session** | Loses context after 30 min. Forgets earlier decisions. Repeats questions. | Auto-compacts context. Saves decisions to `.memory/`. Resumes perfectly in new sessions. |
| **Team of 5 devs using Claude** | Each gets different code style, different patterns, different conventions. | 9 rule files enforce the same standards for everyone. Every Claude session reads the same rules. |
| **"Fix the login bug"** | Edits the auth module, the user model, the API client, the config file... | `/spartan:freeze auth/` &rarr; Claude can only edit files in that directory. No scope creep. |
| **3-week feature** | Chaos. No plan, no tracking, context lost between sessions. | `/spartan:project new` &rarr; Roadmap, phases, wave execution across parallel Claude tabs, persistent memory. |
| **"Add a new API endpoint"** | Writes a controller. No manager layer, no tests, inconsistent naming. | `/api-endpoint-creator` &rarr; Full stack: Controller + Manager + Repository + Tests, following your team's conventions. |

### What Spartan is NOT

Spartan doesn't replace Claude &mdash; it makes Claude **consistent and reliable**.

> Not everything needs a command. Questions, explanations, small code changes (&lt; 30 min) &mdash; just talk to Claude directly. Commands are for **structured workflows where missing steps cause real problems**.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Superpowers  (always on, automatic)               │
│  "debug this" → 4-phase root cause investigation            │
│  "review this" → two-stage code review                      │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Spartan Commands  (on-demand, 26 commands)        │
│  /spartan            → smart router: asks what you need     │
│  /spartan:quickplan  → spec + plan + branch in one shot     │
│  /spartan:pr-ready   → full checklist before creating PR    │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: GSD v5  (multi-session projects > 3 days)         │
│  Decompose → Plan → Wave-execute → Verify                  │
│  Agent memory (.memory/) persists across all sessions       │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (`npm install -g @anthropic-ai/claude-code`)

### Install

```bash
git clone https://github.com/spartan-stratos/spartan-ai-toolkit.git
cd spartan-ai-toolkit/spartan-ai-toolkit
chmod +x scripts/setup.sh
./scripts/setup.sh --global
```

The setup script runs 8 steps:

1. Check prerequisites (node, npm, git, claude)
2. Guide Superpowers plugin install
3. Install GSD via npx
4. Copy `CLAUDE.md` to `~/.claude/`
5. Install 26 slash commands to `~/.claude/commands/`
6. Install 9 coding rule files to `~/.claude/rules/`
7. Install 8 skills to `~/.claude/skills/`
8. Install 2 expert agents to `~/.claude/agents/`

### Verify

Open any project and run:

```bash
claude
```

Then type:

```
/spartan
```

The smart router asks what you need and routes to the right command. If it responds, everything is working.

---

## Commands

### Routing: Command or Chat?

```
What do you need?
│
├─ Question / explanation / brainstorm        → Just ask Claude
├─ Small code change (< 30 min, ≤ 3 files)   → Just ask Claude
├─ Structured workflow with checklist         → /spartan:command
└─ Not sure which command                     → /spartan (smart router)
```

### All 26 Commands

| Phase | Command | Purpose |
|-------|---------|---------|
| **Start** | `/spartan` | Smart router — asks what you need, routes to right command |
| | `/spartan:project [action]` | Large project lifecycle: `new`, `status`, `milestone-new`, `milestone-complete` |
| | `/spartan:phase [action] [N]` | Phase lifecycle: `discuss`, `plan`, `execute`, `verify` |
| | `/spartan:init-project` | Scan codebase, generate project CLAUDE.md |
| | `/spartan:brownfield` | Map unfamiliar codebase before touching it |
| | `/spartan:kotlin-service` | Scaffold Kotlin + Micronaut microservice |
| | `/spartan:next-app` | Scaffold Next.js app (App Router, Vitest, Docker, CI) |
| | `/spartan:gsd-upgrade` | Upgrade GSD to v5 (agent memory + wave execution) |
| **Build** | `/spartan:quickplan "task"` | Spec + plan + branch in one shot (tasks < 1 day) |
| | `/spartan:next-feature` | Add feature to existing Next.js app |
| | `/spartan:debug "symptom"` | 4-phase root cause investigation |
| | `/spartan:figma-to-code` | Figma MCP to production React components |
| | `/spartan:migration "desc"` | Create versioned Flyway database migration |
| **Ship** | `/spartan:pr-ready` | Pre-PR checklist: rebase, tests, lint, security, PR description |
| | `/spartan:review` | PR review with Kotlin/Micronaut conventions |
| | `/spartan:fe-review` | PR review with Next.js App Router conventions |
| | `/spartan:deploy [svc]` | Deploy guide with pre-flight checks |
| **Setup** | `/spartan:e2e` | Scaffold Playwright E2E testing |
| | `/spartan:testcontainer` | Setup Testcontainers (Postgres/Kafka/Redis) |
| | `/spartan:env-setup` | Audit env vars, generate `.env.example` |
| **Ops** | `/spartan:daily` | Standup summary from git log + project status |
| | `/spartan:context-save` | Save session state, resume in new session |
| **Safety** | `/spartan:careful` | Warn before destructive ops (rm, DROP, force-push) |
| | `/spartan:freeze <dir>` | Lock file edits to one directory only |
| | `/spartan:unfreeze` | Remove directory lock |
| | `/spartan:guard <dir>` | Careful + freeze combined (maximum safety) |

---

## Coding Rules

9 rule files are installed to `~/.claude/rules/project/` and enforced automatically in every project:

| Rule File | What It Enforces |
|-----------|-----------------|
| `CORE_RULES` | `!!` operator banned, Either error handling, null safety patterns |
| `ARCHITECTURE_RULES` | Layered architecture: Controller &rarr; Manager &rarr; Service/Repository |
| `API_RULES` | RPC-style API design, query parameters only (no path params) |
| `DATABASE_RULES` | No foreign keys, TEXT not VARCHAR, soft deletes, UUID primary keys |
| `FRONTEND_RULES` | Build check before commit, cleanup imports, API response null safety |
| `CONTROLLER_TEST_STANDARDS` | `@MicronautTest` patterns, AbstractControllerTest, Retrofit clients |
| `NAMING_CONVENTIONS` | snake_case for DB/JSON, camelCase for Kotlin/TypeScript |
| `RETROFIT_CLIENT_PLACEMENT` | Never place Retrofit interfaces in kapt-enabled modules |
| `TRANSACTION_RULES` | Multi-table operations must use `transaction(db.primary) {}` |

---

## Skills

8 skill sets installed to `~/.claude/skills/`:

| Skill | Description |
|-------|-------------|
| `/api-endpoint-creator` | Generate full Controller &rarr; Manager &rarr; Repository stack |
| `/database-table-creator` | SQL migration &rarr; Exposed Table &rarr; Entity &rarr; Repository &rarr; Tests |
| `/backend-api-design` | RPC-style API design patterns and reference |
| `/database-patterns` | Schema design, migrations, Exposed ORM patterns |
| `/kotlin-best-practices` | Null safety, Either, coroutines quick reference |
| `/testing-strategies` | Integration test patterns for Micronaut |
| `/security-checklist` | Authentication, authorization, input validation, OWASP |
| `/ui-ux-pro-max` | Design system: 67 styles, 96 palettes, 57 font pairings, 13 stacks |

---

## Expert Agents

2 agents installed to `~/.claude/agents/`:

| Agent | Expertise |
|-------|-----------|
| `micronaut-backend-expert` | Deep Micronaut framework knowledge, database design, API architecture |
| `solution-architect-cto` | Strategic tech decisions, system design, scalability planning |

---

## Target Stack

Spartan is designed for teams using:

| Layer | Technology |
|-------|-----------|
| Backend | Kotlin + Micronaut (coroutines, Either, Exposed ORM) |
| Frontend | React + Next.js + TypeScript (App Router) |
| Database | PostgreSQL |
| Container | Docker |
| Orchestration | Kubernetes |
| IaC | Terraform |
| Platforms | Railway (staging) &middot; AWS (production) &middot; GCP |
| CI/CD | GitHub Actions |

> **Using a different stack?** Fork the repo, edit `CLAUDE.md` and the files in `rules/project/`, then run `setup.sh --global`. The command framework works with any language or framework.

---

## Daily Workflow

```
/spartan:daily                      ← Standup summary
       ↓
/spartan:quickplan "task"           ← Spec + plan + branch (< 1 day)
       ↓
  [Code — Superpowers auto-triggers TDD, debug, review]
       ↓
/spartan:pr-ready                   ← Pre-PR checklist + create PR
       ↓
/spartan:deploy [svc] [target]      ← Deploy + verify
```

### Task Size Routing

| Size | Approach |
|------|----------|
| < 30 min, ≤ 3 files | Just ask Claude (no command needed) |
| < 1 day | `/spartan:quickplan "task"` |
| 1–3 days | `/spartan:project new` |
| > 3 days, multi-session | `/spartan:project new` with GSD v5 wave execution |

---

## GSD v5: Multi-Session Projects

For projects spanning multiple days/sessions, GSD v5 provides:

**Decompose** &mdash; Break requirements into work units (max 3 files, max half-day each), grouped into dependency waves.

**Wave Execution** &mdash; Wave 1 runs in parallel (multiple Claude Code tabs). Wave 2 starts after Wave 1 passes tests. Repeat until done.

**Agent Memory** (`.memory/`) &mdash; Persistent project knowledge: architectural decisions, discovered patterns, domain facts, known blockers. Survives all sessions.

```
/spartan:project new                ← Create PROJECT.md + ROADMAP.md
/spartan:phase discuss N            ← Requirements (3 forcing questions first)
/spartan:phase plan N               ← Wave-parallel execution plan
/spartan:phase execute N            ← Execute with TDD, atomic commits
/spartan:phase verify N             ← UAT + capture learnings to .memory/
```

---

## Safety Guardrails

Three levels of protection, activated on-demand:

| Level | Command | Protection |
|-------|---------|-----------|
| Warn | `/spartan:careful` | Confirm before `rm -rf`, `DROP TABLE`, `git push --force` |
| Lock | `/spartan:freeze <dir>` | File edits restricted to one directory only |
| Max | `/spartan:guard <dir>` | Careful + freeze combined |

Careful mode overrides auto mode &mdash; destructive operations always require confirmation.

---

## Bonus: Telegram Bridge

Control Claude Code remotely from your phone when you're away from your desk. Built on the [Claude Agent SDK](https://docs.anthropic.com/en/docs/claude-code/sdk) &mdash; no CLI spawning, real streaming responses.

```
Phone (Telegram) ←→ Bridge (Node.js) ←→ Claude Agent SDK ←→ Claude API
```

Multi-project sessions, cost tracking, secret redaction, `/scan` for project discovery, `/cancel` to abort queries.

See [`claude-telegram-bridge/README.md`](claude-telegram-bridge/README.md) for setup.

---

## Project Structure

```
spartan-ai-toolkit/
├── spartan-ai-toolkit/               # Main toolkit
│   ├── CLAUDE.md                     # Workflow brain (Claude reads this)
│   ├── README.md                     # Toolkit-specific README
│   ├── scripts/
│   │   └── setup.sh                  # One-command installer (8 steps)
│   ├── docs/
│   │   ├── GUIDE.md                  # Comprehensive guide (15 min read)
│   │   ├── CHEATSHEET.md             # Quick reference card
│   │   └── FIRST-RUN.md             # First-run walkthrough
│   ├── rules/project/                # 9 coding standard files
│   │   ├── CORE_RULES.md
│   │   ├── ARCHITECTURE_RULES.md
│   │   ├── API_RULES.md
│   │   ├── DATABASE_RULES.md
│   │   ├── FRONTEND_RULES.md
│   │   ├── CONTROLLER_TEST_STANDARDS.md
│   │   ├── NAMING_CONVENTIONS.md
│   │   ├── RETROFIT_CLIENT_PLACEMENT.md
│   │   └── TRANSACTION_RULES.md
│   ├── skills/                       # 8 Claude Code skill sets
│   │   ├── api-endpoint-creator/
│   │   ├── backend-api-design/
│   │   ├── database-patterns/
│   │   ├── database-table-creator/
│   │   ├── kotlin-best-practices/
│   │   ├── security-checklist/
│   │   ├── testing-strategies/
│   │   └── ui-ux-pro-max/
│   ├── agents/                       # 2 expert agent definitions
│   │   ├── micronaut-backend-expert.md
│   │   └── solution-architect-cto.md
│   └── .claude/commands/             # 26 slash command prompts
│       ├── spartan.md                # Smart router (entry point)
│       └── spartan/                  # 25 subcommands
│           ├── quickplan.md
│           ├── pr-ready.md
│           ├── debug.md
│           └── ... (22 more)
├── claude-telegram-bridge/           # Remote control via Telegram
│   ├── bridge.js
│   ├── package.json
│   └── README.md
├── CLAUDE.md                         # Project-level AI context
├── README.md                         # This file
├── LICENSE                           # MIT License
└── .gitignore
```

---

## Customization

### For Your Team

1. Fork this repo
2. Edit `spartan-ai-toolkit/CLAUDE.md` &mdash; change stack conventions
3. Edit files in `spartan-ai-toolkit/rules/project/` &mdash; change coding rules
4. Add/replace skills and commands
5. Share the fork &mdash; everyone runs `setup.sh --global`

### Per-Project Overrides

Each project can have its own `CLAUDE.md` in its root directory. Claude reads both: global toolkit rules + project-specific context. Project-level overrides global when there's a conflict.

Generate one automatically:

```
/spartan:init-project
```

---

## Documentation

| Document | Description | Reading Time |
|----------|-------------|:------------:|
| [Full Guide](spartan-ai-toolkit/docs/GUIDE.md) | Comprehensive A-to-Z guide | 15 min |
| [First Run](spartan-ai-toolkit/docs/FIRST-RUN.md) | Step-by-step first project walkthrough | 20 min |
| [Cheatsheet](spartan-ai-toolkit/docs/CHEATSHEET.md) | Quick reference card (print it) | 2 min |

---

## Credits

- [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent
- [GSD](https://github.com/gsd-build/get-shit-done) by TACHES
- Inspired by [OpenSpec](https://github.com/Fission-AI/OpenSpec) fast-forward concept

---

## License

MIT
