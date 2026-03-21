# API & Testing Rules

> Full guide: use `/backend-api-design` or `/testing-strategies` skill

---

## URL Design

### NEVER Use Path Parameters

**Do NOT use path parameters (e.g., `/{id}`, `/{userId}`). Always use query parameters.**

Why:
- Query parameters are more explicit and self-documenting
- Easier to add optional parameters without breaking API
- Consistent pattern across all endpoints
- Simpler routing configuration
- Better for caching and logging

#### Bad - Path Parameters
```kotlin
// DON'T DO THIS
@Get("/employees/{id}")
suspend fun getEmployee(@PathVariable id: UUID): EmployeeResponse

@Get("/employees/{id}/metrics")
suspend fun getMetrics(@PathVariable id: UUID): MetricsResponse

@Delete("/employees/{id}")
suspend fun deleteEmployee(@PathVariable id: UUID): Boolean
```

#### Good - Query Parameters
```kotlin
// DO THIS
@Get("/employee")
suspend fun getEmployee(@QueryValue id: UUID): EmployeeResponse

@Get("/employee/metrics")
suspend fun getMetrics(@QueryValue id: UUID): MetricsResponse

@Post("/employee/delete")
suspend fun deleteEmployee(@QueryValue id: UUID): Boolean
```

### Endpoint Naming

Use singular nouns for single resource, plural for collections:

```kotlin
// Collection endpoints (plural)
@Get("/employees")           // List employees
@Get("/organizations")       // List organizations

// Single resource endpoints (singular)
@Get("/employee")            // Get one employee (with ?id=xxx)
@Get("/organization")        // Get one organization (with ?id=xxx)
```

Use verb sub-paths for actions:

```kotlin
// Actions use sub-paths, not HTTP verbs alone
@Post("/employee/delete")     // Delete employee
@Post("/employee/restore")    // Restore employee
@Post("/sync/employees")      // Trigger employee sync
@Post("/sync/github")         // Trigger GitHub sync
```

### Controller Organization

Group related endpoints under common prefixes:

```kotlin
@Controller("/api/v1/admin")
class AdminController {
  // Sync operations
  @Post("/sync/employees")
  @Post("/sync/github")

  // Employee operations
  @Get("/employees")
  @Get("/employee")
  @Get("/employee/metrics")
}
```

### Request/Response Patterns

Required vs optional query parameters:

```kotlin
// Required parameter - no default, will fail if missing
@Get("/employee")
suspend fun getEmployee(
  @QueryValue id: UUID  // Required - no ? nullable
): EmployeeResponse

// Optional parameters - nullable with defaults
@Get("/employees")
suspend fun listEmployees(
  @QueryValue search: String?,      // Optional
  @QueryValue status: String?,      // Optional
  @QueryValue page: Int?,           // Optional, default in code
  @QueryValue limit: Int?           // Optional, default in code
): EmployeeListResponse {
  val effectivePage = page ?: 1
  val effectiveLimit = limit ?: 20
  // ...
}
```

Consistent pagination pattern:

```kotlin
// Request
@Get("/employees")
suspend fun listEmployees(
  @QueryValue page: Int?,    // 1-based page number
  @QueryValue limit: Int?    // Items per page (max 100)
)

// Response
data class EmployeeListResponse(
  val items: List<EmployeeResponse>,
  val total: Int,
  val page: Int,
  val limit: Int,
  val hasMore: Boolean
)
```

### Quick Reference

| Rule | Example |
|------|---------|
| No path params | `@Get("/employee")` with `@QueryValue id` |
| Plural for lists | `@Get("/employees")` |
| Singular for single | `@Get("/employee")` |
| Actions as sub-paths | `@Post("/employee/delete")` |
| Query params for all IDs | `?id=xxx` not `/{id}` |

---

## Model Location

### Rule: All API models live in `module-client` ONLY

**NEVER duplicate request or response models across modules.**

```
app/module-client/src/main/kotlin/insight/c0x12c/client/
├── request/           # API request models
│   ├── conversation/
│   ├── message/
│   └── {domain}/
└── response/          # API response models
    ├── conversation/
    ├── message/
    ├── attachment/
    └── {domain}/
```

### NEVER create request/response models in module-api or module-impl

```kotlin
// WRONG:
// module-communication/module-api/model/response/ConversationResponse.kt
package insight.c0x12c.communication.model.response
data class ConversationResponse(...)  // DON'T DO THIS

// CORRECT:
// module-client/response/conversation/ConversationResponse.kt
package insight.c0x12c.client.response.conversation
data class ConversationResponse(...)  // PUT IT HERE
```

### Import from module-client

```kotlin
// In ConversationManager.kt or any other file
import insight.c0x12c.client.response.conversation.ConversationResponse
import insight.c0x12c.client.request.conversation.CreateConversationRequest
```

### Add module-client dependency

```gradle
dependencies {
  implementation(project(":app:module-client"))
}
```

### Naming

| Type | Pattern | Example |
|------|---------|---------|
| Response | `{Entity}Response` | `ConversationResponse` |
| List response | `{Entity}ListResponse` | `ConversationListResponse` |
| Item in list | `{Entity}Item` | `ConversationItem` |
| Brief/summary | `{Entity}Brief` | `ContactBrief` |
| Request | `{Action}{Entity}Request` | `CreateConversationRequest` |

Why this matters:
- Single source of truth
- No sync issues between duplicates
- Clear ownership
- Easier refactoring

---

## Testing

### ALWAYS Use Retrofit Clients for API Tests

**Never construct raw HttpRequest objects for API endpoint testing.**

Use the Retrofit clients in `module-client` instead of building HTTP requests by hand.

Why:
- **Type safety**: Retrofit clients give compile-time type checking
- **Single source of truth**: API contracts are defined once in client interfaces
- **Consistency**: Tests use the same client code as production consumers
- **Maintainability**: API changes only need updates in one place
- **Discoverability**: IDE autocomplete shows all available endpoints

#### Bad - Raw HttpRequest Construction
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

#### Good - Retrofit Client Usage
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

All Retrofit clients are in `app/module-client/src/main/kotlin/insight/c0x12c/client/`:

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

## Specs Must Include Frontend

### Rule: Every spec that touches the UI MUST have a "Frontend Changes" section

When writing a spec (`/spec`), if the feature touches anything the user sees, you MUST include:

### What to put in the Frontend Changes section

1. **Files to change** - List every frontend file that needs edits (components, types, API clients, pages)
2. **TypeScript type changes** - Show the before/after for any type changes (interfaces, enums)
3. **Component changes** - Describe what each component gains or loses:
   - New UI elements (inputs, buttons, badges, columns)
   - Where they go in the layout (which card, which section, before/after what)
   - State management (new state? uses existing parent state?)
4. **API client changes** - New methods on the API client, with function signature
5. **UI behavior** - How the user interacts with the new stuff:
   - What triggers actions (click, enter key, toggle)
   - Validation (what's rejected, what error shows)
   - Save flow (which button, which API call)
   - Default values for new fields

### When does this apply?

- New API endpoint that returns data shown in UI
- Changes to existing API response shape (new fields)
- New config/settings the admin can change
- Any feature the user mentioned UI/UX for

### When does this NOT apply?

- Pure backend changes (scheduler fixes, sync logic, internal refactors)
- Features with no UI component at all

### Why this rule exists

Frontend gets forgotten in specs. Then during implementation, the FE work is vague and inconsistent. Specifying FE changes upfront means:
- The plan phase knows exactly which FE files to touch
- The implementation team doesn't have to guess UI layout
- Type changes are designed alongside API changes (no mismatches)
