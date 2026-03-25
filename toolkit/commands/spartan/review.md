---
name: spartan:review
description: Perform a thorough PR review following Spartan Kotlin + Micronaut conventions and company rules
argument-hint: "[optional: branch name or PR description]"
---

# Code Review: {{ args[0] | default: "current changes" }}

Perform a comprehensive code review of the current changes. Use the `git diff` tool to inspect
all modified files. Analyze the changes systematically.

**Before reviewing, reference these company rules:**
- `rules/backend-micronaut/KOTLIN.md` — Null safety, Either, coroutines
- `rules/backend-micronaut/CONTROLLERS.md` — Controller → Manager → Service/Repository
- `rules/backend-micronaut/API_DESIGN.md` — Query params only, RPC-style URLs
- `rules/database/SCHEMA.md` — No FK, TEXT not VARCHAR, soft deletes

## Review Checklist

### Stage 1: Correctness & Business Logic
- [ ] Does the implementation match the stated requirements/ticket?
- [ ] Are all edge cases handled?
- [ ] Is error handling using `Either<ClientException, T>` (not exceptions)?
- [ ] Are there any `!!` operators? (BANNED — see CORE_RULES)
- [ ] Are all coroutine scopes properly managed?

### Stage 2: Kotlin & Micronaut Conventions
- [ ] Controllers are thin — delegate to Manager immediately
- [ ] `@ExecuteOn(TaskExecutors.BLOCKING)` on controller methods that call blocking code
- [ ] `@Secured` annotation present on all controllers
- [ ] Manager returns `Either<ClientException, T>`, not raw types or exceptions
- [ ] Query parameters used (no path parameters like `/{id}`)
- [ ] Null safety: safe call + elvis, no `!!`
- [ ] Extension functions preferred over utility classes

### Stage 3: Test Coverage
- [ ] New endpoints have `@MicronautTest` integration tests
- [ ] Tests follow the pattern from `/testing-strategies` skill
- [ ] Tests are independent (no test order dependencies)
- [ ] Edge cases are tested
- [ ] Test uses proper test data builders

### Stage 4: Clean Code & Architecture
- [ ] Layered architecture: Controller → Manager → Service/Repository
- [ ] No business logic in controllers or repositories
- [ ] Package structure follows controller/manager/service/repository/model
- [ ] No cyclic dependencies between packages
- [ ] Functions are small and single-purpose

### Stage 5: Database & API
- [ ] Migrations use TEXT not VARCHAR (DATABASE_RULES)
- [ ] No foreign key constraints (DATABASE_RULES)
- [ ] Soft delete with `deleted_at` (no hard deletes)
- [ ] Standard columns present: `id`, `created_at`, `updated_at`, `deleted_at`
- [ ] UUID primary keys
- [ ] API URLs follow RPC style (API_RULES)
- [ ] No sensitive data logged
- [ ] Input validation on all public API endpoints

## Output Format

Provide review results as:

```
## PR Review Summary

### Approved / Needs Changes / Blocked

### Critical Issues (must fix)
- [issue with file:line reference]

### Suggestions (nice to have)
- [suggestion]

### Praise (what was done well)
- [positive note]

### Verdict
[Final recommendation]
```

### Stage 6: Documentation Gap Analysis (from pr-reviewer agent)
After reviewing code, check if any patterns found should be documented:
- [ ] New architectural pattern used? → Update `rules/shared-backend/ARCHITECTURE.md`
- [ ] New error handling pattern? → Update `rules/backend-micronaut/KOTLIN.md`
- [ ] New database pattern? → Update `rules/database/SCHEMA.md`
- [ ] Recurring PR feedback theme? → Create new rule or update existing
- [ ] New convention established? → Update CLAUDE.md or `.memory/patterns/`

If documentation updates needed, list them at the end of the review:
```
### Documentation Updates Needed
- [file]: [what to add/update and why]
```

## Rules

- Always use `git diff` to inspect actual changes — don't guess from filenames
- Reference the company rules files before checking code
- Every finding must include file:line reference
- Separate "must fix" from "nice to have" — don't block PRs on style nits
- Praise good code — reviews aren't just for finding problems
