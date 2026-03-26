# Spartan AI Toolkit

> Engineering discipline layer for AI coding tools — commands, rules, skills, agents, and packs.

---

## Install

Three ways to install. Pick one.

### Option 1: npx (recommended)

```bash
npx @c0x12c/spartan-ai-toolkit@latest
```

Interactive menu — pick your AI tool and packs. Works out of the box.

```bash
# Or specify packs directly
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut,product

# Install everything
npx @c0x12c/spartan-ai-toolkit@latest --all

# Install for Cursor instead of Claude Code
npx @c0x12c/spartan-ai-toolkit@latest --agent=cursor
```

**Supported agents:** `claude-code` (default), `cursor`, `windsurf`, `codex`, `copilot`

### Option 2: Setup script

```bash
git clone https://github.com/spartan-stratos/spartan-ai-toolkit.git
cd spartan-ai-toolkit/toolkit
chmod +x scripts/setup.sh
./scripts/setup.sh --global
```

### Option 3: Claude Code plugin

Search for **"Spartan AI Toolkit"** in the Claude Code plugin marketplace.

### Global vs Local

- `--global` installs to `~/.claude/` — works across all projects (default)
- `--local` installs to `./.claude/` — only this project

After install, open any project, run `claude`, then type `/spartan`.

---

## How to Use — Pick Your Style

**Workflows** &mdash; guided multi-stage processes. Best for features, bug fixes, research. Uses more tokens but catches what you'd miss.

| Workflow | Command | What it does |
|----------|---------|-------------|
| **Build** | `/spartan:build [backend\|frontend] [feature]` | Requirement &rarr; plan &rarr; TDD &rarr; review &rarr; PR |
| **Fix** | `/spartan:fix [symptom]` | Reproduce &rarr; investigate &rarr; test-first fix &rarr; PR |
| **Research** | `/spartan:research [topic]` | Frame &rarr; gather &rarr; analyze &rarr; report |
| **Startup** | `/spartan:startup [idea]` | Brainstorm &rarr; validate &rarr; research &rarr; pitch |
| **Onboard** | `/spartan:onboard` | Scan &rarr; map architecture &rarr; set up tooling |

**Direct commands** &mdash; one command, one job. Best when you know what step you need. Saves tokens.

```
/spartan:spec "feature"    ← write the spec
/spartan:plan "feature"    ← plan the implementation
/spartan:review             ← just the code review
/spartan:pr-ready           ← just the PR creation
/spartan:migration "desc"   ← just the migration
```

**Rules only** &mdash; zero overhead. Rules load automatically and enforce coding standards every session. No commands needed.

```bash
# Install packs → rules work silently in every session
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut
```

---

## Pick Your Packs

Packs group commands, rules, skills, and agents by use case. **Core is always installed.** Pick the rest based on what you're building.

### "I'm building a Kotlin + Micronaut backend"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut
```

This pulls in `backend-micronaut` + its dependencies (`database` and `shared-backend` auto-included). You get migration commands, API design rules, Kotlin coding standards, test patterns, and two expert agents.

### "I'm building a React + Next.js frontend"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=frontend-react
```

You get Next.js scaffolding, Figma-to-code, E2E testing setup, frontend review, and the UI/UX design skill.

### "Full-stack Kotlin + Next.js"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut,frontend-react
```

### "I'm running a multi-week project"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut,project-mgmt
```

Adds project lifecycle, phases, workstreams, and GSD v5 wave execution on top of your backend tools.

### "I'm exploring startup ideas"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=research
```

Research pack pulls in `product` as a dependency. You get brainstorming, validation, market research, competitor teardowns, pitch materials, and investor outreach.

### "Give me everything"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --all
```

---

## All Packs

| Pack | Category | Depends on | What you get |
|------|----------|------------|--------------|
| **core** | Core | — | Always installed. Workflows (build, fix, onboard), spec, plan, pr-ready, daily, safety commands |
| **backend-micronaut** | Backend | database, shared-backend | Kotlin service scaffold, code review, testcontainers, API/DB/Kotlin rules, 5 skills, 2 agents |
| **backend-nodejs** | Backend | database, shared-backend | Coming soon |
| **backend-python** | Backend | database, shared-backend | Coming soon |
| **frontend-react** | Frontend | — | Next.js app/feature scaffold, Figma-to-code, E2E, frontend review, UI/UX skill |
| **project-mgmt** | Planning | — | Project lifecycle, phases, workstreams, GSD upgrade, forensics, brownfield, codebase mapping |
| **product** | Planning | — | Think-before-build, validate, teardown, interview, lean canvas, brainstorm |
| **ops** | Ship | — | Deploy + env-setup |
| **research** | Research | product | Startup + research workflows, kickoff to investor outreach, 10 skills, 2 agents |

Hidden packs (`database`, `shared-backend`) get pulled in as dependencies — you don't pick them directly.

---

## Commands

All commands start with `/spartan:` (e.g., `/spartan:spec "feature"`).

Type `/spartan` to get the smart router — it asks what you need and picks the right command.

