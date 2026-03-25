
---

## Kotlin + Micronaut Backend

**Stack:** Kotlin + Micronaut — coroutines, Either error handling, Exposed ORM

Rules in `rules/backend-micronaut/` and `rules/database/` are loaded automatically.

**Workflow:** `/spartan:build backend "feature"` handles the full pipeline (plan → migration → endpoint → tests → review → PR).

### Backend Commands

| Command | Purpose |
|---|---|
| `/spartan:kotlin-service [name]` | Scaffold Micronaut microservice |
| `/spartan:review` | PR review with Kotlin/Micronaut conventions |
| `/spartan:testcontainer [type]` | Setup Testcontainers |
| `/spartan:migration "desc"` | Create database migration |
