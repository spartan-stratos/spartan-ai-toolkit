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

### Overview

The architecture uses a **three-tier bean hierarchy** that makes modules reusable, testable, and maintainable through clear separation of concerns.

### Tier 1: Shared Beans (Foundation Infrastructure)

**Location**: `api-application/src/main/kotlin/com/yourcompany/runtime/factory/`

Shared beans are foundational infrastructure components at the BOTTOM of the dependency hierarchy.

**Characteristics**:
- Provide fundamental infrastructure (database, cache, messaging, configuration)
- NO dependencies on module beans or application beans
- Must be provided by the application (or test configuration)
- Should be mockable/replaceable for testing

**Standard Shared Beans**:
- `DatabaseContext` - Database connectivity
- `RedissonClient` / `JedisCluster` - Distributed caching and locking
- `AwsConfig` - AWS service configuration
- `ObjectMapper` - JSON serialization

**Example**: DatabaseFactory.kt
```kotlin
@Factory
class DatabaseFactory {
  @Singleton
  fun provideDatabaseContext(config: AppConfiguration.DatabaseConfig): DatabaseContext {
    return DatabaseContext.Builder(DatabaseConfig(/* ... */)).build(/* ... */)
  }
}
```

### Tier 2: Module Beans (Module-Level Reusable Components)

**Location**: `{module}/module-impl/src/main/kotlin/.../config/`

Module beans are reusable components within a specific module. They encapsulate module-specific logic and DEPEND ON shared beans only.

**Characteristics**:
- Created by module-level factories
- DEPEND ON shared beans ONLY (DatabaseContext, RedissonClient, etc.)
- Can be reused in other projects that need the same module
- Should NOT depend on other app modules (only core modules and shared beans)
- Provide the public API of the module via interfaces

**Example**: DurableJobFactory.kt
```kotlin
@Factory
class DurableJobFactory {
  @Bean
  fun postgresActivityStore(
    databaseContext: DatabaseContext,  // Shared bean
    config: DurableJobConfiguration
  ): ActivityStore {
    return PostgresActivityStore(databaseContext, config)
  }

  @Bean
  fun redisDistributedLock(
    redissonClient: RedissonClient,  // Shared bean
    config: DurableJobConfiguration
  ): DistributedLock {
    return RedisDistributedLock(redissonClient, config)
  }
}
```

**Key**: Module doesn't know or care if it's using production or test shared beans - it just depends on the interface.

### Tier 3: Application Beans (Application-Specific Business Logic)

**Location**: `app/module-{name}/module-impl/src/main/kotlin/.../runtime/factory/`

Application beans are application-specific implementations that use module beans and shared beans for business logic unique to this application.

**Characteristics**:
- Created by application-specific factories within the module
- DEPEND ON both shared beans AND module beans
- Contain business logic specific to this application
- Wire together repositories, managers, and services
- NOT intended to be reused in other projects
- At the TOP of the dependency hierarchy

**Example**: AuthFactory.kt
```kotlin
@Factory
class AuthFactory {
  @Singleton
  @Requires(bean = FirebaseAuth::class)
  fun provideAuthManager(
    firebaseAuth: FirebaseAuth,
    userRepository: UserRepository,
    refreshTokensRepository: RefreshTokensRepository,
    databaseContext: DatabaseContext,  // Shared bean
    featureFlagManager: FeatureFlagManager
  ): AuthManager = DefaultAuthManager(/* ... */)

  @Singleton
  fun provideRefreshTokensRepository(db: DatabaseContext): RefreshTokensRepository {
    return DefaultRefreshTokensRepository(db)
  }
}
```

### Bean Dependency Flow

**The dependency flow goes UPWARD - higher tier beans depend on lower tier beans.**

```
┌────────────────────────────────────────────────────────┐
│         Application Beans (Top Tier)                   │
│  (AuthManager, UserManager, PaymentManager, etc.)      │
│  DEPENDS ON: Module Beans + Shared Beans               │
└──────────────────────────┬─────────────────────────────┘
                           │ depends on
                           ▼
┌────────────────────────────────────────────────────────┐
│         Module Beans (Middle Tier)                     │
│  (ActivityRuntime, DistributedLock, EventStore, etc.)  │
│  DEPENDS ON: Shared Beans ONLY                         │
└──────────────────────────┬─────────────────────────────┘
                           │ depends on
                           ▼
┌────────────────────────────────────────────────────────┐
│         Shared Beans (Bottom Tier - Foundation)        │
│  (DatabaseContext, RedissonClient, AwsConfig, etc.)    │
│  PROVIDED BY: Application (prod) OR Test Config (test) │
│  DEPENDS ON: Nothing (foundation layer)                │
└────────────────────────────────────────────────────────┘
```

