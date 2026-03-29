# Controller Rules

> Full guide: use `/api-endpoint-creator` skill

## Required Annotations

Every controller class MUST have these annotations:

```kotlin
@ExecuteOn(TaskExecutors.IO)  // REQUIRED: Enables coroutine suspension
@Validated                     // Input validation
@Controller("/api/v1/...")    // Endpoint path
@Secured(...)                  // Security rule
class MyController(
  private val myManager: MyManager  // ONLY managers, never repositories
) {
```

### Why @ExecuteOn(TaskExecutors.IO) is Required

- Controllers use `suspend` functions for async operations
- Without this annotation, suspend functions may not run right
- It offloads blocking operations to the IO thread pool
- Stops blocking the main event loop

## Dependency Rules

| Allowed | Not Allowed |
|---------|-------------|
| Managers (`*Manager`) | Repositories (`*Repository`) |
| Detectors (`*Detector`) | Database context |
| - | Direct entity access |
| - | External API clients |

### Example: Correct Controller

```kotlin
@ExecuteOn(TaskExecutors.IO)
@Controller("/api/v1/admin")
@Secured(OAuthSecurityRule.ADMIN)
class ProjectHealthController(
  private val projectHealthManager: ProjectHealthManager,  // ✓ Manager
  private val projectRiskDetector: ProjectRiskDetector     // ✓ Detector/Manager
) {
  @Get("/project/health")
  suspend fun getProjectHealth(@QueryValue id: UUID): ProjectHealthResponse {
    return projectHealthManager.computeProjectHealth(id, ...).throwOrValue()
  }
}
```

### Example: Incorrect Controller (VIOLATION)

```kotlin
// ❌ WRONG - Controller directly uses repositories
@Controller("/api/v1/admin")
class ProjectHealthController(
  private val projectHealthManager: ProjectHealthManager,
  private val projectAlertRepository: ProjectAlertRepository,  // ❌ NO!
  private val projectRepository: ProjectRepository             // ❌ NO!
) {
  @Get("/project/alerts")
  suspend fun getProjectAlerts(@QueryValue id: UUID): List<ProjectAlertSummary> {
    val alerts = projectAlertRepository.byProjectId(id)  // ❌ Direct repo access
    return alerts.map { ProjectAlertSummary.from(it) }
  }
}
```

## Thin Controller Pattern

Controllers should ONLY:

1. **Parse and validate HTTP input** (query params, body, headers)
2. **Delegate to managers** for business logic
3. **Transform manager results** to HTTP responses
4. **Handle authentication context** (get current user, etc.)

Controllers should NEVER:

1. Access repositories directly
2. Contain business logic
3. Make database queries
4. Call external APIs
5. Manage transactions
6. **Define inline data classes** (see below)

```kotlin
@Get("/project/health")
suspend fun getProjectHealth(
  @QueryValue id: UUID,
  @QueryValue date: String?,
  @QueryValue window: Int?
): ProjectHealthResponse {
  // 1. Parse input
  val targetDate = date?.let { LocalDate.parse(it) } ?: LocalDate.now()
  val windowDays = window ?: 7

  // 2. Delegate to manager and return
  return projectHealthManager.computeProjectHealth(id, targetDate, windowDays).throwOrValue()
}
```

## Error Handling Pattern

```kotlin
@Post("/project/alert/acknowledge")
suspend fun acknowledgeAlert(
  @QueryValue id: UUID,
  @QueryValue acknowledgedBy: UUID
): ProjectAlertSummary {
  // Manager returns Either<ClientException, T>
  // .throwOrValue() unwraps or throws the exception
  return projectHealthManager.acknowledgeAlert(id, acknowledgedBy).throwOrValue()
}
```

## No Inline Data Classes

**NEVER define `data class` declarations inside or at the bottom of controller files.**

All request/response models MUST live in `module-client`:
- Requests: `module-client/src/main/kotlin/com/yourcompany/client/request/`
- Responses: `module-client/src/main/kotlin/com/yourcompany/client/response/`

