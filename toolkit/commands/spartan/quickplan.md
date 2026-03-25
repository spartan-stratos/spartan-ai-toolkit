---
name: spartan:quickplan
description: Fast-forward planning — scaffold spec + plan + branch in one shot for tasks too small for full GSD lifecycle but too important to skip planning.
argument-hint: "[task description]"
---

# Quick Plan: {{ args[0] }}

You are running a **fast-forward planning session** — inspired by OpenSpec's `/opsx:ff`.
Goal: go from idea → actionable plan in one pass, without multi-step ceremony.

This command is for tasks that are:
- Too small for a full GSD milestone (< 1 day of work)
- Too important to just "vibe code" without a plan
- Self-contained with clear scope

---

## Step 1: Research (parallel, 2 min)

Run these two investigations simultaneously using subagents:

**Subagent A — Codebase scan:**
- Find all files relevant to: {{ args[0] }}
- Identify existing patterns, conventions already in use
- Note any tests that might be affected

**Subagent B — Impact analysis:**
- What could break?
- Any DB migrations needed?
- API contract changes?
- Dependencies between services?

---

## Step 2: Generate Spec (inline, no file needed)

Present a concise spec in this format. Keep it under 30 lines:

```markdown
## Spec: [task name]

**Goal:** [one sentence — what success looks like]

**Scope:**
- IN: [what will be built]
- OUT: [what is explicitly NOT in scope]

**Acceptance criteria:**
1. [testable criterion]
2. [testable criterion]
3. [testable criterion]

**Approach:** [2-3 sentences on implementation approach]

**Risks / unknowns:** [any?]
```

Ask: "Does this spec match your intent? Any changes before we plan?"
**Auto mode on?** → Skip this question, continue immediately. Show spec but don't wait.
**Auto mode off (default)?** → Wait for approval. If the user says "yes" / "go" / "lgtm" → continue.

---

## Step 3: Generate Plan (immediately after spec approval)

Break into **max 4 atomic tasks**. Each task must:
- Be completable in one commit
- Have a clear verification step
- Follow TDD (test first)

Format:
```markdown
## Plan: [task name]
Branch: feature/[ticket-or-slug]

### Task 1: [name]
Files: [exact file paths]
Test first: [what test to write]
Implementation: [what to change]
Commit: feat([scope]): [message]
Verify: [how to confirm it works]

### Task 2: ...
```

---

## Step 4: Create branch + first test

```bash
git checkout -b feature/[slug]
```

Then immediately write the first failing test for Task 1.
Do NOT write any production code yet.

Show the red test output, then:
**Auto mode on?** → Immediately start executing task by task. Don't wait.
**Auto mode off?** → Say "Plan is ready. Say **'go'** to start executing task by task, or **'adjust'** to modify the plan."

---

## Execution mode (after "go")

Execute each task in sequence:
1. Write test → confirm it fails (red)
2. Write minimal implementation → confirm test passes (green)
3. Refactor if needed
4. Commit with atomic message
5. Show summary, move to next task

After all tasks: run full test suite, then say:
"All tasks complete. Ready for `/spartan:pr-ready` to prep the PR."

## Rules

- Max 4 tasks — if you need more, the scope is too big for quickplan
- Every task must be one commit
- Test first (TDD) — write the failing test before the implementation
- Don't skip the spec approval step unless auto mode is on
- Keep the spec under 30 lines — if it's longer, use `/spartan:phase` instead
