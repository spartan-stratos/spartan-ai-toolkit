---
name: spartan:debug
description: Structured root-cause debugging using a 4-phase investigation protocol. Produces a Debug Report with fix plan. Use for bugs that aren't immediately obvious.
argument-hint: "[describe the symptom / error]"
---

# Debug Investigation: {{ args[0] }}

You are running a **structured debugging session**.
Do NOT guess. Do NOT try random fixes. Follow the 4 phases in order.

---

## Phase 1: Reproduce & Characterize (understand before touching anything)

**Goal:** Make the failure deterministic and fully described.

1. Get the exact error message, stack trace, or symptom
2. Find the minimal reproduction case:
   - What inputs trigger it?
   - What inputs do NOT trigger it?
   - Is it consistent or flaky?
   - Environment-specific? (local / CI / prod)

3. Gather context:
```bash
# Recent changes that could have introduced this
git log --oneline -10
git diff HEAD~5 --stat

# Are tests failing?
./gradlew test --info 2>&1 | tail -40

# Logs around the failure time
# (ask user for relevant log snippets if not in repo)
```

Document findings. Do NOT proceed until the bug is reproducible.

---

## Phase 2: Isolate the Root Cause (narrow the search space)

**Goal:** Find the exact line / decision / data that causes the failure.

Use binary isolation:
1. Start from the failure point, trace backwards through the call stack
2. At each layer, ask: "Is the data correct at this point?"
3. Keep narrowing until you find where correct data becomes incorrect data

For common Kotlin/Micronaut patterns, check:
- **Null safety violations**: Any `!!` operators? (BANNED — see CORE_RULES)
- **Either handling**: Is `.left()` / `.right()` used correctly? Missing error cases?
- **Coroutine scope leaks**: Is a coroutine cancelled before work completes?
- **Exposed transaction scope**: Is `newSuspendedTransaction {}` wrapping DB calls correctly?
- **Soft delete filtering**: Is `deleted_at IS NULL` included in queries? (DATABASE_RULES)
- **Testcontainers state**: Is a previous test leaving dirty data?

```kotlin
// Add strategic logging to narrow the search
log.debug("State at boundary: entity={}, dto={}", entity, dto)
```

Document: "The root cause is [X] because [evidence]."

---

## Phase 3: Fix with Test First (TDD the fix)

**Goal:** Fix correctly and ensure it cannot regress.

1. **Write a failing test that captures the bug FIRST:**
```kotlin
@Test
fun `given [condition that triggers bug], when [action], then [correct behavior]`() {
    // Reproduce the exact scenario that fails
    // This test must FAIL right now
}
```

2. **Confirm test is red** — if it passes, you haven't reproduced the bug in the test

3. **Write the minimal fix** — change as little as possible

4. **Confirm test is green**

5. **Check for similar patterns** in the codebase:
```bash
# Find similar code that might have the same bug
grep -r "[pattern from the bug]" --include="*.kt" src/
```

---

## Phase 4: Verify & Harden

**Goal:** Confirm fix is complete and add protection layers.

```bash
# Full test suite must pass
./gradlew test

# Integration tests specifically
./gradlew integrationTest 2>/dev/null || ./gradlew test -Dmicronaut.environments=test
```

Check:
- [ ] Fix addresses root cause, not symptom
- [ ] No regression in existing tests
- [ ] Edge cases covered in new test
- [ ] Similar patterns in codebase checked and fixed if needed
- [ ] Logging/observability added if this was hard to debug

---

## Output: Debug Report

After completing all phases, produce a brief report:

```markdown
## Debug Report: [symptom]

**Root Cause:** [exact cause in one sentence]

**Why it happened:**
[2-3 sentences explaining the chain of events]

**Fix:**
[what was changed and why it fixes the root cause]

**Test added:**
[name of the regression test]

**Similar patterns checked:**
[files checked / changes made]

**Prevention:**
[what could prevent this class of bug in future — linting rule, convention, etc.]
```

Commit with:
```
fix([scope]): [root cause description]

- Root cause: [one line]
- Add regression test: [test name]
- Checked [N] similar patterns
```

## Rules

- Follow the 4 phases in order — don't skip to fixing
- Never guess — every hypothesis must have evidence
- Write a failing test before writing the fix
- Change as little as possible — minimal fix, not refactor
- Check for similar patterns in the codebase after fixing
