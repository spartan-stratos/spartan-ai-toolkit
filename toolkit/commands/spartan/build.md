---
name: spartan:build
description: "Build a new feature end-to-end — backend, frontend, or full-stack with auto-detection"
argument-hint: "[backend|frontend] [feature description]"
preamble-tier: 4
---

# Build: {{ args[0] | default: "a new feature" }}

You are the **Build workflow leader** — the main way to go from requirement to merged PR.

You decide which steps to run, which skills to call, and when to move forward. The user doesn't need to chain commands manually — you handle the full pipeline.

```
PIPELINE:

  Check Context → Spec → Design? → Plan → Implement → Review → Ship
       │            │        │         │        │          │       │
   .memory/    Gate 1    Design    Gate 2   Gate 3    Gate 3.5  Gate 4
   .planning/           Gate (UI)
```

**Fast path:** For small work (< 1 day, ≤ 4 tasks), you do spec + plan inline. No separate commands needed.
**Full path:** For bigger work, you call `/spartan:spec`, `/spartan:design`, `/spartan:plan` as sub-steps.

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

## Step 0.5: Check Context (silent — no questions)

Before doing anything, check what already exists for this feature.

```bash
# Check memory for relevant decisions/patterns
ls .memory/index.md 2>/dev/null
ls .memory/decisions/ .memory/patterns/ .memory/knowledge/ .memory/blockers/ 2>/dev/null

# Check for existing artifacts
ls .planning/specs/*.md 2>/dev/null
ls .planning/designs/*.md 2>/dev/null
ls .planning/plans/*.md 2>/dev/null

# Check for handoff from a previous session
ls .handoff/*.md 2>/dev/null
```

**If `.memory/index.md` exists**, read it. Look for decisions or patterns related to this feature. If you find something relevant, mention it:
> "Found relevant context in `.memory/`: [brief summary]. Using this."

**If a handoff exists**, read it. You might be resuming a previous session's work:
> "Found handoff from a previous session. Resuming from: [last stage]."

**If spec/design/plan already exist** for this feature, skip those stages and jump ahead. Show what you found:
> "Found: spec ✓, design ✓, plan ✓ — jumping to Implement."

---

## Stage 1: Understand (Spec)

### Size check first

Before asking anything, estimate the size from the user's description:

- **Small** (< 1 day, ≤ 4 tasks, ≤ 3 files) → **Fast path** — inline spec below
- **Big** (multi-day, 5+ tasks, new tables + endpoints + UI) → **Full path** — run `/spartan:spec`

**How to decide:**
- Adding a column + updating one endpoint = small
- New feature with migration + service + controller + frontend = big
- If unclear, ask one question: "Quick estimate — is this a few hours or multiple days?"

### Fast path (small work)

Ask 3 forcing questions. Always. Even in auto mode.

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

### Full path (big work)

Tell the user and run the spec command internally:
> "This is bigger work — let me run a proper spec first."

Use the approach from `/spartan:spec` — ask questions one at a time, fill the template, run Gate 1, save to `.planning/specs/`.

Then continue to the next stage automatically (don't tell the user to run a separate command).

**GATE 1 — STOP and ask:**
> "Here's the scope. Anything to change before I plan?"
>
> **Auto mode on?** → Show scope, continue immediately without waiting.

---

## Stage 1.5: Design (UI work only — auto-detected)

**Only runs if the feature has UI work.** Skip entirely for pure backend.

Check if this feature needs a design:
- Frontend mode? → Yes
- Full-stack mode with UI changes? → Yes
- Backend only? → Skip this stage

Check if a design already exists:
```bash
ls .planning/designs/*.md 2>/dev/null
```

If no design exists and UI work is needed:
> "This has UI work. Want me to create a design doc?"
>
> - **A) Yes** — I'll run the design workflow (dual-agent review with design-critic)
> - **B) Skip** — I'll design as I build (fine for simple UI changes)
> - **C) I have Figma designs** — point me to them

If user picks A → use the approach from `/spartan:design` internally. Run the full design workflow including the design-critic agent review.

If user picks B → continue to Plan.

If user picks C → read the Figma reference and use it as the design source.

