<p align="center">
  <h1 align="center">Spartan AI Toolkit</h1>
  <p align="center">
    <strong>Engineering discipline layer for AI coding tools</strong>
    <br />
    Workflows &middot; Commands &middot; Rules &middot; Skills &middot; Agents
  </p>
  <p align="center">
    <a href="#install">Install</a> &middot;
    <a href="#pick-your-packs">Pick Your Packs</a> &middot;
    <a href="#how-to-use">How to Use</a> &middot;
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

AI coding tools are powerful. But on real projects, they write code without tests, push PRs without rebasing, edit files you didn't ask about, and forget decisions from 20 minutes ago. Every developer on your team gets different code style from the same AI.

Spartan fixes this. It's a set of **workflows, rules, and commands** that make AI coding tools consistent and reliable for production work.

| Without Spartan | With Spartan |
|----------------|-------------|
| "Build this feature" &rarr; jumps to code, no plan, no tests | `/spartan:build` &rarr; understand, plan, TDD, review, PR |
| "Fix this bug" &rarr; guesses a fix, hopes for the best | `/spartan:fix` &rarr; reproduce, root-cause, test-first fix, PR |
| Team of 5 devs &rarr; each gets different code style | Rule files &rarr; same standards for everyone, every session |
| 3-week feature &rarr; no plan, lost context | `/spartan:project new` &rarr; roadmap, phases, wave execution, persistent memory |

> Not everything needs a workflow. Questions, small code changes (&lt; 30 min) &mdash; just talk to your AI directly. Workflows are for **structured work where missing steps cause real problems**.

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

## How to Use

After installing, open any project and type `/spartan`. The smart router figures out what you need.

But here's the real guide &mdash; **pick the approach that fits how you work:**

### Approach 1: Workflows (guided, thorough)

**Best for:** Features with 3+ tasks, bugs you can't figure out quickly, research projects, codebase onboarding.

Workflows walk you through stages with gates between each step. They call the right commands and skills for you &mdash; you don't need to know what's under the hood.

| Workflow | Command | What it does |
|----------|---------|-------------|
| **Build** | `/spartan:build [backend\|frontend] [feature]` | Requirement &rarr; plan &rarr; TDD &rarr; review &rarr; PR |
| **Fix** | `/spartan:fix [symptom]` | Reproduce &rarr; investigate &rarr; test-first fix &rarr; PR |
| **Research** | `/spartan:research [topic]` | Frame question &rarr; gather sources &rarr; analyze &rarr; report |
| **Startup** | `/spartan:startup [idea]` | Brainstorm &rarr; validate &rarr; market research &rarr; pitch |
| **Onboard** | `/spartan:onboard` | Scan codebase &rarr; map architecture &rarr; set up tooling |

**Build** auto-detects your stack. If you have `build.gradle.kts`, it uses Kotlin/Micronaut skills. If you have `next.config.*`, it uses React/Next.js skills. You can also be explicit:

```
/spartan:build backend add user profile endpoint
/spartan:build frontend dashboard page
/spartan:build add payment processing        ← auto-detect
```

**Startup** replaces the old `/spartan:full-run`. Same 4-stage pipeline, new name.

**Fix** replaces the old `/spartan:debug`. Same investigation protocol, but now goes all the way to PR.

### Approach 2: Direct commands (fast, focused)

**Best for:** When you know exactly what you need. One command, one job, done.

Workflows use more tokens because they run multiple stages. If you want to save tokens or you already know what step you're on, jump straight to the command:

| Instead of... | Use directly |
|---------------|-------------|
| Running the full Build workflow | `/spartan:spec "feature"` + `/spartan:plan "feature"` for planning, then code manually |
| Running the full Fix workflow | `/spartan:debug "symptom"` for just the investigation part |
| Build workflow's review stage | `/spartan:review` (backend) or `/spartan:fe-review` (frontend) |
| Build workflow's ship stage | `/spartan:pr-ready` to create the PR |
| Startup workflow's full pipeline | `/spartan:kickoff` (stages 1-2), `/spartan:deep-dive` (stage 3), `/spartan:fundraise` (stage 4) |

Think of it this way: **workflows are the recipe, commands are individual cooking steps.** If you already know how to cook, just grab the step you need.

### Approach 3: Rules only (zero overhead)

**Best for:** Teams that want consistent code style without changing how they work.

Rules cost zero extra tokens. They're loaded automatically every session as part of CLAUDE.md. You don't run anything &mdash; the AI just follows the standards.

What rules do:
- Force consistent naming (`NAMING_CONVENTIONS`)
- Enforce architecture patterns (`ARCHITECTURE`, `CONTROLLERS`, `SERVICES_AND_BEANS`)
- Prevent bad database design (`SCHEMA`, `ORM_AND_REPO`, `TRANSACTIONS`)
- Catch Kotlin anti-patterns (`KOTLIN`)
- Keep frontend code clean (`FRONTEND`)

Install with just the packs you want, and the rules work silently in every session:

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut
# Now every AI session follows your Kotlin + Micronaut coding standards
```

### Getting started

Whichever approach you pick:

1. **Run `/spartan:onboard`** (or `/spartan:init-project` for just the CLAUDE.md) to set up your project
2. **Try `/spartan:build backend [small feature]`** to see the full workflow once
3. After that, use whichever approach fits the task

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
