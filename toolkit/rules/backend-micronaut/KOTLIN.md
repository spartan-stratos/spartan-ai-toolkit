# Kotlin Rules

> Full guide: use `/kotlin-best-practices` skill

## Null Safety (CRITICAL)

**The force unwrap operator `!!` is FORBIDDEN in this codebase.**

It causes runtime crashes, makes code unpredictable, and goes against Kotlin's null safety. There are no exceptions.

### What to Use Instead

**Safe call + elvis operator:**
```kotlin
val result = someNullableValue?.doSomething() ?: defaultValue
val email = decodedToken.email ?: return AuthError.INVALID_CREDENTIALS.asException().left()
```

**Explicit null check (enables smart cast):**
```kotlin
if (user == null) {
    return AuthError.AUTHENTICATION_FAILED.asException().left()
}
generateTokensAndResponse(user, provider.value) // user is non-null here
```

**Let scope function:**
```kotlin
user?.let { validUser ->
    generateTokensAndResponse(validUser, provider.value)
} ?: return AuthError.AUTHENTICATION_FAILED.asException().left()
```

**requireNotNull (only when null means a programming error):**
```kotlin
val validUser = requireNotNull(user) {
    "User must not be null at this point"
}
```

### Smart Casts

Use Kotlin's smart cast after null checks:
```kotlin
val user = userRepository.byId(userId)
if (user != null) {
    // user is automatically cast to non-null type here
    println(user.email) // No need for user?.email
}
```

### Codebase Examples

```kotlin
// Authentication Manager pattern
override suspend fun loginWithOAuth(request: OAuthLoginRequest): Either<ClientException, LoginResponse> {
    return transaction(db.primary) {
        val user = findOrCreateUser(request)

        // NEVER: generateTokensAndResponse(user!!, provider)
        // ALWAYS:
        if (user == null) {
            return@transaction AuthError.AUTHENTICATION_FAILED.asException().left()
        }
        generateTokensAndResponse(user, provider).right()
    }
}

// Repository pattern
override fun byId(id: UUID): UserEntity? {
    return transaction(db.replica) {
        UsersTable.selectAll()
            .where { UsersTable.id eq id }
            .singleOrNull()
            ?.let { convert(it) }  // Safe call chain
    }
}
```

---

## No Workarounds (CRITICAL)

**NEVER use workarounds. Always fix the root cause. This rule has no exceptions.**

### Forbidden: @Suppress Annotations

```kotlin
// WRONG
@Suppress("UNUSED_PARAMETER")
private fun createCommit(employeeId: UUID, authorUsername: String)

// CORRECT - Remove the unused parameter and update all call sites
private fun createCommit(authorUsername: String)
```

```kotlin
// WRONG
@Suppress("DEPRECATION")
fun oldMethod() { ... }

// CORRECT - Use the non-deprecated replacement
fun newMethod() { ... }
```

### Forbidden: Placeholder Parameters

```kotlin
// WRONG - Adding parameters "for future use"
fun process(data: String, reserved: String = "") { }

// CORRECT - Only include parameters you actually use
fun process(data: String) { }
```

### Forbidden: TODO Comments Instead of Fixes

```kotlin
// WRONG
// TODO: Fix this later
val result = unsafeOperation()!!

// CORRECT - Fix it now
val result = unsafeOperation() ?: return error
```

### Forbidden: Temporary Hacks

```kotlin
// WRONG
fun getUser(): User {
    // HACK: Direct DB access because manager is broken
    return database.query("SELECT * FROM users WHERE id = ?")
}

// CORRECT - Fix the manager or use proper layers
fun getUser(): User {
    return userManager.findById(id).throwOrValue()
}
```

### What to Do Instead

1. **Understand the root cause** - why does the warning/error exist?
2. **Fix the actual problem** - unused param? Remove it. Deprecated? Use replacement. Tests fail? Fix the tests.
3. **Update all related code** - method signature, all call sites, tests, docs, frontend if needed.
4. **Ask for clarification** if unsure about the correct approach.

### Real Examples

**Entity field removed** (e.g., `employeeId` removed from `GitHubCommitEntity`):
```kotlin
// WRONG
private fun createCommit(
  @Suppress("UNUSED_PARAMETER") employeeId: UUID,
  authorUsername: String
): GitHubCommitEntity

// CORRECT - Remove param AND update all call sites
private fun createCommit(authorUsername: String): GitHubCommitEntity
```

