# Think Before Build

A workflow for going from raw idea to confident build. Works for new projects and new features.

The goal: think deep before coding so you don't go back and forth.

---

## Why This Exists

The old flow:

```
idea -> quick spec -> build -> "oh wait" -> change -> build -> "oh wait" -> change
```

Back-and-forth happens because:
- You didn't think through the full picture before building
- UX surprises (build it, see it, hate it)
- Missing states (empty, loading, error)
- Feature connections you didn't think about
- Scope creep ("while I'm here...")

This workflow forces deep thinking before any code.

---

## Two Entry Points

```
NEW PROJECT?                          NEW FEATURE?
     |                                     |
     v                                     v
Phase 0: PRODUCT + MVP MAP            Skip to Phase 1
     |
     v
For each MVP feature:
Phase 1-6 (same as new feature)
```

- **New project**: Start at Phase 0. Define the product, pick MVP features, then build each one.
- **New feature** (existing project): Start at Phase 1. The product already exists.

---

## Phase 0: PRODUCT + MVP MAP (new projects only, 20 min)

**Goal:** Pick the 3 features that make this a product. Not 10. Three.

### Framework: The Core Loop + Feature Kill List

#### Step 1: Find the Core Loop

Every product has one core loop - the thing the user does over and over:

```
CORE LOOP:
1. User [triggers something] ->
2. System [does something] ->
3. User [gets value] ->
4. (repeat)

Example (ShipNest):
1. User uploads app info ->
2. System publishes to app store ->
3. User's app is live ->
4. (repeat for next update)
```

Your MVP must make this loop work. Everything else is extra.

#### Step 2: List All Features You Want

Brain dump every feature. Don't filter:

```
ALL FEATURES I WANT:
1. _________
2. _________
3. _________
4. _________
5. _________
6. _________
7. _________
...
```

#### Step 3: Kill Most of Them

For each feature, ask: "Can the core loop work without this?"

```
FEATURE                     CORE LOOP NEEDS IT?     VERDICT
- [feature 1]               YES                     MVP
- [feature 2]               NO                      LATER
- [feature 3]               YES                     MVP
- [feature 4]               NO, but nice            LATER
- [feature 5]               NO                      LATER
- [feature 6]               YES                     MVP
- [feature 7]               NO                      NEVER (be honest)
```

Rules:
- Max 3-5 features in MVP. If you have more, your core loop is too complex.
- Auth doesn't count as a feature (it's infrastructure).
- "Nice to have" means LATER, not MVP.

#### Step 4: Feature Tree + Dependency Map

Draw how features connect to each other. Which ones need other ones to work?

```
FEATURE TREE:
  [infra feature] ──┬──> [feature A] ──> [feature C]
                    └──> [feature B]

Example (ShipNest):
  Auth ──┬──> Project CRUD ──┬──> Screenshot Editor
         │                   └──> App Store Connect
         └──> Dashboard (needs all above)
```

Then write out the dependencies as rules:

```
DEPENDENCY MAP:
  [feature A] needs [feature X] because: _________
  [feature B] needs [feature X] because: _________
  [feature C] needs [feature A] because: _________
  [feature D] needs nothing (can build anytime)

Example:
  Screenshot Editor needs Project CRUD because: screenshots belong to a project
  App Store Connect needs Project CRUD because: you publish a project's app
  Dashboard needs all because: it shows overview of everything
```

Rules:
- If A needs B, build B first. No exceptions.
- Features with no dependencies can be built in any order.
- If two features depend on each other, they're actually one feature. Merge them.
- Infra (auth, DB setup, project structure) always goes first.

#### Step 5: Build Order

Use the dependency map to set the order. Bottom of the tree first, top last:

```
MVP BUILD ORDER:
1. [feature] - no dependencies, foundation
2. [feature] - depends on #1
3. [feature] - depends on #1
4. [feature] - depends on #2 and #3

LATER (v2):
- [feature]
- [feature]

NEVER (be honest):
- [feature] - why: _________
```

