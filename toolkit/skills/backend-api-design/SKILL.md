---
name: backend-api-design
description: Design RPC-style APIs with layered architecture (Controller → Manager → Repository). Use when creating new API endpoints, designing API contracts, or reviewing API patterns.
---

# Backend API Design — Quick Reference

## URL Patterns

```
GET  /api/v1/employees              # List (plural)
GET  /api/v1/employee               # Get one (?id=xxx)
POST /api/v1/employee               # Create
POST /api/v1/employee/update        # Update (?id=xxx)
POST /api/v1/employee/delete        # Soft delete (?id=xxx)
POST /api/v1/employee/restore       # Restore (?id=xxx)
POST /api/v1/sync/employees         # Action
```

## Hard Rules

- **NO path params** — always `@QueryValue`, never `@PathVariable`
- **Singular for single resource** — `/employee` not `/employees/{id}`
- **Plural for collections** — `/employees`
- **Verb sub-paths for actions** — `/delete`, `/restore`, `/sync`

## Controller Template

```kotlin
@ExecuteOn(TaskExecutors.IO)    // REQUIRED for suspend
@Validated
@Controller("/api/v1/admin")
@Secured(OAuthSecurityRule.ADMIN)
class EmployeeController(
  private val employeeManager: EmployeeManager  // Managers ONLY
) {
  @Get("/employee")
  suspend fun getEmployee(@QueryValue id: UUID): EmployeeResponse {
    return employeeManager.findById(id).throwOrValue()
  }

  @Get("/employees")
  suspend fun listEmployees(
    @QueryValue page: Int?,
    @QueryValue limit: Int?,
    @QueryValue status: String?
  ): EmployeeListResponse {
    return employeeManager.list(
      page = page ?: 1,
      limit = (limit ?: 20).coerceAtMost(100),
      status = status
    ).throwOrValue()
  }
}
```

## Layered Architecture

```
Controller  →  thin, just delegates
    ↓
Manager     →  business logic, transactions, Either returns
    ↓
Repository  →  data access only, no business logic
```

### Controller: Thin Wrapper
- Parse query params with defaults
- Delegate to manager
- Unwrap Either with `.throwOrValue()`
- NO business logic, NO repository access

### Manager: Business Logic
- Returns `Either<ClientException, T>`
- Wraps DB ops in `transaction(db.primary) { }`
- Orchestrates multiple repositories
- Validates business rules

### Repository: Data Access
- Returns entities or null
- `db.replica` for reads, `db.primary` for writes
- Always checks `deletedAt.isNull()`

## Response Models

All in `module-client/response/{domain}/`:

```kotlin
data class EmployeeResponse(
  val id: UUID,
  val name: String,
  val email: String,
  val status: String,
  val createdAt: Instant
) {
  companion object {
    fun from(entity: EmployeeEntity) = EmployeeResponse(
      id = entity.id,
      name = entity.name,
      email = entity.email,
      status = entity.status,
      createdAt = entity.createdAt
    )
  }
}

data class EmployeeListResponse(
  val items: List<EmployeeResponse>,
  val total: Int,
  val page: Int,
  val limit: Int,
  val hasMore: Boolean
)
```

## Pagination Pattern

```kotlin
override suspend fun list(
  page: Int,
  limit: Int,
  status: String?
): Either<ClientException, EmployeeListResponse> {
  val offset = (page - 1) * limit

  val (items, total) = transaction(db.replica) {
    val query = EmployeesTable
      .selectAll()
      .where { EmployeesTable.deletedAt.isNull() }

    if (status != null) {
      query.andWhere { EmployeesTable.status eq status }
    }

    val total = query.count().toInt()
    val items = query
      .orderBy(EmployeesTable.createdAt to SortOrder.DESC)
      .limit(limit)
      .offset(offset.toLong())
      .map { convert(it) }

    items to total
  }

  return EmployeeListResponse(
    items = items.map { EmployeeResponse.from(it) },
    total = total,
    page = page,
    limit = limit,
    hasMore = (page * limit) < total
  ).right()
}
```

## Error Pattern

```kotlin
// Not found
val entity = repository.byId(id)
  ?: return ClientError.NOT_FOUND.asException().left()

// Already exists
val existing = repository.byEmail(email)
if (existing != null) {
  return ClientError.ALREADY_EXISTS.asException().left()
}

// Validation
if (request.name.isBlank()) {
  return ClientError.INVALID_INPUT.asException("Name is required").left()
}
```

## Factory Bean

```kotlin
@Factory
class EmployeeManagerFactory {
  @Singleton
  fun provideEmployeeManager(
    employeeRepository: EmployeeRepository,
    db: DatabaseContext
  ): EmployeeManager {
    return DefaultEmployeeManager(employeeRepository, db)
  }
}
```
