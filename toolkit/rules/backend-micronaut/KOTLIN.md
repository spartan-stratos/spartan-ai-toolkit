# Kotlin Rules

> Full guide: use `/kotlin-best-practices` skill

## Null Safety (CRITICAL)

**The force unwrap operator `!!` is FORBIDDEN in this codebase.**

It causes runtime crashes, makes code unpredictable, and goes against Kotlin's null safety. There are no exceptions.

### What to Use Instead

```kotlin
// Safe call + elvis
val email = decodedToken.email ?: return AuthError.INVALID_CREDENTIALS.asException().left()

// Null check (enables smart cast)
if (user == null) {
    return AuthError.AUTHENTICATION_FAILED.asException().left()
}
generateTokensAndResponse(user, provider.value) // user is non-null here

// requireNotNull (only when null = programming error)
val validUser = requireNotNull(user) { "User must not be null here" }
```

---

## No Workarounds (CRITICAL)

**NEVER use workarounds. Always fix the root cause. This rule has no exceptions.**

**Forbidden patterns:**

| Pattern | Instead |
|---------|---------|
| `@Suppress("UNUSED_PARAMETER")` | Remove the parameter, update call sites |
| `@Suppress("DEPRECATION")` | Use the non-deprecated replacement |
| `// TODO: Fix this later` + `!!` | Fix it now with proper null handling |
| `// HACK:` comments | Fix the root cause using proper layers |
| Placeholder parameters `reserved: String = ""` | Only include parameters you use |

```kotlin
// WRONG
@Suppress("UNUSED_PARAMETER")
private fun createCommit(employeeId: UUID, authorUsername: String)

// CORRECT — remove unused param, update all call sites
private fun createCommit(authorUsername: String)
```

**Always**: understand root cause, fix actual problem, update all related code (call sites, tests, docs).

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

Put `companion object { fun from(entity) }` inside Response DTOs. **Never** create separate mapper files or private extension functions.

```kotlin
data class UserResponse(val id: UUID, val email: String, val displayName: String) {
  companion object {
    fun from(entity: UserEntity) = UserResponse(
      id = entity.id,
      email = entity.email,
      displayName = entity.displayName ?: entity.email
    )
  }
}
```

When extra data needed, pass as additional params: `fun from(entity, extraData, count)`.
When extra data needs fetching, use a private manager helper that calls `Response.from()`.

**Never do:** separate mapper files, private extension functions in managers, scattered inline mapping.

**Location:** Response DTOs go in `module-client/response/`. `module-client` depends on `module-repository`.

---

## Style

### No Magic Numbers

Never hardcode durations, timeouts, limits. Put them in `application.yml` and inject via config class.

```kotlin
// WRONG
val expiresAt = Instant.now().plus(7, ChronoUnit.DAYS)
val maxRetries = 3

// CORRECT
val expiresAt = Instant.now().plusSeconds(tokenConfig.refreshTokenExpirationSeconds)
val maxRetries = appConfig.maxRetries
```

### No Inline Fully-Qualified Imports

Always use `import` at the top. Never write fully-qualified class names inline.

```kotlin
// WRONG
val token = java.util.UUID.randomUUID().toString()

// CORRECT
import java.util.UUID
val token = UUID.randomUUID().toString()
```

### Config Objects Over Individual Fields

Inject the config object. Don't unpack fields into separate constructor params.

```kotlin
// WRONG — too many params, fragile
class AuthManager(
  private val refreshTokenExpirationSeconds: Long,
  private val passwordResetExpirationSeconds: Long,
  private val emailVerificationExpirationSeconds: Long
)

// CORRECT — one config object
class AuthManager(
  private val tokenExpirationConfig: TokenExpirationConfig
)
```

### JSON Naming

Backend uses `snake_case` for all JSON. Jackson does this automatically.
Kotlin code stays `camelCase` — Jackson converts at serialization time.

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
