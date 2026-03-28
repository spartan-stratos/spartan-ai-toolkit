<p align="center">
  <h1 align="center">Spartan AI Toolkit</h1>
  <p align="center">
    <strong>Workflow-first engineering discipline for AI coding tools</strong>
    <br />
    Any Stack &middot; Configurable Rules &middot; Quality Gates &middot; Agent Memory
  </p>
  <p align="center">
    <a href="#install">Install</a> &middot;
    <a href="#configure-your-rules">Configure</a> &middot;
    <a href="#pick-your-packs">Packs</a> &middot;
    <a href="#how-it-works">How It Works</a> &middot;
    <a href="#all-commands">Commands</a> &middot;
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

**Spartan is workflow-first.** One command runs the full pipeline. Skills and rules still exist, but they're nodes in the pipeline &mdash; not the product.

| Without Spartan | With Spartan |
|----------------|-------------|
| "Build this feature" &rarr; jumps to code, no plan, no tests | `/spartan:build` &rarr; spec, plan, TDD, gate review, PR |
| "Fix this bug" &rarr; guesses a fix, hopes for the best | `/spartan:debug` &rarr; reproduce, root-cause, test-first fix, PR |
| Team of 5 devs &rarr; each gets different code style | Configurable rules &rarr; same standards for everyone, any stack |
| 3-week feature &rarr; lost context between sessions | `/spartan:project` &rarr; roadmap, phases, agent memory across sessions |

> Not everything needs a workflow. Questions, small code changes (&lt; 30 min) &mdash; just talk to your AI. Workflows are for **structured work where missing steps cause real problems**.

---

## What You Get

| What | Description |
|------|-------------|
| **Workflows** | End-to-end pipelines: spec &rarr; design &rarr; plan &rarr; build &rarr; review &rarr; ship |
| **Configurable rules** | Your coding standards, your architecture, your review checklist &mdash; any stack |
| **Quality gates** | Automated checkpoints between each step. Nothing ships without review. |
| **Agent memory** | Decisions and patterns survive across sessions. The AI builds on what it knows. |
| **8 stack profiles** | Go, Python, Java, Kotlin, React, TypeScript &mdash; pick one and go |

### Works with any stack

Spartan isn't locked to one language. Configure your own rules or pick a built-in profile:

| Profile | Stack | Rules included |
|---------|-------|---------------|
| `kotlin-micronaut` | Kotlin + Micronaut | 8 backend + 3 database rules |
| `react-nextjs` | React + Next.js | Frontend conventions |
| `go-standard` | Go | Error handling, interfaces, concurrency, project layout |
| `python-django` | Python + Django | Models, views, ORM, testing |
| `python-fastapi` | Python + FastAPI | Endpoints, Pydantic, async patterns |
| `java-spring` | Java + Spring Boot | Controllers, services, JPA, security |
| `typescript-node` | TypeScript + Node.js | Express/Fastify, Zod, strict mode |
| `custom` | Anything | Blank template &mdash; bring your own rules |

Not on this list? Create your own rules in markdown, point the config at them. The toolkit reads whatever you give it.

---

## Install

Three ways. Pick one.

### Option 1: npx (recommended)

```bash
npx @c0x12c/spartan-ai-toolkit@latest --local
```

Interactive menu. Pick your AI tool and packs. Done in 30 seconds. Files go into `.claude/` in your project.

```bash
# Pick specific packs
npx @c0x12c/spartan-ai-toolkit@latest --local --packs=backend-micronaut,frontend-react

# Install everything
npx @c0x12c/spartan-ai-toolkit@latest --local --all
```

### Option 2: Setup script

```bash
git clone https://github.com/spartan-stratos/spartan-ai-toolkit.git
cd spartan-ai-toolkit/toolkit
chmod +x scripts/setup.sh && ./scripts/setup.sh --local
```

### Option 3: Claude Code plugin

Search for **"Spartan AI Toolkit"** in the Claude Code plugin marketplace.

