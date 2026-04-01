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

### Agent Teams boost (if enabled)

```bash
echo "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-not_set}"
```

**If Agent Teams is enabled**, create a research team (NOT sub-agents):

```
TeamCreate(team_name: "research-{topic-slug}", description: "Research: {topic}")

TaskCreate(subject: "Breadth search", description: "Run direct + alternative + adjacent queries, collect 8-15 sources with credibility scores")
TaskCreate(subject: "Depth analysis", description: "Deep dive on top 3-5 sources from breadth search")
TaskCreate(subject: "Contrarian search", description: "Find counterarguments, failures, criticism")

Agent(
  team_name: "research-{topic-slug}",
  name: "breadth-researcher",
  subagent_type: "general-purpose",
  prompt: "Search broadly for: {topic}. Run direct + alternative + adjacent queries.
    Collect 8-15 sources. Track each with: title, URL, credibility (1-5), key data points.
    Check TaskList, claim your task. Message depth-researcher when you have initial findings."
)

Agent(
  team_name: "research-{topic-slug}",
  name: "depth-researcher",
  subagent_type: "general-purpose",
  prompt: "Go deep on the top 3-5 sources for: {topic}.
    Extract detailed data, cross-reference claims, note contradictions.
    Check TaskList, claim your task. Wait for breadth-researcher findings if needed."
)

Agent(
  team_name: "research-{topic-slug}",
  name: "contrarian-researcher",
  subagent_type: "general-purpose",
  prompt: "Find counterarguments and criticism for: {topic}.
    Search for failures, risks, overhyped claims, hidden costs.
    Check TaskList, claim your task."
)
```

After all teammates report back, merge source lists, `TeamDelete()`, continue to Stage 3 (Analyze).

**If Agent Teams is NOT enabled**, gather sequentially:

### Search strategy
Follow the `deep-research` skill process: scope, research, verify, synthesize. Run multiple search queries — direct, alternative framing, adjacent, and contrarian.

Aim for 8-15 sources. Track credibility (1-5) for each.

**No gate here — continue to Analyze.** But if the data is thin, say so:
> "I found limited data on this. Here's what exists: [X]. Want me to dig in a different direction?"

---

## Stage 3: Analyze

**Goal:** Turn raw data into insight. Form a view.

Follow the `deep-research` skill's verify + synthesize steps: cross-reference sources, flag conflicts, separate fact from opinion, form a clear position.

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

Use the report structure from the `deep-research` skill: TL;DR, Background, Key Findings (sourced), Analysis, Open Questions, Sources.

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
