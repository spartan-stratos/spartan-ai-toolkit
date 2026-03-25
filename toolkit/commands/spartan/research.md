---
name: spartan:research
description: "Deep research on any topic — frame the question, gather sources, analyze, and produce a structured report"
argument-hint: "[topic to research]"
---

# Research: {{ args[0] | default: "your topic" }}

You are running the **Research workflow** — turn a question into an actionable report backed by real sources.

```
STAGE 1: FRAME             STAGE 2: GATHER           STAGE 3: ANALYZE          STAGE 4: REPORT
──────────────            ──────────────            ────────────────          ───────────────
Sharpen the question      Web search (multiple)     Cross-reference           Structured report
What's useful output?     Read sources              Patterns + contradictions Key findings
Source strategy           Track credibility         Form a clear view         Recommendations

Gate 1                                              Gate 2                    Gate 3
"Right question?"                                   "Key findings so far"     "Full report"
```

---

## Style

Be direct. Give options with your honest take. Pick a side — never say "it depends" without choosing. No filler.

---

## Stage 1: Frame

**Goal:** Turn a vague topic into a specific, answerable question.

### Sharpen the question
The user's topic is probably too broad. Narrow it:

| Too broad | Better |
|-----------|--------|
| "AI dev tools" | "Which AI coding assistants have >10k paying users and why?" |
| "competitor landscape" | "Who are the top 5 competitors in [space], what do they charge, and where are the gaps?" |
| "market for X" | "How big is the [X] market, who's buying, and is it growing?" |

### Define useful output
Ask: "What would a useful answer look like?"

Options:
- **Comparison table** — if comparing things (competitors, tools, approaches)
- **Number + context** — if sizing a market or measuring something
- **Recommendation** — if deciding between options
- **Landscape map** — if understanding a space

### Pick source strategy

| Research type | Best sources |
|---------------|-------------|
| Market sizing | Industry reports, investor decks, public filings |
| Competitor analysis | Product pages, pricing pages, reviews, job postings |
| Tech evaluation | Docs, GitHub repos, benchmarks, community forums |
| Trend research | News, social media, conference talks, funding announcements |
| Academic/deep | Papers, books, expert blogs |

**GATE 1 — STOP and ask:**
> "Here's how I'd frame the research:
> - Question: [specific question]
> - Output format: [table/number/recommendation/map]
> - Sources: [what I'll search for]
>
> Right direction, or should I adjust the focus?"
>
> **Auto mode on?** → Show framing, continue immediately.

---

## Stage 2: Gather

**Goal:** Find real data from real sources. Track everything.

### Search strategy
Use the `deep-research` skill. Run multiple search queries — not just one:

1. **Direct query** — the obvious search
2. **Alternative framing** — same question, different words
3. **Adjacent query** — related topic that might have useful data
4. **Contrarian query** — "why [topic] is wrong/failing/overhyped"

### For each source found, track:

```markdown
**Source:** [title]
**URL:** [link]
**Credibility:** [1-5, where 5 = primary data/official, 1 = random blog]
**Key data points:**
- [fact 1]
- [fact 2]
**Notes:** [anything to flag — bias, outdated, contradicts other sources]
```

### Source credibility rules
- **5 — Primary data:** Company filings, official announcements, published research with methodology
- **4 — Expert source:** Industry analyst, domain expert blog, respected publication
- **3 — Good secondary:** Tech publication, well-sourced article, community consensus
- **2 — Weak secondary:** Random blog, social media opinion, anonymous source
- **1 — Unreliable:** Unsourced claims, obvious bias, marketing material presented as research

**Don't stop at 3 sources.** Aim for 8-15 depending on topic size. More sources = more signal.

**No gate here — continue to Analyze.** But if the data is thin, say so:
> "I found limited data on this. Here's what exists: [X]. Want me to dig in a different direction?"

---

## Stage 3: Analyze

**Goal:** Turn raw data into insight. Form a view.

### Cross-reference
- Do multiple sources agree? That's stronger signal.
- Do sources contradict? Flag it — and say which you trust more and why.
- Is there a pattern across sources that none of them call out directly?

### Separate fact from opinion
For every claim in your notes, tag it:
- **FACT** — backed by data, multiple sources agree
- **LIKELY** — strong signal but not confirmed
- **OPINION** — one source's view, not proven
- **CONTESTED** — sources disagree

### Form a view
Don't be neutral. After analyzing the data, take a position:
- "The data says [X]."
- "Most sources agree on [Y] but I think [Z] is more accurate because [evidence]."
- "There's not enough data to be confident, but the best guess is [W]."

**GATE 2 — STOP and ask:**
> "Here's what I found:
> - [Key finding 1]
> - [Key finding 2]
> - [Key finding 3]
> - Surprise: [something unexpected]
>
> Want the full report, or should I dig deeper on any of these?"
>
> **Auto mode on?** → Show findings, continue to report.

---

## Stage 4: Report

**Goal:** Structured, actionable document. No filler.

### Report format

```markdown
# Research Report: [topic]
Date: [YYYY-MM-DD]

## Question
[The specific, sharpened question from Stage 1]

## Key Findings
1. [Most important finding — one paragraph]
2. [Second finding]
3. [Third finding]

## Analysis

### [Section based on question type]
[Deep analysis with data. Every claim linked to a source.]

### What the data doesn't tell us
[Gaps in the research. What you couldn't find or confirm.]

### Surprises
[Anything unexpected that changes the picture.]

## Recommendation
[Clear, actionable recommendation. Not "it depends."]
[If the user needs to make a decision, pick a side and explain why.]

## Sources
| # | Source | Credibility | Key contribution |
|---|--------|-------------|-----------------|
| 1 | [name + URL] | [1-5] | [what it provided] |
| 2 | ... | ... | ... |

## Methodology
[What you searched for, how many sources reviewed, what was excluded and why]
```

### Save the report
If a project folder exists → save to `02-research/research-[topic-slug]-YYYY-MM-DD.md`
If no project folder → save to current directory or ask where.

**GATE 3 — Done.**
> "Report saved to [path]. Key takeaway: [one sentence]. Want me to go deeper on anything, or use this for something? (e.g., `/spartan:content` to turn it into a blog post)"

---

## Rules

- **Sharpen the question first.** A vague question gets a vague answer. Always narrow it at Stage 1.
- **Track credibility.** Not all sources are equal. Say which you trust and why.
- **Take a position.** "The data suggests..." is better than "there are many perspectives."
- **Flag what you don't know.** Honest gaps are better than padded content.
- **Aim for 8-15 sources.** Less than 5 is usually too thin. More than 20 is diminishing returns.
- **No filler.** Every sentence should add information. If you can cut a paragraph without losing meaning, cut it.
- **Separate facts from opinions.** Label them. The reader needs to know what's proven vs. guessed.
