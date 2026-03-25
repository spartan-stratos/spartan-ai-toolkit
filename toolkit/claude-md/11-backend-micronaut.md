
---

## Kotlin + Micronaut Backend

**Stack:** Kotlin + Micronaut — coroutines, Either error handling, Exposed ORM

Rules in `rules/backend-micronaut/` enforce coding standards:
- `KOTLIN.md` — Null safety (`!!` banned), Either errors, enums, conversions, style
- `CONTROLLERS.md` — Layered arch: Controller → Manager → Service/Repository, test patterns
- `SERVICES_AND_BEANS.md` — Service vs Manager separation, 3-tier bean hierarchy
- `API_DESIGN.md` — RPC-style, query params only (no path params), model location
- `RETROFIT_PLACEMENT.md` — Never place Retrofit interfaces in kapt-enabled modules

> Full patterns: use /kotlin-best-practices or /backend-api-design skill

### Feature Development Workflow (Backend)

When building a backend feature, follow this pipeline:

```
Epic → Spec → Plan → Build → Review
              ↑         ↑       ↑        ↑
            Gate 1    Gate 2  Gate 3   Gate 4
```

**Build phases:** Database → Business Logic → API Layer → Tests

See `templates/workflow-backend-micronaut.md` for the full workflow with:
- Stack-specific quality gates (Kotlin rules, Exposed ORM checks, API conventions)
- Concrete code patterns (Controller, Manager, Repository, Factory, DTO, Test)
- Real file locations per module
- Parallel vs sequential task planning

For small tasks (< 1 day), `/spartan:quickplan` covers spec + plan in one shot.

### Backend Skills

- `/api-endpoint-creator` — Generate full Controller → Manager → Repository stack
- `/backend-api-design` — RPC-style API design reference
- `/kotlin-best-practices` — Null safety, Either, coroutines quick reference
- `/testing-strategies` — Integration test patterns for Micronaut
- `/security-checklist` — Auth, validation, OWASP prevention

### Backend Agents

- `micronaut-backend-expert` — Deep Micronaut framework expertise
- `solution-architect-cto` — Strategic tech decisions, system design

### Backend Commands

| Command | Purpose |
|---|---|
| `/spartan:kotlin-service [name]` | Scaffold Micronaut microservice |
| `/spartan:review` | PR review with Kotlin/Micronaut conventions |
| `/spartan:testcontainer [type]` | Setup Testcontainers (postgres/kafka/redis) |
