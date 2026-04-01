---
name: spartan:spec
description: Write a feature spec — interactive Q&A, saves to .planning/specs/, runs Gate 1
argument-hint: "[feature name]"
---

# Spec: {{ args[0] | default: "unnamed feature" }}

You are running the **Spec workflow** — turn a feature idea into a clear, written spec that other commands (`/spartan:plan`, `/spartan:build`) can use.

The spec gets saved to `.planning/specs/{{ args[0] | default: "feature-name" }}.md`.

---

## Step 0: Setup

Create the directory if it doesn't exist:
```bash
mkdir -p .planning/specs
```

Check if a spec already exists:
```bash
ls .planning/specs/{{ args[0] | default: "feature-name" }}.md 2>/dev/null
```

If it exists, ask:
> "A spec for **{{ args[0] }}** already exists. Want to **update** it or **start fresh**?"
>
> - A) Update — I'll show you the current spec and we'll revise it
> - B) Start fresh — overwrite with a new spec

---

## Step 1: Understand the Problem

Ask these questions **one at a time**, not all at once. Wait for an answer before the next question.

1. **"What problem does this solve?"** — Not the feature. The pain. If the user says "add a profiles endpoint", ask what user problem it fixes.

2. **"Who's affected and how?"** — Get at least one concrete user story. Push for specifics: role, action, benefit.

3. **"What's out of scope?"** — Force the user to draw a line. What are we NOT building? This prevents scope creep later.

4. **"Any data or API changes needed?"** — Only ask if it's backend-touching. Skip for pure frontend or config changes.

5. **"What could go wrong?"** — Get at least 3 edge cases. Prompt with examples if the user is stuck: "What about empty data? Concurrent access? Permission denied?"

---

## Step 2: Fill the Template

Use the `feature-spec.md` template structure. Fill in every section from the user's answers.

The spec must have:
- **Problem** — 2-3 sentences, specific
- **Goal** — what success looks like
- **User Stories** — at least 1, in "As a [role]..." format
- **Requirements** — must-have, nice-to-have, out of scope
- **Data Model** — if applicable (tables, columns, types)
- **API Changes** — if applicable (endpoints, request/response)
- **UI Changes** — if applicable (screens, components)
- **Edge Cases** — at least 3
- **Testing Criteria** — happy path + edge case tests
- **Dependencies** — what this needs to work

Set the metadata:
```
**Created**: [today's date]
**Status**: draft
**Author**: [user's name or "team"]
**Epic**: [epic name if part of one, otherwise "none"]
```

---

## Step 3: Run Gate 1

Before saving, run the Gate 1 checklist from `quality-gates.md`:

**Completeness:**
- [ ] Problem is clearly stated (not vague)
- [ ] Goal is specific and measurable
- [ ] At least one user story exists
- [ ] Requirements split into must-have, nice-to-have, out of scope
- [ ] Out of scope section exists

**Data Model** (if applicable):
- [ ] New tables have standard columns (id, timestamps)
- [ ] Column types are correct
- [ ] Soft delete strategy is defined

**API Design** (if applicable):
- [ ] Endpoints follow project naming convention
- [ ] Request/response examples included
- [ ] JSON field naming matches project convention

**Quality:**
- [ ] Edge cases listed (at least 3)
- [ ] Testing criteria for happy path
- [ ] Testing criteria for edge cases
- [ ] Dependencies listed

If any item fails → fix it before saving. Don't skip the gate.

---

## Step 4: Save and Confirm

Save the spec to `.planning/specs/{{ args[0] | default: "feature-name" }}.md`.

Then tell the user:

> "Spec saved to `.planning/specs/{{ args[0] }}.md` — Gate 1 passed."
>
> **Next steps:**
> - Has UI work? → `/spartan:ux prototype {{ args[0] }}`
> - Ready to plan? → `/spartan:plan {{ args[0] }}`
> - Part of a bigger epic? → `/spartan:epic`

---

## Rules

- **One feature per spec.** If the user describes multiple features, suggest splitting into separate specs or using `/spartan:epic` first.
- **Ask questions one at a time.** Don't dump all 5 questions in one message.
- **Use the Structured Question Format** when asking for decisions: simplify → recommend → options (A/B/C) → one decision per turn.
- **Be specific.** Push back on vague answers. "Make it faster" → "What's the target latency?"
- **Gate 1 is not optional.** Every spec must pass before saving.
- **Auto mode on?** → Still ask the questions, but skip the "anything to change?" confirmation. Show the spec and save it.
