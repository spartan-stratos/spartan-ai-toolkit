---
name: spartan:deep-dive
description: "Go deep on a validated idea: market research + competitor teardowns (Stage 3)"
argument-hint: "[project name or idea]"
---

# Deep Dive: {{ args[0] | default: "your idea" }}

Runs Stage 3: deep market research and competitor teardowns.
Only do this AFTER validation says GO or TEST MORE.

## Steps

### Check Prior Work
1. Find the project folder in `projects/`
2. Read everything in `01-brainstorm/` and `03-validation/`
3. Pull out: the idea, target user, competitors found, market signals

### Market Research
4. Use the `market-research` skill
5. Run market sizing (TAM/SAM/SOM with math shown)
6. Find industry data, reports, trends
7. Check demand signals: search volume, forum posts, review complaints
8. Look for tailwinds (new regulation, tech shift, behavior change)
9. Save to `02-research/market-research-{date}.md`

### Competitor Teardowns
10. Use the `competitive-teardown` skill
11. Identify top 3-5 competitors from validation step
12. For each competitor:
    - Product teardown (what they do, pricing, strengths, weaknesses)
    - Business teardown (funding, team, traction)
    - User feedback (reviews, Reddit, forums)
13. Save each to `02-research/teardown-{competitor}-{date}.md`

### Synthesis
14. Create a summary that connects everything:
    - Market size and growth
    - Competitor landscape (table comparison)
    - The gap: what nobody does well
    - Our positioning: where we win
    - Biggest risks
15. Save to `02-research/synthesis-{date}.md`

### Gate 3 Check
16. Show findings to user
17. If strong signals: "This looks worth building. Want me to run /spartan:fundraise?"
18. If weak signals: "Here's what's concerning: [X]. Still want to go forward?"
19. If dead: "I'd archive this. Here's why: [X]"

## Rules

- Read ALL prior work before starting. Don't re-research what we already know.
- If validation was TEST MORE, ask what test the user ran and what happened.
- Be honest if the data kills the idea. Better now than after building.
