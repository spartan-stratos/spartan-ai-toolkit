<p align="center">
  <h1 align="center">Spartan AI Toolkit</h1>
  <p align="center">
    <strong>Workflow-first engineering discipline for AI coding tools</strong>
    <br />
    Workflows &middot; Skills &middot; Agent Memory &middot; Quality Gates
  </p>
  <p align="center">
    <a href="#install">Install</a> &middot;
    <a href="#pick-your-packs">Pick Your Packs</a> &middot;
    <a href="#how-it-works">How It Works</a> &middot;
    <a href="#all-commands">All Commands</a> &middot;
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/@c0x12c/spartan-ai-toolkit"><img src="https://img.shields.io/npm/v/@c0x12c/spartan-ai-toolkit.svg" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/@c0x12c/spartan-ai-toolkit"><img src="https://img.shields.io/npm/dm/@c0x12c/spartan-ai-toolkit.svg" alt="npm downloads"></a>
    <a href="https://github.com/spartan-stratos/spartan-ai-toolkit/blob/main/LICENSE"><img src="https://img.shields.io/github/license/spartan-stratos/spartan-ai-toolkit.svg" alt="license"></a>
    <a href="https://github.com/spartan-stratos/spartan-ai-toolkit/stargazers"><img src="https://img.shields.io/github/stars/spartan-stratos/spartan-ai-toolkit.svg" alt="GitHub stars"></a>
  </p>
</p>

---

## Why Spartan?

Most AI coding tools give you **skills** &mdash; a better prompt for writing tests, a smarter code review, a prettier design. That's nice. But skills alone don't solve problems. They're just steps. Nobody ships a feature by running "write test" in isolation.

Real work needs **workflows** &mdash; end-to-end pipelines that take you from "I need to build X" to "PR merged." Workflows connect the steps in the right order, with quality gates between each one, and agent memory that carries knowledge across sessions.

**Spartan is workflow-first.** Skills and commands still exist, but they're nodes in a pipeline &mdash; not the product.

### The three layers

```
WORKFLOWS       End-to-end pipelines that solve problems
                spec → design → plan → build → review → ship
                   ↑        ↑        ↑       ↑ + 3.5      ↑
                 Gate 1  Design   Gate 2    Gate 3       Gate 4
                         Gate
                                    │
SKILLS          Knowledge at each step (Kotlin patterns, UI design,
                database rules, security checks, testing strategies)
                                    │
AGENT MEMORY    Decisions, patterns, and context that survive across
                sessions (.memory/, .planning/, design-config)
```

**Workflows** define the process: what happens, in what order, with what gates. They call the right skills at the right time. You don't need to know which skill to use &mdash; the workflow picks it.

**Skills** are the domain knowledge. They teach the AI how to write Kotlin, how to design UIs that don't look AI-generated, how to structure database migrations. A skill alone is just a prompt. Inside a workflow, it's the right knowledge at the right moment.

**Agent memory** is what makes multi-session work possible. Decisions from Phase 1 inform Phase 3. Design choices from the spec carry through to the code review. Without memory, each session starts from scratch. With it, the AI builds on what it already knows.

### What that looks like in practice

| Without Spartan | With Spartan |
|----------------|-------------|
| "Build this feature" &rarr; jumps to code, no plan, no tests | `/spartan:build` &rarr; spec, plan, TDD, gate review, PR |
| "Fix this bug" &rarr; guesses a fix, hopes for the best | `/spartan:fix` &rarr; reproduce, root-cause, test-first fix, PR |
| Team of 5 devs &rarr; each gets different code style | Rules load every session &rarr; same standards for everyone |
| 3-week feature &rarr; no plan, lost context between sessions | `/spartan:project` &rarr; roadmap, phases, agent memory across sessions |
| "Design this page" &rarr; generic AI template | `/spartan:design` &rarr; design config, dual-agent review, Design Gate |

