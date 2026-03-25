# Naming Conventions

## Overview

This document defines the naming conventions used across different layers of the stack. Consistent naming reduces bugs, makes the codebase easier to understand, and helps everyone move faster.

## Convention Summary

| Layer | Convention | Example |
|-------|-----------|---------|
| **Database (SQL)** | `snake_case` | `points_balance`, `user_id`, `created_at` |
| **Kotlin Code** | `camelCase` | `pointsBalance`, `userId`, `createdAt` |
| **API JSON (over wire)** | `snake_case` | `"points_balance"`, `"user_id"` |
| **TypeScript Code** | `camelCase` | `pointsBalance`, `userId`, `createdAt` |

## How It Works

### Backend (Kotlin + Micronaut)

**Jackson ObjectMapper** is configured globally with `SNAKE_CASE` naming strategy:

```kotlin
// In your Jackson configuration module
fun ObjectMapper.configured(): ObjectMapper {
  propertyNamingStrategy = PropertyNamingStrategies.SNAKE_CASE
  // ... other configuration
}
```

This means:
- **Write Kotlin code in `camelCase`** (idiomatic Kotlin)
- **Jackson automatically converts to `snake_case`** when serializing to JSON
- **Jackson automatically converts from `snake_case`** when deserializing JSON

**Example:**
```kotlin
// Kotlin DTO (use camelCase)
@Serdeable
data class CreateRecognitionRequest(
  val receiverIds: List<UUID>,      // camelCase in code
  val coreValueIds: List<UUID>,     // camelCase in code
  val points: Int,
  val message: String
)
```

**JSON sent/received (automatic snake_case):**
```json
{
  "receiver_ids": ["uuid-1", "uuid-2"],
  "core_value_ids": ["uuid-3"],
  "points": 10,
  "message": "Great work!"
}
```

### Frontend (TypeScript + React)

**Axios interceptors** automatically convert between conventions:

```typescript
// src/lib/case-converter.ts
export function toSnakeCase<T>(obj: T): T    // camelCase -> snake_case
export function toCamelCase<T>(obj: T): T    // snake_case -> camelCase
```

```typescript
// src/lib/api.ts
// Request interceptor: Convert camelCase to snake_case before sending
api.interceptors.request.use((config) => {
  if (config.data && typeof config.data === 'object') {
    config.data = toSnakeCase(config.data)
  }
  return config
})

// Response interceptor: Convert snake_case to camelCase after receiving
api.interceptors.response.use((response) => {
  if (response.data && typeof response.data === 'object') {
    response.data = toCamelCase(response.data)
  }
  return response
})
```

This means:
- **Write TypeScript code in `camelCase`** (idiomatic JavaScript/TypeScript)
- **Interceptors automatically convert to `snake_case`** when sending requests
- **Interceptors automatically convert to `camelCase`** when receiving responses

**Example:**
```typescript
// TypeScript interface (use camelCase)
export interface CreateRecognitionRequest {
  receiverIds: string[]     // camelCase in code
  coreValueIds: string[]    // camelCase in code
  points: number
  message: string
}

// Usage - just use camelCase everywhere
const data: CreateRecognitionRequest = {
  receiverIds: ['uuid-1', 'uuid-2'],
  coreValueIds: ['uuid-3'],
  points: 10,
  message: 'Great work!'
}

// Interceptor automatically sends as snake_case
await api.post('/recognitions', data)
```

### Database (PostgreSQL)

All database objects use `snake_case`:

```sql
-- Tables (plural, snake_case)
CREATE TABLE users (...)
CREATE TABLE core_values (...)
CREATE TABLE recognition_receivers (...)

-- Columns (snake_case)
id UUID PRIMARY KEY
points_balance INTEGER
allowance_balance INTEGER
created_at TIMESTAMP
updated_at TIMESTAMP
deleted_at TIMESTAMP

-- Indexes (idx_tablename_column)
CREATE INDEX idx_users_email ON users(email)
CREATE INDEX idx_recognitions_giver_id ON recognitions(giver_id)
```

## CRITICAL: @QueryValue Must Use Explicit snake_case Names

**The frontend axios interceptor converts ALL query params to `snake_case` (e.g., `projectId` → `project_id`). But Micronaut's `@QueryValue` does NOT auto-convert — it matches the EXACT param name from the URL.**

**Jackson's SNAKE_CASE config only affects JSON body serialization/deserialization, NOT query parameter binding.**

This means ALL multi-word `@QueryValue` params MUST have explicit snake_case names:

```kotlin
// ✅ CORRECT — explicit snake_case name matches what frontend sends
@QueryValue("project_id") projectId: UUID,
@QueryValue("alert_id") alertId: UUID,
@QueryValue("repo_full_name") repoFullName: String,

// ❌ WRONG — Micronaut expects ?projectId=xxx but frontend sends ?project_id=xxx
@QueryValue projectId: UUID,
@QueryValue alertId: UUID,
@QueryValue repoFullName: String,

// ✅ OK — single-word params don't need explicit name (no case conversion needed)
@QueryValue status: String,
@QueryValue limit: Int,
@QueryValue id: UUID,
```

**Rule: If a `@QueryValue` param name has more than one word (contains uppercase letters), ALWAYS add explicit `@QueryValue("snake_case_name")`.**

## Rules

### DO

1. **Use `camelCase` in all Kotlin code** (properties, variables, function parameters)
2. **Use `camelCase` in all TypeScript code** (interfaces, variables, function parameters)
3. **Use `snake_case` in all SQL** (tables, columns, indexes)
4. **Let the framework handle conversion** (Jackson for backend, Axios interceptors for frontend)
5. **ALWAYS add explicit snake_case name to multi-word `@QueryValue` params**

### DON'T

1. **DON'T manually convert case in API calls** - interceptors handle this
2. **DON'T use `@JsonProperty` unless mapping external APIs** (like Google OAuth)
3. **DON'T mix conventions within the same layer**
4. **DON'T use `snake_case` in Kotlin or TypeScript code**
5. **DON'T use `camelCase` in SQL or JSON API contracts**
6. **DON'T use bare `@QueryValue` for multi-word param names** — always add explicit snake_case

### When to Use `@JsonProperty`

Only use `@JsonProperty` annotation when:
- Mapping responses from **external APIs** that don't follow your conventions
- Field names must differ from the automatic conversion for **backwards compatibility**

```kotlin
// ONLY for external APIs (like Google OAuth)
@Serdeable
data class GoogleTokenResponse(
  @JsonProperty("access_token")
  val accessToken: String,
  @JsonProperty("expires_in")
  val expiresIn: Int,
  @JsonProperty("id_token")
  val idToken: String?
)
```

## Code Review Checklist

- [ ] No manual `snake_case` in Kotlin DTO properties
- [ ] No manual `snake_case` in TypeScript interfaces
- [ ] No manual case conversion in API calls (let interceptors handle it)
- [ ] `@JsonProperty` only used for external API mappings
- [ ] Database columns and tables use `snake_case`
- [ ] Exposed Table definitions match database column names