### Bad - Inline Data Classes (VIOLATION)

```kotlin
// ❌ WRONG - data classes at bottom of controller file
@Controller("/api/v1/admin/github")
class GitHubController(private val manager: GitHubManager) {

  @Post("/project-sources/orgs/set")
  suspend fun setProjectOrgs(
    @QueryValue projectId: UUID,
    @Body request: SetProjectOrgsRequest
  ): List<ProjectOrgAssignment> {
    return manager.setProjectOrgs(projectId, request.organizations).throwOrValue()
  }
}

// ❌ NEVER DO THIS - data classes defined in controller file
data class SetProjectOrgsRequest(
  val organizations: List<OrgAssignmentInput>
)

data class OrgAssignmentInput(
  val orgLogin: String,
  val includeAllRepos: Boolean = true
)
```

### Good - Separate Request File in module-client

```kotlin
// ✓ CORRECT - In module-client/request/GitHubProjectSourcesRequest.kt
package com.yourcompany.client.request

import io.micronaut.serde.annotation.Serdeable
import java.util.UUID

@Serdeable
data class SetProjectOrgsRequest(
  val organizations: List<OrgAssignmentInput>
)

@Serdeable
data class OrgAssignmentInput(
  val orgLogin: String,
  val includeAllRepos: Boolean = true
)
```

```kotlin
// ✓ CORRECT - Controller imports from module-client
import com.yourcompany.client.request.SetProjectOrgsRequest
import com.yourcompany.client.request.OrgAssignmentInput

@Controller("/api/v1/admin/github")
class GitHubController(private val manager: GitHubManager) {
  // Uses imported request classes
}
```

### Why This Rule Exists

1. **Single source of truth** - Models defined once, used everywhere
2. **Client generation** - External clients can import from module-client
3. **Consistency** - All teams know where to find request/response models
4. **Maintainability** - Changes to models are tracked in one place
5. **Testing** - Retrofit clients in tests use the same models

### How to Fix Violations

1. Create the right file in `module-client/request/` or `module-client/response/`
2. Move data class definitions there with `@Serdeable` annotation
3. Add proper imports in controller
4. Delete inline definitions from controller file

## No Private Converter Functions

**NEVER define private extension functions like `.toResponse()` in controller files.**

### Bad - Private Converter Functions (VIOLATION)

```kotlin
// ❌ WRONG - private converter functions in controller
class DataSyncController(private val manager: DataSyncManager) {

  @Post("/sync")
  suspend fun sync(): List<SyncResultResponse> {
    return manager.sync().throwOrValue().map { it.toResponse() }
  }

  // ❌ NEVER DO THIS
  private fun SyncResult.toResponse() = SyncResultResponse(
    success = success,
    resourceType = resourceType,
    // ...
  )
}
```

### Preferred: Manager Returns Response DTOs

The best pattern is for managers to return Response DTOs directly:

```kotlin
// ✓ BEST - Manager returns Response DTOs
class DataSyncController(private val manager: DataSyncManager) {

  @Post("/sync")
  suspend fun sync(): List<SyncResultResponse> {
    return manager.sync().throwOrValue()  // Manager already returns Response type
  }
}
```

### Acceptable: Inline Mapping in Controller

When the manager returns domain models, use inline mapping:

```kotlin
// ✓ ACCEPTABLE - Inline mapping (no private functions)
class DataSyncController(private val manager: DataSyncManager) {

  @Post("/sync")
  suspend fun sync(): List<SyncResultResponse> {
    return manager.sync()
      .throwOrValue()
      .map {
        SyncResultResponse(
          success = it.success,
          resourceType = it.resourceType,
          itemsSynced = it.itemsSynced,
          errors = it.errors
        )
      }
  }
}
```

### When Companion Objects Work

If `module-client` can depend on the model's module without circular dependency:

