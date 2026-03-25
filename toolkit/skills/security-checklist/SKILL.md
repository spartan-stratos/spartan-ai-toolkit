---
name: security-checklist
description: Security best practices for Micronaut/Kotlin backend including authentication, authorization, input validation, and OWASP prevention. Use when implementing auth, validating inputs, or reviewing security.
---

# Security Checklist — Quick Reference

## Authentication

```kotlin
// Always use @Secured on controllers
@Secured(SecurityRule.IS_AUTHENTICATED)   // Any logged-in user
@Secured(OAuthSecurityRule.ADMIN)         // Admin only
@Secured(SecurityRule.IS_ANONYMOUS)       // Public endpoint

// Get current user from security context
val principal = SecurityUtils.currentPrincipal()
  ?: return AuthError.UNAUTHORIZED.asException().left()
```

## Authorization Checks

```kotlin
// Verify user has access to the resource
suspend fun getEmployee(id: UUID, requesterId: UUID): Either<ClientException, EmployeeResponse> {
  val employee = employeeRepository.byId(id)
    ?: return ClientError.NOT_FOUND.asException().left()

  // Check: can this user see this employee?
  if (!hasAccess(requesterId, employee)) {
    return ClientError.FORBIDDEN.asException().left()
  }

  return EmployeeResponse.from(employee).right()
}
```

## Input Validation

```kotlin
// Validate at controller boundary
@Post("/employee")
suspend fun create(@Valid @Body request: CreateEmployeeRequest): EmployeeResponse {
  // @Valid triggers Jakarta validation annotations
  return employeeManager.create(request).throwOrValue()
}

// Request with validation
data class CreateEmployeeRequest(
  @field:NotBlank val name: String,
  @field:Email val email: String,
  @field:Size(max = 1000) val description: String?
)
```

## SQL Injection Prevention

```kotlin
// SAFE — Exposed ORM parameterizes automatically
UsersTable.selectAll()
  .where { UsersTable.email eq userInput }  // parameterized

// DANGEROUS — raw SQL with string concat
exec("SELECT * FROM users WHERE email = '$userInput'")  // NEVER DO THIS
```

## Common Vulnerabilities to Check

| Vulnerability | Prevention |
|--------------|-----------|
| SQL Injection | Use Exposed ORM (auto-parameterized) |
| XSS | Don't render user input as HTML |
| CSRF | Micronaut handles via token validation |
| Auth bypass | @Secured on every controller |
| IDOR | Check resource ownership in manager |
| Mass assignment | Use explicit request DTOs, not entity directly |
| Sensitive data exposure | Never return passwords, tokens in responses |
| Missing rate limiting | Add @RateLimiter for auth endpoints |

## Secrets Management

- NEVER hardcode secrets in code
- Use environment variables: `DB_PASSWORD`, `JWT_SECRET`
- Never log sensitive data (tokens, passwords, PII)
- Never commit `.env` files

## Response Sanitization

```kotlin
// Response DTO controls what's exposed — don't return raw entities
data class UserResponse(
  val id: UUID,
  val email: String,
  val displayName: String
  // NO password field, NO internal fields
) {
  companion object {
    fun from(entity: UserEntity) = UserResponse(
      id = entity.id,
      email = entity.email,
      displayName = entity.displayName ?: entity.email
    )
  }
}
```

## Review Checklist

When reviewing security-sensitive code:

- [ ] All endpoints have @Secured annotation
- [ ] Admin endpoints use OAuthSecurityRule.ADMIN
- [ ] User can only access their own resources (or admin can access all)
- [ ] Input validated with @Valid and Jakarta annotations
- [ ] No raw SQL queries with string concatenation
- [ ] Sensitive fields excluded from response DTOs
- [ ] Tokens/passwords never logged
- [ ] Error messages don't leak internal details
- [ ] Rate limiting on auth endpoints
