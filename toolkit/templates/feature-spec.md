# Spec: [Feature Name]

> **Workflow position:** Spec defines WHAT to build. After this passes Gate 1, create a **design doc** (if UI feature) or go straight to the **implementation plan** (`implementation-plan.md`).
>
> ```
> Epic → ► Spec → [Design] → Plan → Build → Review
>              ↑
>            Gate 1
> ```

**Created**: [date]
**Status**: draft | ready | approved
**Author**: [who wrote this]
**Epic**: [epic name or "none"]

---

## Problem

What problem are we solving? Why does it matter?

[Describe the problem in 2-3 sentences. Be specific.]

---

## Goal

What does success look like? How do we know we're done?

[Describe the end state. What can users do that they couldn't before?]

---

## User Stories

Who uses this and why?

- As a [role], I want to [action] so that [benefit]
- As a [role], I want to [action] so that [benefit]

---

## Requirements

### Must Have
- [requirement 1]
- [requirement 2]

### Nice to Have
- [requirement]

### Out of Scope
- [what we're NOT building]
- [what we're NOT changing]

---

## Data Model

What data do we need? New tables? Changes to existing tables?

*Skip this section if the feature doesn't touch the database.*

### New Tables

| Table | Purpose |
|-------|---------|
| [table_name] | [what it stores] |

### Table Schema

```sql
CREATE TABLE [table_name] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns here
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### Changes to Existing Tables

| Table | Change | Why |
|-------|--------|-----|
| [table] | [add/modify/remove column] | [reason] |

---

## API Changes

What endpoints are needed?

*Skip this section if the feature doesn't add or change APIs.*

### New Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/v1/[path] | [what it does] |
| POST | /api/v1/[path] | [what it does] |

### Request/Response Examples

```json
// GET /api/v1/[path]?param=value
// Response:
{
  "field_name": "value",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Changes to Existing Endpoints

| Endpoint | Change | Why |
|----------|--------|-----|
| [endpoint] | [what changes] | [reason] |

---

## UI Changes

What screens or components are affected?

*Skip this section if the feature is backend-only. For detailed UI work, create a design doc (`design-doc.md`) after this spec passes Gate 1.*

- [screen/component 1]: [what changes]
- [screen/component 2]: [what changes]

---

## Edge Cases

What could go wrong? What are the weird scenarios?

- [edge case 1]: [how to handle it]
- [edge case 2]: [how to handle it]
- [edge case 3]: [how to handle it]

---

## Testing Criteria

How do we know this works?

### Happy Path Tests
- [test 1]
- [test 2]

### Edge Case Tests
- [test 1]
- [test 2]

### Integration Tests
- [test 1]

---

## Dependencies

What does this need to work?

- [dependency 1]: [why]
- [dependency 2]: [why]

---

## Notes

- [note]

---

## Tips

- **Be specific** — "fast" is vague, "under 200ms" is specific
- **List what's out of scope** — prevents scope creep
- **Include edge cases** — think about nulls, empty lists, concurrent access
- **Match existing patterns** — check how similar features are built in the codebase
- **Spec defines the contract** — data model and API shapes go here. Architecture and file structure go in the plan.