> Not everything needs a workflow. Questions, small code changes (&lt; 30 min) &mdash; just talk to your AI. Workflows are for **structured work where missing steps cause real problems**.

---

## Install

Three ways to install. Pick one.

### Option 1: npx (recommended)

```bash
npx @c0x12c/spartan-ai-toolkit@latest
```

This opens an interactive menu. Pick your AI tool and packs. Done in 30 seconds.

You can also skip the menu:

```bash
# Pick specific packs
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut,frontend-react

# Install everything
npx @c0x12c/spartan-ai-toolkit@latest --all
```

### Option 2: Setup script

```bash
git clone https://github.com/spartan-stratos/spartan-ai-toolkit.git
cd spartan-ai-toolkit/toolkit
chmod +x scripts/setup.sh && ./scripts/setup.sh --global
```

### Option 3: Claude Code plugin

Search for **"Spartan AI Toolkit"** in the Claude Code plugin marketplace.

### Global vs Local

- **`--global`** (default) &mdash; installs to `~/.claude/`, works across all your projects
- **`--local`** &mdash; installs to `./.claude/` in current project only

### Not using Claude Code?

The installer supports 5 AI tools:

```bash
npx @c0x12c/spartan-ai-toolkit@latest --agent=claude-code  # default
npx @c0x12c/spartan-ai-toolkit@latest --agent=cursor
npx @c0x12c/spartan-ai-toolkit@latest --agent=windsurf
npx @c0x12c/spartan-ai-toolkit@latest --agent=codex
npx @c0x12c/spartan-ai-toolkit@latest --agent=copilot
```

All content is standard markdown &mdash; it works with any AI coding tool.

---

## Pick Your Packs

Packs group commands, rules, skills, and agents by use case. **Core is always installed.** You pick the rest.

Don't overthink it &mdash; find your situation below and copy the command.

### "I build Kotlin + Micronaut backends"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut
```

Pulls in `database` and `shared-backend` automatically. 9 rules, 7 skills, 2 agents.

### "I build React + Next.js frontends"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=frontend-react
```

### "Full-stack (Kotlin + Next.js)"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut,frontend-react
```

### "Multi-week project"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut,project-mgmt
```

Adds milestone tracking, phases, parallel workstreams on top of your stack pack.

### "Exploring startup ideas"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=research
```

Full pipeline: brainstorm &rarr; validate &rarr; research &rarr; pitch &rarr; outreach.

### "Give me everything"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --all
```

### All Packs at a Glance

| Pack | Category | Auto-pulls | What's inside |
|------|----------|------------|---------------|
| **core** | Core | &mdash; | Always installed. Daily workflow commands + safety guardrails |
| **backend-micronaut** | Backend | database, shared-backend | Kotlin + Micronaut: commands, rules, skills, agents |
| **backend-nodejs** | Backend | database, shared-backend | Coming soon |
| **backend-python** | Backend | database, shared-backend | Coming soon |
| **frontend-react** | Frontend | &mdash; | React + Next.js: commands, rules, skills |
| **project-mgmt** | Planning | &mdash; | Project lifecycle, phases, workstreams |
| **product** | Planning | &mdash; | Product thinking before building |
| **ops** | Ship | &mdash; | Deploy + environment management |
| **research** | Research | product | Full startup pipeline: idea to investor |

---

## How It Works

After installing, type `/spartan`. The smart router figures out what you need.

### The Feature Workflow

This is the core pipeline. Every feature goes through it.

```
/spartan:epic → /spartan:spec → /spartan:design → /spartan:plan → /spartan:build → /spartan:pr-ready
                     ↑               ↑                 ↑              ↑ + 3.5           ↑
                   Gate 1       Design Gate          Gate 2         Gate 3            Gate 4
```

