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

## Controller Test Standards

### 1. Test Structure Requirements

**ALWAYS follow this pattern for controller tests:**

1. **Extend AbstractControllerTest** - Never write standalone tests
2. **Use @TestInstance(TestInstance.Lifecycle.PER_CLASS)** - For proper lifecycle management
3. **Create a client interface** - Use Retrofit client for making API calls
4. **Generate JWT tokens** - Use `accessToken()` method to create real JWT tokens
5. **Test through HTTP** - Always test the full HTTP stack, not mocked managers

### 2. Required Test Setup

```kotlin
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class YourControllerTest : AbstractControllerTest() {

    private lateinit var yourClient: YourClient
    private lateinit var testUser: UserEntity
    private lateinit var repository: YourRepository

    // Override to manage cleanup manually
    override fun cleanDataAfterTest(): Boolean = false

    @BeforeAll
    override fun beforeAll() {
        // 1. Create Retrofit client
        val url = embeddedServer.url.toString()
        val jackson = ObjectMapper().configured()
        val retrofit = Retrofits
            .newBuilder(
                url = url.toHttpUrl(),
                jackson = jackson
            )
            .build()
        yourClient = retrofit.create(YourClient::class.java)

        // 2. Initialize repositories
        repository = DefaultYourRepository(database)

        // 3. Create test users
        testUser = prepareUser(
            email = "test@test.com",
            displayName = "Test User",
            status = UserStatus.ACTIVE,
            role = UserRole.USER
        )

        // 4. Clean up any existing test data
        cleanTestData()
    }

    @AfterAll
    override fun afterAll() {
        // Clean up all test data
        cleanTestData()
    }
}
```

### 3. Test Pattern

```kotlin
@Test
fun `test name should describe the behavior`() = runBlocking {
    // Given - Setup test data
    val authToken = accessToken(testUser)  // Generate real JWT
    val request = CreateRequest(...)

    // When - Make API call through client
    val result = yourClient.createSomething(authToken, request)

    // Then - Assert using Strikt
    expectThat(result) {
        get { field }.isEqualTo(expectedValue)
    }
}
```

### 4. Authentication Testing

**ALWAYS test authentication scenarios:**

```kotlin
@Test
fun `should fail without authentication`() = runBlocking {
    // When/Then
    expectThrows<HttpClientResponseException> {
        yourClient.someMethod("")
    }.and {
        get { status }.isEqualTo(HttpStatus.UNAUTHORIZED)
    }
}

@Test
fun `should fail when not owner`() = runBlocking {
    // Given
    val otherUser = prepareUser(email = "other@test.com")
    val otherToken = accessToken(otherUser)

    // When/Then
    expectThrows<HttpClientResponseException> {
        yourClient.accessResource(otherToken, resourceId)
    }.and {
        get { status }.isEqualTo(HttpStatus.NOT_FOUND) // Use NOT_FOUND for security
    }
}
```

### 5. Client Interface Requirements

**Create a proper Retrofit client in module-client:**

```kotlin
interface YourClient {
    @POST("/api/resource")
    suspend fun create(
        @Header("Authorization") authorization: String,
        @Body request: CreateRequest
    ): Response

    @GET("/api/resource/detail")  // Use query params, not path variables
    suspend fun get(
        @Header("Authorization") authorization: String,
        @Query("id") id: UUID
    ): Response

    @PUT("/api/resource/update")
    suspend fun update(
        @Header("Authorization") authorization: String,
        @Query("id") id: UUID,
        @Body request: UpdateRequest
    ): Response

    @DELETE("/api/resource/delete")
    suspend fun delete(
        @Header("Authorization") authorization: String,
        @Query("id") id: UUID
    ): Unit
}
```

### 6. Data Cleanup Pattern

```kotlin
private fun hardDeleteTestData() {
    try {
        transaction(database.primary) {
            // Delete in correct order (foreign keys first)
            ChildTable.deleteWhere {
                ChildTable.parentId inList testIds
            }
            ParentTable.deleteWhere {
                ParentTable.userId eq testUser.id
            }
        }
    } catch (e: Exception) {
        // Ignore if data doesn't exist
    }
}
```

### 7. Common Mistakes to Avoid

**DON'T:**
- Mock the manager or repository in controller tests
- Use @MockBean for dependencies
- Test without authentication
- Forget to clean up test data
- Use path variables in client interfaces
- Skip authorization/ownership tests

**DO:**
- Test the full HTTP stack end-to-end
- Use real JWT tokens via `accessToken()`
- Test all error scenarios
- Track created entities for cleanup
- Use query parameters exclusively
- Test one-to-one/one-to-many relationships

### 8. Assertion Pattern

Use Strikt for readable assertions:

```kotlin
expectThat(result) {
    get { id }.isNotNull()
    get { status }.isEqualTo(expectedStatus)
    get { nestedObject }.isNotNull().and {
        get { field }.isEqualTo(value)
    }
}

expectThat(list) {
    get { size }.isGreaterThanOrEqualTo(2)
    get { map { it.name } }.contains("Name1", "Name2")
}

expectThrows<HttpClientResponseException> {
    // action that should throw
}.and {
    get { status }.isEqualTo(HttpStatus.BAD_REQUEST)
}
```

