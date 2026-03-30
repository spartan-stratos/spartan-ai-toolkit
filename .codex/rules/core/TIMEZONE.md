# Timezone Rules

## One Rule: Everything is UTC

**Server stores UTC. API sends UTC. API receives UTC. No exceptions.**

The frontend is the only place that converts to/from local time — for display only.

```
Database (TIMESTAMPTZ/UTC) → Backend (Instant/UTC) → API JSON (ISO 8601 Z) → Frontend (UTC) → Display (local)
                                                                              ← Send (local → UTC) ←  Input
```

---

## Database

### Use `TIMESTAMPTZ` — Not `TIMESTAMP`

**Always use `TIMESTAMPTZ` (with timezone).** PostgreSQL docs and wiki both say this.

Why: `TIMESTAMPTZ` converts to UTC on insert and converts back on read. If a connection has a non-UTC session timezone (DBA tools, connection pool quirks, migration scripts), `TIMESTAMPTZ` still stores the correct UTC value. `TIMESTAMP` without timezone silently stores whatever you give it — if the session isn't UTC, you get wrong data and can't tell.

```sql
-- CORRECT — TIMESTAMPTZ is the safe default
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- WRONG — TIMESTAMP without timezone is fragile
CREATE TABLE events (
  id UUID PRIMARY KEY,
  starts_at TIMESTAMP NOT NULL,  -- Breaks if session timezone isn't UTC
  created_at TIMESTAMP DEFAULT NOW()
);
```

Both types use 8 bytes internally. No storage difference.

### Server Must Run in UTC

The database server, application server, and all containers must run in UTC:

```yaml
# application.yml
datasources:
  default:
    connection-properties:
      timezone: UTC
```

```sql
-- PostgreSQL: verify
SHOW timezone;  -- Should return 'UTC'
```

```dockerfile
# Dockerfile
ENV TZ=UTC
```

```yaml
# Kubernetes pod spec
env:
  - name: TZ
    value: "UTC"
```

---

## Backend (Kotlin)

### Always Use `Instant` — Never `LocalDateTime`

`Instant` is UTC by definition. `LocalDateTime` has no timezone info and causes bugs.

```kotlin
// CORRECT — Instant is always UTC
val now: Instant = Instant.now()
val expiresAt: Instant = Instant.now().plusSeconds(3600)

// WRONG — LocalDateTime has no timezone, ambiguous
val now: LocalDateTime = LocalDateTime.now()  // What timezone? Nobody knows.
```

### `ZonedDateTime` — Only at Computation Boundaries

Never put `ZonedDateTime` in entities, DTOs, or API payloads. It's OK for:
- Scheduling logic (computing "next 9 AM in user's timezone")
- DST-aware date arithmetic ("add 1 day" at DST boundary)
- Generating reports in a specific timezone

Always convert back to `Instant` before passing to other layers.

```kotlin
// CORRECT — entities and DTOs use Instant
data class UserEntity(
  val createdAt: Instant,
  val lastLoginAt: Instant?,
  val subscriptionExpiresAt: Instant?
)

// CORRECT — ZonedDateTime only for scheduling computation
fun nextNotificationTime(userTimezone: String, localTime: LocalTime): Instant {
  val zone = ZoneId.of(userTimezone)
  val nextLocal = ZonedDateTime.now(zone).with(localTime)
  return nextLocal.toInstant()  // Convert back to Instant
}

// WRONG — ZonedDateTime in entity
data class UserEntity(
  val createdAt: ZonedDateTime  // NO — keep entities in Instant
)
```

### Jackson Serialization

Jackson must serialize `Instant` as ISO 8601 with the `Z` suffix:

```kotlin
objectMapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
// Output: "2024-01-15T10:30:00Z"
```

Never output offsets like `+07:00` or timezone names in API responses.

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

### No Timezone Fields in Timestamp Payloads

Don't put timezone info alongside timestamps. The exception is user preferences (see below).

```json
// WRONG — timezone alongside a timestamp
{ "starts_at": "2024-01-20T09:00:00Z", "timezone": "America/New_York" }

// CORRECT — just UTC
{ "starts_at": "2024-01-20T09:00:00Z" }
```

---

## Frontend

### Receive UTC, Convert for Display

```typescript
// Convert at display time
function formatDate(utcString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(utcString))
}
```

### Send UTC to Server

```typescript
// Convert local input to UTC before API call
const localDate = new Date(userInput)
const utcString = localDate.toISOString()  // "2024-01-20T02:00:00.000Z"

await api.post('/events', { startsAt: utcString })

// WRONG — no Z suffix, ambiguous
await api.post('/events', { startsAt: '2024-01-20T09:00:00' })
```

### Use Browser Timezone at Render Time