#### Step 6: Stack & Structure

Pick your tools. Don't overthink this:

```
STACK:
- Frontend: _________
- Backend: _________
- Database: _________
- Auth: _________
- Hosting: _________
- Why this stack: _________ (use what you know, not what's trendy)

PROJECT STRUCTURE:
- Monorepo or separate repos: _________
- Key folders: _________
```

### Output

Feature tree, dependency map, build order, stack picked. Everything else is parked.

---

### Handoff to Phase 1

Follow the build order from Step 5. One feature at a time. Don't start the next feature until its dependencies are built and working.

```
Feature 1 (no deps)      -> Phase 1-6 -> DONE
Feature 2 (needs #1)     -> Phase 1-6 -> DONE
Feature 3 (needs #1)     -> Phase 1-6 -> DONE  (can run parallel with #2 if no shared dep)
Feature 4 (needs #2, #3) -> Phase 1-6 -> DONE
```

---

## Phase 1: DUMP (5 min)

**Goal:** Get everything out of your head. No filter. No judgment.

### Framework: JTBD + Brain Dump

Answer these 4 questions. Write fast, don't edit:

```
1. THE JOB
   "When _________, I want to _________, so I can _________."
   (situation)         (motivation)          (outcome)

2. THE TRIGGER
   What moment makes the user need this?
   What are they doing right before?

3. THE CURRENT PAIN
   How do they solve this today without your feature?
   What's annoying about the current way?

4. DREAM STATE
   If this worked perfectly, what would the user say?
   "Now I can finally ___________."
```

### Example

```
1. THE JOB
   "When I have 10 screenshot variants for my app store listing,
    I want to A/B test them,
    so I can pick the one that gets the most downloads."

2. THE TRIGGER
   User just finished making screenshots in the editor.
   They're staring at 10 variants and don't know which is best.

3. THE CURRENT PAIN
   They upload one, wait a week, check downloads.
   Change it, wait another week. Takes months to optimize.

4. DREAM STATE
   "Now I can test all 10 at once and know the winner in days."
```

### Output

A messy brain dump. That's fine. You clean it up in the next phase.

---

## Phase 2: CHALLENGE (10 min)

**Goal:** Poke holes. Kill bad ideas early. Find the smallest version that works.

### Framework: Pre-Mortem + MoSCoW

#### Step 1: Pre-Mortem

Imagine it's 2 weeks from now. You built it and it failed. Why?

Write down 5 reasons it could fail:

```
FAILURE REASONS:
1. _________
2. _________
3. _________
4. _________
5. _________
```

For each one, ask: "Can I prevent this?" If yes, add it to your requirements. If no, maybe this feature isn't ready.

#### Step 2: MoSCoW Sort

Take everything from Phase 1 and sort it:

```
MUST HAVE (ship breaks without these)
- _________
- _________

SHOULD HAVE (really want, but can ship without)
- _________

COULD HAVE (nice but not important)
- _________

WON'T HAVE (explicitly not doing this time)
- _________
- _________
```

Rules:
- Max 3-5 items in MUST HAVE. If you have more, you're building too much.
- WON'T HAVE is the most important list. It prevents scope creep.
- If you're not sure, it's SHOULD HAVE, not MUST HAVE.

#### Step 3: The Bar Test

Explain the feature to an imaginary friend at a bar. One sentence:

```
"It lets you _________ so you don't have to _________."
```

If you can't say it in one sentence, it's too complex. Simplify.

### Output

A clean list of must-haves, a "won't have" list, and a one-sentence description.

---

## Phase 3: WALK THROUGH (15 min)

**Goal:** "Use" the feature in your head. Every screen, every click, every state.

This is the most important phase. If you nail this, you won't change things during build.

### Framework: Screen State Matrix

#### Step 1: List Every Screen

Write down every screen the user will see, in order:

```
SCREENS:
1. [Screen Name] - one line about what it shows
2. [Screen Name] - one line about what it shows
3. ...
```

