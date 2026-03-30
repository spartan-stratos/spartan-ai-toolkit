---
name: spartan:validate
description: Score a product idea with a quick canvas + 7-area validation checklist — get a GO / TEST MORE / KILL decision
argument-hint: "[idea or product name]"
---

# Validate: {{ args[0] | default: "your idea" }}

You are running a two-part validation session. Part 1 is a quick idea canvas (5 min). Part 2 is a scoring checklist (10 min). At the end, you'll get a clear GO / TEST MORE / KILL decision.

Be honest. The point is to kill bad ideas early, not to make every idea sound good.

---

## Part 1: Quick Idea Canvas (~5 min)

Walk the user through each question. Challenge weak or vague answers. "Everyone" is not a target user. "It's better" is not a differentiator.

### The Canvas

| # | Question | Answer |
|---|---|---|
| 1 | **The problem:** What specific pain does this solve? | |
| 2 | **Who has it:** Describe the person (not "everyone") | |
| 3 | **Current solution:** How do they solve it today? | |
| 4 | **Your solution:** 30-second pitch — what is it and what does it do? | |
| 5 | **Why you:** What do you know or have that gives you an edge? | |
| 6 | **Market size:** How many people have this problem? (rough is fine) | |
| 7 | **Top 3 risks:** What could kill this idea? | |
| 8 | **First experiment:** What's the cheapest way to test demand? | |

### Gut Check (yes/no)

Ask these 5 questions. The user answers yes or no:

1. Would you use this yourself?
2. Do you know 3 real people who have this problem?
3. Have you seen people complain about this online?
4. Can you explain it in one sentence to a stranger?
5. Would you still work on this if it took twice as long?

Count the "yes" answers:
- 5/5 = Strong founder conviction
- 3-4 = Good, but check what's missing
- 0-2 = Red flag — you might not care enough to push through the hard parts

**Output:** Filled canvas table + gut check score

Ask: **"Ready for the scoring checklist? This gets more specific."**

---

## Part 2: Validation Checklist (~10 min)

Score each area 1-5. Ask the user probing questions to arrive at the right score. Don't let them rate themselves high without evidence.

### Area 1: Problem (is it real?)

| Score | Meaning |
|---|---|
| 1 | You think it's a problem but haven't talked to anyone |
| 2 | A few people mentioned it casually |
| 3 | Multiple people describe this pain unprompted |
| 4 | People are actively spending money/time to solve it |
| 5 | People are desperate — current solutions are awful and expensive |

Ask: How often does this problem happen? Daily? Weekly? Once a year?
Ask: How do they solve it now? How much time/money does that cost them?

### Area 2: Solution (does it work?)

| Score | Meaning |
|---|---|
| 1 | Just an idea, no proof it works |
| 2 | Mockup or prototype exists |
| 3 | A few people have tried it and gave feedback |
| 4 | Users understand it in 30 seconds and want to use it |
| 5 | Users try it and don't want to go back to the old way |

Ask: Can a stranger understand what this does in 30 seconds?
Ask: Is this simpler than what they use now, or more complicated?

### Area 3: Competition (can you win?)

| Score | Meaning |
|---|---|
| 1 | Strong incumbents, no clear angle |
| 2 | Competitors exist but are beatable on one dimension |
| 3 | Competitors are weak or serving a different segment |
| 4 | No direct competitors, only workarounds |
| 5 | You have a clear unfair advantage they can't copy |

Ask: Who are the top 3 alternatives? What do they charge?
Ask: Why would someone pick you over them?

### Area 4: Market (big enough?)

| Score | Meaning |
|---|---|
| 1 | Tiny niche, hard to grow beyond 100 users |
| 2 | Small market, maybe a lifestyle business |
| 3 | Medium market, can build a real company |
| 4 | Large market with clear growth trends |
| 5 | Massive market, multiple entry points |

Ask: How many people/companies have this problem?
Ask: Is this market growing or shrinking?

### Area 5: Build Ability (can you build it?)

| Score | Meaning |
|---|---|
| 1 | Needs tech that doesn't exist yet |
| 2 | Very hard — needs specialized skills you don't have |
| 3 | Doable but will take 2-3 months for MVP |
| 4 | Can build MVP in 2-4 weeks with your current skills |
| 5 | Can build MVP in under 2 weeks, mostly known tech |

Ask: What's the hardest part to build?
Ask: Any tech risk — things that might not work?

### Area 6: Founder Fit (should YOU build it?)

| Score | Meaning |
|---|---|
| 1 | No connection to this space, just saw an opportunity |
| 2 | Some interest but no experience with these users |
| 3 | You understand the space, have used similar products |
| 4 | You've worked in this space or have the problem yourself |
| 5 | Deep expertise + network + personal obsession with the problem |

Ask: Do you know this type of user personally?
Ask: Would you still work on this in 2 years if growth is slow?

### Area 7: Business Model (will it make money?)

| Score | Meaning |
|---|---|
| 1 | No idea how to make money from this |
| 2 | Could maybe add ads or freemium later |
| 3 | Users might pay, but unclear how much |
| 4 | Clear pricing model, comparable products charge similar amounts |
| 5 | Users already pay for worse alternatives — willingness to pay is proven |

Ask: How will you charge? Subscription? One-time? Usage-based?
Ask: What would users pay? What are they paying for alternatives now?

---

## Scoring

Add up all 7 scores.

| Total | Verdict | What to Do |
|---|---|---|
| 28-35 | **BUILD** | Strong idea. Start with `/spartan:think` to plan it out. |
| 21-27 | **TEST MORE** | Promising but gaps. Do more user research on the low-scoring areas. |
| 14-20 | **RETHINK** | Too many weak spots. Pivot the approach or park the idea. |
| Below 14 | **KILL** | Not ready. Save your time for a stronger idea. |

---

## Output: One-Page Scorecard

Show this at the end:

```
## Validation Scorecard: [idea name]

### Scores
| Area | Score | Notes |
|---|---|---|
| Problem | X/5 | [one-liner] |
| Solution | X/5 | [one-liner] |
| Competition | X/5 | [one-liner] |
| Market | X/5 | [one-liner] |
| Build Ability | X/5 | [one-liner] |
| Founder Fit | X/5 | [one-liner] |
| Business Model | X/5 | [one-liner] |
| **TOTAL** | **XX/35** | |

### Verdict: [BUILD / TEST MORE / RETHINK / KILL]

### Weakest Areas (focus here):
1. [lowest scoring area] — [what to do about it]
2. [second lowest] — [what to do about it]

### Recommended Next Step:
- BUILD → Run `/spartan:think` to start structured planning
- TEST MORE → Run `/spartan:interview` to talk to real users
- RETHINK → Run `/spartan:brainstorm` to explore other angles
- KILL → Move on. Run `/spartan:brainstorm` for new ideas.
```
