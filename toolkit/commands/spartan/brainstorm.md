---
name: spartan:brainstorm
description: Structured brainstorming — generate ideas, filter fast, rank the top 3
argument-hint: "[theme or problem space]"
---

# Brainstorm: {{ args[0] | default: "new ideas" }}

You are running a structured brainstorming session in 3 steps: Generate, Filter, Rank.

The goal: go from a theme to 3 strong ideas in about 15 minutes.

---

## Step 1: GENERATE (~5 min)

Brain dump time. Quantity over quality. No filtering yet.

Generate **8-15 ideas** around the theme: {{ args[0] }}

Use different lenses to get variety:
- **Technology lens:** What can new tech (AI, APIs, automation) make possible now that wasn't before?
- **Market gap lens:** What's missing in this space? What do people complain about?
- **Pain point lens:** What painful manual process could be fixed?
- **Trend lens:** What's changing in this space? Where is it heading?
- **Remix lens:** Take an existing product in another market — what if it existed for THIS market?

For each idea, write exactly 3 things:

| # | Name | One-Sentence Pitch | Who It's For |
|---|---|---|---|
| 1 | [catchy name] | [what it does in one sentence] | [specific person/role] |
| 2 | | | |
| ... | | | |

**Rules during generation:**
- No judging yet. Bad ideas are fine. They can spark good ones.
- Each idea must be different enough from the others — no slight variations
- "Who it's for" must be a specific person, not "everyone"

Show the full list, then ask: **"Want to add any ideas before we filter? Last chance — once we filter, we kill fast."**

---

## Step 2: FILTER (~5 min)

Quick kill round. For each idea, answer 3 questions:

| # | Name | Build MVP in 2-4 weeks? | Know someone with this problem? | Would someone pay TODAY? | Grade |
|---|---|---|---|---|---|
| 1 | [name] | Yes/No | Yes/No | Yes/No | HOT/WARM/COLD |
| 2 | | | | | |
| ... | | | | | |

**Grading:**
- **HOT** = All 3 yes — strong candidate
- **WARM** = 2 yes — worth a closer look
- **COLD** = 0-1 yes — kill it (for now)

**Kill question details:**

**"Can I build an MVP in 2-4 weeks?"**
If no → park it. Good ideas you can't build fast become idea graveyards. Come back when you can.

**"Do I know someone who has this problem?"**
If no → risky. You can't do user interviews if you don't know the users. You'd be guessing.

**"Would someone pay for this TODAY?"**
If no → might still work as a free/community play, but the path to money is harder. Note it.

Show the filtered list. Cross out COLD ideas. Ask: **"Agree with the filtering? Any saves before we rank?"**

---

## Step 3: RANK (pick top 3, ~5 min)

Take all HOT and WARM ideas. If there are more than 5, narrow down.

Rank by these 3 factors:

| # | Name | Founder-Market Fit | Market Size (gut) | Excitement | Total |
|---|---|---|---|---|---|
| | | 1-5 | 1-5 | 1-5 | /15 |

**Founder-Market Fit:** Do you understand these users? Have you been one of them? Do you have connections in this space?

**Market Size (gut feel):** How many people have this problem? Don't need exact numbers — just S/M/L/XL gut check, mapped to 1-5.

**Excitement:** How pumped are you about this idea? Be honest. You'll be working on it for months. Low excitement = you'll quit.

---

## Output: Top 3 Ideas

For each of the top 3, write one paragraph:

```
## Top 3 Ideas

### #1: [Name] (Score: X/15)
[One paragraph: what it is, who it's for, why it scored high,
what makes it worth pursuing. Include the biggest risk.]

### #2: [Name] (Score: X/15)
[Same format]

### #3: [Name] (Score: X/15)
[Same format]
```

---

## Also Considered (WARM ideas for later)

List the WARM ideas that didn't make top 3 but could be worth revisiting:
- [Name] — [one line on why it's parked]

---

## Next Step

> Run `/spartan:validate` on your #1 pick.

Validation will score the idea on 7 areas and give you a GO / TEST MORE / KILL decision.

If your #1 doesn't pass validation, come back and try #2.

---

**Other useful follow-ups:**
- `/spartan:teardown [competitor]` — Analyze competitors in the space
- `/spartan:interview [idea]` — Generate user interview questions
- `/spartan:lean-canvas [idea]` — Map out the full business model
- `/spartan:think [idea]` — Deep structured thinking before building
