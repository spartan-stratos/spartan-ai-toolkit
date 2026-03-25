# Backend Workflow: Kotlin + Micronaut

Stack-specific feature development workflow for the `backend-micronaut` pack.

**Rules enforced:** `KOTLIN.md`, `CONTROLLERS.md`, `SERVICES_AND_BEANS.md`, `API_DESIGN.md`, `RETROFIT_PLACEMENT.md`, `SCHEMA.md`, `ORM_AND_REPO.md`, `TRANSACTIONS.md`, `ARCHITECTURE.md`

---

## The Workflow

```
Epic → Spec → Plan → Build → Review
              ↑         ↑       ↑        ↑
            Gate 1    Gate 2  Gate 3   Gate 4
```

---

## Module Structure

A typical Micronaut monorepo follows this layout:

```
{service}/
├── database-migration/sql/         # Migration SQL files
├── app/
│   ├── api-application/             # Controllers, managers, factories, tests
│   │   └── src/main/kotlin/.../
│   │       ├── controller/          # HTTP endpoints (thin)
│   │       ├── manager/             # Business logic
│   │       └── runtime/factory/     # Bean wiring
│   ├── module-client/               # Request/response DTOs (shared)
│   │   └── src/main/kotlin/.../
│   │       ├── request/{domain}/    # Input models
│   │       └── response/            # Output models
│   ├── module-repository/           # Database layer
│   │   └── src/main/kotlin/.../postgresql/
│   │       ├── table/               # Exposed Table objects
│   │       ├── entity/              # Entity classes
│   │       └── repository/          # Data access
│   ├── module-exception/            # Error types
│   └── module-{feature}/            # Feature modules (for larger features)
│       ├── module-api/              # Interface (contract)
│       └── module-impl/             # Implementation + factory
└── core/                            # Shared across services
    ├── module-database/             # DatabaseContext, transactions
    ├── module-retrofit/             # HTTP client
    └── module-config/               # Configuration
```

---

## Phase Guide

### Spec Phase — what to define

The spec for a backend feature should include:

**Data model:**
- Tables with standard columns: `id` (UUID), `created_at`, `updated_at`, `deleted_at`
- Use TEXT not VARCHAR (see `SCHEMA.md`)
- No foreign key constraints (see `SCHEMA.md`)
- Soft delete via `deleted_at` column
- Include `update_updated_at()` trigger

**API contract:**
- RPC-style endpoints (see `API_DESIGN.md`)
- Query parameters only — no path parameters
- snake_case JSON in all responses
- Request/response models in `module-client`

**Example spec sections:**

```sql
-- Data Model
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

```
-- API Contract
POST /api/v1/user-profile/create
GET  /api/v1/user-profile/get?user_id=xxx
POST /api/v1/user-profile/update
POST /api/v1/user-profile/delete
```

---

### Plan Phase — how to structure tasks

Break into these phases:

#### Phase 1: Database
| # | Task | Files | Reference |
|---|------|-------|-----------|
| 1 | Create migration SQL | `database-migration/sql/NNN-{description}.sql` | `SCHEMA.md` |
| 2 | Create Table object | `module-repository/.../table/{Name}Table.kt` (extends `UUIDTable`) | `ORM_AND_REPO.md` |
| 3 | Create Entity class | `module-repository/.../entity/{Name}Entity.kt` (implements `Entity<Instant>`) | `ORM_AND_REPO.md` |
| 4 | Create Repository | `module-repository/.../repository/{Name}Repository.kt` + `Default{Name}Repository.kt` | `ORM_AND_REPO.md` |

#### Phase 2: Business Logic
| # | Task | Files | Reference |
|---|------|-------|-----------|
| 5 | Create Manager interface | `api-application/.../manager/{Name}Manager.kt` (or `module-{name}/module-api`) | `SERVICES_AND_BEANS.md` |
| 6 | Create Manager implementation | `api-application/.../manager/Default{Name}Manager.kt` (or `module-{name}/module-impl`) | `SERVICES_AND_BEANS.md` |
| 7 | Create request/response models | `module-client/.../request/{domain}/{Name}Request.kt` + `module-client/.../response/{Name}Response.kt` | `API_DESIGN.md` |

#### Phase 3: API Layer
| # | Task | Files | Reference |
|---|------|-------|-----------|
| 8 | Create Controller | `api-application/.../controller/{Name}Controller.kt` | `CONTROLLERS.md` |
| 9 | Create/update Factory beans | `api-application/.../runtime/factory/{Name}Factory.kt` (or update `ManagerFactory.kt`) | `SERVICES_AND_BEANS.md` |

#### Phase 4: Tests
| # | Task | Files | Reference |
|---|------|-------|-----------|
| 10 | Repository tests | `module-repository/src/test/.../Default{Name}RepositoryTest.kt` | `testing-strategies` skill |
| 11 | Manager unit tests | `api-application/src/test/.../Default{Name}ManagerTest.kt` | `testing-strategies` skill |
| 12 | Controller integration tests | `api-application/src/test/.../{Name}ControllerTest.kt` (Retrofit client) | `testing-strategies` skill |

**Parallel groups:**
- Tasks 1-3 can run in parallel (migration, table, entity are independent files)
- Tasks 5, 7 can run in parallel (manager interface and models don't depend on each other)
- Tasks 10-12 can run in parallel (tests are independent)

**Sequential:**
- Task 4 needs 1-3 (repository needs table + entity)
- Task 6 needs 4, 5 (implementation needs repository + interface)
- Task 8 needs 6, 7 (controller needs manager + models)
- Task 9 needs 6 (factory needs manager implementation)

---

## Code Patterns

### Controller Pattern

```kotlin
@ExecuteOn(TaskExecutors.IO)
@Validated
@Controller("/api/v1/user-profile")
@Secured(SecurityRule.IS_AUTHENTICATED)
class UserProfileController(
  private val userProfileManager: UserProfileManager,
) {
  @Post("/create")
  suspend fun create(@Body request: CreateUserProfileRequest): UserProfileResponse {
    return userProfileManager.create(request).throwOrValue()
  }

  @Get("/get")
  suspend fun get(@QueryValue userId: UUID): UserProfileResponse {
    return userProfileManager.getByUserId(userId).throwOrValue()
  }
}
```

Key points: `suspend` functions, `@ExecuteOn(IO)`, `@QueryValue` (not path params), `.throwOrValue()` to unwrap Either.

### Manager Pattern

```kotlin
interface UserProfileManager {
  suspend fun create(request: CreateUserProfileRequest): Either<ClientException, UserProfileResponse>
  suspend fun getByUserId(userId: UUID): Either<ClientException, UserProfileResponse>
}