**Auto mode on?** → Skip for small UI changes (adding a column to a table, a toggle). Run for new screens/pages.

---

## Stage 2: Plan

### Check for saved plan

If a plan already exists for this feature, use it:
> "Found plan: `.planning/plans/{name}.md` — using it."

If no plan exists, do the size check:

### Fast path (small — 1-4 tasks)

Produce an inline plan:

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

**Max 4 tasks for inline plan.** If you need more, use the full path.

### Full path (big — 5+ tasks)

Use the approach from `/spartan:plan` internally — architecture design, file locations, phased tasks with parallel/sequential marking. Save to `.planning/plans/`.

Then continue automatically.

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
> If 3+ tasks were completed: "I'll run a self-review now. For a deeper dual-agent review, say 'gate review'."
>
> **Auto mode on?** → Continue to Review immediately.

---

## Stage 3.5: Review (auto-runs)

This stage runs automatically after implementation. You don't wait for the user to run a separate review command.

### Self-review
- **Backend code** → use the approach from `/spartan:review`
- **Frontend code** → use the approach from `/spartan:fe-review`
- **Both** → review backend first, then frontend

Fix any issues found during review. Commit fixes separately:
```
fix([scope]): [what review caught]
```

### Dual-agent review (optional, on request)
If the user says "gate review" or if the feature is large (5+ tasks), offer to spawn the gate-review approach:
> "Want a dual-agent gate review? This spawns a reviewer agent for a second opinion."

If yes → use the approach from `/spartan:gate-review` internally.

---

## Stage 4: Ship

### Create PR
Run the approach from `/spartan:pr-ready`:
- Rebase onto main
- Run all checks one final time
- Create PR with clear title, summary, and test plan

### Save to memory (if something notable was learned)

After the PR is created, check if this build revealed anything worth remembering:

- **New pattern discovered?** → Save to `.memory/patterns/`
- **Architecture decision made?** → Save to `.memory/decisions/`
- **Gotcha or workaround found?** → Save to `.memory/knowledge/`
- **Nothing notable?** → Skip. Don't save noise.

```bash
mkdir -p .memory/decisions .memory/patterns .memory/knowledge
```

Update `.memory/index.md` if you saved anything.

**GATE 4 — Done.**
> "PR created: [link]. Here's what's in it: [summary]."

---

## Resume: Picking Up Where You Left Off

If a previous session was interrupted (context overflow, user stopped, etc.), this workflow can resume.

**How resume works:**
1. Step 0.5 checks for `.handoff/` files and existing `.planning/` artifacts
2. Determine which stage was completed last:
   - Has spec but no plan → resume at Stage 2 (Plan)
   - Has plan but no commits on feature branch → resume at Stage 3 (Implement)
   - Has commits but no PR → resume at Stage 4 (Ship)
3. Show the user: "Resuming from [stage]. Here's what was done: [summary]."
4. Continue from that point.

**Don't re-do completed stages.** Read the saved artifacts and move forward.

---

## Rules

- **You are the orchestrator.** Don't tell the user to run `/spartan:spec` or `/spartan:plan` separately. Run those approaches yourself when needed.
- **Fast path is the default for small work.** If the whole thing is 1-4 tasks, do everything inline. Don't force the user through 3 separate commands.
- **Full path for big work.** If 5+ tasks, save artifacts to `.planning/` so future sessions can pick up.
- **Gates are mandatory.** Even small features go through all stages. The stages are fast for small work — that's fine.
- **TDD by default.** Write the test first. Override only when test-first doesn't make sense for that specific task.
- **One commit per task.** Don't batch. Each task = one commit with a clear message.
- **Security check always runs.** Whether backend or frontend, security patterns get checked during review.
- **Frontend checks for backend needs.** If a new page needs data that doesn't exist yet, say so at Stage 2 and add backend tasks first.
- **Don't over-plan.** If the whole thing is 1-2 files and 30 minutes of work, don't force it into this workflow. Just do it. This workflow is for features that need structure — at least 2-3 tasks.
- **Save state for big work.** If 5+ tasks, save artifacts to `.planning/` so future sessions can resume.
