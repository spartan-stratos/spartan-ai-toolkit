# Spartan AI Toolkit

Engineering discipline layer for AI coding tools. Provides rules, skills, workflows, and agents.

## Hosts

Spartan supports two AI agent hosts:

| | Claude Code | Codex / OpenAI Agents |
|---|---|---|
| **Source** | `toolkit/skills/{name}/SKILL.md` (committed) | `.agents/skills/spartan-{name}/SKILL.md` (generated, gitignored) |
| **Frontmatter** | Full — name, description, allowed_tools | Minimal — name + description only |
| **Agent metadata** | N/A | `agents/openai.yaml` per skill |
| **Install** | `npx @c0x12c/ai-toolkit@latest` | `node toolkit/scripts/gen-codex-skills.js` |

**Claude skills are the source of truth.** Codex skills are generated from them. Edit `toolkit/skills/`, never `.agents/skills/`.

## Build commands

```bash
# Generate Codex skills from Claude sources
make codex
# or: node toolkit/scripts/gen-codex-skills.js

# Check if Codex skills are fresh (CI use)
make codex-dry-run
# or: node toolkit/scripts/gen-codex-skills.js --dry-run

# Health dashboard for Codex skills
make codex-check
# or: node toolkit/scripts/check-codex-skills.js

# Full validation (structure + content + Codex freshness)
make validate
```

## Rules

Coding standards in `toolkit/rules/{pack-name}/`. Apply these to your project:

- **KOTLIN** — Kotlin null safety, Either error handling, no `!!` (`rules/backend-micronaut/`)
- **ARCHITECTURE** — Layered architecture: Controller -> Manager -> Repository (`rules/shared-backend/`)
- **API_DESIGN** — RPC-style API design, query params only, no path params (`rules/backend-micronaut/`)
- **SCHEMA** — No foreign keys, TEXT not VARCHAR, soft deletes, gen_random_uuid() (`rules/database/`)
- **FRONTEND** — Build check before commit, cleanup imports, null safety (`rules/frontend-react/`)
- **NAMING_CONVENTIONS** — snake_case DB/JSON, camelCase Kotlin/TypeScript (`rules/core/`)
- **CONTROLLERS** — @MicronautTest integration test patterns (`rules/backend-micronaut/`)
- **TRANSACTIONS** — Multi-table operations must use transactions (`rules/database/`)

## Skills

Available in `toolkit/skills/`. Each skill is a directory with a `SKILL.md` definition.

### Backend

- `api-endpoint-creator` — Generate Controller -> Manager -> Repository stack
- `backend-api-design` — RPC-style API design patterns
- `database-patterns` — Schema design, migrations, Exposed ORM
- `database-table-creator` — SQL migration -> Table -> Entity -> Repository -> Tests
- `kotlin-best-practices` — Null safety, Either, coroutines quick reference
- `security-checklist` — Auth, validation, OWASP prevention
- `testing-strategies` — Integration test patterns for Micronaut
- `ci-cd-patterns` — CI/CD pipeline patterns for GitHub Actions
- `service-debugging` — Structured debugging runbook

### Frontend

- `ui-ux-pro-max` — Design system with 67 styles, 96 palettes, 13 stacks
- `design-intelligence` — Design system bootstrapping and token generation
- `design-workflow` — Anti-AI-generic design guidelines
- `browser-qa` — Real browser QA with Playwright

### Infrastructure

- `terraform-best-practices` — Terraform conventions quick reference
- `terraform-module-creator` — Create reusable Terraform modules
- `terraform-review` — PR review for Terraform changes
- `terraform-security-audit` — Security audit for Terraform codebases
- `terraform-service-scaffold` — Generate service-level Terraform

### Research

- `brainstorm` — Idea generation and ranking
- `idea-validation` — Score ideas, GO / TEST MORE / KILL
- `market-research` — Market sizing, trends, opportunities
- `competitive-teardown` — Deep competitor analysis
- `deep-research` — Multi-source research with citations
- `investor-materials` — Pitch deck, one-pager, financial model
- `investor-outreach` — Investor targeting and outreach
- `article-writing` — Long-form content creation
- `content-engine` — Content strategy and production
- `startup-pipeline` — Full startup research pipeline
- `web-to-prd` — Scan live web app, extract features, generate PRD

## Agents

- `micronaut-backend-expert` — Micronaut framework, database design, API architecture
- `solution-architect-cto` — System design, scalability, tech decisions
- `idea-killer` — Stress-test ideas, find weaknesses
- `research-planner` — Plan and coordinate research workflows

## Install

```bash
# Full toolkit (commands + packs + rules + skills + agents)
npx @c0x12c/ai-toolkit@latest

# Skills only (works with any AI agent)
npx skills add c0x12c/ai-toolkit
```

## More Info

See [README.md](README.md) for the full docs, packs, and all 51 commands.