#### Step 2: For Each Screen, Fill the State Matrix

Every screen has multiple states. List them all:

```
SCREEN: [Name]
  URL: /path

  STATES:
  - Empty:    what does the user see when there's no data?
  - Loading:  what shows while data loads?
  - Success:  what does the normal view look like?
  - Error:    what if the API fails?
  - Partial:  what if some data is missing? (optional fields null)

  ACTIONS:
  - [Button/Link] -> goes to [screen] / does [action]
  - [Button/Link] -> goes to [screen] / does [action]

  EDGE CASES:
  - What if the list has 100+ items? (pagination?)
  - What if the user has no permission?
  - What if they're on mobile?
```

#### Step 3: Narrate the User Journey

Write it like a story. Walk through the happy path first, then the sad paths:

```
HAPPY PATH:
1. User opens [page]. They see [what].
2. They click [button]. [What happens].
3. They fill in [fields]. They click [submit].
4. They see [success state]. Done.

SAD PATH - Empty:
1. User opens [page]. There's no data yet.
2. They see [empty state message + CTA].
3. They click [CTA]. Goes to [creation flow].

SAD PATH - Error:
1. User fills in [fields]. Clicks [submit].
2. API returns error. They see [error message].
3. They fix [input] and retry.
```

### Output

A complete screen-by-screen walkthrough with all states.

---

## Phase 4: TECH CHECK (10 min)

**Goal:** Map the feature to actual code. Find conflicts and reuse chances.

### Framework: Impact Map

#### Step 1: Data Changes

```
NEW TABLES:
- [table_name]: [what it stores]
  Columns: [list key columns]

CHANGED TABLES:
- [table_name]: add [column] because [reason]

NO TABLE CHANGES? Skip this.
```

#### Step 2: API Changes

```
NEW ENDPOINTS:
- [METHOD] /api/[path] - [what it does]
  Request: { [key fields] }
  Response: { data: { [key fields] } }

CHANGED ENDPOINTS:
- [METHOD] /api/[path] - [what changes]
```

#### Step 3: Existing Code Impact

This is where you catch conflicts:

```
REUSE:
- What existing components can I reuse? [list them]
- What existing API hooks can I reuse? [list them]
- What existing services/repos can I extend? [list them]

CONFLICTS:
- Does this change break any existing page? [which ones]
- Does this change any shared component? [which ones]
- Does this change any existing API response shape? [which ones]

DEPENDENCIES:
- Does this need a new npm package? [which one, why]
- Does this need a new env variable? [which one]
- Does this depend on another feature being done first? [which one]
```

#### Step 4: Effort Gut Check

```
T-shirt size: XS / S / M / L / XL

XS = 1-2 files changed, < 1 hour
S  = 3-5 files, a few hours
M  = 5-10 files, half a day
L  = 10-20 files, full day
XL = 20+ files, multiple days -> consider splitting into smaller features
```

If it's XL, go back to Phase 2 and cut scope.

### Output

A list of DB changes, API changes, code impacts, and a size estimate.

---

## Phase 5: FINAL CUT (5 min)

**Goal:** Last chance to simplify before building. Lock the scope.

### Framework: The Three Filters

#### Filter 1: The Confidence Check

For each must-have from Phase 2, rate your confidence:

```
MUST HAVE                           CONFIDENCE
- [feature 1]                       HIGH / MEDIUM / LOW
- [feature 2]                       HIGH / MEDIUM / LOW
- [feature 3]                       HIGH / MEDIUM / LOW
```

- HIGH = I know exactly what to build and how
- MEDIUM = I know what to build but some details are fuzzy
- LOW = I'm guessing

Any LOW items? Either figure them out right now, or move them to v2.

#### Filter 2: The v1/v2 Split

```
v1 (shipping now):
- [thing 1]
- [thing 2]
- [thing 3]

v2 (shipping later):
- [thing 4]
- [thing 5]
```

