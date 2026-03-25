---
name: startup-pipeline
description: The full startup idea pipeline from brainstorm to investor outreach. Defines the stages, gates, and file structure. Auto-activates when working through the pipeline.
---

# Startup Pipeline

The full flow for taking an idea from zero to investor-ready.

## The Pipeline

```
STAGE 1: DISCOVER          STAGE 2: FILTER           STAGE 3: DIG              STAGE 4: BUILD
─────────────────          ───────────────           ─────────────             ──────────────
/brainstorm                /validate                 /research                 /pitch
                                                     /teardown                 /outreach
                                                                               /content

   Generate ideas  ──►  Kill bad ones fast  ──►  Go deep on survivors  ──►  Make materials
   8-15 ideas             GO / TEST / PASS         Market + competitors      Deck, memo, emails
   Pick top 3             Need data? Move on       Real numbers              Ready to send

   📁 01-brainstorm/      📁 03-validation/        📁 02-research/           📁 04-build/
```

## Stage Gates

Each stage has a gate. Don't move forward unless you pass.

### Gate 1: Worth Testing?
After brainstorm, you need at least 1 idea where:
- The problem is real (people feel pain)
- You can build a v1 in 2 weeks
- You know who the user is

If none pass → brainstorm again or pick a new space.

### Gate 2: Worth Researching?
After validation, you need:
- Verdict: **GO** or **TEST MORE**
- At least some demand signal (people search for it, pay for alternatives, complain online)
- No obvious killer (market too small, already dominated, illegal)

If PASS → stop here. Move to next idea.
If TEST MORE → do one cheap test first, then re-validate.

### Gate 3: Worth Building?
After deep research, you need:
- Market big enough (>$100M TAM for VC, >$1M for bootstrap)
- Clear gap in competitors (something nobody does well)
- Realistic distribution path (you can get first 100 users)
- You understand the customer better than before

If no → archive the project. Save the research for later.

### Gate 4: Ready to Send?
After pitch materials, check:
- All numbers match across docs
- Claims are backed by your research
- You can answer tough questions about each slide
- The ask is clear

## File Naming

Each stage saves files with a prefix so they stay sorted:

```
projects/my-idea/
├── 01-brainstorm/
│   └── brainstorm-session-2026-03-02.md
├── 02-research/
│   ├── market-research-2026-03-03.md
│   ├── teardown-competitor-a-2026-03-03.md
│   └── teardown-competitor-b-2026-03-03.md
├── 03-validation/
│   └── validation-report-2026-03-02.md
├── 04-build/
│   ├── pitch-deck-outline-2026-03-04.md
│   ├── one-pager-2026-03-04.md
│   └── investor-emails-2026-03-04.md
└── README.md
```

## How Combo Commands Map

| Combo | Stages | What happens |
|-------|--------|-------------|
| `/kickoff [theme]` | 1 → 2 | Brainstorm + validate top ideas |
| `/deep-dive [project]` | 3 | Research + teardown competitors |
| `/fundraise [project]` | 4 | Pitch materials + outreach drafts |
| `/full-run [theme]` | 1 → 2 → 3 → 4 | Everything, with pauses at each gate |

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
- I tell you if an idea should die at the gate
- I don't let you skip ahead just because you're excited

**Never:**
- Ask a question without giving options
- Let a weak idea pass a gate to be nice
- Say "it depends" without picking a side
- Skip the gate check
- Pretend every idea deserves Stage 4

## Rules

- Always pause at gates. Don't skip ahead.
- Each stage builds on the last. Read prior work first.
- If you're at Stage 3 and find a killer, be honest. Move to archive.
- The pipeline saves time by killing bad ideas early.
- Not every idea reaches Stage 4. That's the point.
