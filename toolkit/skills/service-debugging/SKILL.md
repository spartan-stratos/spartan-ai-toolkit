---
name: service-debugging
description: "Structured debugging runbook for backend services. Use when investigating production issues, API errors, performance problems, or when something broke and you need to find why."
allowed_tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Service Debugging

Structured approach to investigating and fixing service issues. Symptoms in, root cause out.

## When to Use

- API endpoint returning errors (4xx, 5xx)
- Performance degradation or slow queries
- Service not starting or crashing
- Data inconsistency between services
- After a deploy when something broke
- User reports "something is broken"

## Process

### 1. Gather Symptoms

Before touching code, collect:
- **What's broken?** (specific endpoint, feature, or behavior)
- **When did it start?** (after a deploy? gradually? suddenly?)
- **Who's affected?** (all users, specific users, specific data?)
- **Error messages?** (logs, HTTP responses, stack traces)

### 2. Check the Obvious

Run these first — they catch 80% of issues:

```bash
# Recent deploys (did someone push something?)
git log --oneline -10

# Service health
curl -s http://localhost:8080/health | jq .

# Recent errors in logs
grep -i "error\|exception\|fatal" logs/app.log | tail -20

# Database connectivity
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"

# Environment variables (missing or wrong?)
env | grep -i "DB_\|API_\|SECRET_" | sort
```

### 3. Narrow Down

| Symptom | Check First |
|---------|-------------|
| 500 errors | Stack trace in logs → find the throwing line |
| 404 errors | Route registration → is the controller loaded? |
| 401/403 errors | Auth config → is @Secured correct? Token valid? |
| Slow response | Database → run EXPLAIN on the slow query |
| Timeout | External service → is the downstream API responding? |
| Data missing | Soft delete → is `deleted_at` set? Wrong query filter? |
| Service won't start | Bean creation → check @Factory and @Singleton wiring |

### 4. Reproduce

- Can you trigger the bug locally?
- What's the minimal request that fails?
- Does it fail consistently or intermittently?

### 5. Find Root Cause

Use git bisect if it's a regression:
```bash
git bisect start
git bisect bad HEAD
git bisect good <last-known-good-commit>
# Test each commit until you find the one that broke it
```

Use grep to find related code:
```bash
# Find where the error message comes from
grep -r "error message text" --include="*.kt" src/

# Find all callers of a broken function
grep -r "functionName" --include="*.kt" src/
```

### 6. Fix and Verify

1. Write a test that reproduces the bug (red)
2. Fix the code (green)
3. Run full test suite
4. Test manually if it's a user-facing issue

> See `common-issues.md` for a catalog of frequently seen bugs and their fixes.

## Gotchas

- **Don't fix the symptom, fix the cause.** Adding a null check that hides a data issue means the data issue will bite you later.
- **Check the deploy log before blaming the code.** Config changes, environment variable updates, and infra changes cause more outages than code bugs.
- **"It works on my machine" usually means environment difference.** Compare local env vars, database state, and service versions with the target environment.
- **Intermittent failures are usually race conditions.** If it fails 1 in 10 times, look for concurrent access, shared mutable state, or connection pool exhaustion.
- **Don't restart the service as your first debugging step.** You'll lose the state that helps you diagnose. Read logs first, then restart if needed.
- **Soft-deleted records are the #1 "data missing" cause.** Always check `deleted_at IS NULL` in your queries.

## Rules

- Always gather symptoms before changing code
- Write a failing test before fixing
- Check recent git history — most bugs are regressions
- Don't deploy a fix without understanding the root cause
- Document the incident if it affected users
