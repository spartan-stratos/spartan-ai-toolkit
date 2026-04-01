---
name: spartan:plan
description: Write an implementation plan — reads spec, designs architecture, breaks into tasks, runs Gate 2
argument-hint: "[feature name]"
---

# Plan: {{ args[0] | default: "unnamed feature" }}

You are running the **Plan workflow** — turn a spec into a concrete implementation plan with architecture, file locations, and ordered tasks.

```
Epic → Spec → [Design] → ► Plan → Build → Review
                               ↑
                             Gate 2
```

The plan gets saved to `.planning/plans/{{ args[0] | default: "feature-name" }}.md`.

---

## Step 0: Find the Spec

Look for the spec in this order:
1. `.planning/specs/{{ args[0] | default: "feature-name" }}.md`
2. If not found, ask: "No spec found for **{{ args[0] }}**. Want to:"
   - A) Write the spec first → `/spartan:spec {{ args[0] }}`
   - B) Give me a quick description and I'll plan from that (skip spec)

If spec exists, read it. Confirm:
> "Found spec: `.planning/specs/{{ args[0] }}.md`. Planning from this."

Also check:
```bash
mkdir -p .planning/plans
ls .planning/plans/{{ args[0] | default: "feature-name" }}.md 2>/dev/null
```

If a plan already exists, ask:
> "A plan for **{{ args[0] }}** already exists. Want to **update** it or **start fresh**?"

---

## Step 1: Detect Stack

Same auto-detect as `/spartan:build`:
```bash
ls build.gradle.kts settings.gradle.kts 2>/dev/null && echo "STACK:kotlin-micronaut"
ls package.json 2>/dev/null && cat package.json 2>/dev/null | grep -q '"next"' && echo "STACK:nextjs-react"
```

| Detected | Mode |
|----------|------|
| Kotlin only | Backend plan |
| Next.js only | Frontend plan |
| Both | Ask: "Backend, frontend, or full-stack plan?" |
| Neither | Ask the user |

---

## Step 2: Design Architecture

Based on the spec and detected stack, lay out:

### Components Table
List every component this feature needs:
```markdown
| Component | Type | Purpose |
|-----------|------|---------|
| [Name] | [Controller / Manager / Service / Repository / Component / Hook / etc.] | [what it does] |
```

### File Locations Table
Where every file goes:
```markdown
| File | Location | Purpose |
|------|----------|---------|
| [file name] | [directory path] | [what it does] |
```

### Files to Change
Existing files that need changes:
```markdown
| File | What Changes | Why |
|------|-------------|-----|
| [file path] | [description] | [reason] |
```

**Backend plans** follow: Controller → Manager → Repository (layered architecture).
**Frontend plans** follow: Types → Components → Pages → State.
**Full-stack plans** do backend first, then frontend. Mark the integration point.

---

## Step 3: Break into Tasks

Split the work into phases with ordered tasks.

### Phase ordering by stack:

**Backend:** Database → Business Logic → API → Tests
**Frontend:** Types/Interfaces → Components → Pages/Routes → Tests
**Full-stack:** Database → API → Types → Components → Integration → Tests

### Task rules:
- Each task: max 3 files, one commit
- Each task has: description, files, what to test
- Group into phases by dependency
- Mark parallel vs sequential

### Format:
```markdown
### Phase 1: [name]

| # | Task | Files |
|---|------|-------|
| 1 | [description] | [file(s)] |
| 2 | [description] | [file(s)] |

### Phase 2: [name] (depends on Phase 1)

| # | Task | Files |
|---|------|-------|
| 3 | [description] | [file(s)] |
```

### Parallel vs Sequential table:
```markdown
| Parallel Group | Tasks | Why |
|---------------|-------|-----|
| Group A | 1, 2 | independent files |

| Sequential | Depends On | Why |
|-----------|-----------|-----|
| Task 3 | Task 1, 2 | needs their output |
```

---

## Step 4: Testing Plan

Map tests from the spec's testing criteria:

- **Data layer tests** — insert, read, update, soft delete, query filters
- **Business logic tests** — happy path, error cases, validation
- **API / integration tests** — endpoints, auth, invalid input
- **UI tests** (if applicable) — render, interaction, states

Each test ties back to a spec requirement or edge case.

---

## Step 5: Run Gate 2

Before saving, run the Gate 2 checklist from `quality-gates.md`:

**Architecture:**
- [ ] Follows the project's existing architecture patterns
- [ ] Each layer only calls the layer below it
- [ ] Components are in the right directories

**Task Breakdown:**
- [ ] All files to change are listed
- [ ] All new files are listed with their locations
- [ ] Each task is small (one file or one function)
- [ ] Dependencies between tasks are clear
- [ ] Parallel vs sequential tasks are marked

**Testing:**
- [ ] Data layer tests planned
- [ ] Business logic tests planned
- [ ] API/integration tests planned
- [ ] UI tests planned (if applicable)
- [ ] Edge cases from spec are covered in test plan

If any item fails → fix it before saving.

---

## Step 6: Save and Confirm

Save the plan to `.planning/plans/{{ args[0] | default: "feature-name" }}.md`.

Set the metadata:
```
**Spec**: .planning/specs/{{ args[0] }}.md
**Epic**: [epic name or "none"]
**Created**: [today's date]
**Status**: draft
```

Then tell the user:

> "Plan saved to `.planning/plans/{{ args[0] }}.md` — Gate 2 passed."
>
> **Next steps:**
> - Small feature (1-4 tasks)? → `/spartan:build {{ args[0] }}`
> - Big feature (5+ tasks)? → `/spartan:phase execute N`
> - Want a dual-agent review first? → `/spartan:gate-review`

---

## Rules

- **Read the spec first.** Don't invent requirements the spec doesn't have.
- **Match the codebase.** Check existing patterns before proposing architecture. Run searches to find how similar features are built.
- **Small tasks.** Each task = one commit, max 3 files, completable in minutes not hours.
- **Gate 2 is not optional.** Every plan must pass before saving.
- **Auto mode on?** → Skip confirmations, show the plan and save it directly.
- **Link back to spec.** Every task should trace to a spec requirement. If a task doesn't come from the spec, question why it's there.
