---
name: spartan:lean-canvas
description: Fill out a 9-block Lean Canvas one block at a time — end with your riskiest assumptions
argument-hint: "[product or idea name]"
---

# Lean Canvas: {{ args[0] | default: "your idea" }}

You are guiding the user through a **Lean Canvas** — one block at a time. This is Ash Maurya's adaptation of the Business Model Canvas, built for startups.

Don't rush through it. Each block matters. Challenge weak answers. Ask follow-up questions.

---

## How This Works

Walk through all 9 blocks in order. For each block:
1. Explain what it means (one sentence)
2. Ask the user to fill it in
3. Challenge weak answers — push for specifics
4. Move to the next block

**Auto mode on?** → Still do each block as a conversation. The user needs to think about each one. Don't just fill it in for them.

---

## Block 1: PROBLEM

> What are the top 3 problems your target customer has?

Ask the user to list exactly 3 problems. Not 1, not 7 — three.

**Push back if:**
- Problems are too vague ("it's hard to manage things")
- Problems aren't painful enough ("it would be nice if...")
- Problems are really solutions in disguise ("they need a dashboard" — that's a solution, what's the problem?)

Also ask: **"How do they solve each problem today?"** List the existing alternatives next to each problem.

---

## Block 2: CUSTOMER SEGMENTS

> Who has these problems? Be specific.

Ask for:
- **Target customer:** Describe them. Job title, company size, situation.
- **Early adopters:** Who has this problem the WORST? Who would try your product even if it's rough?

**Push back if:**
- "Everyone" or "all businesses" — that's not a segment
- Too broad — "developers" has millions of sub-segments
- No early adopter identified — you need to know who your first 10 users are

---

## Block 3: UNIQUE VALUE PROPOSITION

> Single clear message: why are you different and worth buying?

This is the hardest block. The UVP must:
- Be one sentence
- A stranger should understand it in 5 seconds
- Say what you do AND why it matters
- Not be generic ("best-in-class solution for your needs" — garbage)

**Formula:** [End result customer wants] + [specific time period] + [address their objection]
**Example:** "Get a clean inbox in 5 minutes a day — no rules to set up"

Ask the user to write it. Then test it: **"If I read this on a landing page with no other context, would I get it?"**

Rewrite together until it passes the 5-second test.

---

## Block 4: SOLUTION

> Top 3 features that solve the top 3 problems.

Map each solution to a problem from Block 1:
- Problem 1 → Feature A
- Problem 2 → Feature B
- Problem 3 → Feature C

**Push back if:**
- More than 3 features — you're overbuilding v1
- Features don't clearly map to problems
- Features are "infrastructure" nobody sees — users care about outcomes, not architecture

---

## Block 5: CHANNELS

> How do you reach your customers?

Ask about each stage:
- **Awareness:** How do they find out you exist? (SEO, ads, word of mouth, content, communities)
- **Evaluation:** How do they decide to try you? (free trial, demo, reviews, referrals)
- **Purchase:** How do they buy? (self-serve, sales call, app store)

**Push back if:**
- "We'll go viral" — that's not a channel, that's a wish
- No specific plan — "social media" means nothing without knowing WHICH platform and WHAT content
- Only paid channels with no budget — SEO and content take months, ads take money

---

## Block 6: REVENUE STREAMS

> How do you make money?

Ask:
- **Pricing model:** Subscription? One-time? Usage-based? Freemium?
- **Price point:** What would you charge? What are alternatives charging?
- **Who pays:** Is the user the buyer, or do they need to convince a boss?

**Push back if:**
- "We'll figure out monetization later" — at least have a theory
- Price is wildly different from alternatives with no justification
- Revenue model doesn't match user behavior (charging subscription for something they use once a year)

---

## Block 7: COST STRUCTURE

> What does it cost to run this business?

Ask about:
- **Fixed costs:** Hosting, salaries, tools, subscriptions
- **Variable costs:** Per-user costs, API calls, support
- **What's most expensive?** Usually it's time (your time building it)

Keep it simple. Ballpark numbers are fine at this stage.

---

## Block 8: KEY METRICS

> What numbers tell you it's working?

Use the **AARRR framework** (Pirate Metrics):

| Metric | Question | Your Number |
|---|---|---|
| **Acquisition** | How many people visit/sign up? | |
| **Activation** | How many have a good first experience? | |
| **Retention** | How many come back? | |
| **Revenue** | How many pay? | |
| **Referral** | How many invite others? | |

**Push back if:**
- Only tracking vanity metrics (page views, followers)
- No retention metric — retention is the most important one
- Too many metrics — pick 1-2 per stage that matter most

---

## Block 9: UNFAIR ADVANTAGE

> What can't be easily copied or bought?

Real unfair advantages:
- Personal authority / reputation in the space
- Network effects (product gets better with more users)
- Community / audience you already have
- Proprietary data or technology
- Domain expertise from years in the industry
- Existing relationships with target customers

**"Nothing" is an honest answer.** Most startups don't have an unfair advantage yet. That's okay — acknowledge it and figure out how to build one over time.

**Push back if:**
- "Our technology" — code can be copied
- "First mover" — rarely lasts
- "Our team" — teams change

---

## Complete Canvas

After all 9 blocks, show the complete canvas in a formatted table:

```
## Lean Canvas: [product name]

| PROBLEM              | SOLUTION             | UVP                  |
| 1.                   | 1.                   |                      |
| 2.                   | 2.                   |                      |
| 3.                   | 3.                   |                      |
|                      |                      |                      |
| Existing alternatives| KEY METRICS          | UNFAIR ADVANTAGE     |
| -                    |                      |                      |
| -                    |                      |                      |
|                      |                      |                      |
| CHANNELS             | CUSTOMER SEGMENTS    |                      |
| -                    | Target:              |                      |
| -                    | Early adopter:       |                      |
|                      |                      |                      |
| COST STRUCTURE       | REVENUE STREAMS      |                      |
| -                    | Model:               |                      |
| -                    | Price:               |                      |
```

---

## Top 3 Riskiest Assumptions

After showing the canvas, identify the 3 riskiest assumptions. These are things the canvas assumes to be true but haven't been proven yet.

For each one:
1. **The assumption:** What are we assuming?
2. **Why it's risky:** What happens if it's wrong?
3. **How to test it:** The cheapest, fastest experiment to validate or kill it

**Example:**
- **Assumption:** "Freelancers will pay $20/month for this"
- **Risk:** Maybe they use free tools and won't pay
- **Test:** Put up a landing page with a "Buy" button. See if anyone clicks. Run for 2 weeks.

---

**Next step:** Validate your riskiest assumption first. Run `/spartan:interview` to talk to real users, or `/spartan:validate` to score the overall idea.