### 9. Test Coverage Requirements

Every controller should test:
1. Happy path for each endpoint
2. Missing authentication (401)
3. Wrong ownership/authorization (403/404)
4. Invalid input validation (400)
5. Resource not found (404)
6. Business rule violations
7. One-to-one/one-to-many relationships
8. Soft delete behavior
9. Update scenarios (partial updates)
10. List/filter operations

### 10. Example Full Test

See `ProjectControllerTest` and `UserControllerTest` for complete examples that follow all these patterns correctly.

---

## API Testing — Use Retrofit Clients

**Never construct raw HttpRequest objects for API endpoint testing.**

Use the Retrofit clients in `module-client` instead of building HTTP requests by hand.

Why:
- **Type safety**: Retrofit clients give compile-time type checking
- **Single source of truth**: API contracts are defined once in client interfaces
- **Consistency**: Tests use the same client code as production consumers
- **Maintainability**: API changes only need updates in one place
- **Discoverability**: IDE autocomplete shows all available endpoints

### Bad - Raw HttpRequest Construction
```kotlin
// DON'T DO THIS
@Test
fun `should get conversation`() {
  val request = HttpRequest.GET<Any>("/api/v1/conversations/by-id?id=$conversationId")
    .bearerAuth(token.removePrefix("Bearer "))
    .accept(MediaType.APPLICATION_JSON)

  val response = client.toBlocking().exchange(request, ConversationResponse::class.java)
  // assertions
}
```

### Good - Retrofit Client Usage
```kotlin
// DO THIS
@Test
fun `should get conversation`() = runTest {
  val response = conversationClient.getConversation(
    authorization = "Bearer $token",
    id = conversationId
  )

  assertThat(response.id).isEqualTo(conversationId)
}
```

### Client Location

All Retrofit clients are in `module-client/src/main/kotlin/com/yourcompany/client/`:

```
module-client/
├── ConversationClient.kt    # Conversation API endpoints
├── ContactClient.kt         # Contact API endpoints
├── UserClient.kt            # User API endpoints
└── ...
```

### Test Setup with Retrofit Clients

```kotlin
@MicronautTest(environments = ["test"])
class ConversationControllerTest {

  @Inject
  lateinit var conversationClient: ConversationClient

  @Test
  fun `should list conversations`() = runTest {
    val response = conversationClient.listConversations(
      authorization = bearerToken(testUser),
      request = ListConversationsRequest(/* ... */)
    )

    assertThat(response.items).isNotEmpty()
  }
}
```

### When Raw HttpRequest Is Acceptable

Raw HttpRequest is ONLY acceptable for:

1. **SSE/WebSocket connections** - Streaming protocols not supported by Retrofit
2. **Testing error responses** - When you need to test malformed requests
3. **Testing authentication failures** - When testing without/with invalid tokens
4. **Non-standard HTTP behaviors** - Testing edge cases Retrofit abstracts away

```kotlin
// Acceptable: SSE connection test
@Test
fun `should establish SSE connection`() {
  val request = HttpRequest.GET<Any>("/api/v1/realtime/sse")
    .bearerAuth(token)
    .accept(MediaType.TEXT_EVENT_STREAM)  // SSE not supported by Retrofit
  // ...
}

// Acceptable: Testing invalid request format
@Test
fun `should return 400 for malformed request`() {
  val request = HttpRequest.POST("/api/v1/conversations", """{"invalid": "json"}""")
    .bearerAuth(token)
  // ...
}
```

### Adding New Endpoints

When adding a new API endpoint:

1. **Add to Retrofit client FIRST** in `module-client`
2. **Write tests using the client**
3. **Implement the controller**

This makes sure the client contract is defined before the implementation.

### Test Naming Convention
```kotlin
@Test
fun `{action} - {expected outcome}`() { }

// Examples:
fun `createConversation - returns conversation with correct channel`() { }
fun `getMessages - returns empty list for new conversation`() { }
fun `sendMessage - fails with 404 for non-existent conversation`() { }
```

### Test Structure (AAA Pattern)
```kotlin
@Test
fun `should create conversation successfully`() = runTest {
  // Arrange
  val contact = createTestContact()
  val request = CreateConversationRequest(contactId = contact.id)

  // Act
  val response = conversationClient.createConversation(
    authorization = bearerToken(testUser),
    request = request
  )

  // Assert
  assertThat(response.contactId).isEqualTo(contact.id)
}
```

### Quick Reference

| Scenario | Use Retrofit Client | Use Raw HttpRequest |
|----------|:------------------:|:------------------:|
| Standard API calls | Yes | No |
| SSE/WebSocket | No | Yes |
| Testing malformed requests | No | Yes |
| Testing auth failures | No | Yes |
| Integration tests | Yes | No |
| E2E tests | Yes | No |

**Default to Retrofit clients. Only use raw HttpRequest when technically needed.**

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
