# Service Layer and Bean Management

## Service Layer Rules

### Core Principle

**Services fetch data. Managers persist data.**

### Services MUST NOT Call Repositories

```kotlin
// ❌ WRONG - Service calling repository
class DefaultGitHubSyncService(
  private val commitRepository: GitHubCommitRepository,  // NO!
  private val prRepository: GitHubPullRequestRepository  // NO!
) : GitHubSyncService {

  override suspend fun syncCommits(org: String) {
    val commits = gitHubClient.fetchCommits(org)
    commitRepository.insert(...)  // Services should NOT do this!
  }
}

// ✓ CORRECT - Service returns data, Manager persists
class DefaultGitHubDataFetcher(
  private val gitHubClient: GitHubGraphQLClient,
  private val identityResolver: IdentityResolver
) : GitHubDataFetcher {

  override suspend fun fetchCommits(org: String): Either<ClientException, List<GitHubCommitData>> {
    val commits = gitHubClient.fetchCommits(org)
    return commits.map { it.toData(identityResolver) }.right()  // Return DTOs!
  }
}
```

### Services Return DTOs, Not Entities

Services should return data transfer objects that represent fetched data:

```kotlin
// DTO returned by service
data class GitHubCommitData(
  val sha: String,
  val authorUsername: String?,
  val employeeId: UUID?,  // Resolved by service
  val committedAt: Instant,
  val additions: Int,
  val deletions: Int
)

// Manager converts DTO to Entity for persistence
class DefaultGitHubSyncManager(...) : GitHubSyncManager {

  override suspend fun syncCommits(org: String) {
    val commitData = dataFetcher.fetchCommits(org)
      .fold({ return it.left() }, { it })

    for (data in commitData) {
      val entity = GitHubCommitEntity(
        sha = data.sha,
        employeeId = data.employeeId,
        // ...
      )
      commitRepository.insert(entity)  // Manager does persistence
    }
  }
}
```

### Service Allowed Dependencies

| Allowed | Not Allowed |
|---------|-------------|
| External API clients (GitHubGraphQLClient, SlackClient) | Repositories |
| Identity resolvers (for mapping external IDs) | Database context |
| Configuration classes | Transaction management |
| Logging | Other managers |
| Token providers | |

### Manager Allowed Dependencies

| Allowed | Not Allowed |
|---------|-------------|
| Repositories | External API clients (use Services instead) |
| Services | Direct HTTP calls |
| Other managers | |
| Database context | |
| Distributed locks | |

### Data Flow Examples

#### Correct: Manager Orchestrates, Service Fetches

```
1. Controller receives sync request
         ↓
2. Manager.syncCommits() called
         ↓
3. Manager calls Service.fetchCommits()
         ↓
4. Service calls GitHubGraphQLClient
         ↓
5. Service resolves identities
         ↓
6. Service returns List<GitHubCommitData>
         ↓
7. Manager iterates data, calls Repository.insert()
         ↓
8. Manager updates sync cursor
         ↓
9. Manager returns SyncResult to Controller
```

#### Wrong: Service Does Everything

```
1. Controller receives sync request
         ↓
2. Service.syncCommits() called
         ↓
3. Service calls GitHubGraphQLClient
         ↓
4. Service calls Repository.insert()  ← VIOLATION!
         ↓
5. Service returns SyncResult
```

### Naming Conventions

| Layer | Interface Suffix | Implementation Prefix | Example |
|-------|------------------|----------------------|---------|
| Service | `*Fetcher` or `*Service` (readonly) | `Default*` | `GitHubDataFetcher` / `DefaultGitHubDataFetcher` |
| Manager | `*Manager` | `Default*` | `GitHubSyncManager` / `DefaultGitHubSyncManager` |
| Repository | `*Repository` | `Default*` | `GitHubCommitRepository` / `DefaultGitHubCommitRepository` |

### When to Use Service vs Manager

#### Use Service (Fetcher) When:
- Calling external APIs (GitHub, Slack, Notion, Atlas)
- Transforming external data formats
- Resolving identities (external ID → employee_id)
- No database writes needed

#### Use Manager When:
- Orchestrating multiple operations
- Persisting data to database
- Managing transactions
- Business logic that needs DB state
- Distributed locking

### Refactoring Guide: Service Calling Repositories

When you find a Service calling repositories:

1. **Create a new Manager interface** that defines the operation
2. **Create a new Fetcher interface** for the external data fetch
3. **Move DB operations to Manager**
4. **Move API calls to Fetcher**
5. **Manager calls Fetcher, then Repository**

