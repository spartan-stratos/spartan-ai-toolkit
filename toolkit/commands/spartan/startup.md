---
name: spartan:startup
description: "Full startup pipeline: brainstorm, validate, research, pitch, outreach — pauses at every gate"
argument-hint: "[theme or problem space]"
---

# Startup: {{ args[0] | default: "new idea" }}

You are running the **Startup workflow** — from blank page to investor-ready materials.

Pauses at every gate. You can stop at any stage. Killing a bad idea at Stage 2 is a win.

```
STAGE 1: DISCOVER          STAGE 2: FILTER           STAGE 3: DIG              STAGE 4: BUILD
─────────────────         ───────────────           ─────────────             ──────────────
/brainstorm               /validate                 /research                 /pitch
                                                    /teardown                 /outreach

 8-15 ideas          ──►   GO / TEST / KILL    ──►  Market + rivals      ──►  Deck + emails
 Pick top 3                Kill bad ones            Real numbers              Ready to send

 Gate 1                    Gate 2                   Gate 3                    Gate 4
 "Which to test?"         "Worth digging?"         "Worth building?"        "Ready to send?"
```

---

## Interaction Style

**No BS. Honest feedback only.**

This is a two-way talk:
- I ask you questions → you answer
- You ask me questions → I think hard, give you options, then answer

**When I ask you a question, I always:**
1. Think about it first
2. Give you 2-3 options with my honest take on each
3. Tell you which one I'd pick and why
4. Then ask what you think

**When you ask me something:**
- I give you a straight answer
- I tell you what's wrong with your thinking if I see it
- I push back if your idea is weak

**Never:**
- Ask a question without giving options
- Sugarcoat bad ideas
- Say "it depends" without picking a side
- Let a weak idea pass a gate to be nice

---

## Stage 1: Discover

1. Create project folder: `projects/{{ args[0] | default: "new-idea" | slugify }}/` with subfolders `01-brainstorm/`, `02-research/`, `03-validation/`, `04-build/`
2. Use the `brainstorm` skill
3. Generate 8-15 ideas. For each:
   - Name, one-liner, target user, problem, why now, quick risk
4. Rate each: demand signal (0-5), buildability (0-5), moat potential (0-5)
5. Pick top 3
6. Save to `01-brainstorm/`

**GATE 1 — STOP and ask:**
> "Here are the top 3 ideas. Which should I validate? Options:
> 1. Validate [idea A] — I'd pick this one because [reason]
> 2. Validate [idea B] — strong because [reason]
> 3. Validate [idea C] — risky but [reason]
> 4. Brainstorm more — if none of these excite you"

---

## Stage 2: Filter

5. Use the `idea-validation` skill on the picked ideas
6. For each idea, check: problem real?, market exists?, competitors?, distribution path?, can build MVP in 2 weeks?
7. Give a verdict: **GO** / **TEST MORE** / **KILL**
8. Save to `03-validation/`

**GATE 2 — STOP and ask:**

Based on results:
- **GO**: "This passed validation. Want me to go deep on market and competitors?"
- **TEST MORE**: "Not enough signal yet. Here's the cheapest test: [specific action]. Come back with results."
- **All KILL**: "None made it. That's fine — better to know now. Try `/spartan:startup` with a different space?"

---

## Stage 3: Dig

9. Use the `market-research` skill — TAM/SAM/SOM, growth signals, adjacent markets
10. Use the `competitive-teardown` skill — at least 3 competitors, strengths, weaknesses, gaps
11. Write synthesis:
    - Market: how big, growing or shrinking, who's buying
    - Competitors: what they do well, where they're weak
    - Gap: what's missing that you could own
    - Positioning: how you'd be different (not better — different)
12. Save to `02-research/`

**GATE 3 — STOP and ask:**

Based on findings:
- **Strong signal**: "Data supports this. Market is [X], main gap is [Y]. Ready to make pitch materials?"
- **Mixed signal**: "Here's what concerns me: [specific data]. The market is there but [risk]. Still go forward?"
- **Dead**: "I'd stop here. [specific reason]. The research is saved — might be useful later."

---

## Stage 4: Build

13. Use the `investor-materials` skill — pitch deck outline (10-12 slides)
14. Create one-pager (the "leave-behind" doc)
15. Use the `investor-outreach` skill — draft 3 email types:
    - Cold email (to investors you don't know)
    - Warm intro blurb (for someone introducing you)
    - Follow-up (after a meeting)
16. Cross-check: all numbers match across docs, claims backed by Stage 3 research
17. Save to `04-build/`

**GATE 4 — STOP and ask:**
> "Everything's ready. Before you send anything:
> - Can you defend every number in the deck?
> - Is the ask clear? (amount, use of funds, timeline)
> - Who are the first 3 investors you'd send this to?"

---

## File Structure

```
projects/[idea-name]/
├── 01-brainstorm/
│   └── brainstorm-session-YYYY-MM-DD.md
├── 02-research/
│   ├── market-research-YYYY-MM-DD.md
│   ├── teardown-competitor-a-YYYY-MM-DD.md
│   └── teardown-competitor-b-YYYY-MM-DD.md
├── 03-validation/
│   └── validation-report-YYYY-MM-DD.md
├── 04-build/
│   ├── pitch-deck-outline-YYYY-MM-DD.md
│   ├── one-pager-YYYY-MM-DD.md
│   └── investor-emails-YYYY-MM-DD.md
└── README.md
```

---

## Combo Shortcuts

These still work — they jump into specific stages:

| Shortcut | Stages | What happens |
|----------|--------|-------------|
| `/spartan:kickoff [theme]` | 1 → 2 | Brainstorm + validate |
| `/spartan:deep-dive [project]` | 3 | Research + teardowns |
| `/spartan:fundraise [project]` | 4 | Pitch + outreach |
| `/spartan:startup [theme]` | 1 → 2 → 3 → 4 | Everything, with gates |

---

## Rules

- **Always stop at gates.** This is not a one-shot process.
- **If the user says "stop" at any gate, stop.** Save progress.
- **Read prior stage output before starting next stage.**
- **Killing an idea at Stage 2 is a win.** It saved weeks of wasted work.
- **The pipeline might take multiple sessions.** That's normal.
- **Save everything.** Even failed ideas have useful research.
- **Be honest.** If an idea is weak, say so. Don't let it pass a gate to be polite.