**Repository method renamed** (e.g., `byGithubOrg` -> `findByOrgLogin`):
```kotlin
// WRONG - Leave old test unchanged
@Test
fun `byGithubOrg - returns org-level credential`() { }

// CORRECT - Update test to use new method name
@Test
fun `findByOrgLogin - returns credential for org`() {
    val result = repository.findByOrgLogin("test-org")
}
```

| Situation | Wrong Approach | Correct Approach |
|-----------|---------------|------------------|
| Unused parameter | `@Suppress("UNUSED_PARAMETER")` | Remove the parameter |
| Deprecated method | `@Suppress("DEPRECATION")` | Use the replacement |
| Test failure | Skip or ignore test | Fix the test |
| Missing data | Hardcode placeholder | Add proper handling |
| API mismatch | Adapter/shim layer | Update all consumers |

---

## Error Handling

### Use Either for All Fallible Operations

Return `Either<ClientException, T>` from managers. Never throw exceptions in business logic.

```kotlin
suspend fun loginUser(email: String): Either<ClientException, User> {
    val user = userRepository.byEmail(email)
        ?: return ClientError.USER_NOT_FOUND.asException().left()
    return user.right()
}
```

```kotlin
// Good - return error type
fun validateEmail(email: String): Either<ValidationError, String> {
    return if (email.contains("@")) {
        email.right()
    } else {
        ValidationError.INVALID_EMAIL.left()
    }
}

// Bad - throwing exceptions
fun validateEmail(email: String): String {
    if (!email.contains("@")) {
        throw IllegalArgumentException("Invalid email")
    }
    return email
}
```

### Exhaustive When Expressions

Use exhaustive `when` on enums (no `else` needed if all cases covered):
```kotlin
when (provider) {
    OAuthProvider.GOOGLE -> handleGoogle()
    OAuthProvider.GITHUB -> handleGithub()
    OAuthProvider.TWITTER -> handleTwitter()
}
```

### Transaction Safety

Always return from transaction blocks and handle nullable results:
```kotlin
transaction(db.primary) {
    val user = userRepository.byId(userId)
    if (user == null) {
        return@transaction AuthError.USER_NOT_FOUND.asException().left()
    }
    return@transaction Success(user).right()
}
```

---

## Enum Usage

**NEVER hardcode strings when an enum exists.** Use `EnumName.VALUE.value` everywhere: return values, fallback values, comparisons, default values.

```kotlin
// WRONG - hardcoded string
ifLeft = { "critical" }
val status = "healthy"
if (value == "at_risk") { ... }

// CORRECT - use the enum
ifLeft = { HealthStatus.CRITICAL.value }
val status = HealthStatus.HEALTHY.value
if (value == HealthStatus.AT_RISK.value) { ... }
```

**Why**: Hardcoded strings break silently when enum values change. The compiler can't catch typos in strings.

**Known enums**: `HealthStatus`, `ReportType`, `EvaluationMode`, `ProjectRole`, `ProjectStatus`.

Convert String -> enum at boundaries (controllers). Use enum references everywhere else.

---

## Conversions

### Pattern: Companion Object Factory Methods

Put `companion object { fun from(entity) }` inside Response DTOs. **Never** create separate mapper files or private extension functions in managers.

```kotlin
// In module-client/response/...
data class UserResponse(
  val id: UUID,
  val email: String,
  val displayName: String,
  val createdAt: Instant
) {
  companion object {
    fun from(entity: UserEntity): UserResponse {
      return UserResponse(
        id = entity.id,
        email = entity.email,
        displayName = entity.displayName ?: entity.email,
        createdAt = entity.createdAt
      )
    }
  }
}
```

### When Extra Data is Needed

Pass extra data as additional parameters to `from()`:

```kotlin
data class VoiceQueueResponse(
  val id: UUID,
  val displayName: String,
  val overflowQueueName: String?,
  val agentCount: Int
) {
  companion object {
    fun from(
      entity: VoiceQueueEntity,
      overflowQueueName: String?,
      agentCount: Int
    ): VoiceQueueResponse {
      return VoiceQueueResponse(
        id = entity.id,
        displayName = entity.displayName,
        overflowQueueName = overflowQueueName,
        agentCount = agentCount,
      )
    }
  }
}
```