### Local vs Global

- **`--local`** (recommended) &mdash; installs to `./.claude/` in your project. Your team can see, review, and version-control the setup.
- **`--global`** &mdash; installs to `~/.claude/`, works across all your projects.

### Not using Claude Code?

```bash
npx @c0x12c/spartan-ai-toolkit@latest --local --agent=claude-code  # default
npx @c0x12c/spartan-ai-toolkit@latest --local --agent=codex        # full install
npx @c0x12c/spartan-ai-toolkit@latest --local --agent=cursor       # rules only
npx @c0x12c/spartan-ai-toolkit@latest --local --agent=windsurf     # rules only
npx @c0x12c/spartan-ai-toolkit@latest --local --agent=copilot      # rules only
```

| Tool | What gets installed | Where |
|------|-------------------|-------|
| **Claude Code** | Commands + rules + skills + agents + CLAUDE.md | `.claude/` |
| **Codex** | Commands + rules + skills + agents + CLAUDE.md | `.codex/` |
| **Cursor** | Rules + AGENTS.md | `.cursor/rules/` |
| **Windsurf** | Rules + AGENTS.md | `.windsurf/rules/` |
| **Copilot** | Rules + AGENTS.md | `.github/instructions/` |

---

## Configure Your Rules

After installing, set up rules for your stack. This is what makes the build and review commands check your coding standards.

### Quick start: pick a profile

```
/spartan:init-rules
```

This wizard detects your stack, lets you pick a profile, and generates `.spartan/config.yaml`. Takes 2 minutes.

Or jump straight to a profile:

```
/spartan:init-rules go-standard
/spartan:init-rules python-fastapi
/spartan:init-rules java-spring
```

### What's in the config?

`.spartan/config.yaml` controls everything:

```yaml
stack: go-standard
architecture: clean

rules:
  shared:
    - rules/core/NAMING_CONVENTIONS.md
  backend:
    - rules/go/ERROR_HANDLING.md
    - rules/go/INTERFACES.md
    - rules/go/CONCURRENCY.md

file-types:
  backend: [".go"]
  migration: [".sql"]

review-stages:
  - name: correctness
    enabled: true
  - name: stack-conventions
    enabled: true
  # ... more stages

commands:
  test:
    backend: "go test ./..."
  build:
    backend: "go build ./..."
  lint:
    backend: "golangci-lint run"
```

### Auto-detect rules from your code

Already have conventions in your codebase? Let the scanner find them:

```
/spartan:scan-rules
```

It reads 15-20 files, finds repeating patterns (error handling, naming, architecture), and generates rule files for you.

### Extend a profile

Start from a profile and add your own rules on top:

```yaml
extends: kotlin-micronaut

rules-add:
  backend:
    - rules/custom/OUR_AUTH_RULES.md

rules-remove:
  backend:
    - rules/backend-micronaut/RETROFIT_PLACEMENT.md
```

### Conditional rules

Rules that only apply to certain files:

```yaml
conditional-rules:
  - rule: rules/custom/BATCH_RULES.md
    applies-to: "src/**/batch/**"
  - rule: rules/custom/API_V2_RULES.md
    applies-to: "src/api/v2/**"
```

### Validate your config

```
/spartan:lint-rules
```

Checks that your config is valid, all rule files exist, and the format is correct.

### Writing your own rules

Rules are just markdown files. Put them anywhere and reference them in the config.

```markdown
# Error Handling

All errors must be wrapped with context before returning.

## CORRECT
` `` go
return fmt.Errorf("failed to create user: %w", err)
` ``

## WRONG
` `` go
return err
` ``
```

The reviewer reads these files before checking your code. Whatever you write in the rule, the reviewer checks for it.

### No config? Still works.

If you don't create a config, the toolkit falls back to:
1. Scanning `rules/` directory in your project
2. Then `.claude/rules/`
3. Then `~/.claude/rules/`
4. If nothing found, uses a generic review checklist

---

## Pick Your Packs