**Key Points**:
1. Shared beans are at the BOTTOM - they have no dependencies on other beans
2. Module beans depend on shared beans ONLY
3. Application beans depend on both module beans and shared beans
4. Shared beans can be provided by production application or test configuration

### Bean Creation Rules

#### 1. Always Use @Factory Classes

```kotlin
// ✓ Good
@Factory
class UserFactory {
  @Singleton
  fun provideUserRepository(db: DatabaseContext): UserRepository {
    return DefaultUserRepository(db)
  }
}

// ❌ Bad - Don't annotate implementation directly
@Singleton
class DefaultUserRepository(private val db: DatabaseContext) : UserRepository
```

**Why**: Factories give centralized configuration, easy test replacement, and clear dependency management.

**Exception**: `ServiceConnectionQueueProcessor` MUST use `@Singleton` directly (for `@Scheduled`).

#### 2. Depend on Abstractions, Not Implementations

```kotlin
// ✓ Good
@Singleton
fun provideAuthManager(
  userRepository: UserRepository,  // Interface
  featureFlagManager: FeatureFlagManager  // Interface
): AuthManager

// ❌ Bad
fun provideAuthManager(
  userRepository: DefaultUserRepository,  // Concrete class - don't do this!
  ...
)
```

#### 3. Use @Named for Multiple Implementations

```kotlin
@Singleton
@Named("jwtAuthorizationValidator")
fun provideJwtAuthorizationValidator(/* ... */): AuthorizationValidator {
  return JwtAuthorizationValidator(/* ... */)
}

@Singleton
@Named("apiKeyAuthorizationValidator")
fun provideApiKeyAuthorizationValidator(/* ... */): AuthorizationValidator {
  return ApiKeyAuthorizationValidator(/* ... */)
}

// Use with @Named injection
@Singleton
fun provideChain(
  @Named("jwtAuthorizationValidator") jwtValidator: AuthorizationValidator,
  @Named("apiKeyAuthorizationValidator") apiKeyValidator: AuthorizationValidator
): AuthorizationValidator.Chain
```

#### 4. Use @Primary for Default Implementations

```kotlin
@Singleton
@Primary
fun provideJedisCluster(config: RedisConfig): JedisCluster {
  return JedisFactory.cluster(/* ... */)
}
```

#### 5. Use @Requires for Conditional Bean Creation

```kotlin
@Singleton
@Requires(bean = FirebaseAuth::class)  // Only create if FirebaseAuth exists
fun provideAuthManager(firebaseAuth: FirebaseAuth, /* ... */): AuthManager
```

#### 6. Avoid Circular Dependencies

**Bad**: BeanA depends on BeanB, BeanB depends on BeanA

**Good**: Introduce an intermediary (EventBus, interface, etc.) or refactor the design

### Testing Strategy: Bean Replacement

The key to testability is that **shared beans can be replaced in tests**, letting modules work with test implementations.

#### Level 1: Replace Shared Beans

Replace shared beans with test implementations (in-memory database, mock redis).

```kotlin
@MicronautTest(environments = ["test"])
class ModuleTest {

  @Factory
  class TestConfiguration {
    @Singleton
    @Replaces(DatabaseContext::class)
    fun testDatabaseContext(): DatabaseContext {
      return InMemoryDatabaseContext()  // Test implementation
    }

    @Singleton
    @Replaces(RedissonClient::class)
    fun testRedisClient(): RedissonClient {
      return MockRedissonClient()  // Test implementation
    }
  }

  @Test
  fun `module works with test shared beans`() {
    // Module beans automatically use test shared beans
  }
}
```

#### Level 2: Replace Module Beans

```kotlin
@Bean
@Replaces(ActivityRuntime::class)
fun customActivityRuntime(/* ... */): ActivityRuntime {
  return CustomTestActivityRuntime(/* ... */)
}
```

#### Level 3: Replace Application Beans

```kotlin
@Singleton
@Replaces(AgentManager::class)
fun provideAgentManager(/* ... */): AgentManager {
  return DefaultDummyAgentManager(/* ... */)
}
```

**Key Pattern**: Tests use `@Replaces` annotation to swap out beans at any tier, and all higher-tier beans automatically use the replacement.

### File Naming and Location Conventions

#### Shared Beans (Production)
- **Location**: `api-application/src/main/kotlin/com/yourcompany/runtime/factory/`
- **Naming**: `{Purpose}Factory.kt` (e.g., `DatabaseFactory.kt`, `RedisFactory.kt`)

#### Shared Beans (Test)
- **Location**: Within test classes using `@Factory` inner class
- **Naming**: `TestConfiguration` class inside test class