Don't track the user's timezone in frontend state. The browser already knows it.

```typescript
// CORRECT — use at render time
const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone

// WRONG — storing timezone in state
const [timezone, setTimezone] = useState('America/New_York')
```

---

## When You DO Need Timezone

There are cases where storing a user's IANA timezone is correct. The rule is:

**Past events (created_at, login_at, order_placed_at):** Never store timezone. `TIMESTAMPTZ` (UTC) is enough.

**User preferences (notification time, business hours):** Store the user's IANA timezone as a separate column. Don't mix it with timestamps.

```sql
-- CORRECT — timezone as a user preference, not part of timestamps
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',          -- IANA timezone: 'America/New_York'
  notification_time TEXT NOT NULL DEFAULT '09:00', -- local time, not a timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Then compute UTC fire time dynamically in code:
-- nextFire = ZonedDateTime.of(today, LocalTime.parse("09:00"), ZoneId.of("America/New_York")).toInstant()
```

**Why dynamic computation?** Because DST shifts change the UTC offset. "9 AM New York" is `14:00 UTC` in winter but `13:00 UTC` in summer. Storing a fixed UTC value would drift by an hour.

**Never use fixed offsets as timezone identifiers.** `+05:30` is an offset, not a timezone. It changes with DST. Use IANA names: `Asia/Kolkata`, `America/New_York`.

---

## Microservices

### Inter-Service Communication

All service-to-service datetime fields use ISO 8601 UTC, same as external APIs.

### Event Streaming (Kafka, RabbitMQ)

- Use epoch-based types: Avro `timestamp-millis`, Protobuf `google.protobuf.Timestamp`
- These are UTC by definition — no timezone ambiguity
- Document in your schema that all timestamps are UTC epoch

### Logging

All services must log in UTC. If services in different timezones log in local time, correlating logs across services is a nightmare.

```xml
<!-- logback.xml — force UTC -->
<timestamp key="timestamp" datePattern="yyyy-MM-dd'T'HH:mm:ss.SSS'Z'" timeReference="UTC"/>
```

### Distributed Tracing

OpenTelemetry spans use nanosecond UTC timestamps internally. No action needed — but make sure NTP is configured on all nodes. Clock skew (not timezone) is the bigger concern.

### Cron / Scheduler Jobs

Cron expressions are timezone-sensitive. DST transitions can cause jobs to fire twice, or not at all, in the 1-3 AM window.

```kotlin
// CORRECT — schedule in UTC to avoid DST issues
@Scheduled(cron = "0 0 14 * * *", zone = "UTC")  // 2 PM UTC, not "2 PM local"
fun dailyDigest() { ... }

// If the job MUST fire at local wall-clock time, use IANA timezone explicitly:
@Scheduled(cron = "0 0 9 * * *", zone = "America/New_York")  // 9 AM New York, DST-aware
fun morningNotification() { ... }
```

Avoid scheduling jobs in the 1:00-3:00 AM local time window for any timezone with DST.

### IANA Timezone Database Updates

Governments change DST rules. Your JVM and OS timezone databases need updating. If you run long-lived JVMs, update the JDK or use the TZUpdater tool.

---

## Quick Reference

| Layer | Type | Format | Example |
|-------|------|--------|---------|
| Database | Column type | `TIMESTAMPTZ` | `2024-01-15 10:30:00+00` |
| Backend (Kotlin) | Property type | `Instant` | `Instant.now()` |
| API JSON | String | ISO 8601 + Z | `"2024-01-15T10:30:00Z"` |
| Frontend (receive) | Parse | `new Date(utcString)` | `new Date("2024-01-15T10:30:00Z")` |
| Frontend (display) | Format | `Intl.DateTimeFormat` | `"Jan 15, 2024, 5:30 PM"` |
| Frontend (send) | Serialize | `toISOString()` | `"2024-01-15T10:30:00.000Z"` |
| Events (Kafka) | Type | epoch millis | `1705312200000` |
| Cron jobs | Zone | IANA or UTC | `zone = "UTC"` |
| User preference | Column | IANA timezone | `America/New_York` |

## What NOT to Do

- Don't use `TIMESTAMP` without timezone — use `TIMESTAMPTZ`
- Don't use `LocalDateTime` in Kotlin — use `Instant`
- Don't put `ZonedDateTime` in entities or DTOs
- Don't use fixed offsets (`+05:30`) as timezone identifiers — use IANA names
- Don't store timezone alongside timestamps for past events
- Don't convert to local time on the backend — that's the frontend's job
- Don't format dates on the server for display — return UTC, let the client format
- Don't schedule cron jobs in the 1-3 AM DST window
- Don't assume the host timezone is UTC — set `TZ=UTC` in containers
- Don't log in local time — all services log UTC
