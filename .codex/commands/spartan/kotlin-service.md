---
name: spartan:kotlin-service
description: Scaffold a new Kotlin Micronaut microservice following Spartan conventions and company rules
argument-hint: "[service-name] [brief description]"
---

You are scaffolding a new Kotlin Micronaut microservice for the Spartan platform.

**Before scaffolding, read these company rules:**
- `rules/shared-backend/ARCHITECTURE.md` — Layered architecture
- `rules/backend-micronaut/KOTLIN.md` — Kotlin conventions
- `rules/database/SCHEMA.md` — Schema standards
- `rules/backend-micronaut/API_DESIGN.md` — API design patterns

## Service: {{ args[0] }}
## Purpose: {{ args[1] }}

Follow these steps exactly:

### 1. Gather Context
Ask the user:
- What domain events does this service produce/consume?
- What external dependencies (DB, Kafka, Redis, HTTP clients)?
- What are the main domain entities?
- Any specific SLA requirements?

**Auto mode on?** → Infer from service name and description. Default: PostgreSQL, no Kafka, no Redis, standard REST. Proceed to scaffold immediately.
**Auto mode off?** → Wait for answers before proceeding.

### 2. Scaffold Directory Structure

Create the following structure under `src/main/kotlin/com/spartan/{{ args[0] }}/`:

```
controller/        # @Controller classes, @Secured, @ExecuteOn
manager/           # Business logic interfaces + implementations (returns Either)
service/           # External API calls (HTTP clients)
repository/        # Database access (Exposed ORM)
model/             # Entities, DTOs, enums, value objects
config/            # Micronaut configuration classes
```

### 3. Create Base Files

**build.gradle.kts** — include:
- io.micronaut:micronaut-http-server-netty
- org.jetbrains.exposed:exposed-core
- io.micronaut:micronaut-management
- kotlinx-coroutines-reactor
- testcontainers (test scope)
- kotest or junit5

**application.yml** — with:
- micronaut.application.name
- management endpoints (`/health`, `/info`)
- placeholder for datasource (use env vars: `DATASOURCES_DEFAULT_URL`, etc.)

**Main Application class**:
```kotlin
fun main(args: Array<String>) {
    Micronaut.run(Application::class.java, *args)
}
```

**Base error handling** — use Arrow's Either (per CORE_RULES):
```kotlin
// All Manager methods return Either<ClientException, T>
// NEVER use sealed class Result<T> — use Either instead
// NEVER throw exceptions for business errors

suspend fun findUser(id: UUID): Either<ClientException, UserResponse> {
    val user = userRepository.findById(id)
        ?: return UserError.NOT_FOUND.asException().left()
    return user.toResponse().right()
}
```

### 4. Create First Test

Create `src/test/kotlin/.../ApplicationContextTest.kt`:
```kotlin
@MicronautTest
class ApplicationContextTest {
    @Test
    fun `application context loads`() { }
}
```

### 5. Create Flyway Migration

If PostgreSQL is a dependency:
- `src/main/resources/db/migration/V1__create_initial_schema.sql`
- Include base tables for the main domain entities

### 6. Docker Compose for local dev

Create `docker-compose.yml` with:
- postgres:16 with healthcheck
- (if Kafka) confluentinc/cp-kafka with zookeeper

### 7. README.md

Include:
- Service description
- Local setup instructions
- Environment variables table
- Key architectural decisions

After scaffolding, run the TDD skill to write the first domain test.