v1 should be the smallest thing that's still useful. If a user can only do v1 and nothing else, would they still be happy? If no, you cut too much.

#### Filter 3: The Regret Test

Ask yourself:
- "Will I regret not thinking about _________ during build?"
- Walk through Phase 3 screens one more time, fast.
- Anything feel off? Fix it now. Not during build.

### Output

A locked scope. v1 is clear. v2 is parked. No more changes.

---

## Phase 6: BUILD

Now you build. Use the existing pipeline:

```
/spec -> /plan -> /build -> /review
```

The difference: your spec will be way better because you did the thinking first. Feed the phase outputs directly into /spec:

- Phase 0 (PRODUCT + MVP MAP) -> product definition, MVP features, stack
- Phase 1 (DUMP) -> fills the Problem and Goal sections
- Phase 2 (CHALLENGE) -> fills Requirements (must/should/could/won't)
- Phase 3 (WALK THROUGH) -> fills UI Changes, Edge Cases, Testing Criteria
- Phase 4 (TECH CHECK) -> fills Data Model, API Changes, Dependencies
- Phase 5 (FINAL CUT) -> confirms scope is locked

---

## How to Use This With Claude

### New Project

```
"I have a new project idea: [idea]. Let's think it through.
 Start with Phase 0: PRODUCT."
```

### New Feature (existing project)

```
"I want to add [feature]. Let's think it through.
 Start with Phase 1: DUMP."
```

Claude will guide you through each phase, ask questions, and challenge your ideas. Don't rush to build. Stay in the thinking phases until everything feels solid.

Move to the next phase only when you're satisfied with the current one.

---

## Quick Reference

| Phase | When | Time | Framework | Output |
|-------|------|------|-----------|--------|
| 0. PRODUCT + MVP MAP | New project | 20 min | Core Loop + Feature Kill List + Dependency Map | Feature tree, dependency map, build order, stack |
| 1. DUMP | Every feature | 5 min | JTBD + Brain Dump | Raw ideas, the job, the pain |
| 2. CHALLENGE | Every feature | 10 min | Pre-Mortem + MoSCoW | Must-haves, won't-haves, one-liner |
| 3. WALK THROUGH | Every feature | 15 min | Screen State Matrix | Every screen, every state, user journey |
| 4. TECH CHECK | Every feature | 10 min | Impact Map | DB/API changes, conflicts, size estimate |
| 5. FINAL CUT | Every feature | 5 min | Three Filters | Locked v1 scope, parked v2 |
| 6. BUILD | Every feature | varies | /spec -> /plan -> /build | Working feature |

---

## Anti-Patterns (Don't Do These)

**Product level:**
- **10 MVP features.** That's not an MVP. That's a product roadmap. Max 3-5.
- **Picking trendy stack.** Use what you know. Speed matters more than "best" tools.

**Feature level:**
- **Skipping Phase 3.** "I'll figure out the screens while coding." No. 80% of rework comes from this.
- **Too many must-haves.** If you have 8 must-haves, you have 0 must-haves. Max 5.
- **Empty "won't have" list.** If nothing is out of scope, everything is in scope. Scope creep.
- **Skipping the pre-mortem.** Feels negative, but it catches real problems early.
- **Going back to Phase 1 during Phase 5.** If you're rethinking the core idea in Phase 5, the idea wasn't ready. Start over.
- **Starting to code during Phase 4.** Tech check is for mapping, not building. Don't open the editor yet.

---

## The Full Picture

```
NEW PROJECT:
  Phase 0 (Product + MVP Map) -> [Feature 1: Phase 1-6] -> [Feature 2: Phase 1-6] -> ...

NEW FEATURE:
  Phase 1 (Dump) -> Phase 2 (Challenge) -> Phase 3 (Walk Through) -> Phase 4 (Tech Check) -> Phase 5 (Final Cut) -> Phase 6 (Build)

PHASE 6 BUILD PIPELINE:
  /spec -> /plan -> /build -> /review
```