| Step | Command | What happens |
|------|---------|-------------|
| **Spec** | `/spartan:spec "feature"` | Interactive Q&A &rarr; saves to `.planning/specs/` &rarr; Gate 1 |
| **Design** | `/spartan:design "feature"` | Design doc + dual-agent review (designer + critic) &rarr; Design Gate |
| **Plan** | `/spartan:plan "feature"` | Reads spec &rarr; architecture + task breakdown &rarr; saves to `.planning/plans/` &rarr; Gate 2 |
| **Build** | `/spartan:build "feature"` | Picks up saved spec/plan &rarr; TDD task by task &rarr; Gate 3 |
| **Review** | `/spartan:gate-review` | Dual-agent review (builder + reviewer both accept) &rarr; Gate 3.5 |
| **Ship** | `/spartan:pr-ready` | Rebase, test, lint, create PR &rarr; Gate 4 |

You don't have to run every step. Skip design for backend-only work. Skip epic if it's a single feature. The workflow adapts:

| Situation | Path |
|-----------|------|
| Backend feature | `spec` &rarr; `plan` &rarr; `build` |
| Frontend feature | `spec` &rarr; `design` &rarr; `plan` &rarr; `build` |
| Batch of features | `epic` &rarr; then spec/plan/build each one |
| Multi-week project | `project new` &rarr; milestones &rarr; phases |
| Bug fix | `/spartan:fix` (its own workflow) |

### Skills: knowledge at each step

Skills are the domain experts the workflow calls on. You don't pick them &mdash; the workflow loads the right skill at the right time based on your stack.

| Skill | When it's used |
|-------|---------------|
| `kotlin-best-practices` | During build (Kotlin files) |
| `database-patterns` | During plan + build (migration tasks) |
| `ui-ux-pro-max` | During design + build (React components) |
| `design-workflow` | During `/spartan:design` (anti-AI-generic rules) |
| `testing-strategies` | During build (test tasks) |
| `security-checklist` | During review (security scan) |

A skill alone is just a prompt file. Inside a workflow, it's the right knowledge at the right moment.

### Agent memory: context across sessions

The AI forgets everything when you close the terminal. Agent memory fixes that.

```
.planning/
  specs/           ← Feature specs (survive sessions)
  plans/           ← Implementation plans
  designs/         ← Design docs
  epics/           ← Epic tracking
  design-config.md ← Project design system

.memory/
  index.md         ← Quick reference to all knowledge
  decisions/       ← Architectural decision records
  patterns/        ← Reusable code patterns discovered
  knowledge/       ← Domain facts, API gotchas
```

When you run `/spartan:build`, it checks `.planning/specs/` for a saved spec. If one exists, it skips the Q&A and uses it. When you run `/spartan:plan`, it reads the spec and the codebase to make a plan that fits. The memory connects the dots.

### Rules: always-on standards

