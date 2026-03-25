---
name: spartan:full-run
description: "Full startup pipeline: brainstorm, validate, research, pitch, outreach — pauses at every gate"
argument-hint: "[theme or problem space]"
---

# Full Run: {{ args[0] | default: "new idea" }}

Runs the entire startup pipeline from blank page to investor-ready materials.
Pauses at every gate for your decision. You can stop at any stage.

## The Pipeline

```
STAGE 1: DISCOVER     STAGE 2: FILTER      STAGE 3: DIG          STAGE 4: BUILD
───────────────       ──────────────       ─────────────         ──────────────
/brainstorm           /validate            /research             /pitch
                                           /teardown             /outreach

 8-15 ideas     ──►   GO/TEST/PASS   ──►  Market + rivals  ──►  Deck + emails
 Pick top 3           Kill bad ones        Real numbers          Ready to send

 Gate 1               Gate 2               Gate 3                Gate 4
 "Which to test?"    "Worth digging?"     "Worth building?"    "Ready to send?"
```

## Execution

### Stage 1: Discover
1. Create project folder: `projects/[name]/` with subfolders
2. Use the `brainstorm` skill
3. Generate ideas, rate them, pick top 3
4. Save to `01-brainstorm/`

**GATE 1 — STOP and ask:**
> "Here are the top 3 ideas. Which should I validate?"
> Options: pick ideas, brainstorm more, or stop here.

### Stage 2: Filter
5. Use the `idea-validation` skill on picked ideas
6. Problem check, market check, competitor check, distribution check
7. Give GO / TEST MORE / PASS for each
8. Save to `03-validation/`

**GATE 2 — STOP and ask:**
> If GO: "This passed. Want me to go deep?"
> If TEST MORE: "Try this cheap test first: [X]. Come back after."
> If all PASS: "None made it. Try /spartan:brainstorm on a different space?"

### Stage 3: Dig
9. Use the `market-research` skill
10. Use the `competitive-teardown` skill
11. Write synthesis: market + competitors + gap + positioning
12. Save to `02-research/`

**GATE 3 — STOP and ask:**
> If strong: "Data supports this. Ready to make pitch materials?"
> If weak: "Here's what concerns me: [X]. Still go forward?"
> If dead: "I'd stop here. The data says [X]."

### Stage 4: Build
13. Use the `investor-materials` skill — create pitch deck outline
14. Create one-pager
15. Use the `investor-outreach` skill — draft investor emails
16. Cross-check all numbers
17. Save to `04-build/`

**GATE 4 — STOP and ask:**
> "Here's everything. Can you defend these numbers? Flag anything weak."

## Rules

- ALWAYS stop at gates. This is not a one-shot process.
- If the user says "stop" at any gate, stop. Save progress.
- Read all prior stage output before starting the next stage.
- It's a win to kill an idea at Stage 2 instead of Stage 4.
- The whole pipeline might take multiple sessions. That's fine.
- Save everything. Even failed ideas have useful research.
