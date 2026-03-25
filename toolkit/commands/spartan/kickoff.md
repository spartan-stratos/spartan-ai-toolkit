---
name: spartan:kickoff
description: "Start a new idea: create project folder, brainstorm, then validate top picks (Stages 1-2)"
argument-hint: "[theme or problem space]"
---

# Kickoff: {{ args[0] | default: "new idea" }}

Runs Stage 1 (Brainstorm) and Stage 2 (Validate) back to back.
Creates the project and gets you to a GO / PASS decision fast.

## Steps

### Setup
1. Create project folder: `projects/[idea-name]/` with all stage subfolders
2. Copy project readme template if available

### Stage 1: Brainstorm
3. Use the `brainstorm` skill
4. Set the frame: space, target user, limits, goal
5. Generate 8-15 ideas
6. Rate each: demand signal, buildability, moat (0-5)
7. Pick top 3
8. Save to `01-brainstorm/brainstorm-session-{date}.md`

### Gate 1 Check
9. Show top 3 to user
10. Ask: "Which ones should I validate? Or brainstorm more?"
11. Wait for answer before continuing

### Stage 2: Validate
12. Use the `idea-validation` skill
13. For each picked idea:
    - Problem check (real pain or nice-to-have?)
    - Quick market check
    - Quick competitor check (5 min search)
    - Distribution check
    - Build check
14. Give verdict: GO / TEST MORE / PASS
15. Save to `03-validation/validation-{idea-name}-{date}.md`

### Gate 2 Check
16. Show verdicts
17. If any GO: "Want me to run /spartan:deep-dive on this?"
18. If all PASS: "These didn't make it. Want to /spartan:brainstorm a different space?"
19. If TEST MORE: "Here's the cheapest test for each. Try those first."

## Rules

- Don't rush through gates. Pause and ask.
- It's fine if nothing passes. That saves months of building the wrong thing.
- If the user already has a specific idea (not a theme), skip brainstorm and go straight to validate.