Packs group commands, rules, skills, and agents by use case. **Core is always installed.** You pick the rest.

### Common setups

| Situation | Command |
|-----------|---------|
| Kotlin + Micronaut backend | `--packs=backend-micronaut` |
| React + Next.js frontend | `--packs=frontend-react` |
| Full-stack (Kotlin + Next.js) | `--packs=backend-micronaut,frontend-react` |
| Multi-week project | `--packs=backend-micronaut,project-mgmt` |
| Exploring startup ideas | `--packs=research` |
| Everything | `--all` |

### All packs

| Pack | Category | Auto-pulls | What's inside |
|------|----------|------------|---------------|
| **core** | Core | &mdash; | Always installed. Workflows + safety + configurable rules |
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

### 5 Workflow Leaders

Each leader runs a full pipeline. One command &mdash; it handles the rest.

```
/spartan:build "feature"     One command. The leader handles the rest.
       |
       +-- checks .memory/ for relevant decisions
       +-- checks .planning/ for existing spec/design/plan
       |
       +-- SPEC ---------- Gate 1  (inline for small work, full Q&A for big work)
       +-- DESIGN -------- Design Gate  (auto-detected for UI work)
       +-- PLAN ---------- Gate 2  (inline or saved to .planning/)
       +-- IMPLEMENT ----- Gate 3  (TDD, task by task)
       +-- REVIEW -------- Gate 3.5  (agent review against your configured rules)
       +-- SHIP ---------- Gate 4  (PR created, patterns saved to .memory/)
```

| Leader | Command | What it handles |
|--------|---------|----------------|
| **Build** | `/spartan:build [feature]` | Spec &rarr; design? &rarr; plan &rarr; TDD &rarr; review &rarr; PR |
| **Debug** | `/spartan:debug [symptom]` | Reproduce &rarr; root-cause &rarr; test-first fix &rarr; PR |
| **Startup** | `/spartan:startup [idea]` | Brainstorm &rarr; validate &rarr; research &rarr; pitch |
| **Onboard** | `/spartan:onboard` | Scan &rarr; map architecture &rarr; save findings to memory |
| **Research** | `/spartan:research [topic]` | Frame question &rarr; gather sources &rarr; analyze &rarr; report |

### How review uses your rules

When `/spartan:build` reaches the review step, it:
1. Reads `.spartan/config.yaml` to find your rules
2. Spawns a separate review agent (fresh eyes, not the same AI that wrote the code)
3. The reviewer reads all your rule files, then checks the code against them
4. If issues found &rarr; fix &rarr; re-review &rarr; repeat until clean

No config? The reviewer still runs &mdash; it just uses a generic checklist instead of your custom rules.

### Skills: knowledge at each step

Skills are the domain experts. Leaders call the right skill at the right time based on your stack.

| Skill | When the leader calls it |
|-------|------------------------|
| `kotlin-best-practices` | During build (Kotlin files) |
| `database-patterns` | During plan + build (migration tasks) |
| `ui-ux-pro-max` | During design + build (React components) |
| `testing-strategies` | During build (test tasks) |
| `security-checklist` | During review (security scan) |

### Agent memory: context across sessions

The AI forgets everything when you close the terminal. Agent memory fixes that.

```
.planning/                          .memory/
  specs/     -- Feature specs          index.md     -- Quick reference
  plans/     -- Implementation plans   decisions/   -- Architecture decisions
  designs/   -- Design docs            patterns/    -- Code patterns found
  epics/     -- Epic tracking          knowledge/   -- Domain facts, gotchas
                                       blockers/    -- Known issues
```

Leaders read and write memory automatically. Decisions from one session carry forward to the next.

### Rules: always-on standards

Rules load automatically every session. The AI follows them without you asking.

```bash
npx @c0x12c/spartan-ai-toolkit@latest --local --packs=backend-micronaut
# Now every session follows your Kotlin + Micronaut coding standards
```

### Getting started

