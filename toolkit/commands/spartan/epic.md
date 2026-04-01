---
name: spartan:epic
description: Define an epic — break big work into ordered features with specs and plans
argument-hint: "[epic name]"
---

# Epic: {{ args[0] | default: "unnamed epic" }}

You are running the **Epic workflow** — break a big piece of work into ordered features, each of which goes through the full spec → plan → build cycle.

```
► Epic → Spec → [Design] → Plan → Build → Review
   ↑
 start
```

The epic gets saved to `.planning/epics/{{ args[0] | default: "epic-name" }}.md`.

---

## Step 0: Setup

```bash
mkdir -p .planning/epics
ls .planning/epics/{{ args[0] | default: "epic-name" }}.md 2>/dev/null
```

If it exists, ask:
> "An epic for **{{ args[0] }}** already exists. Want to **update** it or **start fresh**?"
>
> - A) Update — I'll show the current epic and we'll revise
> - B) Start fresh — overwrite

---

## Step 1: Understand the Big Picture

Ask these questions **one at a time**:

1. **"What are we building and why?"** — Get the big picture in 2-3 sentences. What outcome does this epic deliver?

2. **"How do we know it's done?"** — Get 2-3 concrete success criteria. Not vague ("users are happy") — specific ("users can create and manage profiles").

3. **"What are the main pieces?"** — Have the user list the features they can think of. Don't worry about order yet.

4. **"Anything risky or tricky?"** — What could block the whole epic?

---

## Step 2: Break into Features

Take the user's feature list and organize it:

1. **Order by dependency.** Feature 2 shouldn't need Feature 5.
2. **Keep features small.** Each should be 1-3 days of work. If one is bigger, split it.
3. **Write a brief for each.** 2-3 sentences: what it does, why it matters, rough scope.

Present as a table:

```markdown
| # | Feature | Depends On | Effort |
|---|---------|------------|--------|
| 1 | [name] | — | [S/M/L] |
| 2 | [name] | #1 | [S/M/L] |
| 3 | [name] | #1, #2 | [S/M/L] |
```

Ask:
> "Here's how I'd order the features. Anything to change?"
>
> **Auto mode on?** → Show the order and continue.

---

## Step 3: Fill the Epic Document

Use the `epic.md` template structure:

```markdown
# Epic: {{ args[0] }}

**Created**: [today's date]
**Status**: planning
**Owner**: [user's name or "team"]

---

## Why

[2-3 sentences from Step 1, question 1]

---

## Success Criteria

- [ ] [from Step 1, question 2]
- [ ] [criteria 2]
- [ ] [criteria 3]

---

## Features

| # | Feature | Status | Spec | Plan | Depends On |
|---|---------|--------|------|------|------------|
| 1 | [name] | todo | — | — | — |
| 2 | [name] | todo | — | — | #1 |
| 3 | [name] | todo | — | — | #1, #2 |

---

## Feature Briefs

### Feature 1: [name]
[2-3 sentences from Step 2]

### Feature 2: [name]
[2-3 sentences]

---

## Risks

- [from Step 1, question 4]

---

## Notes

- [anything else]
```

---

## Step 4: Save and Confirm

Save the epic to `.planning/epics/{{ args[0] | default: "epic-name" }}.md`.

Then tell the user:

> "Epic saved to `.planning/epics/{{ args[0] }}.md` with [N] features."
>
> **Next steps:**
>
> 1. Write specs for each feature (can do multiple before building):
> ```
> /spartan:spec [feature-1]
> /spartan:spec [feature-2]
> /spartan:ux prototype [feature-2]   ← if it has UI work
> /spartan:spec [feature-3]
> ```
>
> 2. When specs are ready, build the whole epic at once:
> ```
> /spartan:build {{ args[0] }}   ← builds all ready features, one branch, one PR
> ```
>
> Build auto-detects the epic, plans all features together, parallelizes independent ones with Agent Teams, and ships one PR.
>
> **Start with:** `/spartan:spec [first-feature-name]`

---

## Tracking Progress

When a spec or plan is written for a feature, update the epic's Features table:

| Status change | When |
|---|---|
| `todo` → `spec` | After `/spartan:spec` saves |
| `spec` → `planned` | After `/spartan:plan` saves |
| `planned` → `building` | After `/spartan:build` starts |
| `building` → `done` | After PR merged |
| any → `skipped` | User decides to skip |

The user can check progress anytime by reading `.planning/epics/{{ args[0] }}.md`.

---

## When NOT to Use This

| Situation | Use instead |
|---|---|
| Single feature | `/spartan:spec` → `/spartan:plan` → `/spartan:build` |
| Multi-week project with milestones | `/spartan:project new` (GSD lifecycle) |

Epics sit between a single feature (too small) and full GSD projects (too big). Use them for a batch of 3-8 related features.

---

## Rules

- **Ask questions one at a time.** Don't dump everything at once.
- **Keep features small.** If a feature is > 3 days, split it.
- **Order by dependency.** Feature N+1 can depend on Feature N, not the other way around.
- **Each feature gets its own spec.** The epic is the container, not the spec.
- **Update the epic as features progress.** Keep the Features table current.
- **Auto mode on?** → Skip confirmations, save directly.