#### Before (Wrong)
```kotlin
class DefaultSyncService(
  private val apiClient: ExternalApiClient,
  private val repository: DataRepository  // ← Problem
) : SyncService {

  override suspend fun sync() {
    val data = apiClient.fetch()
    repository.insert(data)  // ← Service doing persistence
  }
}
```

#### After (Correct)
```kotlin
// Service: Fetch only
class DefaultDataFetcher(
  private val apiClient: ExternalApiClient
) : DataFetcher {

  override suspend fun fetch(): List<DataDTO> {
    return apiClient.fetch().map { it.toDTO() }
  }
}

// Manager: Orchestrate and persist
class DefaultSyncManager(
  private val fetcher: DataFetcher,
  private val repository: DataRepository
) : SyncManager {

  override suspend fun sync() {
    val data = fetcher.fetch()
    repository.insertAll(data.map { it.toEntity() })
  }
}
```

---

## Bean Management (3-Tier Hierarchy)

```
Application Beans (top)    — business logic, depends on module + shared
       ↓
Module Beans (middle)      — reusable module components, depends on shared only
       ↓
Shared Beans (bottom)      — infrastructure (DB, Redis, AWS), no dependencies
```

### Bean Creation Rules

1. **Always use `@Factory` classes** — never `@Singleton` on implementations directly
2. **Depend on interfaces**, not concrete classes
3. **`@Named`** for multiple implementations of same interface
4. **`@Primary`** for default implementation
5. **`@Requires`** for conditional bean creation
6. **No circular dependencies** — fix with interface extraction (see below)

```kotlin
// CORRECT — Factory pattern
@Factory
class UserFactory {
  @Singleton
  fun provideUserRepository(db: DatabaseContext): UserRepository {
    return DefaultUserRepository(db)
  }
}

// WRONG — @Singleton on implementation
@Singleton
class DefaultUserRepository(private val db: DatabaseContext) : UserRepository
```

### Bean Testing

Use `@Replaces` to swap beans at any tier in tests:
```kotlin
@Singleton
@Replaces(DatabaseContext::class)
fun testDatabaseContext(): DatabaseContext = InMemoryDatabaseContext()
```

### Bean Scope

- `@Singleton` — default, use this for most beans
- `@Prototype` — rare, new instance per injection
- `@RequestScope` — per HTTP request, controllers only

---

## Enforcement Checklists

### Service Layer Checklist

- [ ] Services have NO repository imports
- [ ] Services have NO `insert`, `update`, `delete` calls
- [ ] Services return DTOs, not entities
- [ ] Managers handle all DB operations
- [ ] Managers wrap DB operations in transactions
- [ ] External API calls go through Services, not Managers

### Bean Checklist

- [ ] Determine tier: Shared / Module / Application
- [ ] Create `@Factory` class with right naming
- [ ] Define bean method with `@Singleton` (or right scope)
- [ ] Inject dependencies via method parameters
- [ ] Verify dependency direction (no upward dependencies)
- [ ] Return interface type, not concrete implementation
- [ ] Use `@Named` for multiple implementations
- [ ] Use `@Primary` for default implementation
- [ ] Use `@Requires` for conditional creation
- [ ] No circular dependencies (see "Breaking Circular Dependencies" below)
- [ ] Bean is testable (can be replaced with `@Replaces`)

---

## Breaking Circular Dependencies

`Provider<T>` for lazy initialization is a code smell for a circular dependency. Fix the root cause.

### The Problem

```
ProjectManager → WorkspaceManager → SomeService → ProjectManager  (cycle!)
```

**Bad workaround:**
```kotlin
// Provider<T> hides the cycle — DON'T DO THIS
class DefaultProjectManager(
  private val workspaceManagerProvider: Provider<WorkspaceManager>,  // Lazy
) : ProjectManager
```

### The Fix: Interface Extraction + Layer Split

**Step 1** — Find the shared functionality causing the cycle.

**Step 2** — Extract it into a focused interface:
```kotlin
interface ProjectThumbnailResolver {
  suspend fun resolveProjectThumbnailUrl(entity: ProjectEntity): String?
}
```

**Step 3** — Move the logic to a new component with lower-level dependencies:
```kotlin
class DefaultProjectThumbnailResolver(
  private val storageService: StorageService  // No cycle
) : ProjectThumbnailResolver { ... }
```

**Step 4** — Inject directly, no Provider needed:
```kotlin
class DefaultProjectManager(
  private val workspaceManager: WorkspaceManager,         // Direct injection
  private val projectThumbnailResolver: ProjectThumbnailResolver  // New!
) : ProjectManager
```

**Rule:** If you reach for `Provider<T>`, stop. Extract the shared functionality into its own interface at a lower layer.