### Workflows (core + research packs)
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
| `spec "feature"` | Write a feature spec — saves to `.planning/specs/` |
| `plan "feature"` | Write implementation plan from spec — saves to `.planning/plans/` |
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
| `next-app "name"` | Scaffold new Next.js app |
| `next-feature "name"` | Add feature to existing Next.js app |
| `fe-review` | PR review with Next.js conventions |
| `figma-to-code "url"` | Figma design to production React |
| `e2e "feature"` | Setup Playwright E2E testing |

### Planning (project-mgmt pack)
| Command | What it does |
|---------|-------------|
| `project [action]` | Large project lifecycle (new, status, milestone) |
| `phase [action]` | Phase lifecycle (discuss, plan, execute, verify) |
| `workstreams [action]` | Parallel work tracks |
| `gsd-upgrade` | Upgrade to GSD v5 with memory + waves |
| `forensics "problem"` | Post-mortem for failed workflows |
| `brownfield "svc"` | Map unfamiliar codebase before touching it |
| `map-codebase` | Deep codebase analysis with parallel agents |

### Product (product pack)
| Command | What it does |
|---------|-------------|
| `think` | Guided thinking before coding |
| `validate` | Score an idea — GO / TEST MORE / KILL |
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
| `startup [idea]` | Full pipeline from brainstorm to outreach |
| `kickoff [theme]` | Start new idea — brainstorm + validate |
| `deep-dive [project]` | Market research + competitor teardowns |
| `fundraise [project]` | Pitch materials + investor outreach |
| `research [topic]` | Deep research with source checking |
| `pitch [type]` | Investor-facing materials |
| `outreach [investor]` | Draft investor emails |
| `content [source]` | Turn ideas into platform-native content |
| `write [topic]` | Write blog posts and articles |

---

## Skills

Skills give Claude deeper knowledge in specific areas. They're loaded automatically when you use related commands.

| Skill | Pack | What it does |
|-------|------|-------------|
| `api-endpoint-creator` | backend-micronaut | Generate Controller → Manager → Repository stack |
| `database-table-creator` | database | SQL migration → Table → Entity → Repository → Tests |
| `backend-api-design` | backend-micronaut | RPC-style API design patterns |
| `database-patterns` | database | Schema design, migrations, Exposed ORM |
| `kotlin-best-practices` | backend-micronaut | Null safety, Either, coroutines |
| `testing-strategies` | backend-micronaut | Integration test patterns for Micronaut |
| `security-checklist` | backend-micronaut | Auth, validation, OWASP prevention |
| `ui-ux-pro-max` | frontend-react | Design intelligence — styles, palettes, font pairings, stacks |
| `brainstorm` | research | Idea generation and ranking |
| `idea-validation` | research | Score ideas with structured checklist |
| `market-research` | research | Market sizing, trends, opportunities |
| `competitive-teardown` | research | Deep competitor analysis |
| `deep-research` | research | Multi-source research with citations |
| `investor-materials` | research | Pitch deck, one-pager, financial model |
| `investor-outreach` | research | Investor targeting and outreach |
| `article-writing` | research | Long-form content creation |
| `content-engine` | research | Content strategy and production |
| `startup-pipeline` | research | Full startup research pipeline |

---

## Agents

| Agent | Pack | What it does |
|-------|------|-------------|
| `micronaut-backend-expert` | backend-micronaut | Micronaut framework, database design, API architecture |
| `solution-architect-cto` | backend-micronaut | System design, scalability, tech decisions |
| `idea-killer` | research | Stress-test ideas, find weaknesses |
| `research-planner` | research | Plan and coordinate research workflows |

---

## Rules

Rules are enforced automatically every session. No action needed — they're active as long as the pack is installed.

| Rule | Pack |
|------|------|
| `NAMING_CONVENTIONS` | core |
| `ARCHITECTURE` | shared-backend |
| `SCHEMA` | database |
| `ORM_AND_REPO` | database |
| `TRANSACTIONS` | database |
| `KOTLIN` | backend-micronaut |
| `CONTROLLERS` | backend-micronaut |
| `SERVICES_AND_BEANS` | backend-micronaut |
| `API_DESIGN` | backend-micronaut |
| `RETROFIT_PLACEMENT` | backend-micronaut |
| `FRONTEND` | frontend-react |

---

## Using with Other AI Tools

All content is standard markdown. The npx installer supports multiple agents:

```bash
# Cursor — installs rules to .cursor/rules/
npx @c0x12c/spartan-ai-toolkit@latest --agent=cursor

# Windsurf — installs rules to .windsurf/rules/
npx @c0x12c/spartan-ai-toolkit@latest --agent=windsurf

# Codex — installs to .codex/
npx @c0x12c/spartan-ai-toolkit@latest --agent=codex

# Copilot — installs to .github/copilot/
npx @c0x12c/spartan-ai-toolkit@latest --agent=copilot
```

For other tools, copy the rule files from `toolkit/rules/` into your tool's config directory.

---

## Target Stack

Rules and skills are tuned for this stack, but the command framework works with anything:

| Layer | Technology |
|-------|-----------|
| Backend | Kotlin + Micronaut |
| Frontend | React + Next.js + TypeScript |
| Database | PostgreSQL |
| CI/CD | GitHub Actions |

> **Different stack?** Fork the repo, edit the rules and skills, run the installer. Commands work with any language or framework.

