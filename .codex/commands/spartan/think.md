---
name: spartan:think
description: Guided thinking before coding — 6-phase structured process to prevent building the wrong thing
argument-hint: "[idea or feature description]"
---

# Think Before Build: {{ args[0] | default: "new idea" }}

You are running a **structured thinking session**. The goal: think through everything BEFORE writing any code.

Most rework comes from skipping the thinking phase. This command prevents that.

---

## First Question

Ask the user:

> **"Is this a new project (starting from zero) or a new feature (adding to something that exists)?"**

- **New project** → Start at Phase 0, then continue through Phase 6
- **New feature** → Skip Phase 0, start at Phase 1

**Auto mode on?** → Still pause between phases. Thinking phases need human input — that's the whole point. Show each phase output, then ask "Ready for the next phase?" before moving on.

---

## Phase 0: PRODUCT + MVP MAP (new projects only, ~20 min)

Only run this phase for new projects. Skip to Phase 1 for features.

### 0A — Find the Core Loop
Ask: "What's the one thing a user does repeatedly that makes this product valuable?"
Write it as: **[User] does [action] to get [result], which makes them [come back because...]**

### 0B — Feature Dump
List every feature you can think of. Don't filter yet. Get it all out.

### 0C — Kill Most of Them
Go through the list. For each feature ask: "Can the core loop work without this?"
If yes → cut it from v1. Be brutal. v1 should have 3-5 features max.

### 0D — Dependency Map
For the surviving features, draw the build order:
- What needs to exist before something else can work?
- What's independent and can be built in parallel?

### 0E — Build Order
Number the features 1-N based on dependencies. Feature 1 = the core loop itself.

### 0F — Stack Pick
Based on what you're building, confirm or pick the tech stack.
Only discuss stack if the user hasn't decided yet.

**Output:** Core loop statement + v1 feature list (max 5) + build order + stack

Ask: **"Happy with this MVP scope? Phase 1 will dig into the first feature."**

---

## Phase 1: DUMP (~5 min)

Brain dump using Jobs-to-be-Done (JTBD) framework. Ask the user to fill in:

| Question | Answer |
|---|---|
| **The job:** When I [situation], I want to [motivation], so I can [outcome] | |
| **Trigger:** What event makes someone need this RIGHT NOW? | |
| **Current pain:** How do they solve it today? What sucks about that? | |
| **Dream state:** If this worked perfectly, what does the user's life look like? | |

Help the user write clear answers. Challenge vague ones. "Everyone" is not a user. "It's annoying" is not a pain.

**Output:** Filled JTBD table

Ask: **"Does this capture the real job? Phase 2 will stress-test it."**

---

## Phase 2: CHALLENGE (~10 min)

Three exercises to pressure-test the idea:

### 2A — Pre-mortem
Pretend it's 6 months later and this feature FAILED. List the 5 most likely reasons it failed.
Be honest. Common ones: nobody wanted it, too complicated, built the wrong thing, took too long, tech didn't work.

### 2B — MoSCoW Sort
Take everything from Phase 1 and sort into:

| Category | Items |
|---|---|
| **Must have** (won't work without it) | |
| **Should have** (important but can ship without) | |
| **Could have** (nice but won't miss it) | |
| **Won't have** (explicitly out of scope for v1) | |

### 2C — Bar Test
Write one sentence that explains this feature to a stranger in a bar.
If you can't do it in one sentence, the scope is too big. Simplify until you can.

**Output:** Pre-mortem list + MoSCoW table + bar test sentence

Ask: **"Any surprises in the pre-mortem? Phase 3 is the big one — we'll walk through every screen."**

---

## Phase 3: WALK THROUGH (~15 min)

**This is the most important phase.** 80% of rework comes from skipping this.

### 3A — Screen State Matrix

For every screen/view the user will see, fill out this table:

| Screen | State | What User Sees | Actions Available | Edge Cases |
|---|---|---|---|---|
| [name] | Empty (no data yet) | | | |
| [name] | Loading | | | |
| [name] | Success (happy path) | | | |
| [name] | Error (something broke) | | | |
| [name] | Partial (some data, some missing) | | | |

Go through EVERY screen. Don't skip any state. The empty state and error state are where most bugs hide.

### 3B — Happy Path Narration
Tell the story of a user doing the main flow from start to finish. Step by step. Click by click.
"User opens the page. Sees X. Clicks Y. System does Z. User sees W."

### 3C — Sad Path Narration
Now tell the story of everything going wrong:
- Network fails mid-action
- User enters garbage data
- User does things in unexpected order
- User has no data yet (first time)
- User has too much data (power user)

**Output:** Full screen state matrix + happy path + sad path narrations

Ask: **"Did we miss any screens or states? Phase 4 checks the tech side."**

---

## Phase 4: TECH CHECK (~10 min)

Impact map — what does this touch in the codebase?

### 4A — New Stuff Needed

| Type | Details |
|---|---|
| New database tables | |
| New API endpoints | |
| New UI components | |
| New background jobs | |
| New integrations | |

### 4B — Existing Code Impact

| Existing Code | What Changes | Risk Level |
|---|---|---|
| [file/module] | [what changes] | LOW/MEDIUM/HIGH |

### 4C — Reuse Check
- What existing code can we reuse as-is?
- What existing code needs changes?
- Any conflicts with in-progress work?
- External dependencies or API limits?

### 4D — T-shirt Size
Overall estimate: **S** (< 1 day) / **M** (1-3 days) / **L** (3-7 days) / **XL** (> 1 week)

**Output:** Impact tables + reuse list + size estimate

Ask: **"Any surprises on the tech side? Phase 5 is the final cut."**

---

## Phase 5: FINAL CUT (~5 min)

### 5A — Confidence Check

For each must-have from Phase 2, rate your confidence:

| Must-Have | Confidence | Why |
|---|---|---|
| [item] | HIGH / MEDIUM / LOW | [reason] |

Anything rated LOW → discuss with user. Either find a way to de-risk it, or move it to v2.

### 5B — v1 / v2 Split

| v1 (build now) | v2 (build later) |
|---|---|
| | |

### 5C — Regret Test
Ask: "If we ship v1 without [each v2 item], will users complain loudly?"
If yes → move it back to v1. If no → it stays in v2.

**Output:** Confidence table + v1/v2 split + final scope

Ask: **"This is the final scope. Ready to build?"**

---

## Phase 6: BUILD

Based on the T-shirt size from Phase 4, route to the right build command:

- **S (< 1 day):** "Run `/spartan:spec` then `/spartan:build` with this scope to start building."
- **M-L (1-7 days):** "Run `/spartan:project new` to set up the full project lifecycle."
- **XL (> 1 week):** "Run `/spartan:project new` — this needs milestones and wave planning."

Show the complete thinking output as a summary the user can copy into their planning tool:
- JTBD statement
- MoSCoW scope
- Screen state matrix (key screens only)
- Impact map
- v1/v2 split
- Size estimate + next command to run
