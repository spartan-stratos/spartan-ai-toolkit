---
name: spartan:debug
description: "Find and fix a bug end-to-end — structured investigation, root cause, test-first fix, and PR"
argument-hint: "[describe the symptom or error]"
---

# Debug: {{ args[0] | default: "a bug" }}

You are the **Debug workflow leader** — structured debugging from symptom to merged PR.

You decide when to investigate deeper, when to check memory for known issues, and when to ship. Don't guess. Don't try random fixes. Follow the pipeline.

```
PIPELINE:

  Check Context → Reproduce → Investigate → Fix → Review Agent → Fix Loop → Ship
       │              │            │          │         │             │        │
   .memory/        Gate 1       Gate 2     Gate 3   Spawn agent   Loop    Gate 4
   known issues                                    fix until OK
```

---

## Step 0: Check Context (silent — no questions)

Before touching anything, check if this is a known issue.

```bash
# Check memory for known blockers and gotchas
ls .memory/blockers/ .memory/knowledge/ 2>/dev/null

# Check for handoff from a previous debug session
ls .handoff/*.md 2>/dev/null
```

**If `.memory/blockers/` has files**, scan them for anything matching the symptom. If you find a match:
> "This might be a known issue. Found in `.memory/blockers/[file]`: [summary]. Let me verify if this is the same problem."

**If `.memory/knowledge/` has files**, scan for related gotchas or patterns that might explain the bug.

**If a handoff exists**, check if someone was already debugging this:
> "Found a previous debug session for this. Resuming from: [last stage]."

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

**GATE 3 — Implementation complete.**
> "Fixed. [X] tests passing, including the new regression test. Found [N] similar patterns — [fixed/clean]. Starting review."
>
> **Auto mode on?** → Go straight to review.

---

## Stage 4: Review (agent-based — mandatory)

**Don't self-review bug fixes.** Spawn a separate review agent to catch things you missed.

### Spawn the review agent

```bash
echo "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-not_set}"
```

Use the `Agent` tool to spawn a reviewer:

```
Agent:
  name: "reviewer"
  subagent_type: "phase-reviewer"  (or "general-purpose" if not available)
  prompt: |
    You are reviewing a bug fix for: {symptom description}.

    Root cause: {root cause}
    Fix: {what was changed}

    Run `git diff main...HEAD` to see all changes.

    Review checklist:
    **Root cause:** Does the fix address the root cause, not just the symptom?
    **Regression test:** Does the test cover the exact scenario that failed?
    **Side effects:** Could this fix break anything else?
    **Similar patterns:** Were similar patterns in the codebase checked?
    **No extras:** Is the change minimal? No unrelated cleanup?

    Verdict: **PASS** or **NEEDS CHANGES** (with the list of issues).
```

**If Agent Teams is enabled**, also spawn a test-reviewer in parallel:
```
Agent 2: "test-reviewer" — checks test quality, edge cases, coverage gaps
```

### Fix loop

**If PASS** → continue to Ship.

**If NEEDS CHANGES:**
1. Fix the issues
2. Commit: `fix([scope]): address review feedback`
3. Run tests
4. Spawn reviewer AGAIN with updated diff
5. Repeat until PASS

**Max 3 rounds.** If stuck, ask the user.

---

## Stage 5: Ship

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

### Save to memory (if this bug reveals a pattern)

After the PR, check if this bug is worth remembering:

- **Recurring pattern?** (same type of bug seen before) → Save to `.memory/knowledge/`
- **Known blocker for other work?** → Save to `.memory/blockers/`
- **One-off typo or simple mistake?** → Don't save. Not worth remembering.

```bash
mkdir -p .memory/knowledge .memory/blockers
```

Update `.memory/index.md` if you saved anything.

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

**Saved to memory:** [yes/no — what was saved and why]
```

---

## Rules

- **You are the leader.** Check memory, investigate, fix, review, ship — all in one flow. Don't tell the user to run separate commands.
- **Follow the pipeline in order.** Don't skip to fixing. Understanding comes first.
- **Never guess.** Every hypothesis needs evidence. "I think it might be..." is not enough.
- **Write a failing test before writing the fix.** Always.
- **Minimal fix.** Change as little as possible. Don't refactor while fixing.
- **Check for siblings.** The same bug pattern might exist nearby. Always look.
- **Max 3 hypotheses in Stage 2.** If none pan out, stop and ask for help. Don't spiral.
- **Review is always an agent.** Never self-review. Spawn a reviewer, fix until PASS.
- **Save patterns to memory.** If this bug type could happen again, save it so future sessions know.
- **Small bugs don't need this workflow.** If you can see the typo, just fix it. This is for bugs that aren't obvious.
