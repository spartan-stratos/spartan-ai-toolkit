# Spartan AI Toolkit

> AI workflow for Engineering Managers — **35 commands in 6 packs**, full-stack Kotlin + Next.js.

---

## Quick Start

```bash
git clone https://github.com/spartan-stratos/spartan-ai-toolkit.git
cd spartan-ai-toolkit/toolkit
chmod +x scripts/setup.sh
./scripts/setup.sh --global
```

After setup, open any project, run `claude`, then:

```
/spartan
```

The smart router will ask what you need and route to the right command.

---

## Why Spartan?

**Commands are pre-built, high-quality prompts** for workflows where free-form chat leads to missed steps.

Example: `/spartan:pr-ready` checks 6 steps (rebase, tests, lint, architecture, security, PR description) — devs typically forget 3 of those 6.

**Not everything needs a command.** Talk to Claude directly for explanations, small code changes (< 30 min), or brainstorming. Use commands for structured workflows with checklists.

---

## 3 Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Superpowers  (always on, automatic)                │
│  "help me plan X"   → brainstorm → spec → plan             │
│  "debug this"       → 4-phase root cause investigation      │
│  "review this"      → two-stage code review                 │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Spartan Commands  (on-demand, precision tools)     │
│  /spartan            → smart router: asks what you need     │
│  /spartan:quickplan  → spec+plan+branch in one shot         │
│  /spartan:pr-ready   → full checklist before creating PR    │
│  ... 35 commands total (6 packs)                             │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: GSD v5  (for large multi-session projects)        │
│  /spartan:project new → decompose → plan → wave-execute     │
│  Agent memory: .memory/ — persistent project knowledge      │
│  Wave execution: parallel work across Claude Code tabs      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3 Journeys

### 🟢 New Project → [Journey A]
```
/spartan:init-project → kotlin-service / next-app → gsd-upgrade → [daily tasks]
```

### 🔵 Existing Project → [Journey B]
```
/spartan:brownfield → init-project → [daily tasks]
```

### 🟡 Daily Tasks → [Journey C] (most used)
```
daily → quickplan → [code with Superpowers] → pr-ready → deploy
```

Details: see the **[README](../README.md)** for full command table and pack examples.

---

## 35 Commands

### Start (project setup)
| Command | When to use |
|---|---|
| `/spartan` | **Not sure which command** → smart router asks + routes |
| `/spartan:project [action]` | Large project lifecycle: `new`, `status`, `milestone-new`, `milestone-complete`, `milestone-summary`, `manager` |
| `/spartan:phase [action] [N]` | Phase lifecycle: `discuss`, `plan`, `execute`, `verify` |
| `/spartan:init-project [name]` | Auto-generate CLAUDE.md from codebase scan |
| `/spartan:brownfield [svc]` | Entering unfamiliar codebase — map before touching |
| `/spartan:kotlin-service [name]` | Scaffold new Micronaut microservice |
| `/spartan:next-app [name]` | Scaffold new Next.js app |
| `/spartan:gsd-upgrade [mode]` | Upgrade GSD v5 (memory + waves) |
| `/spartan:workstreams [action]` | Parallel workstreams: `list`, `create`, `switch`, `progress`, `complete` |
| `/spartan:forensics "problem"` | Post-mortem investigation for failed workflows |

### Build (daily task work)
| Command | When to use |
|---|---|
| `/spartan:quickplan "task"` | Task < 1 day — spec+plan+branch |
| `/spartan:next-feature [name]` | Add feature to existing Next.js app |
| `/spartan:debug "symptom"` | Bug with unclear root cause |
| `/spartan:figma-to-code [url]` | Figma MCP → production React |
| `/spartan:migration "desc"` | Create Flyway migration |

### Ship (review + deploy)
| Command | When to use |
|---|---|
| `/spartan:pr-ready` | Before creating any PR (don't skip) |
| `/spartan:review` | PR review with Kotlin/Micronaut conventions |
| `/spartan:fe-review` | PR review with Next.js conventions |
| `/spartan:deploy [svc] [target]` | Deploy + verify |

### Setup (integration, as-needed)
| Command | When to use |
|---|---|
| `/spartan:e2e [feature]` | Setup Playwright E2E testing |
| `/spartan:testcontainer [type]` | Setup Testcontainers |
| `/spartan:env-setup [svc]` | Audit env vars |

### Ops (routine)
| Command | When to use |
|---|---|
| `/spartan:daily` | Standup summary |
| `/spartan:context-save` | Save session → resume later |
| `/spartan:update` | Check for updates + upgrade toolkit |

### Safety (guardrails)
| Command | When to use |
|---|---|
| `/spartan:careful` | Warn before destructive ops (rm, DROP, force-push) |
| `/spartan:freeze <dir>` | Lock edits to one directory only |
| `/spartan:unfreeze` | Remove directory lock |
| `/spartan:guard <dir>` | Careful + freeze combined. Max safety. |

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Kotlin + Micronaut |
| Frontend | React + Next.js + TypeScript (App Router) |
| Container | Docker |
| Orchestration | Kubernetes |
| IaC | Terraform |
| Platforms | Railway (staging) · AWS (production) · GCP |
| CI/CD | GitHub Actions |

---

## Files

```
toolkit/
├── CLAUDE.md                      ← Workflow brain (Claude reads this)
├── scripts/setup.sh               ← One-command installer (8 steps)
├── rules/project/                 ← Company rules (synced to all projects)
│   ├── CORE_RULES.md             ← !! banned, Either, null safety
│   ├── ARCHITECTURE_RULES.md     ← Controller → Manager → Repo
│   ├── API_RULES.md              ← Query params only, RPC-style
│   ├── DATABASE_RULES.md         ← No FK, TEXT, soft deletes
│   ├── FRONTEND_RULES.md         ← Build check, cleanup imports
│   ├── CONTROLLER_TEST_STANDARDS ← @MicronautTest patterns
│   ├── NAMING_CONVENTIONS.md     ← snake_case DB, camelCase Kotlin
│   ├── RETROFIT_CLIENT_PLACEMENT ← Kapt conflict rules
│   └── TRANSACTION_RULES.md      ← Multi-table transaction pattern
├── skills/                        ← Company skills (8 sets)
├── agents/                        ← Expert agents (2)
└── .claude/commands/
    ├── spartan.md                 ← Smart router (entry point)
    └── spartan/                   ← 34 slash commands
```

---

## Credits
- [Superpowers](https://github.com/obra/superpowers) — Jesse Vincent
- [GSD](https://github.com/gsd-build/get-shit-done) — TÂCHES
- Inspired by [OpenSpec](https://github.com/Fission-AI/OpenSpec) fast-forward concept
