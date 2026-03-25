<p align="center">
  <h1 align="center">Spartan AI Toolkit</h1>
  <p align="center">
    <strong>Engineering discipline layer for AI coding tools</strong>
    <br />
    44 commands &middot; 7 packs &middot; 18 skills &middot; 4 agents &middot; 9 rules &middot; 13 frameworks &middot; 6 templates
  </p>
  <p align="center">
    <a href="#quick-start">Quick Start</a> &middot;
    <a href="#packs">Packs</a> &middot;
    <a href="#compatibility">Compatibility</a> &middot;
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>
</p>

---

## Why Spartan?

AI coding tools are powerful. But on real projects, they write code without tests, push PRs without rebasing, edit files you didn't ask about, and forget decisions from 20 minutes ago. Every developer on your team gets different code style from the same AI.

Spartan fixes this. It's a set of **commands, rules, skills, and workflows** that make AI coding tools consistent and reliable for production work.

| Without Spartan | With Spartan |
|----------------|-------------|
| "Create a PR" &rarr; pushes without tests or description | `/spartan:pr-ready` &rarr; rebase, tests, lint, security, auto PR description |
| "Debug this" &rarr; guesses a fix, hopes for the best | `/spartan:debug` &rarr; reproduce, isolate, root-cause, verify |
| Team of 5 devs &rarr; each gets different code style | 9 rule files &rarr; same standards for everyone, every session |
| 3-week feature &rarr; no plan, lost context | `/spartan:project new` &rarr; roadmap, phases, wave execution, persistent memory |

> Not everything needs a command. Questions, small code changes (&lt; 30 min) &mdash; just talk to your AI directly. Commands are for **structured workflows where missing steps cause real problems**.

---

## Quick Start

### Option 1: npx (recommended)

```bash
npx spartan-ai-toolkit@latest
```

### Option 2: Setup script

```bash
git clone https://github.com/spartan-stratos/spartan-ai-toolkit.git
cd spartan-ai-toolkit/toolkit
chmod +x scripts/setup.sh && ./scripts/setup.sh --global
```

### Option 3: Claude Code plugin

Search for "Spartan AI Toolkit" in the Claude Code plugin marketplace.

After install, open any project and type `/spartan`. The smart router asks what you need and routes to the right command.

---

## Packs

Pick what fits your project. Core is always installed.

| Pack | Commands | Rules | Skills | Agents | Best for |
|------|----------|-------|--------|--------|----------|
| **core** | 11 | &mdash; | &mdash; | &mdash; | Everyone |
| **backend** | 4 | 8 | 7 | 2 | Kotlin + Micronaut |
| **frontend** | 5 | 2 | 1 | &mdash; | React + Next.js |
| **project-mgmt** | 7 | &mdash; | &mdash; | &mdash; | Multi-day projects |
| **product** | 6 | &mdash; | &mdash; | &mdash; | Product thinking |
| **ops** | 2 | &mdash; | &mdash; | &mdash; | Deploy & infra |
| **research** | 9 | &mdash; | 10 | 2 | Startup pipeline |

```bash
# Pick from menu
./scripts/setup.sh --global

# Specify packs
./scripts/setup.sh --global --packs=backend,product

# Install everything
./scripts/setup.sh --global --all
```

---

## Commands (44)

All commands are prefixed with `/spartan:` (e.g., `/spartan:quickplan "task"`).

| Pack | Commands |
|------|----------|
| **core** | `quickplan`, `daily`, `debug`, `pr-ready`, `init-project`, `context-save`, `update`, `careful`, `freeze`, `unfreeze`, `guard` |
| **backend** | `kotlin-service`, `migration`, `review`, `testcontainer` |
| **frontend** | `next-app`, `next-feature`, `fe-review`, `figma-to-code`, `e2e` |
| **project-mgmt** | `project`, `phase`, `workstreams`, `gsd-upgrade`, `forensics`, `brownfield`, `map-codebase` |
| **product** | `think`, `validate`, `teardown`, `interview`, `lean-canvas`, `brainstorm` |
| **ops** | `deploy`, `env-setup` |
| **research** | `kickoff`, `deep-dive`, `full-run`, `fundraise`, `research`, `pitch`, `outreach`, `content`, `write` |

