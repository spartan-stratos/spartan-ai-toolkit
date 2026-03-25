---
name: spartan:build
description: "Build a new feature end-to-end — backend, frontend, or full-stack with auto-detection"
argument-hint: "[backend|frontend] [feature description]"
---

# Build: {{ args[0] | default: "a new feature" }}

You are running the **Build workflow** — the main way to go from requirement to merged PR.

This workflow has 4 stages with gates between each. Don't skip ahead.

```
STAGE 1: UNDERSTAND        STAGE 2: PLAN           STAGE 3: IMPLEMENT        STAGE 4: SHIP
───────────────────       ──────────────          ──────────────────        ──────────────
3 forcing questions       Size check:             Task by task, TDD         Self-review
Scope: in / out           Small → inline plan     Right skills per stack    Fix issues found
Stack detection           Big → full /phase       Tests after each task     Create PR

Gate 1                    Gate 2                  Gate 3                    Gate 4
"Scope right?"            "Plan good?"            "Tests pass?"             "PR created"
```

---

## Step 0: Detect Mode & Stack (silent — no questions)

Parse the user's input to find the mode:
- First arg is `backend` or `be` → **backend mode**
- First arg is `frontend` or `fe` → **frontend mode**
- No mode given → **auto-detect**

**Auto-detect logic** (check the project files):
```bash
ls build.gradle.kts settings.gradle.kts 2>/dev/null && echo "STACK:kotlin-micronaut"
ls package.json 2>/dev/null && cat package.json 2>/dev/null | grep -q '"next"' && echo "STACK:nextjs-react"
ls .planning/PROJECT.md 2>/dev/null && echo "GSD_ACTIVE"
```

| Detected | Mode |
|----------|------|
| Kotlin only | Backend |
| Next.js only | Frontend |
| Both | Ask: "This is a full-stack project. Is this feature backend, frontend, or both?" |
| Neither | Ask the user what stack they're using |

**Check for installed skills:**
- If backend mode but no `kotlin-best-practices` skill found → warn: "You don't have the backend pack installed. Run `/spartan:update` and add it, or continue without stack-specific guidance."
- If frontend mode but no `ui-ux-pro-max` skill found → same warning for frontend pack.

---

## Stage 1: Understand

**Ask 3 forcing questions. Always. Even in auto mode.**

1. **"What pain does this solve?"** — Not the feature. The pain. If the user says "add a profiles endpoint" ask what user problem it fixes.
2. **"What's the narrowest version we can ship?"** — Force MVP thinking. Cut scope until it hurts.
3. **"What assumption could be wrong?"** — Surface hidden risks early.

After the user answers, produce a scope block:

```markdown
## Scope: [feature name]

**Pain:** [one sentence]
**Stack:** [backend / frontend / full-stack] — [Kotlin+Micronaut / Next.js+React / both]

**IN:**
- [what will be built]
- [what will be built]

**OUT:**
- [what is NOT in scope]
- [what is NOT in scope]

**Risk:** [the assumption that could be wrong]
```

**GATE 1 — STOP and ask:**
> "Here's the scope. Anything to change before I plan?"
>
> **Auto mode on?** → Show scope, continue immediately without waiting.

---

## Stage 2: Plan

### Size check

Count the expected work:
- **Small** (1-4 tasks, < 1 day): Inline plan right here. Like a mini-quickplan.
- **Big** (5+ tasks, multi-day): Use `/spartan:phase plan` for a full wave-parallel plan.

### Inline plan format (small features)

```markdown
## Plan: [feature name]
Branch: `feature/[slug]`

### Task 1: [name]
Files: [exact paths]
Test first: [what test to write]
Implementation: [what to change]
Verify: [how to confirm]

### Task 2: [name]
...
```

**Max 4 tasks for inline plan.** If you need more, it's a big feature — use `/spartan:phase`.

### What the plan includes (by mode)

**Backend mode** — tasks follow this order:
1. Migration (if new/changed table)
2. Entity + Table object + Repository + repo tests
3. Service/Manager + service tests
4. Controller + integration tests

Uses skills: `database-patterns`, `api-endpoint-creator`, `kotlin-best-practices`, `testing-strategies`, `security-checklist`

**Frontend mode** — tasks follow this order:
1. Types / interfaces
2. API client (if new endpoints needed — flag that backend work may be needed first)
3. Components (bottom-up: small → composed → page-level)
4. Page + routing + tests

Uses skills: `ui-ux-pro-max`, frontend rules

**Full-stack mode** — backend tasks first, then frontend tasks. Mark the integration point clearly (where frontend starts depending on backend API).

### Create branch

```bash
git checkout -b feature/[slug]
```

Write the first failing test for Task 1. Show it fails.

**GATE 2 — STOP and ask:**
> "Plan has [N] tasks. Does this make sense?"
>
> **Auto mode on?** → Show plan, start executing immediately.

---

## Stage 3: Implement

Execute each task in order:

### For each task:
1. **Write test** → run it → confirm it fails (red)
2. **Write code** → run test → confirm it passes (green)
3. **Refactor** if needed (tests still green)
4. **Commit** with an atomic message:
   ```
   feat([scope]): [what this task does]
   ```
5. Brief status: "Task [N]/[total] done. Moving to next."

### TDD override
If a task is hard to test-first (UI components, config changes), say so and switch to implement-then-test. But always have a test when the task is done.

### Skill routing during implementation

Call the right skills based on what you're doing:

| Working on... | Use skill |
|---------------|-----------|
| Database migration | `database-patterns` |
| New endpoint | `api-endpoint-creator` |
| Kotlin code | `kotlin-best-practices` |
| Writing tests | `testing-strategies` |
| React components | `ui-ux-pro-max` |
| Security-sensitive code | `security-checklist` |

### After all tasks

Run the full test suite:
```bash
# Backend
./gradlew test

# Frontend
npm test

# Both
./gradlew test && npm test
```

**GATE 3 — STOP and ask:**
> "All [N] tasks done. [X] tests passing. Ready for review?"
>
> **Auto mode on?** → Continue to Ship immediately.

---

## Stage 4: Ship

### Self-review
- **Backend code** → use the approach from `/spartan:review`
- **Frontend code** → use the approach from `/spartan:fe-review`
- **Both** → review backend first, then frontend

Fix any issues found during review. Commit fixes separately:
```
fix([scope]): [what review caught]
```

### Create PR
Run the approach from `/spartan:pr-ready`:
- Rebase onto main
- Run all checks one final time
- Create PR with clear title, summary, and test plan

**GATE 4 — Done.**
> "PR created: [link]. Here's what's in it: [summary]."

---

## Rules

- **Always start at Stage 1.** Don't skip the 3 questions. They prevent building the wrong thing.
- **Gates are mandatory.** Even small features go through all 4 stages. The stages are fast for small work — that's fine.
- **TDD by default.** Write the test first. Override only when test-first doesn't make sense for that specific task.
- **One commit per task.** Don't batch. Each task = one commit with a clear message.
- **Security check always runs.** Whether backend or frontend, security patterns get checked at the end of Stage 3.
- **Frontend checks for backend needs.** If a new page needs data that doesn't exist yet, say so at Stage 2 and add backend tasks first.
- **Don't over-plan.** If the whole thing is 1-2 files and 30 minutes of work, don't force it into this workflow. Just do it. This workflow is for features that need structure — at least 2-3 tasks.
