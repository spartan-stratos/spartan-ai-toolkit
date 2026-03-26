# Epic: [Epic Name]

> **Workflow position:** Epic is the starting point. After filling this in, write a **feature spec** (`feature-spec.md`) for each feature listed below.
>
> ```
> ► Epic → Spec → [Design] → Plan → Build → Review
> ```

**Created**: [date]
**Status**: planning | in-progress | done
**Owner**: [who owns this]

---

## Why

What are we building and why? What's the big picture?

[2-3 sentences. Be specific about the outcome.]

---

## Success Criteria

How do we know the epic is done?

- [ ] [criteria 1]
- [ ] [criteria 2]
- [ ] [criteria 3]

---

## Features

Ordered list of features. Each one becomes a spec → plan → build cycle.

| # | Feature | Status | Spec | Plan | Depends On |
|---|---------|--------|------|------|------------|
| 1 | [feature name] | todo | — | — | — |
| 2 | [feature name] | todo | — | — | #1 |
| 3 | [feature name] | todo | — | — | #1, #2 |

### Status values
- `todo` — not started
- `spec` — spec written, not built yet
- `planned` — plan written, not built yet
- `building` — currently being built
- `done` — built, reviewed, merged
- `skipped` — decided not to build

---

## Feature Briefs

Short description of each feature. Enough to write a spec from.

### Feature 1: [name]
[2-3 sentences: what it does, why it matters, rough scope]

### Feature 2: [name]
[2-3 sentences]

### Feature 3: [name]
[2-3 sentences]

---

## Risks

What could block us or go wrong?

- [risk 1]: [how to handle]
- [risk 2]: [how to handle]

---

## Notes

- [note]

---

## Tips

- **Start with why** — what problem does the whole epic solve?
- **Order by dependency** — feature 2 shouldn't need feature 5
- **Keep features small** — each one should be 1-3 days of work, not a month
- **Be clear about scope** — what's in, what's out
- **Feature briefs matter** — they're the seed for each spec session

---

## When to Use This vs Other Templates

| Situation | Use |
|-----------|-----|
| Big feature set (3+ features, multi-week) | This epic template |
| Single feature (1-3 days) | Skip epic, start with `feature-spec.md` |
| Quick task (< 1 day) | Skip epic, use `/spartan:spec` → `/spartan:build` |
| Product-level vision doc for stakeholders | Use `prd-template.md` instead |
