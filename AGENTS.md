# Spartan AI Toolkit

Engineering discipline layer for AI coding tools. Provides rules, skills, workflows, and agents.

## Rules

Coding standards in `toolkit/rules/project/`. Apply these to your project:

- **CORE_RULES** — Kotlin null safety, Either error handling, no `!!`
- **ARCHITECTURE_RULES** — Layered architecture: Controller → Manager → Repository
- **API_RULES** — RPC-style API design, query params only, no path params
- **DATABASE_RULES** — No foreign keys, TEXT not VARCHAR, soft deletes, uuid_generate_v4()
- **FRONTEND_RULES** — Build check before commit, cleanup imports, null safety
- **NAMING_CONVENTIONS** — snake_case DB/JSON, camelCase Kotlin/TypeScript
- **CONTROLLER_TEST_STANDARDS** — @MicronautTest integration test patterns
- **TRANSACTION_RULES** — Multi-table operations must use transactions

## Skills

Available in `toolkit/skills/`. Each skill is a directory with a `SKILL.md` definition.

### Backend

- `api-endpoint-creator` — Generate Controller → Manager → Repository stack
- `backend-api-design` — RPC-style API design patterns
- `database-patterns` — Schema design, migrations, Exposed ORM
- `database-table-creator` — SQL migration → Table → Entity → Repository → Tests
- `kotlin-best-practices` — Null safety, Either, coroutines quick reference
- `security-checklist` — Auth, validation, OWASP prevention
- `testing-strategies` — Integration test patterns for Micronaut

### Frontend

- `ui-ux-pro-max` — Design system with 67 styles, 96 palettes, 13 stacks

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

## Agents

- `micronaut-backend-expert` — Micronaut framework, database design, API architecture
- `solution-architect-cto` — System design, scalability, tech decisions
- `idea-killer` — Stress-test ideas, find weaknesses
- `research-planner` — Plan and coordinate research workflows

## Install

```bash
# Full toolkit (commands + packs + rules + skills + agents)
npx spartan-ai-toolkit@latest

# Skills only (works with any AI agent)
npx skills add spartan-stratos/spartan-ai-toolkit
```

## More Info

See [README.md](README.md) for the full docs, packs, and all 48 commands.
