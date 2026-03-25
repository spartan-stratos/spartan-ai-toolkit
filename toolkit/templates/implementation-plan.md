# Plan: [Feature Name]

> **Workflow position:** Plan defines HOW to build it. It turns the spec into tasks with clear architecture, file locations, and dependencies. After this passes Gate 2, start building.
>
> ```
> Epic → Spec → [Design] → ► Plan → Build → Review
>                                ↑
>                              Gate 2
> ```

**Spec**: [path to spec file]
**Epic**: [epic name or "none"]
**Created**: [date]
**Status**: draft | ready | approved

---

## Architecture

How does this fit into the existing system?

### Components

List the main components this feature needs. Adapt to your stack.

| Component | Type | Purpose |
|-----------|------|---------|
| [Name] | [Controller / Service / Repository / Component / Hook / etc.] | [what it does] |
| [Name] | [Controller / Service / Repository / Component / Hook / etc.] | [what it does] |
| [Name] | [Controller / Service / Repository / Component / Hook / etc.] | [what it does] |

### Where Things Go

| File | Location | Purpose |
|------|----------|---------|
| [file name] | [directory path] | [what it does] |
| [file name] | [directory path] | [what it does] |

---

## Files to Change

Existing files that need changes:

| File | What Changes | Why |
|------|-------------|-----|
| [file path] | [description] | [reason] |

---

## New Files

Files to create:

| File | Purpose |
|------|---------|
| [file path] | [what it does] |

---

## Task Breakdown

Ordered list of tasks. Each task should be small enough for one person or agent to do.

Organize into phases that make sense for your stack. Some examples:

**Backend features:** Database → Business Logic → API → Tests
**Frontend features:** Components → Pages/Routes → State/Data → Tests
**Full-stack features:** Database → API → Components → Integration → Tests

### Phase 1: [name]

| # | Task | Files |
|---|------|-------|
| 1 | [task description] | [file(s)] |
| 2 | [task description] | [file(s)] |

### Phase 2: [name]

| # | Task | Files |
|---|------|-------|
| 3 | [task description] | [file(s)] |
| 4 | [task description] | [file(s)] |

### Phase 3: [name]

| # | Task | Files |
|---|------|-------|
| 5 | [task description] | [file(s)] |
| 6 | [task description] | [file(s)] |

---

## Parallel vs Sequential

Which tasks can run at the same time?

| Parallel Group | Tasks | Why |
|---------------|-------|-----|
| Group A | [tasks] | [they don't depend on each other] |
| Group B | [tasks] | [they don't depend on each other] |

| Sequential | Depends On | Why |
|-----------|-----------|-----|
| Task [N] | Task [M] | [reason] |

---

## Risk Areas

What's tricky? What could break?

- [risk 1]: [how to handle]
- [risk 2]: [how to handle]

---

## Testing Plan

Adapt these categories to your stack:

### Data Layer Tests
- Insert + read back
- Update fields
- Delete behavior
- Query filters

### Business Logic Tests
- Happy path for each method
- Error cases (not found, validation failures)

### API / Integration Tests
- Each endpoint or route works correctly
- Auth/permission checks
- Invalid input returns proper errors

### UI Tests (if applicable)
- Component renders correctly
- User interactions work
- Loading/error/empty states

---

## Checklist Before Starting

- [ ] Read the spec
- [ ] Read project coding rules
- [ ] Check existing codebase for similar patterns
- [ ] Understand the data model

---

## Tips

- **Small tasks** — each task should take minutes, not hours
- **Clear dependencies** — know what has to finish before what
- **List ALL files** — don't leave anyone guessing where things go
- **Match architecture** — follow the project's existing patterns
- **Plan defines HOW** — architecture, files, and task order go here. WHAT to build is in the spec.
