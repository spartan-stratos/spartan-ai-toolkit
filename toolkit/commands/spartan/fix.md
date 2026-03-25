---
name: spartan:fix
description: "Find and fix a bug end-to-end — structured investigation, root cause, test-first fix, and PR"
argument-hint: "[describe the symptom or error]"
---

# Fix: {{ args[0] | default: "a bug" }}

You are running the **Fix workflow** — structured debugging from symptom to merged PR.

Don't guess. Don't try random fixes. Follow the 4 stages.

```
STAGE 1: REPRODUCE         STAGE 2: INVESTIGATE       STAGE 3: FIX              STAGE 4: SHIP
──────────────────        ─────────────────         ──────────────            ──────────────
Get exact symptoms        Trace code path           Write failing test        Review fix
Find minimal repro        Check recent changes      Minimal fix               Create PR
Confirm it's real         Pinpoint root cause       Check similar patterns    Clear description

Gate 1                    Gate 2                    Gate 3                    Gate 4
"I can reproduce this"    "Root cause: [X]"         "All tests pass"          "PR created"
```

---

## Stage 1: Reproduce

**Goal:** Make the bug deterministic. Understand it fully before touching anything.

### Gather info
1. Get the exact error message, stack trace, or symptom
2. Ask if not clear:
   - What inputs trigger it?
   - What inputs do NOT trigger it?
   - Consistent or flaky?
   - Which environment? (local / CI / prod)

### Check recent changes
```bash
# What changed recently?
git log --oneline -15
git diff HEAD~5 --stat

# Are tests already failing?
./gradlew test --info 2>&1 | tail -40
```

### Find minimal reproduction
- Trace the code path from the symptom
- Identify the smallest input that triggers the bug
- Confirm you can make it happen on demand

**If you can't reproduce it:**
> Stop. Ask for more context — logs, steps, environment details. Don't move forward until you can see the bug happen.

**GATE 1 — STOP and ask:**
> "I can reproduce the bug. Here's what happens: [symptoms]. Here's how to trigger it: [steps]. Moving to investigation?"
>
> **Auto mode on?** → Show findings, continue immediately.

---

## Stage 2: Investigate

**Goal:** Find the exact line, value, or decision that causes the failure.

### Binary isolation
Start from the failure point. Trace backwards:

1. At the crash/error point — what's the value?
2. One layer up — is the data correct here?
3. Keep going back until you find where correct data becomes wrong data

### Common patterns to check

**Kotlin/Micronaut:**
- `!!` operators (banned — null safety violation)
- Either handling — is `.left()` / `.right()` correct? Missing error branch?
- Coroutine scope — is a job cancelled before it finishes?
- `newSuspendedTransaction {}` — is it wrapping the right calls?
- Soft delete — is `deleted_at IS NULL` in the query?

**React/Next.js:**
- Missing dependency in `useEffect` array
- State update after unmount
- Server/client hydration mismatch
- Missing error boundary
- Wrong key prop in list rendering

**General:**
- Race condition — does order of execution matter?
- Stale cache — is old data being served?
- Config mismatch — different values between environments?

### Form a hypothesis
Write it down: "The root cause is [X] because [evidence]."

If your first hypothesis is wrong, try the next one. **Max 3 hypotheses** before stopping and asking for help. Don't go in circles.

**GATE 2 — STOP and ask:**
> "Root cause: [one sentence]. Evidence: [what proves it]. Here's my fix plan: [approach]. Sound right?"
>
> **Auto mode on?** → Show root cause, continue to fix.

---

## Stage 3: Fix

**Goal:** Fix correctly. Make sure it can't come back.

### Step 1: Write failing test
```
Write a test that captures the exact bug scenario.
This test MUST FAIL right now — if it passes, you haven't reproduced the bug in the test.
```

Run it. Confirm red.

### Step 2: Write the minimal fix
Change as little as possible. This is a fix, not a refactor. Don't clean up nearby code. Don't "improve" things while you're here.

Run the test. Confirm green.

### Step 3: Check for similar patterns
The same mistake might exist elsewhere:
```bash
# Find code with the same pattern as the bug
grep -rn "[pattern from the bug]" --include="*.kt" --include="*.tsx" src/
```

If you find similar issues, fix them too. Each gets its own test.

### Step 4: Run full test suite
```bash
# Make sure nothing else broke
./gradlew test
# or
npm test
```

### Commit
```
fix([scope]): [root cause description]

- Root cause: [one line]
- Add regression test: [test name]
- Checked [N] similar patterns
```

**GATE 3 — STOP and ask:**
> "Fixed. [X] tests passing, including the new regression test. Found [N] similar patterns — [fixed/clean]. Ready for review?"
>
> **Auto mode on?** → Continue to Ship.

---

## Stage 4: Ship

### Review the fix
Quick self-review:
- Fix addresses root cause, not just symptom?
- No leftover debug code (log statements, commented code)?
- Test covers the exact scenario that failed?
- Similar patterns in codebase checked?

### Create PR
Clear description matters more for bug fixes than features:

```markdown
## What was broken
[User-visible symptom]

## Root cause
[One paragraph — what went wrong and why]

## Fix
[What was changed and why it fixes the root cause]

## How to verify
[Steps to confirm the bug is gone]

## Regression test
[Name of the test that guards against this]
```

**GATE 4 — Done.**
> "PR created: [link]. Bug: [symptom]. Root cause: [one line]. Fix: [one line]."

---

## Debug Report

After the PR is created, produce this summary:

```markdown
## Debug Report: [symptom]

**Root Cause:** [exact cause in one sentence]

**Why it happened:** [2-3 sentences — the chain of events]

**Fix:** [what changed and why]

**Test added:** [test name]

**Similar patterns checked:** [files checked / changes made]

**Prevention:** [what could stop this class of bug — lint rule, convention, type change, etc.]
```

---

## Rules

- **Follow the 4 stages in order.** Don't skip to fixing. Understanding comes first.
- **Never guess.** Every hypothesis needs evidence. "I think it might be..." is not enough.
- **Write a failing test before writing the fix.** Always.
- **Minimal fix.** Change as little as possible. Don't refactor while fixing.
- **Check for siblings.** The same bug pattern might exist nearby. Always look.
- **Max 3 hypotheses in Stage 2.** If none pan out, stop and ask for help. Don't spiral.
- **Small bugs don't need this workflow.** If you can see the typo, just fix it. This is for bugs that aren't obvious.
