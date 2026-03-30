---
name: spartan:interview
description: Generate Mom Test interview questions — talk about their life, not your idea
argument-hint: "[product or feature name]"
---

# Interview Script: {{ args[0] | default: "your product" }}

You are generating a user interview script based on **The Mom Test** by Rob Fitzpatrick.

The core idea: even your mom will lie to you about your startup idea. So don't ask about your idea — ask about their life.

---

## The Mom Test Rules (ALWAYS enforce these)

1. **Talk about their life, not your idea.** Don't pitch. Don't describe what you're building. Ask about what they do today.
2. **Ask about specifics in the past, not generics or the future.** "Tell me about the last time you..." beats "Would you ever..."
3. **Talk less, listen more.** If you're talking more than 30% of the time, you're doing it wrong.

---

## Red Flags (print these as warnings in the script)

| Red Flag | What It Really Means | What to Do Instead |
|---|---|---|
| "That sounds great!" | They're being polite | Ask: "When was the last time you had this problem?" |
| "I would definitely use that" | Future promises are worthless | Ask: "What did you do LAST TIME this happened?" |
| "Yeah, that's a problem" | Generic agreement, no signal | Ask: "Can you walk me through the last time?" |
| "I'd pay for that" | Talk is cheap | Ask: "How much do you spend on [current solution] now?" |
| They change the subject | They don't actually care | Note it. This problem isn't top of mind for them. |

---

## Generate the Interview Script

Based on {{ args[0] }}, generate a ready-to-use script. Ask the user first:

> **"In 1-2 sentences, what problem does {{ args[0] }} solve and who has this problem?"**

Then generate the full script:

---

### Opening (~2 min)

**Goal:** Build rapport. Set the frame. Don't bias them.

Script:
```
"Thanks for taking the time. I'm trying to understand how people
deal with [problem area — NOT your solution]. I'm not selling anything.
I just want to learn about your experience.

There are no right or wrong answers. I'm most interested in stories
about what you actually do day to day."
```

**DO NOT** say: "I'm building X and want your feedback." That biases everything.

---

### Group 1: Understanding Their World (5 questions)

**Goal:** Understand their current workflow. What do they do today?

1. "Can you walk me through how you handle [problem area] right now?"
2. "What does a typical [day/week] look like when you're dealing with this?"
3. "What tools or processes do you use for this today?"
4. "What's the most annoying part of how you do this now?"
5. "If you could wave a magic wand and fix one thing about this, what would it be?"

**For each answer:** Follow up with "Can you give me a specific example?" and "When was the last time that happened?"

---

### Group 2: Finding the Pain (4 questions)

**Goal:** How bad is the problem? Are they actively trying to fix it?

6. "How often does [the problem] come up? Daily? Weekly? Monthly?"
7. "The last time this happened, what did you do? Walk me through it step by step."
8. "Have you tried to find a better way to handle this? What did you try?"
9. "Have you spent any money trying to solve this? How much?"

**Key signal:** If they haven't tried to solve it or spent money on it, the pain might not be bad enough.

---

### Group 3: Checking Importance (5 questions)

**Goal:** Is this a top-3 problem or just a minor annoyance?

10. "Where does this problem rank in your list of headaches? Top 3? Top 10?"
11. "If this problem disappeared tomorrow, how much would your life change?"
12. "What other problems compete for your attention and budget right now?"
13. "Have you ever started fixing this and then stopped? Why?"
14. "If someone solved this for you, what would that free you up to do?"

**Key signal:** If it's not in their top 3, they won't pay for a solution or change their behavior.

---

### Closing (~2 min)

**Goal:** Get referrals and next steps.

Script:
```
"This has been really helpful. A couple more quick things:

- Is there anything about [problem area] that I should have asked
  but didn't?
- Do you know 2-3 other people who deal with this same problem?
  I'd love to talk to them too.
- Would it be okay if I followed up in a few weeks with a quick update?"
```

---

## Scoring Rubric

After the interview, score the signal strength:

| Signal | Score | What It Means |
|---|---|---|
| They described the problem with emotion and detail | STRONG | Real pain, they care |
| They've spent money or significant time trying to solve it | STRONG | Willing to pay |
| They asked YOU when it would be ready | STRONG | Pull signal — they want this |
| They offered to introduce you to others with the problem | STRONG | They think this matters |
| They gave generic answers, no specific stories | WEAK | Problem might not be real for them |
| They were polite but didn't share any struggles | WEAK | No pain here |
| They said "cool idea" but had no personal experience | NONE | Wrong person or wrong problem |

### After the Interview

Count your signals:

- **3+ STRONG signals** = This problem is real. Keep digging with more interviews.
- **1-2 STRONG signals** = Promising but need more data. Interview 3-5 more people.
- **0 STRONG signals** = Wrong person or wrong problem. Try a different audience or rethink.

---

## Output

Show the user:
1. The complete interview script (ready to print/copy)
2. The red flags cheat sheet (keep it visible during the interview)
3. The scoring rubric (fill in after each interview)

**Remind the user:** Talk to at least 5 people before making any decisions. One interview is not enough data.

**Next step:** After 5+ interviews, run `/spartan:validate` to score the idea based on what you learned.
