# Spartan AI Toolkit

Engineering discipline layer for AI coding agents. Provides rules, skills, and workflows.

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

Available in `toolkit/skills/`. Each follows the Agent Skills spec:

- `api-endpoint-creator` — Generate Controller → Manager → Repository stack
- `backend-api-design` — RPC-style API design patterns
- `database-patterns` — Schema design, migrations, Exposed ORM
- `database-table-creator` — SQL migration → Table → Entity → Repository → Tests
- `kotlin-best-practices` — Null safety, Either, coroutines quick reference
- `security-checklist` — Auth, validation, OWASP prevention
- `testing-strategies` — Integration test patterns for Micronaut
- `ui-ux-pro-max` — Design system with 67 styles, 96 palettes, 13 stacks

## Install

```bash
# Claude Code (full toolkit with commands + packs)
npx spartan-ai-toolkit@latest

# Any agent (skills only)
npx skills add spartan-stratos/spartan-ai-toolkit
```

## More Info

See `toolkit/CLAUDE.md` for the full workflow brain (Claude Code specific).