@Singleton
class DefaultUserProfileManager(
  private val userProfileRepository: UserProfileRepository,
  private val db: DatabaseContext,
) : UserProfileManager {

  override suspend fun create(request: CreateUserProfileRequest): Either<ClientException, UserProfileResponse> {
    return either {
      val entity = db.primary {
        userProfileRepository.create(request)
      }
      UserProfileResponse.from(entity)
    }
  }
}
```

Key points: returns `Either<ClientException, T>`, `db.primary {}` for writes, `db.replica {}` for reads.

### Repository Pattern

```kotlin
interface UserProfileRepository {
  fun create(request: CreateUserProfileRequest): UserProfileEntity
  fun findByUserId(userId: UUID): UserProfileEntity?
}

class DefaultUserProfileRepository : UserProfileRepository {
  override fun findByUserId(userId: UUID): UserProfileEntity? {
    return UserProfileEntity.find {
      (UserProfileTable.userId eq userId) and (UserProfileTable.deletedAt.isNull())
    }.firstOrNull()
  }
}
```

Key points: always filter `deletedAt.isNull()`, soft delete sets `deletedAt` (never hard delete).

### Response DTO Pattern

```kotlin
@Serdeable
data class UserProfileResponse(
  val id: UUID,
  val userId: UUID,
  val displayName: String,
  val bio: String?,
  val createdAt: Instant,
) {
  companion object {
    fun from(entity: UserProfileEntity) = UserProfileResponse(
      id = entity.id.value,
      userId = entity.userId,
      displayName = entity.displayName,
      bio = entity.bio,
      createdAt = entity.createdAt,
    )
  }
}
```

Key points: `@Serdeable`, `companion object { fun from() }` for conversion, camelCase in code (Jackson auto-converts to snake_case).

### Factory Pattern

```kotlin
@Factory
class UserProfileFactory(
  private val userProfileRepository: UserProfileRepository,
  private val db: DatabaseContext,
) {
  @Singleton
  fun userProfileManager(): UserProfileManager {
    return DefaultUserProfileManager(userProfileRepository, db)
  }
}
```

Key points: `@Factory` class, `@Singleton` method, returns interface type, constructs `Default*` implementation.

### Test Pattern

```kotlin
@MicronautTest(environments = ["test"], transactional = false)
class UserProfileControllerTest : AbstractControllerTest() {

  @Inject
  lateinit var client: UserProfileClient  // Retrofit client