### Manager Helper for Extra Data Fetching

When extra data needs to be fetched, use a simple private helper that calls `Response.from()`:

```kotlin
class DefaultVoiceQueueAdminManager(...) {

  private fun toResponse(entity: VoiceQueueEntity): VoiceQueueResponse {
    val overflowName = entity.overflowQueueId?.let {
      voiceQueueRepository.byId(it)?.displayName
    }
    val agentCount = agentQueueMappingRepository.byQueueId(entity.id).size
    return VoiceQueueResponse.from(entity, overflowName, agentCount)
  }

  override suspend fun getQueue(id: UUID): Either<ClientException, VoiceQueueResponse> {
    val queue = voiceQueueRepository.byId(id) ?: return ...
    return toResponse(queue).right()
  }
}
```

### Shared Formatting Utilities

For commonly used formatting, define private file-level functions in the response file:

```kotlin
private val TIME_FORMATTER: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")
private fun formatTime(time: LocalTime?): String? = time?.format(TIME_FORMATTER)

data class ScheduleDayResponse(...) {
  companion object {
    fun from(entity: BusinessHoursDayEntity): ScheduleDayResponse {
      return ScheduleDayResponse(
        openTime = formatTime(entity.openTime),
        closeTime = formatTime(entity.closeTime)
      )
    }
  }
}
```

### What NOT to Do

```kotlin
// DON'T create separate mapper files
// mappers/UserMappers.kt
fun UserEntity.toResponse(): UserResponse = ...

// DON'T put conversion logic in Manager private extension functions
class DefaultUserManager {
  private fun UserEntity.toResponse(): UserResponse { ... }
}

// DON'T scatter conversion logic inline in multiple places
override suspend fun getUser(id: UUID) = UserResponse(id = entity.id, email = entity.email, ...)
override suspend fun listUsers() = users.map { UserResponse(id = it.id, email = it.email, ...) }
```

### File Location

Response DTOs with factory methods go in `module-client`:
```
module-client/src/main/kotlin/com/yourcompany/client/
+-- response/
    +-- user/
        +-- UserResponse.kt          # with companion object { fun from() }
    +-- conversation/
        +-- ConversationResponse.kt  # with companion object { fun from() }
```

`module-client` depends on `module-repository`, so Response DTOs can import Entity classes.

---

## Style

### Named Arguments
Use named arguments for 2+ parameters:
```kotlin
fn(a = x, b = y)
```

### Comments
Comments explain **WHY**, not **WHAT**. No KDoc that restates the function name.

```kotlin
// WRONG - useless comments
/**
 * Default implementation of [UserManager].
 * Provides CRUD operations for users with validation.
 */
class DefaultUserManager(...) : UserManager

/**
 * Validates a configuration value.
 * @param configKey The configuration key
 * @param value The value to validate
 * @return ValidationResult
 */
fun validate(configKey: String, value: JsonNode): ValidationResult
```

```kotlin
// CORRECT - no comments needed, code is self-explanatory
class DefaultUserManager(...) : UserManager

fun validate(configKey: String, value: JsonNode): ValidationResult
```

```kotlin
// CORRECT - comments that explain WHY
// Twilio requires E.164 format, strip any formatting
val normalized = phoneNumber.replace(Regex("[^+\\d]"), "")

// Cache for 5 minutes to reduce DB load during peak hours
val CACHE_TTL = 5.minutes
```

### Configuration URLs
Wrap default URL values in backticks in YAML:
```yaml
# Good
base-url: ${VENDOR_BASE_URL:`https://api.example.com`}

# Bad - may cause build errors
base-url: ${VENDOR_BASE_URL:https://api.example.com}
```

### Formatting
- **2-space indentation**, no tabs
- **LF line endings** (Unix style)
- **120 char** line length guide, 1000 hard limit
- UTF-8 encoding, final newline always
- No star imports (wildcard imports disabled)
- Import order: `*,java.*,javax.*,kotlin.*`

```kotlin
// Braces on same line
class MyClass {
  fun myFunction() {
    // code
  }
}

// Multiline parameters - aligned
fun longFunctionName(
  firstParameter: String,
  secondParameter: Int,
  thirdParameter: Boolean
) {
  // body
}
```

### Enforcement
```bash
./gradlew ktlintCheck     # Check style
./gradlew ktlintFormat    # Auto-fix style
```
