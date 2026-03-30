---
name: spartan:fundraise
description: "Create pitch materials + investor outreach drafts (Stage 4)"
argument-hint: "[project name]"
---

# Fundraise: {{ args[0] | default: "your project" }}

Runs Stage 4: creates investor materials and outreach drafts.
Only do this AFTER deep-dive confirms the idea is worth building.

## Steps

### Check Prior Work
1. Find the project folder in `projects/`
2. Read EVERYTHING in `01-brainstorm/`, `02-research/`, `03-validation/`
3. Build a source of truth: key numbers, market size, competitors, positioning

### Pitch Materials
4. Use the `investor-materials` skill
5. Create pitch deck outline (12 slides):
   - Company + wedge
   - Problem → Solution → Product
   - Market → Business model → Traction
   - Team → Competition → Ask
   - Use of funds → Milestones
6. Create one-pager (1 page summary)
7. Check: all numbers match across docs
8. Save to `04-build/pitch-deck-outline-{date}.md`
9. Save to `04-build/one-pager-{date}.md`

### Investor Outreach
10. Use the `investor-outreach` skill
11. Ask user: "Do you have specific investors to target? Or want me to suggest types?"
12. Create 3 email templates:
    - Cold email (to unknown investors)
    - Warm intro request (for connectors)
    - Follow-up template
13. If specific investors given, personalize each one
14. Save to `04-build/investor-emails-{date}.md`

### Gate 4 Check
15. Show materials to user
16. Ask: "Can you defend every number here in a meeting?"
17. Flag any weak spots: "This claim needs better data: [X]"
18. If ready: "These are ready to send. Start with your best-fit investor."

## Rules

- Every number must come from the research files. No making stuff up.
- If research is thin, say so. "This section is weak because we don't have data on X."
- Don't hype. Investors see through it.
- Materials should be ready to send, not "almost done."
