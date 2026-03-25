
---

## Tech Stack — Backend

**Backend:** Kotlin + Micronaut — coroutines, Either error handling, Exposed ORM
**CI/CD:** GitHub Actions

### Company Rules (synced across all projects)

Rules in `rules/project/` enforce coding standards — Claude MUST follow them:
- `CORE_RULES.md` — Kotlin null safety (`!!` banned), Either error handling, controller patterns
- `ARCHITECTURE_RULES.md` — Layered architecture: Controller → Manager → Service/Repository
- `API_RULES.md` — RPC-style API design, query params only (no path params), testing
- `DATABASE_RULES.md` — No foreign keys, TEXT not VARCHAR, soft deletes, `uuid_generate_v4()`, partial indexes
- `CONTROLLER_TEST_STANDARDS.md` — `@MicronautTest` patterns, AbstractControllerTest, Retrofit clients
- `NAMING_CONVENTIONS.md` — snake_case DB/JSON, camelCase Kotlin/TypeScript, Jackson SNAKE_CASE config
- `RETROFIT_CLIENT_PLACEMENT.md` — Never place Retrofit interfaces in kapt-enabled modules
- `TRANSACTION_RULES.md` — Multi-table operations MUST use `transaction(db.primary) {}`

### Backend Skills

- `/api-endpoint-creator` — Generate full Controller → Manager → Repository stack
- `/database-table-creator` — SQL migration → Exposed Table → Entity → Repository → Tests
- `/backend-api-design` — RPC-style API design reference
- `/database-patterns` — Schema design, migrations, Exposed ORM patterns
- `/kotlin-best-practices` — Null safety, Either, coroutines quick reference
- `/testing-strategies` — Integration test patterns for Micronaut
- `/security-checklist` — Auth, validation, OWASP prevention

### Backend Agents

- `micronaut-backend-expert` — Deep Micronaut framework expertise, DB design, API architecture
- `solution-architect-cto` — Strategic tech decisions, system design, scalability planning

### Backend Commands

| Command | Purpose |
|---|---|
| `/spartan:kotlin-service [name]` | Scaffold Micronaut microservice |
| `/spartan:migration "desc"` | Create versioned Flyway migration |
| `/spartan:review` | PR review with Kotlin/Micronaut conventions |
| `/spartan:testcontainer [type]` | Setup Testcontainers (postgres/kafka/redis) |

### TDD — Backend Specific
- Kotlin: `@MicronautTest` integration tests are mandatory for every endpoint (see `/testing-strategies` skill)

---

## Kotlin + Micronaut Conventions

> Full details: read `rules/project/CORE_RULES.md` and `rules/project/ARCHITECTURE_RULES.md`

```kotlin
// Error handling — Either, not exceptions (Arrow)
suspend fun findUser(id: UUID): Either<ClientException, UserResponse>

// !! is BANNED — use safe call + elvis
val email = token.email ?: return AuthError.INVALID_CREDENTIALS.asException().left()

// Layered architecture: Controller → Manager → Service/Repository
@Controller("/api/v1")
@Secured(SecurityRule.IS_AUTHENTICATED)
class UserController(private val userManager: UserManager) {
    @Get("/user")
    @ExecuteOn(TaskExecutors.BLOCKING)
    suspend fun getUser(@QueryValue id: UUID) = userManager.getUser(id)
}

// Manager = business logic (returns Either)
interface UserManager {
    suspend fun getUser(id: UUID): Either<ClientException, UserResponse>
}

// API design — query params only, no path params
// GET  /api/v1/users           (list)
// GET  /api/v1/user?id=xxx     (get one)
// POST /api/v1/user            (create)
// POST /api/v1/user/update     (update)
// POST /api/v1/user/delete     (soft delete)

// Database — Exposed ORM, TEXT not VARCHAR, soft deletes
object UsersTable : UUIDTable("users") {
    val name = text("name")
    val email = text("email")
    val deletedAt = timestamp("deleted_at").nullable()
    val createdAt = timestamp("created_at").defaultExpression(CurrentTimestamp)
    val updatedAt = timestamp("updated_at").defaultExpression(CurrentTimestamp)
}

// Package structure
com.spartan.{module}/
  controller/      # HTTP handling, validation, @Secured
  manager/         # Business logic, orchestration (interface + impl)
  service/         # External API calls
  repository/      # Database access (Exposed)
  model/           # Entities, DTOs, enums
```

---

## Stripe Conventions

- All amounts: `Long` (cents) — use `Money` value class
- Every Stripe mutation: idempotency key required
- Webhook signature: always verify with `Webhook.constructEvent()`
- Secret key: backend only, never in frontend, never in git
- Test card: `4242 4242 4242 4242`