Rules cost zero tokens. They load automatically every session. The AI follows them without you asking.

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut
# Now every session follows your Kotlin + Micronaut coding standards
```

### Getting started

1. **Run `/spartan:onboard`** to set up your project
2. **Try `/spartan:spec "small feature"`** then `/spartan:build "small feature"` to see the workflow
3. After that, just use `/spartan` &mdash; the router picks the right command

---

## All Commands

Type `/spartan` to get the smart router. Or go direct:

### Workflows
| Command | What it does |
|---------|-------------|
| `build [mode] [feature]` | Build a feature end-to-end (backend, frontend, or auto-detect) |
| `fix [symptom]` | Find and fix a bug with structured investigation |
| `research [topic]` | Deep research with source tracking and report |
| `startup [idea]` | Full startup pipeline: brainstorm to investor-ready |
| `onboard` | Understand a new codebase and set up tooling |

### Core (always installed)
| Command | What it does |
|---------|-------------|
| `spec "feature"` | Write a feature spec &mdash; saves to `.planning/specs/` |
| `plan "feature"` | Write implementation plan from spec &mdash; saves to `.planning/plans/` |
| `gate-review [phase]` | Dual-agent review (Gate 3.5) &mdash; builder + reviewer both accept |
| `daily` | Standup summary from git history |
| `pr-ready` | Full checklist before creating any PR |
| `init-project` | Auto-generate CLAUDE.md from codebase scan |
| `context-save` | Save session state to resume later |
| `update` | Check for toolkit updates |
| `careful` | Warn before destructive ops |
| `freeze <dir>` | Lock edits to one directory |
| `unfreeze` | Remove directory lock |
| `guard <dir>` | careful + freeze combined |

### Backend (backend-micronaut pack)
| Command | What it does |
|---------|-------------|
| `kotlin-service "name"` | Scaffold new Micronaut microservice |
| `review` | PR review with Kotlin/Micronaut conventions |
| `testcontainer "type"` | Setup Testcontainers integration testing |
| `migration "desc"` | Create Flyway database migration |

### Frontend (frontend-react pack)
| Command | What it does |
|---------|-------------|
| `design "feature"` | Design workflow with dual-agent review (Design Gate) |
| `next-app "name"` | Scaffold new Next.js app |
| `next-feature "name"` | Add feature to existing Next.js app |
| `fe-review` | PR review with Next.js conventions |
| `figma-to-code "url"` | Figma design to production React |
| `e2e "feature"` | Setup Playwright E2E testing |

### Planning (project-mgmt pack)
| Command | What it does |
|---------|-------------|
| `epic "name"` | Break big work into ordered features |
| `project [action]` | Large project lifecycle (new, status, milestone) |
| `phase [action]` | Phase lifecycle (discuss, plan, execute, verify) |
| `workstreams [action]` | Parallel work tracks |
| `think` | Guided thinking before coding |
| `gsd-upgrade` | Upgrade to GSD v5 with memory + waves |
| `forensics "problem"` | Post-mortem for failed workflows |
| `brownfield "svc"` | Map unfamiliar codebase before touching it |
| `map-codebase` | Deep codebase analysis with parallel agents |

### Product (product pack)
| Command | What it does |
|---------|-------------|
| `validate` | Score an idea &mdash; GO / TEST MORE / KILL |
| `teardown` | Deep competitor analysis |
| `interview` | Mom Test interview questions |
| `lean-canvas` | Fill out a 9-block Lean Canvas |
| `brainstorm` | Generate and rank ideas |

### Ship (ops pack)
| Command | What it does |
|---------|-------------|
| `deploy "svc" "target"` | Deploy + verify |
| `env-setup "svc"` | Audit env vars across environments |

### Research (research pack)
| Command | What it does |
|---------|-------------|
| `startup [idea]` | Full pipeline: brainstorm to investor outreach |
| `kickoff [theme]` | Start new idea &mdash; brainstorm + validate |
| `deep-dive [project]` | Market research + competitor teardowns |
| `fundraise [project]` | Pitch materials + investor outreach |
| `research [topic]` | Deep research with source checking |
| `pitch [type]` | Investor-facing materials |
| `outreach [investor]` | Draft investor emails |
| `content [source]` | Turn ideas into platform-native content |
| `write [topic]` | Write blog posts and articles |

---

## Target Stack

Rules and skills are tuned for:

| Layer | Technology |
|-------|-----------|
| Backend | Kotlin + Micronaut |
| Frontend | React + Next.js + TypeScript |
| Database | PostgreSQL |
| CI/CD | GitHub Actions |

> **Different stack?** Fork the repo, edit the rules and skills, run the installer. The command framework works with any language or framework.

---

## Telegram Bridge

Control your AI coding sessions from your phone. Provider-based &mdash; currently supports Telegram.

```
Phone (Telegram) <-> Bridge (Node.js) <-> Claude Agent SDK <-> Claude API
```

See [`bridges/`](bridges/) for setup.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add commands, skills, rules, and agents.

---

## License

MIT