1. **Install:** `npx @c0x12c/spartan-ai-toolkit@latest --local`
2. **Configure rules:** `/spartan:init-rules` (picks a profile for your stack)
3. **Onboard:** `/spartan:onboard` (scans and maps your codebase)
4. **Build:** `/spartan:build "first feature"` (spec, plan, TDD, review, PR)

After that, just use `/spartan` &mdash; the router picks the right leader.

---

## All Commands

Type `/spartan` to get the smart router. Or go direct:

### Workflow Leaders (start here)

| Leader | Command | Pipeline |
|--------|---------|----------|
| **Build** | `build [mode] [feature]` | context &rarr; spec &rarr; design? &rarr; plan &rarr; TDD &rarr; review &rarr; PR |
| **Debug** | `debug [symptom]` | known issues &rarr; reproduce &rarr; investigate &rarr; test-first fix &rarr; PR |
| **Startup** | `startup [idea]` | resume check &rarr; brainstorm &rarr; validate &rarr; research &rarr; pitch |
| **Onboard** | `onboard` | memory check &rarr; scan &rarr; map &rarr; setup &rarr; save to memory |
| **Research** | `research [topic]` | frame &rarr; gather &rarr; analyze &rarr; report |

### Core (always installed)

| Command | What it does |
|---------|-------------|
| `spec "feature"` | Write a feature spec &mdash; saves to `.planning/specs/` |
| `plan "feature"` | Implementation plan from spec &mdash; saves to `.planning/plans/` |
| `gate-review` | Dual-agent review (builder + reviewer both accept) |
| `daily` | Standup summary from git history |
| `pr-ready` | Full checklist before creating any PR |
| `init-project` | Auto-generate CLAUDE.md from codebase scan |
| `init-rules` | Set up configurable rules for your stack |
| `scan-rules` | Auto-generate rules from code patterns |
| `lint-rules` | Validate your config and rule files |
| `context-save` | Save session state to resume later |
| `update` | Check for toolkit updates |
| `careful` | Warn before destructive ops |
| `freeze <dir>` | Lock edits to one directory |
| `guard <dir>` | careful + freeze combined |

### Backend (backend-micronaut pack)

| Command | What it does |
|---------|-------------|
| `kotlin-service "name"` | Scaffold new Micronaut microservice |
| `review` | PR review with your configured rules |
| `testcontainer "type"` | Setup Testcontainers |
| `migration "desc"` | Create database migration |

### Frontend (frontend-react pack)

| Command | What it does |
|---------|-------------|
| `design "feature"` | Design workflow with dual-agent review |
| `next-app "name"` | Scaffold new Next.js app |
| `next-feature "name"` | Add feature to existing Next.js app |
| `fe-review` | PR review for frontend code |
| `figma-to-code "url"` | Figma design to production React |
| `e2e "feature"` | Setup Playwright E2E testing |

### Planning (project-mgmt pack)

| Command | What it does |
|---------|-------------|
| `epic "name"` | Break big work into ordered features |
| `project [action]` | Large project lifecycle (new, status, milestone) |
| `phase [action]` | Phase lifecycle (discuss, plan, execute, verify) |
| `workstreams [action]` | Parallel work tracks |
| `team [action]` | Agent Teams: create, wave, review, research, build |
| `think` | Guided thinking before coding |
| `forensics "problem"` | Post-mortem for failed workflows |
| `map-codebase` | Deep codebase analysis with parallel agents |

### Product (product pack)

| Command | What it does |
|---------|-------------|
| `validate` | Score an idea &mdash; GO / TEST MORE / KILL |
| `teardown` | Deep competitor analysis |
| `interview` | Mom Test interview questions |
| `lean-canvas` | 9-block Lean Canvas |
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
| `pitch [type]` | Investor-facing materials |
| `outreach [investor]` | Draft investor emails |
| `content [source]` | Turn ideas into platform-native content |
| `write [topic]` | Write blog posts and articles |

---

## Telegram Bridge

Control your AI coding sessions from your phone.

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