---

## Skills (18)

| Skill | Pack | What it does |
|-------|------|-------------|
| `api-endpoint-creator` | backend | Generate Controller &rarr; Manager &rarr; Repository stack |
| `database-table-creator` | backend | SQL migration &rarr; Table &rarr; Entity &rarr; Repository &rarr; Tests |
| `backend-api-design` | backend | RPC-style API design patterns |
| `database-patterns` | backend | Schema design, migrations, Exposed ORM |
| `kotlin-best-practices` | backend | Null safety, Either, coroutines |
| `testing-strategies` | backend | Integration test patterns for Micronaut |
| `security-checklist` | backend | Auth, validation, OWASP prevention |
| `ui-ux-pro-max` | frontend | Design system: 67 styles, 96 palettes, 13 stacks |
| `brainstorm` | research | Idea generation and ranking |
| `idea-validation` | research | Score ideas &mdash; GO / TEST MORE / KILL |
| `market-research` | research | Market sizing, trends, opportunities |
| `competitive-teardown` | research | Deep competitor analysis |
| `deep-research` | research | Multi-source research with citations |
| `investor-materials` | research | Pitch deck, one-pager, financial model |
| `investor-outreach` | research | Investor targeting and outreach |
| `article-writing` | research | Long-form content creation |
| `content-engine` | research | Content strategy and production |
| `startup-pipeline` | research | Full startup research pipeline |

---

## Agents (4)

| Agent | Expertise |
|-------|-----------|
| `micronaut-backend-expert` | Micronaut framework, database design, API architecture |
| `solution-architect-cto` | System design, scalability, tech decisions |
| `idea-killer` | Stress-test ideas, find weaknesses |
| `research-planner` | Plan and coordinate research workflows |

---

## Rules (9)

Enforced automatically every session.

| Rule | What it enforces |
|------|-----------------|
| `CORE_RULES` | No `!!`, Either error handling, null safety |
| `ARCHITECTURE_RULES` | Controller &rarr; Manager &rarr; Repository layers |
| `API_RULES` | RPC-style APIs, query params only |
| `DATABASE_RULES` | No foreign keys, TEXT not VARCHAR, soft deletes |
| `FRONTEND_RULES` | Build check, cleanup imports, null safety |
| `CONTROLLER_TEST_STANDARDS` | @MicronautTest integration patterns |
| `NAMING_CONVENTIONS` | snake_case DB/JSON, camelCase code |
| `RETROFIT_CLIENT_PLACEMENT` | No Retrofit in kapt modules |
| `TRANSACTION_RULES` | Multi-table ops must use transactions |

---

## Frameworks & Templates

**13 frameworks** in `toolkit/frameworks/` &mdash; Lean Canvas, Design Sprint, Jobs To Be Done, Mom Test, Value Proposition Canvas, and more. Used by research and product commands.

**6 templates** in `toolkit/templates/` &mdash; Competitor analysis, idea canvas, PRD, user interview, validation checklist, project readme.

---

## Compatibility

**Native support:** Claude Code &mdash; slash commands, skills, agents, rules, npx installer, plugin marketplace.

**Works with any AI tool:** All content is standard markdown. Rules, frameworks, templates, and skill definitions can be added to any AI coding tool's system instructions &mdash; Codex, Gemini, Copilot, Cursor, Windsurf, etc.

---

## Telegram Bridge

Control your AI coding sessions from your phone. Provider-based architecture &mdash; currently supports Telegram.

```
Phone (Telegram) <-> Bridge (Node.js) <-> Claude Agent SDK <-> Claude API
```

See [`bridges/`](bridges/) for setup and docs.

---

## Target Stack

Rules and skills are tuned for this stack, but the command framework works with anything:

| Layer | Technology |
|-------|-----------|
| Backend | Kotlin + Micronaut |
| Frontend | React + Next.js + TypeScript |
| Database | PostgreSQL |
| CI/CD | GitHub Actions |

> **Using a different stack?** Fork the repo, edit the rules and skills, run `setup.sh --global`. The command framework works with any language or framework.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add commands, skills, rules, and agents.

---

## License

MIT
