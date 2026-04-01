---
name: spartan:kickoff
description: "Start a new idea: create project folder, brainstorm, then validate top picks (Stages 1-2)"
argument-hint: "[theme or problem space]"
---

# Kickoff: {{ args[0] | default: "new idea" }}

Runs Brainstorm + Validate back to back. Gets you to a GO / PASS decision fast.

If the user already has a specific idea (not a theme), skip brainstorm and go straight to validate.

---

## Step 1: Setup

Create project folder with stage subfolders:

```bash
mkdir -p "projects/{{ args[0] | default: "new-idea" }}"/{01-brainstorm,02-interviews,03-validation,04-research,05-pitch}
```

---

## Step 2: Brainstorm

Run `/spartan:brainstorm {{ args[0] | default: "" }}` internally — don't tell the user to run it separately.

This will:
1. Set the frame: space, target user, limits, goal
2. Generate 8-15 ideas
3. Rate each: demand signal, buildability, moat (0-5)
4. Pick top 3
5. Save to `projects/{{ args[0] }}/01-brainstorm/brainstorm-session.md`

### Gate 1

Show top 3 to user. Ask:
> "Which ones should I validate? Or brainstorm more?"

Wait for answer before continuing.

---

## Step 3: Validate

Run `/spartan:validate` internally for each picked idea.

This will:
1. Problem check (real pain or nice-to-have?)
2. Quick market check
3. Quick competitor check
4. Distribution check
5. Build check
6. Give verdict: GO / TEST MORE / PASS
7. Save to `projects/{{ args[0] }}/03-validation/validation-{idea-name}.md`

### Gate 2

Show verdicts:
- If any **GO**: "Want me to run `/spartan:deep-dive` on this?"
- If all **PASS**: "These didn't make it. Want to `/spartan:brainstorm` a different space?"
- If **TEST MORE**: "Here's the cheapest test for each. Try those first."

---

## Rules

- Don't rush through gates. Pause and ask.
- It's fine if nothing passes. That saves months of building the wrong thing.
- If the user already has a specific idea (not a theme), skip brainstorm and go straight to validate.
- You are the orchestrator — run brainstorm and validate yourself, don't tell the user to chain commands.