#### Module Beans (Core Modules)
- **Location**: `core/module-{name}/module-impl/src/main/kotlin/com/yourcompany/{module}/config/`
- **Naming**: `{ModuleName}Factory.kt` (e.g., `DurableJobFactory.kt`)

#### Module Beans (App Modules - if reusable)
- **Location**: `module-{name}/module-impl/src/main/kotlin/com/yourcompany/{module}/config/`
- **Naming**: `{ModuleName}Factory.kt`

#### Application Beans (App Modules)
- **Location**: `module-{name}/module-impl/src/main/kotlin/com/yourcompany/runtime/factory/`
- **Naming**: `{ModuleName}Factory.kt` (e.g., `AuthFactory.kt`, `UserFactory.kt`)

### Bean Lifecycle and Scope

#### @Singleton (Default - Use This)
Most beans should be singletons to avoid unnecessary object creation.

```kotlin
@Singleton
fun provideUserRepository(db: DatabaseContext): UserRepository
```

#### @Prototype (Rarely Used)
Only use when you need a new instance for each injection point.

```kotlin
@Prototype
fun provideHttpClient(): HttpClient
```

#### @RequestScope (Controllers Only)
Use for beans that should be created per HTTP request.

```kotlin
@RequestScope
fun provideRequestContext(request: HttpRequest<*>): RequestContext
```

### Common Bean Patterns

#### Pattern 1: Repository Creation

Repositories depend only on `DatabaseContext`.

```kotlin
@Factory
class RepositoryFactory {
  @Singleton
  fun provideUserRepository(db: DatabaseContext): UserRepository {
    return DefaultUserRepository(db)
  }
}
```

#### Pattern 2: Manager Creation

Managers orchestrate business logic and depend on repositories and services.

```kotlin
@Factory
class ManagerFactory {
  @Singleton
  fun provideUserManager(
    userRepository: UserRepository,
    userSessionHandler: UserSessionHandler
  ): UserManager {
    return DefaultUserManager(userRepository, userSessionHandler)
  }
}
```

#### Pattern 3: Service Composition

Complex services composed of multiple dependencies, often with qualifiers.

```kotlin
@Factory
class ModuleAiFactory {
  @Singleton
  @OpenAi4O  // Qualifier annotation
  fun provideOpenAi4OChatService(
    openAiConfig: OpenAiConfig,
    effectiveListener: SpanChatModelListener
  ): ChatService {
    return OpenAiChatService(/* ... */)
  }

  @Singleton
  @Claude35Sonnet20241022  // Different qualifier
  fun provideClaude35Sonnet20241022ChatService(
    anthropicConfig: AnthropicConfig,
    effectiveListener: SpanChatModelListener
  ): ChatService {
    return AnthropicChatService(/* ... */)
  }
}
```

#### Pattern 4: Bean Event Listener (Special Case)

For configuring existing beans created by frameworks.

```kotlin
@Singleton
class JacksonFactory : BeanCreatedEventListener<ObjectMapper> {
  override fun onCreated(event: BeanCreatedEvent<ObjectMapper>): ObjectMapper {
    return event.bean.configured()  // Apply custom configuration
  }
}
```

### Migration Guide: Converting Direct Beans to Factory Beans

**Before** (Wrong):
```kotlin
@Singleton
class DefaultUserRepository(private val db: DatabaseContext) : UserRepository
```

**After** (Correct):

Create factory:
```kotlin
// In runtime/factory/UserFactory.kt
@Factory
class UserFactory {
  @Singleton
  fun provideUserRepository(db: DatabaseContext): UserRepository {
    return DefaultUserRepository(db)
  }
}
```

Update implementation:
```kotlin
// Remove @Singleton annotation from implementation
class DefaultUserRepository(private val db: DatabaseContext) : UserRepository {
  // implementation
}
```

### Common Bean Mistakes to Avoid

| Mistake | Wrong | Right |
|---------|-------|-------|
| @Singleton on implementation | `@Singleton class DefaultUserRepo` | Create a factory instead |
| Depending on concrete classes | `fun provide(repo: DefaultUserRepo)` | Depend on interface: `UserRepo` |
| Circular dependencies | BeanA → BeanB → BeanA | Introduce intermediary or refactor |
| Mixing prod and test beans | Test beans in production factory | Put test beans in TestConfiguration |
| Not making beans replaceable | `object SingletonManager { ... }` | Use Micronaut DI with @Factory |
| Wrong tier dependencies | Module bean depending on app bean | Follow strict tier hierarchy |

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
- [ ] No circular dependencies
- [ ] Bean is testable (can be replaced with `@Replaces`)
