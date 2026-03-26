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

After installing, type `/spartan`. The smart router figures out what you need and runs the right workflow.

### 5 Workflow Leaders

Each leader runs a full pipeline end-to-end. You don't chain commands manually &mdash; the leader decides which skills and sub-steps to call.

```
/spartan:build "feature"     One command. The leader handles the rest.
       │
       ├── checks .memory/ for relevant decisions
       ├── checks .planning/ for existing spec/design/plan
       │
       ├── SPEC ──────── Gate 1  (inline for small work, full Q&A for big work)
       ├── DESIGN ────── Design Gate  (auto-detected for UI work)
       ├── PLAN ──────── Gate 2  (inline or saved to .planning/)
       ├── IMPLEMENT ─── Gate 3  (TDD, task by task)
       ├── REVIEW ────── Gate 3.5  (self-review, optional dual-agent)
       └── SHIP ──────── Gate 4  (PR created, patterns saved to .memory/)
```

| Leader | Command | What it handles |
|--------|---------|----------------|
| **Build** | `/spartan:build [feature]` | Spec &rarr; design? &rarr; plan &rarr; TDD &rarr; review &rarr; PR. Auto-detects backend/frontend. Resumes across sessions. |
| **Fix** | `/spartan:fix [symptom]` | Checks known issues &rarr; reproduce &rarr; investigate &rarr; test-first fix &rarr; PR. Saves patterns to memory. |
| **Startup** | `/spartan:startup [idea]` | Brainstorm &rarr; validate &rarr; research &rarr; pitch. Auto-resumes from where you left off. |
| **Onboard** | `/spartan:onboard` | Scan &rarr; map architecture &rarr; setup tooling &rarr; save findings to memory for future sessions. |
| **Research** | `/spartan:research [topic]` | Frame question &rarr; gather sources &rarr; analyze &rarr; structured report. |

**Fast path:** For small work (&lt; 1 day, &le; 4 tasks), `/spartan:build` does spec + plan inline. No separate commands needed. Just say what you want to build.

**Full path:** For bigger work (5+ tasks, multi-day), the leader saves specs, designs, and plans to `.planning/` so you can resume in a new session.

### Individual commands still work

Leaders call these internally, but you can run them directly when you want just one step:

| Command | What it does |
|---------|-------------|
| `/spartan:spec "feature"` | Write a spec &rarr; saves to `.planning/specs/` |
| `/spartan:design "feature"` | Design doc + dual-agent review |
| `/spartan:plan "feature"` | Implementation plan from spec &rarr; saves to `.planning/plans/` |
| `/spartan:gate-review` | Dual-agent review (builder + reviewer) |
| `/spartan:pr-ready` | Pre-PR checklist + auto PR |

### Skills: knowledge at each step

Skills are the domain experts the leaders call on. You don't pick them &mdash; the leader loads the right skill at the right time based on your stack.

| Skill | When the leader calls it |
|-------|------------------------|
| `kotlin-best-practices` | During build (Kotlin files) |
| `database-patterns` | During plan + build (migration tasks) |
| `ui-ux-pro-max` | During design + build (React components) |
| `design-workflow` | During design step (anti-AI-generic rules) |
| `testing-strategies` | During build (test tasks) |
| `security-checklist` | During review (security scan) |

A skill alone is just a prompt file. Inside a workflow, it's the right knowledge at the right moment.

### Agent memory: context across sessions

The AI forgets everything when you close the terminal. Agent memory fixes that.

```
.planning/                          .memory/
  specs/     ← Feature specs          index.md     ← Quick reference
  plans/     ← Implementation plans   decisions/   ← Architecture decisions
  designs/   ← Design docs            patterns/    ← Code patterns found
  epics/     ← Epic tracking          knowledge/   ← Domain facts, gotchas
                                       blockers/    ← Known issues
```

**Leaders read and write memory automatically:**
- `/spartan:build` checks `.planning/` for saved artifacts. If a spec exists, it skips the Q&A. After shipping, it saves new patterns to `.memory/`.
- `/spartan:fix` checks `.memory/blockers/` for known issues before investigating. After fixing, it saves recurring patterns.
- `/spartan:onboard` saves architecture findings to `.memory/knowledge/` so future sessions start with context.
- `/spartan:startup` scans the project folder and auto-resumes from the last completed stage.

### Rules: always-on standards

Rules cost zero tokens. They load automatically every session. The AI follows them without you asking.

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut
# Now every session follows your Kotlin + Micronaut coding standards
```

### Getting started

1. **Run `/spartan:onboard`** to set up your project (saves findings for future sessions)
2. **Try `/spartan:build "small feature"`** &mdash; it handles spec, plan, TDD, review, and PR in one flow
3. After that, just use `/spartan` &mdash; the router picks the right leader

---

## All Commands

Type `/spartan` to get the smart router. Or go direct:

### Workflow Leaders (start here)

Each leader runs a full pipeline. You give it one command &mdash; it handles the rest.

| Leader | Command | Pipeline |
|--------|---------|----------|
| **Build** | `build [mode] [feature]` | context &rarr; spec &rarr; design? &rarr; plan &rarr; TDD &rarr; review &rarr; PR |
| **Fix** | `fix [symptom]` | known issues &rarr; reproduce &rarr; investigate &rarr; test-first fix &rarr; PR |
| **Startup** | `startup [idea]` | resume check &rarr; brainstorm &rarr; validate &rarr; research &rarr; pitch |
| **Onboard** | `onboard` | memory check &rarr; scan &rarr; map &rarr; setup &rarr; save to memory |
| **Research** | `research [topic]` | frame &rarr; gather &rarr; analyze &rarr; report |

### Core (always installed)

Leaders call these automatically, but you can also run them directly.

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
| `team [action]` | Agent Teams: create, wave, review, research, build, clean |
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