  @Test
  fun `create user profile - success`() = runTest {
    val request = CreateUserProfileRequest(
      userId = UUID.randomUUID(),
      displayName = "Test User",
    )
    val response = client.create(request)
    assertThat(response.displayName).isEqualTo("Test User")
  }
}
```

Key points: `@MicronautTest`, Retrofit client injection, `runTest` for coroutines, assertk assertions.

---

## Quality Gates — Backend Specific

### Gate 1: Spec Review (Backend)

Everything from the generic Gate 1, plus:

**Data Model (SCHEMA.md):**
- [ ] Uses TEXT not VARCHAR
- [ ] Uses UUID for primary keys
- [ ] Has `id`, `created_at`, `updated_at`, `deleted_at` columns
- [ ] No foreign key constraints
- [ ] `update_updated_at()` trigger in migration
- [ ] Indexes include `WHERE deleted_at IS NULL`

**API Design (API_DESIGN.md):**
- [ ] RPC-style endpoints (verb-based: `/create`, `/get`, `/update`, `/delete`)
- [ ] Uses query parameters, not path parameters
- [ ] Response models use snake_case JSON
- [ ] Request/response models planned for `module-client`

---

### Gate 2: Plan Review (Backend)

Everything from the generic Gate 2, plus:

**Architecture (ARCHITECTURE.md, CONTROLLERS.md):**
- [ ] Follows layered design: Controller → Manager → Repository
- [ ] Controllers only call managers (not repositories directly)
- [ ] Managers wrap DB operations via `db.primary {}` / `db.replica {}`
- [ ] Bean management follows 3-tier hierarchy (SERVICES_AND_BEANS.md)

**File Locations:**
- [ ] Migrations in `database-migration/sql/`
- [ ] Table/Entity/Repository in `module-repository`
- [ ] Manager interface in feature module's `module-api` or in `api-application`
- [ ] Manager implementation in feature module's `module-impl` or in `api-application`
- [ ] Request/response models in `module-client`
- [ ] Controller in `api-application`
- [ ] Factory in `api-application/runtime/factory/` or feature module's `module-impl`

---

### Gate 3: Implementation Review (Backend)

Everything from the generic Gate 3, plus:

**Kotlin (KOTLIN.md):**
- [ ] No `!!` anywhere in the code
- [ ] Null safety via `?.`, `?:`, or explicit checks
- [ ] Error handling uses `Either<ClientException, T>`
- [ ] No `@Suppress` annotations
- [ ] Enums use companion object for lookup
- [ ] Response DTOs have `companion object { fun from() }` for conversion

**Architecture:**
- [ ] Controller is thin — `suspend` functions, `@ExecuteOn(TaskExecutors.IO)`, `.throwOrValue()`
- [ ] Manager returns `Either<ClientException, T>`, uses `db.primary {}` for writes
- [ ] Repository checks `deletedAt.isNull()` in all queries
- [ ] Soft delete sets `deletedAt`, never hard deletes

**Configuration:**
- [ ] No magic numbers — durations, timeouts, limits come from config
- [ ] Config values injected as config objects (not unpacked into individual constructor params)
- [ ] No inline fully-qualified imports

**Models:**
- [ ] Uses `@Serdeable` annotation
- [ ] JSON field names auto-converted to snake_case via Jackson
- [ ] Models in `module-client`

**Tests:**
- [ ] Uses Retrofit clients for API tests (not raw HttpRequest)
- [ ] Repository tests use Testcontainers
- [ ] Test class extends `AbstractControllerTest` (for integration tests)
- [ ] Uses `runTest` for coroutine tests

---

### Gate 4: Final Review (Backend)

Everything from the generic Gate 4, plus:

- [ ] `./gradlew test` passes
- [ ] `./gradlew ktlintCheck` passes
- [ ] `./gradlew clean build` passes
- [ ] No `!!` in any changed file
- [ ] No `@Suppress` in any changed file
- [ ] All controllers use `@ExecuteOn(TaskExecutors.IO)` and `suspend` functions
- [ ] All JSON uses snake_case (auto via Jackson)
- [ ] No magic numbers (grep for `ChronoUnit`, `.plus(` with hardcoded values)
- [ ] No inline fully-qualified imports (grep for `java.\w+.\w+.\w+(`)

---

## Quick Reference

| What | Where | Rule |
|------|-------|------|
| Migration SQL | `database-migration/sql/NNN-description.sql` | `SCHEMA.md` |
| Table object | `module-repository/.../postgresql/table/` | `ORM_AND_REPO.md` |
| Entity class | `module-repository/.../postgresql/entity/` | `ORM_AND_REPO.md` |
| Repository | `module-repository/.../postgresql/repository/` | `ORM_AND_REPO.md` |
| Manager interface | `api-application/.../manager/` or `module-{name}/module-api` | `SERVICES_AND_BEANS.md` |
| Manager impl | `api-application/.../manager/` or `module-{name}/module-impl` | `SERVICES_AND_BEANS.md` |
| Controller | `api-application/.../controller/` | `CONTROLLERS.md` |
| Factory | `api-application/.../runtime/factory/` | `SERVICES_AND_BEANS.md` |
| Request DTOs | `module-client/.../request/{domain}/` | `API_DESIGN.md` |
| Response DTOs | `module-client/.../response/` | `API_DESIGN.md` |
| Integration tests | `api-application/src/test/` | `testing-strategies` skill |
| Repository tests | `module-repository/src/test/` | `testing-strategies` skill |

## Related Skills & Commands

- `/spartan:kotlin-service` — scaffold a new Micronaut microservice
- `/spartan:review` — PR review with Kotlin/Micronaut conventions
- `/spartan:testcontainer` — set up Testcontainers
- `/spartan:migration` — create a database migration
- `/api-endpoint-creator` skill — generates the full Controller → Manager → Repository stack
- `/backend-api-design` skill — RPC-style API design patterns
- `/kotlin-best-practices` skill — null safety, Either, coroutines
- `/testing-strategies` skill — integration test patterns
- `/security-checklist` skill — auth, validation, OWASP
