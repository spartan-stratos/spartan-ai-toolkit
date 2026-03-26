---
name: spartan:design
description: Design workflow — project config, design doc, designer + critic review, Design Gate
argument-hint: "[feature name]"
preamble-tier: 4
---

# Design: {{ args[0] | default: "unnamed feature" }}

You are running the **Design workflow** — create a design document for a feature with UI work. Uses a dual-agent approach: you (designer) + `design-critic` agent.

```
Epic → Spec → ► [Design] → Plan → Build → Review
                    ↑
               Design Gate
```

The design doc gets saved to `.planning/designs/{{ args[0] | default: "feature-name" }}.md`.

---

## Step 0: Check Prerequisites

### Find the spec
```bash
ls .planning/specs/{{ args[0] | default: "feature-name" }}.md 2>/dev/null
```

If spec exists, read it. The design must match the spec's requirements.
If no spec, ask:
> "No spec found. Want to:"
> - A) Write the spec first → `/spartan:spec {{ args[0] }}`
> - B) Give me a quick brief and I'll design from that

### Find design config
```bash
ls .planning/design-config.md .claude/design-config.md 2>/dev/null
```

If no design config exists, ask:
> "No design config found. This file sets your project's colors, fonts, and brand identity."
> - A) Create one now — I'll ask you a few questions
> - B) Skip it — I'll use generic design guidelines

If user picks A, run the **Design Config Setup** (see below).

### Load the design-workflow skill
Read the `design-workflow` skill for anti-AI-generic guidelines. Apply these throughout.

---

## Design Config Setup (only if no config exists)

Ask these questions **one at a time**:

1. **"What's the app/product name?"**
2. **"Light theme, dark theme, or both?"**
3. **"What's the primary brand color?"** (e.g., "violet #8B5CF6", "amber #F59E0B")
4. **"What font do you use?"** (default: Inter if unsure)
5. **"Any reference apps for the look and feel?"** (e.g., "Linear, Vercel Dashboard")
6. **"What should it NOT look like?"** (anti-references)

Save to `.planning/design-config.md` using the `design-config.md` template.

---

## Step 1: Design Brief

Fill in the brief from the spec and user input:

```markdown
### What are we designing?
[From spec's UI Changes section or user's description]

### Who's the user?
[From spec's User Stories or design-config]

### Goal
[From spec's Goal section]

### Platform
[Desktop / Mobile / Both — ask if not clear]
```

---

## Step 2: User Flows

Map every user story from the spec to a concrete flow:

```markdown
### Flow 1: [name]
**Trigger**: [what starts it]

| Step | User Action | System Response | Screen |
|------|-------------|-----------------|--------|
| 1 | [action] | [response] | [screen] |
```

Include edge case flows: empty data, error, loading, timeout.

---

## Step 3: Screen Design

For each screen:

1. **Screen inventory** — list all screens with their states
2. **Component list** — what components each screen needs
3. **Wireframes** — ASCII wireframes showing layout structure
4. **Responsive behavior** — how layout changes at mobile/tablet/desktop

If design-config exists, use its colors, fonts, and design personality. Don't invent new values.

---

## Step 4: Visual Design Details

Add these sections if the project has a design config:

### Section Zones
Plan background alternation for visual rhythm:
```markdown
| Section | Background | Mood |
|---------|-----------|------|
| Hero | [from design-config palette] | Dramatic entry |
| Content | [slightly different bg] | Subtle shift |
```

### Motion Plan
What moves and when:
```markdown
| Element | Animation | Trigger | Duration |
|---------|-----------|---------|----------|
| Section content | Fade up | Scroll into view | 0.6s |
| Cards | Stagger fade | Scroll into view | 0.6s + 0.15s |
```

### Component Specs
For key components, detail props, states, and interactions:
```markdown
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| [name] | [type] | [yes/no] | [what it does] |
```

---

## Step 5: Accessibility Checklist

Before sending to critic, verify:

- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] All interactive elements keyboard accessible
- [ ] Focus order follows visual layout
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Touch targets at least 44x44px on mobile
- [ ] No information conveyed by color alone

---

## Step 6: Self-Check (Before Calling Critic)

Run through these checks yourself:

1. **Does it look like a real app, or a generic AI template?**
2. **Is there clear visual hierarchy?** Can you tell what's most important?
3. **Does the accent color draw the eye to CTAs?**
4. **Is there enough whitespace?**
5. **Does the text use specific language, not generic marketing fluff?**
6. **Does it match the design personality from design-config?**

Fix anything that fails before calling the critic.

---

## Step 7: Spawn Design Critic

Spawn the `design-critic` agent as a subagent. Give it:

1. **The design document** you just wrote
2. **The design-config** (if exists)
3. **The spec** (if exists)
4. **Your self-check results** from Step 6

**Prompt for the critic:**
> "Review this design for the Design Gate. Design doc: [content]. Design-config: [path or 'none']. Spec: [path or 'none']. Check for AI-generic patterns, brand compliance, accessibility, and responsive behavior. Give your verdict: ACCEPT or NEEDS CHANGES."

### Discussion
Same rules as `/spartan:gate-review`:
- If critic says ACCEPT → Design Gate passed
- If critic says NEEDS CHANGES → fix issues, re-submit
- Max 3 rounds of back-and-forth
- Escalate to user if stuck

---

## Step 8: Save and Confirm

Save the design doc to `.planning/designs/{{ args[0] | default: "feature-name" }}.md`.

```markdown
**Date**: [today]
**Status**: approved
**Spec**: .planning/specs/{{ args[0] }}.md
**Designer**: Claude (main agent)
**Critic**: design-critic agent
**Verdict**: PASSED — both agents accept
```

Then tell the user:

> "Design saved to `.planning/designs/{{ args[0] }}.md` — Design Gate passed."
>
> **Next steps:**
> - Ready to plan? → `/spartan:plan {{ args[0] }}`
> - Want to build a prototype first? → Ask and I'll generate HTML
> - Need changes? → Run `/spartan:design {{ args[0] }}` again

---

## Rules

- **Read the design-config first.** If it exists, every color and font must come from it. No inventing.
- **Anti-AI-generic is the top priority.** If the design looks like every other AI-generated page, it fails.
- **All states must be covered.** Loading, empty, error, success — not just the happy path.
- **Responsive is not optional.** Every screen must work at mobile, tablet, and desktop.
- **Critic must accept.** Single-agent design is just `/spartan:build` with a UI. The dual-agent review is what makes this command valuable.
- **Auto mode on?** → Skip confirmations but still run the full critic review.
