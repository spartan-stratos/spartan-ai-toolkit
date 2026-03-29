# Timezone Rules

## One Rule: Everything is UTC

**Server stores UTC. API sends UTC. API receives UTC. No exceptions.**

The frontend is the only place that converts to/from local time — and only for display.

```
Database (UTC) → Backend (UTC) → API JSON (UTC) → Frontend receives (UTC) → Display (local)
                                                  ← Frontend sends (UTC) ←  Input (local → UTC)
```

---

## Backend

### Always Use `Instant` — Never `LocalDateTime`

`Instant` is UTC by definition. `LocalDateTime` has no timezone info and leads to bugs.

```kotlin
// CORRECT — Instant is always UTC
val now: Instant = Instant.now()
val expiresAt: Instant = Instant.now().plusSeconds(3600)

// WRONG — LocalDateTime has no timezone, ambiguous
val now: LocalDateTime = LocalDateTime.now()  // What timezone? Nobody knows.
val expiresAt: LocalDateTime = LocalDateTime.now().plusHours(1)
```

### Never Use `ZonedDateTime` in Business Logic

`ZonedDateTime` is only for converting when absolutely needed (e.g., generating a report for a specific timezone). Don't pass it between layers.

```kotlin
// CORRECT — use Instant everywhere
data class UserEntity(
  val createdAt: Instant,
  val lastLoginAt: Instant?,
  val subscriptionExpiresAt: Instant?
)

// WRONG — ZonedDateTime in entities/DTOs
data class UserEntity(
  val createdAt: ZonedDateTime,   // NO — carries timezone baggage
  val lastLoginAt: LocalDateTime? // NO — ambiguous
)
```

### Never Store Timezone in the Database

Don't add `timezone` columns. Don't save user timezone preferences alongside timestamps. If the frontend needs to display local time, it does the conversion itself.

```sql
-- CORRECT — just UTC timestamps
CREATE TABLE events (
  id UUID PRIMARY KEY,
  starts_at TIMESTAMP NOT NULL,     -- UTC
  ends_at TIMESTAMP NOT NULL,       -- UTC
  created_at TIMESTAMP DEFAULT NOW() -- UTC
);

-- WRONG — storing timezone info
CREATE TABLE events (
  id UUID PRIMARY KEY,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  timezone TEXT DEFAULT 'America/New_York'  -- DON'T DO THIS
);
```

### Jackson Serialization

Jackson must serialize all `Instant` fields as ISO 8601 with the `Z` (UTC) suffix. This should be configured globally:

```kotlin
// ObjectMapper config (usually already set)
objectMapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
// Output: "2024-01-15T10:30:00Z"
```

Every datetime field in API JSON looks like: `"2024-01-15T10:30:00Z"`

Never output offsets like `+07:00` or timezone names like `Asia/Ho_Chi_Minh`.

---

## API Contract

### All Datetime Fields Are ISO 8601 UTC

```json
{
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T14:22:33Z",
  "expires_at": "2024-02-15T00:00:00Z"
}
```

### Request Bodies — Frontend Sends UTC

When the frontend sends a datetime, it MUST be UTC:

```json
{
  "starts_at": "2024-01-20T09:00:00Z",
  "ends_at": "2024-01-20T17:00:00Z"
}
```

### Query Parameters — Also UTC

```
GET /events?from=2024-01-01T00:00:00Z&to=2024-01-31T23:59:59Z
```

### No Timezone Fields in Request or Response

```json
// WRONG — timezone info in API
{
  "starts_at": "2024-01-20T09:00:00Z",
  "timezone": "America/New_York"
}

// CORRECT — just UTC, frontend handles display
{
  "starts_at": "2024-01-20T09:00:00Z"
}
```

---

## Frontend

### Receive UTC, Convert for Display

All API responses return UTC. Convert to local only when showing to the user:

```typescript
// CORRECT — convert at display time
function formatDate(utcString: string): string {
  return new Date(utcString).toLocaleString()
  // Or use Intl.DateTimeFormat for more control
}

// CORRECT — with specific format
function formatDate(utcString: string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(utcString))
}
```

### Send UTC to Server

Convert local input to UTC before sending:

```typescript
// CORRECT — convert to UTC before API call
const localDate = new Date(userInput)  // user picks "Jan 20, 2024 9:00 AM"
const utcString = localDate.toISOString()  // "2024-01-20T02:00:00.000Z" (if user is UTC+7)

await api.post('/events', {
  startsAt: utcString,  // Always UTC
})

// WRONG — sending local time string
await api.post('/events', {
  startsAt: '2024-01-20T09:00:00',  // No Z suffix — ambiguous!
})
```

### Date Libraries

If using a date library (date-fns, dayjs, luxon), still follow the same pattern:

```typescript
// date-fns example
import { formatInTimeZone } from 'date-fns-tz'

// Display: UTC → user's local timezone
const display = formatInTimeZone(
  new Date(apiResponse.createdAt),  // UTC from API
  Intl.DateTimeFormat().resolvedOptions().timeZone,  // user's timezone
  'MMM d, yyyy h:mm a'
)

// Send: local → UTC
const utc = new Date(localInput).toISOString()
```

### Never Store Timezone in Frontend State

Don't track the user's timezone in state or send it to the backend. The browser already knows the timezone — use it at render time.

```typescript
// WRONG — tracking timezone in state
const [timezone, setTimezone] = useState('America/New_York')

// CORRECT — use browser timezone at render time
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
```

---

## Database

### TIMESTAMP Without Timezone

Use `TIMESTAMP` (not `TIMESTAMPTZ`). The value is always UTC. No timezone info needed.

```sql
-- CORRECT
created_at TIMESTAMP DEFAULT NOW()  -- NOW() returns UTC in a UTC-configured server

-- ALSO ACCEPTABLE (PostgreSQL stores both as UTC internally)
created_at TIMESTAMPTZ DEFAULT NOW()
```

### Server Must Be Configured for UTC

The database server and application server must run in UTC:

```yaml
# application.yml
datasources:
  default:
    connection-properties:
      timezone: UTC
```

```sql
-- PostgreSQL: verify server timezone
SHOW timezone;  -- Should return 'UTC'
```

---

## Quick Reference

| Layer | Type | Format | Example |
|-------|------|--------|---------|
| Database | Column type | `TIMESTAMP` | `2024-01-15 10:30:00` |
| Backend (Kotlin) | Property type | `Instant` | `Instant.now()` |
| API JSON | String | ISO 8601 + Z | `"2024-01-15T10:30:00Z"` |
| Frontend (receive) | Parse | `new Date(utcString)` | `new Date("2024-01-15T10:30:00Z")` |
| Frontend (display) | Format | `toLocaleString()` | `"Jan 15, 2024, 5:30 PM"` (UTC+7) |
| Frontend (send) | Serialize | `toISOString()` | `"2024-01-15T10:30:00.000Z"` |

## What NOT to Do

- Don't use `LocalDateTime` in Kotlin — use `Instant`
- Don't store timezone names or offsets in the database
- Don't send timezone info in API requests or responses
- Don't use `TIMESTAMPTZ` thinking it "stores the timezone" — PostgreSQL converts everything to UTC anyway
- Don't convert to local time on the backend — that's the frontend's job
- Don't assume a timezone — let the browser handle it
- Don't format dates on the server for display — return UTC, let the client format