```kotlin
// In module-client/response/...
data class UserResponse(...) {
  companion object {
    fun from(entity: UserEntity) = UserResponse(...)
  }
}
```

Then use: `users.map { UserResponse.from(it) }`

When circular dependencies stop companion objects from working, use inline mapping or have the manager return Response DTOs directly.

## How to Fix Controller Violations

When a controller directly uses repositories, follow these steps:

### 1. Identify the Operations

Look at what repository methods the controller is calling:
- `repository.byId(id)`
- `repository.byStatus(status)`
- `repository.update(...)`

### 2. Add Methods to the Manager Interface

```kotlin
// In the Manager interface (e.g., ProjectHealthManager.kt)
interface ProjectHealthManager {
  // ... existing methods ...

  // Add new methods for operations that were in the controller
  suspend fun getProjectAlerts(projectId: UUID): Either<ClientException, List<ProjectAlertSummary>>
  suspend fun listAlerts(status: String?): Either<ClientException, List<ProjectAlertSummary>>
  suspend fun acknowledgeAlert(alertId: UUID, acknowledgedBy: UUID): Either<ClientException, ProjectAlertSummary>
}
```

### 3. Implement in the Manager

```kotlin
// In DefaultProjectHealthManager.kt
class DefaultProjectHealthManager(
  // ... existing dependencies ...
  private val projectAlertRepository: ProjectAlertRepository  // Move repo here
) : ProjectHealthManager {

  override suspend fun getProjectAlerts(projectId: UUID): Either<ClientException, List<ProjectAlertSummary>> {
    val alerts = projectAlertRepository.byProjectId(projectId)
    return alerts.map { ProjectAlertSummary.from(it) }.right()
  }
}
```

### 4. Update the Controller

```kotlin
// Remove repository dependency, use manager instead
class ProjectHealthController(
  private val projectHealthManager: ProjectHealthManager
  // Repository dependency REMOVED
) {
  @Get("/project/alerts")
  suspend fun getProjectAlerts(@QueryValue id: UUID): List<ProjectAlertSummary> {
    return projectHealthManager.getProjectAlerts(id).throwOrValue()
  }
}
```

### 5. Update the Factory

```kotlin
// In EvaluationManagerFactory.kt
@Singleton
fun provideProjectHealthManager(
  // ... existing params ...
  projectAlertRepository: ProjectAlertRepository  // Add new dependency
): ProjectHealthManager {
  return DefaultProjectHealthManager(
    // ... existing args ...
    projectAlertRepository = projectAlertRepository
  )
}
```

## Either Extension for Controllers

```kotlin
// Extension to convert Either to HTTP response
fun <T> Either<ClientException, T>.getOrThrow(): T =
    fold({ throw it }, { it })
```

---

## Controller Testing

> Full testing guide: use `/testing-strategies` skill

**Key rules:**
- Extend `AbstractControllerTest`, never standalone tests
- Use Retrofit clients from `module-client` — never raw `HttpRequest`
- Generate real JWT tokens via `accessToken()`
- Test full HTTP stack end-to-end, no mocking managers
- Every endpoint needs: happy path, auth (401), ownership (403/404), validation (400), not found (404)
- Clean up test data in `@BeforeAll` / `@AfterAll`

---

## Enforcement Checklist

Before committing controller changes:

- [ ] Controller class has `@ExecuteOn(TaskExecutors.IO)` annotation
- [ ] Controller only injects Managers/Detectors (no Repositories)
- [ ] All database operations are delegated to managers
- [ ] Controller methods are thin (just input parsing and delegation)
- [ ] Business logic is in managers, not controllers
- [ ] **NO inline data classes** - all models in `module-client`
- [ ] **NO private converter functions** - use inline mapping or manager returns Response DTOs
- [ ] **NO @Put, @Patch, @Delete** — only @Get and @Post (RPC-style, see API_DESIGN.md)
- [ ] **NO @PathVariable** — only @QueryValue for all IDs
