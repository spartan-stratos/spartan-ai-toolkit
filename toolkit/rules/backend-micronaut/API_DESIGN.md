# API Design Rules

> Full guide: use `/backend-api-design` or `/testing-strategies` skill

---

## RPC Style — No REST Verbs

All mutations use `@Post`. Never use `@Put`, `@Delete`, or `@Patch`.

| Action | HTTP Method | Example |
|--------|-------------|---------|
| Read one | `@Get` | `@Get("/item")` |
| Read list (paginated) | `@Post("/list")` | `@Post("/list")` with body |
| Create | `@Post` | `@Post` |
| Update | `@Post("/update")` | `@Post("/update")` |
| Delete | `@Post("/delete")` | `@Post("/delete")` |
| Custom action | `@Post("/close")` | `@Post("/close")` |

### Bad — REST Verbs (NEVER use these)

```kotlin
// ❌ BAD — REST verbs
@Patch("/{id}")
suspend fun update(@PathVariable id: UUID, @Body request: UpdateRequest): Response

@Delete("/{id}")
suspend fun delete(@PathVariable id: UUID): Boolean

@Put("/{id}")
suspend fun replace(@PathVariable id: UUID, @Body request: ReplaceRequest): Response
```

### Good — RPC-Style

```kotlin
// ✅ GOOD — RPC-style
@Post("/update")
suspend fun update(@QueryValue id: UUID, @Body request: UpdateRequest): Response

@Post("/delete")
suspend fun delete(@QueryValue id: UUID): Boolean
```

---

## List Endpoints — POST with offset/limit (CRITICAL)

**All paginated list endpoints MUST use `@Post("/list")` with a request body containing `offset: Long` and `limit: Int`.**

**NEVER use `@Get` with `page: Int` and `size: Int` query parameters.**

### Why This Is Critical

- `offset/limit` is precise — you know exactly which records you're fetching
- `page/size` requires calculation and can lead to off-by-one errors
- POST with body allows complex filters, sorting, and search without URL length limits
- Consistent pattern across entire codebase

### Bad — @Get with page/size Query Parameters

```kotlin
// ❌ BAD — @Get with page/size query params
@Get("/bounties")
suspend fun listBounties(
  @QueryValue page: Int?,
  @QueryValue size: Int?
): PaginationData<BountyResponse>

// ❌ BAD — Manager with page/size
suspend fun list(page: Int, size: Int): PaginationData<Bounty>
```

### Good — @Post with offset/limit Request Body

```kotlin
// ✅ GOOD — @Post("/list") with request body
@Post("/list")
suspend fun listBounties(
  authentication: Authentication,
  @Valid @Body request: BountyListRequest
): PaginationData<BountyResponse>

// ✅ GOOD — Request DTO implements PageableRequest
@Serdeable
@Introspected
data class BountyListRequest(
  val filter: BountyFilter? = null,
  val sort: BountySort? = null,
  val search: String? = null,
  @field:Min(0)
  override val offset: Long = 0,
  @field:Min(1)
  override val limit: Int = 100
) : PageableRequest

// ✅ GOOD — Manager with offset/limit
suspend fun list(
  filter: BountyFilter?,
  sort: BountySort?,
  search: String?,
  offset: Long,
  limit: Int
): Either<ClientException, PaginationData<BountyResponse>>
```

### PageableRequest Interface

All list request DTOs should implement this interface:

```kotlin
interface PageableRequest {
  val offset: Long  // Starting position (0-based)
  val limit: Int    // Number of items to return
}
```

### Quick Reference

| Pattern | Status |
|---------|--------|
| `@Get` with `page/size` query params | ❌ NEVER |
| `@Post("/list")` with `offset/limit` in body | ✅ ALWAYS |
| Manager methods with `page: Int, size: Int` | ❌ NEVER |
| Manager methods with `offset: Long, limit: Int` | ✅ ALWAYS |

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

Required vs optional query parameters (for single-resource GETs):

```kotlin
// Required parameter - no default, will fail if missing
@Get("/employee")
suspend fun getEmployee(
  @QueryValue id: UUID  // Required - no ? nullable
): EmployeeResponse
```

Paginated list endpoints use POST with request body (see "List Endpoints" section above):

```kotlin
// ✅ CORRECT — POST with request body for lists
@Post("/list")
suspend fun listEmployees(
  @Valid @Body request: EmployeeListRequest
): PaginationData<EmployeeResponse>

// Request DTO
@Serdeable
@Introspected
data class EmployeeListRequest(
  val search: String? = null,
  val status: EmployeeStatus? = null,
  @field:Min(0)
  override val offset: Long = 0,
  @field:Min(1)
  override val limit: Int = 100
) : PageableRequest

// Response wrapper
data class PaginationData<T>(
  val items: List<T>,
  val total: Long,
  val offset: Long,
  val limit: Int,
  val hasMore: Boolean
)
```

### Quick Reference

| Rule | Example |
|------|---------|
| No path params | `@Get("/employee")` with `@QueryValue id` |
| List endpoints | `@Post("/list")` with `offset/limit` in body |
| Singular for single | `@Get("/employee")` |
| Actions as sub-paths | `@Post("/employee/delete")` |
| Query params for all IDs | `?id=xxx` not `/{id}` |

---

## Model Location

### Rule: All API models live in `module-client` ONLY

**NEVER duplicate request or response models across modules.**

```
module-client/src/main/kotlin/com/yourcompany/client/
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
package com.yourcompany.communication.model.response
data class ConversationResponse(...)  // DON'T DO THIS

// CORRECT:
// module-client/response/conversation/ConversationResponse.kt
package com.yourcompany.client.response.conversation
data class ConversationResponse(...)  // PUT IT HERE
```

### Import from module-client

```kotlin
// In ConversationManager.kt or any other file
import com.yourcompany.client.response.conversation.ConversationResponse
import com.yourcompany.client.request.conversation.CreateConversationRequest
```

### Add module-client dependency

```gradle
dependencies {
  implementation(project(":module-client"))
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

### Request Validation Annotations

All required fields in request DTOs MUST have validation annotations:

```kotlin
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull

data class CreateItemRequest(
  @field:NotBlank(message = "name is required")
  val name: String,                                // String → @field:NotBlank

  @field:NotNull(message = "amount is required")
  val amount: BigDecimal,                          // Non-String → @field:NotNull

  val note: String? = null                         // Optional → no annotation
)
```

**Message format:** snake_case field name + " is required" (e.g., `"participant_id is required"`).

Response DTOs do NOT need validation annotations.

Why this matters:
- Single source of truth
- No sync issues between duplicates
- Clear ownership
- Easier refactoring

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
