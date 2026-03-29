---
name: spartan:build
description: "Build a new feature end-to-end — backend, frontend, or full-stack with auto-detection"
argument-hint: "[backend|frontend] [feature description]"
preamble-tier: 4
---

# Build: {{ args[0] | default: "a new feature" }}

You are the **Build workflow leader** — the main way to go from requirement to merged PR.

You decide which steps to run, which skills to call, and when to move forward. The user doesn't need to chain commands manually — you handle the full pipeline.

```
SINGLE FEATURE:

  Context → Spec → Design? → Plan → Implement → Review Agent → Fix → Ship
     │        │        │        │        │            │          │       │
  .memory/ Gate 1   Design   Gate 2   Gate 3    Spawn agent   Loop   Gate 4
                    Gate                        fix until OK

EPIC (multi-feature — auto-detected):

  Context → Epic detected → Per feature: Spec/Design/Plan → Implement → Review Agent → Fix → Ship
     │            │                │                             │            │          │       │
  .planning/  read epic    fill gaps if needed          parallel by      Spawn agent  Loop   one PR
  epics/                                                dependency       fix until OK
```

**Fast path:** For small work (< 1 day, ≤ 4 tasks), you do spec + plan inline. No separate commands needed.
**Full path:** For bigger work, you call `/spartan:spec`, `/spartan:ux prototype`, `/spartan:plan` as sub-steps.
**Epic path:** If the feature name matches an epic with 2+ specs ready, build all features together — one branch, one PR.

### Stages That MUST NOT Be Skipped

| Stage | When it runs | Can skip? |
|-------|-------------|-----------|
| Stage 1 (Spec) | Always | NO — every feature needs a scope |
| Stage 2 (Design) | Frontend/UI work | NO — must ask user (skip only if pure data change) |
| Stage 3 (Plan) | Always | NO — every feature needs a plan |
| Stage 4 (Implement) | Always | NO |
| Stage 5 (Review) | Always | **NEVER** — this is the most commonly skipped stage. You MUST spawn the review agent. |
| Stage 6 (Ship) | Always | NO |

**If you finish Stage 4 and are about to commit/PR without running Stage 5 — STOP. You are skipping review. Go back and run it.**

---

## Step 0: Detect Mode & Stack (silent — no questions)

Parse the user's input to find the mode:
- First arg is `backend` or `be` → **backend mode**
- First arg is `frontend` or `fe` → **frontend mode**
- No mode given → **auto-detect**

**Auto-detect logic** (check the project files):
```bash
ls build.gradle.kts settings.gradle.kts 2>/dev/null && echo "STACK:kotlin-micronaut"
ls package.json 2>/dev/null && cat package.json 2>/dev/null | grep -q '"next"' && echo "STACK:nextjs-react"
ls .planning/PROJECT.md 2>/dev/null && echo "GSD_ACTIVE"
```

| Detected | Mode |
|----------|------|
| Kotlin only | Backend |
| Next.js only | Frontend |
| Both | Ask: "This is a full-stack project. Is this feature backend, frontend, or both?" |
| Neither | Ask the user what stack they're using |

**Check for installed skills:**
- If backend mode but no `kotlin-best-practices` skill found → warn: "You don't have the backend pack installed. Run `/spartan:update` and add it, or continue without stack-specific guidance."
- If frontend mode but no `ui-ux-pro-max` skill found → same warning for frontend pack.

---

## Step 0.5: Check Context (silent — no questions)

Before doing anything, check what already exists for this feature.

```bash
# Check memory for relevant decisions/patterns
ls .memory/index.md 2>/dev/null
ls .memory/decisions/ .memory/patterns/ .memory/knowledge/ .memory/blockers/ 2>/dev/null

# Check for existing artifacts
ls .planning/specs/*.md 2>/dev/null
ls .planning/designs/*.md .planning/design/screens/*.md 2>/dev/null
ls .planning/plans/*.md 2>/dev/null

# Check for design tokens
ls .planning/design/system/tokens.md .planning/design-config.md 2>/dev/null

# Check for epic
ls .planning/epics/*.md 2>/dev/null

# Check for handoff from a previous session
ls .handoff/*.md 2>/dev/null
```

**If `.memory/index.md` exists**, read it. Look for decisions or patterns related to this feature. If you find something relevant, mention it:
> "Found relevant context in `.memory/`: [brief summary]. Using this."

**If a handoff exists**, read it. You might be resuming a previous session's work:
> "Found handoff from a previous session. Resuming from: [last stage]."

**If spec/design/plan already exist** for this feature, skip those stages and jump ahead. Show what you found:
> "Found: spec ✓, design ✓, plan ✓ — jumping to Implement."

### Epic detection (auto — no questions)

**If an epic exists** that matches the feature name (or the user passed an epic name):

1. Read the epic file at `.planning/epics/{name}.md`
2. Find all features listed in the epic's Features table
3. Check which features have specs ready (status = `spec` or `planned`)
4. Check which features are already `done` or `skipped`

**If 2+ features have specs ready → switch to Epic mode:**
> "Found epic **{name}** with {N} features. {X} specs ready, {Y} already done. Building all ready features together — one branch, one PR."

Then jump to **Stage E: Epic Build** below.

**If only 1 feature has a spec** → build that one normally (single feature mode).

**If no features have specs yet** → tell the user to write specs first:
> "Epic exists but no specs are ready. Run `/spartan:spec {first-feature}` to start."

---

## Stage 1: Understand (Spec)

### Size check first

Before asking anything, estimate the size from the user's description:

- **Small** (< 1 day, ≤ 4 tasks, ≤ 3 files) → **Fast path** — inline spec below
- **Big** (multi-day, 5+ tasks, new tables + endpoints + UI) → **Full path** — run `/spartan:spec`

**How to decide:**
- Adding a column + updating one endpoint = small
- New feature with migration + service + controller + frontend = big
- If unclear, ask one question: "Quick estimate — is this a few hours or multiple days?"

### Fast path (small work)

Ask 3 forcing questions. Always. Even in auto mode.

1. **"What pain does this solve?"** — Not the feature. The pain. If the user says "add a profiles endpoint" ask what user problem it fixes.
2. **"What's the narrowest version we can ship?"** — Force MVP thinking. Cut scope until it hurts.
3. **"What assumption could be wrong?"** — Surface hidden risks early.

After the user answers, produce a scope block:

```markdown
## Scope: [feature name]

**Pain:** [one sentence]
**Stack:** [backend / frontend / full-stack] — [Kotlin+Micronaut / Next.js+React / both]

**IN:**
- [what will be built]
- [what will be built]

**OUT:**
- [what is NOT in scope]
- [what is NOT in scope]

**Risk:** [the assumption that could be wrong]
```

### Full path (big work)

Tell the user and run the spec command internally:
> "This is bigger work — let me run a proper spec first."

Use the approach from `/spartan:spec` — ask questions one at a time, fill the template, run Gate 1, save to `.planning/specs/`.

Then continue to the next stage automatically (don't tell the user to run a separate command).

**GATE 1 — STOP and ask:**
> "Here's the scope. Anything to change before I plan?"
>
> **Auto mode on?** → Show scope, continue immediately without waiting.

---

## Stage 2: Design (UI work only — auto-detected)

**Only runs if the feature has UI work.** Skip entirely for pure backend.

Check if this feature needs a design:
- Frontend mode? → Yes
- Full-stack mode with UI changes? → Yes
- Backend only? → Skip this stage

Check if a design already exists:
```bash
ls .planning/designs/*.md 2>/dev/null
```

If no design exists and UI work is needed:
> "This has UI work. Want me to create a design doc?"
>
> - **A) Yes** — I'll run the design workflow (dual-agent review with design-critic)
> - **B) Skip** — I'll design as I build (fine for simple UI changes)
> - **C) I have Figma designs** — point me to them

If user picks A → use the approach from `/spartan:ux prototype` internally. Run the full design workflow including the design-critic agent review.

If user picks B → continue to Plan.

If user picks C → read the Figma reference and use it as the design source.

**Auto mode on?** → Still ask this question. Design skipping is the user's call, not yours. The only exception: if the change is purely data (adding a column to an existing table, no new screens or layouts), skip silently. If there's ANY new component, screen, modal, or layout change — you MUST ask.

---

## Stage 3: Plan

### Check for saved plan

If a plan already exists for this feature, use it:
> "Found plan: `.planning/plans/{name}.md` — using it."

If no plan exists, do the size check:

### Fast path (small — 1-4 tasks)

Produce an inline plan:

```markdown
## Plan: [feature name]
Branch: `feature/[slug]`

### Task 1: [name]
Files: [exact paths]
Test first: [what test to write]
Implementation: [what to change]
Verify: [how to confirm]

### Task 2: [name]
...
```

**Max 4 tasks for inline plan.** If you need more, use the full path.

### Full path (big — 5+ tasks)

Use the approach from `/spartan:plan` internally — architecture design, file locations, phased tasks with parallel/sequential marking. Save to `.planning/plans/`.

Then continue automatically.

### What the plan includes (by mode)

**Backend mode** — tasks follow this order:
1. Migration (if new/changed table)
2. Entity + Table object + Repository + repo tests
3. Service/Manager + service tests
4. Controller + integration tests

Uses skills: `database-patterns`, `api-endpoint-creator`, `kotlin-best-practices`, `testing-strategies`, `security-checklist`

**Frontend mode** — tasks follow this order:
1. Types / interfaces
2. API client (if new endpoints needed — flag that backend work may be needed first)
3. Components (bottom-up: small → composed → page-level)
4. Page + routing + tests

Uses skills: `ui-ux-pro-max`, frontend rules

**Full-stack mode** — backend tasks first, then frontend tasks. Mark the integration point clearly (where frontend starts depending on backend API).

**CRITICAL: Full-stack means BOTH layers must complete.** Don't move to Gate 3 after finishing backend only. The plan must include frontend tasks and ALL tasks must be done before review. If the spec mentions UI changes, API responses shown to users, or any user-facing behavior — frontend tasks are mandatory.

### Create branch

```bash
git checkout -b feature/[slug]
```

Write the first failing test for Task 1. Show it fails.

**GATE 2 — STOP and ask:**
> "Plan has [N] tasks. Does this make sense?"
>
> **Auto mode on?** → Show plan, start executing immediately.

---

## Stage 4: Implement

### FIRST: Check for parallelism and route

**Before writing any code, analyze the plan from Stage 3.**

Look at the dependency table:
- Group tasks that share the same dependency (e.g., tasks 3, 4, 5 all depend on task 2 → parallel group)
- Tasks at the end with no dependency on each other → another parallel group
- Full-stack plans ALWAYS have parallel groups (backend + frontend tracks)

```bash
echo "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-not_set}"
```

**Route decision:**

| Env var set? | Parallel groups? | Route |
|---|---|---|
| YES | YES (2+ tasks in any group) | **Tell the user: "This plan has parallel groups. I'm creating an agent team to run them at the same time." Then use `TeamCreate` to create a team and spawn teammates.** |
| YES | NO (strict chain) | Sequential execution below |
| NO | — | Sequential execution below |

**How Agent Teams works** (when routing to teams):

Agent Teams are separate Claude Code sessions (not background tasks). They show as multiple **nodes** in the status bar, not "local agents." Each teammate works independently with its own context.

Tell the user you're creating a team, then:
1. Call `TeamCreate` to create the team
2. Call `TaskCreate` for each work item, with `addBlockedBy` for dependencies
3. Spawn teammates with `Agent` using `team_name` and `name` params — each handles a parallel track
4. Split by mode: full-stack = backend-dev + frontend-dev, backend-only = data-layer + api-layer, frontend-only = components-dev + pages-dev
5. Frontend/UI teammates MUST get design doc path and design tokens in their prompt
6. Monitor via incoming messages (auto-delivered). Use `SendMessage` to redirect if needed.
7. When all done, merge worktrees, run full test suite, `TeamDelete` to clean up

**After team completes → continue to Stage 5 (Review). Do NOT stop.**

### Sequential execution (when no parallel groups or Agent Teams not enabled)

Execute each task in order:

### For each task:
1. **Write test** → run it → confirm it fails (red)
2. **Write code** → run test → confirm it passes (green)
3. **Refactor** if needed (tests still green)
4. **Commit** with an atomic message:
   ```
   feat([scope]): [what this task does]
   ```
5. Brief status: "Task [N]/[total] done. Moving to next."

### TDD override
If a task is hard to test-first (UI components, config changes), say so and switch to implement-then-test. But always have a test when the task is done.

### Skill routing during implementation

Call the right skills based on what you're doing:

| Working on... | Use skill |
|---------------|-----------|
| Database migration | `database-patterns` |
| New endpoint | `api-endpoint-creator` |
| Kotlin code | `kotlin-best-practices` |
| Writing tests | `testing-strategies` |
| React components | `ui-ux-pro-max` |
| Security-sensitive code | `security-checklist` |

### After all tasks — Verify Definition of Done

**Before moving to review, verify ALL layers are complete:**

| Mode | Must be done before review |
|------|---------------------------|
| **Backend** | Migration applied, entity/table/repo created, manager with business logic, controller with endpoints, all tests passing (`./gradlew test`) |
| **Frontend** | Types defined, API client updated, components built, page/routing wired, build passes (`yarn build` or `npm run build`) |
| **Full-stack** | ALL backend items above + ALL frontend items above + frontend calls the new backend API correctly |

**Full-stack verification (MANDATORY if mode is full-stack):**
1. Backend tests pass: `./gradlew test`
2. Frontend builds: `yarn build` or `npm run build`
3. Frontend types match backend response DTOs
4. API client has methods for all new endpoints
5. UI shows the data from the new endpoints

**If any layer is incomplete**, go back and finish it. Do NOT proceed to review with only backend done.

Run the full test suite:
```bash
# Backend
./gradlew test

# Frontend
npm test && npm run build

# Both (full-stack)
./gradlew test && npm test && npm run build
```

**GATE 3 — Implementation complete. Review is NEXT.**
> "All [N] tasks done. [X] tests passing. Starting review."
>
> **Auto mode on?** → Go straight to review.
>
> **CRITICAL: You MUST run Stage 5 (Review) after this gate. No exceptions. Do NOT commit, do NOT create a PR, do NOT ask the user what to do next. The next step is ALWAYS the review agent.**

---

## Stage 5: Review (agent-based — MANDATORY, NEVER SKIP)

> **CRITICAL: This stage MUST run for every build. No exceptions.**
> - Not optional. Not skippable. Not deferrable.
> - Do NOT ask the user "Want me to skip review?" or "Should I review?"
> - Do NOT commit or create a PR before this stage completes.
> - If you catch yourself about to skip this stage, STOP and run it.

**This is NOT a self-review.** Spawn a separate review agent to get a fresh perspective. The reviewer finds issues, you fix them, repeat until clean.

### Step 1: Load rules from config

The review uses **configurable rules**. Load them in this order:

```bash
# 1. Check for project config
cat .spartan/config.yaml 2>/dev/null || cat ~/.spartan/config.yaml 2>/dev/null
```

**If `.spartan/config.yaml` exists:**
- Read the `rules` section → get rule file paths for the current mode
- Read the `review-stages` section → get which stages to run
- Read `file-types` section → classify changed files by mode
- If `extends` is set, load the base profile first, then apply overrides (`rules-add`, `rules-remove`, `rules-override`)
- If `conditional-rules` is set, match rules to changed files by glob pattern

**If no config exists — auto-generate from installed packs:**

```bash
# Check what packs are installed
cat .claude/.spartan-packs 2>/dev/null || cat ~/.claude/.spartan-packs 2>/dev/null
```

If a packs file exists, generate config from the matching profile:
- Has `backend-micronaut` → use `kotlin-micronaut` profile
- Has `frontend-react` → use `react-nextjs` profile
- Has `backend-nodejs` → use `typescript-node` profile
- Has `backend-python` → use `python-fastapi` profile
- None of the above → use `custom` profile

Look for the profile in the toolkit source:
```bash
REPO_PATH=$(cat ~/.claude/.spartan-repo 2>/dev/null || echo "")
ls "$REPO_PATH/toolkit/profiles/" 2>/dev/null
```

Copy the matching profile to `.spartan/config.yaml`. Tell the user:
> "No config found. Generated `.spartan/config.yaml` from {profile} profile. Edit it to customize."

**If no packs file either (bare fallback):**
- Scan `rules/` directory for all `.md` files
- Group by subdirectory: `rules/backend-micronaut/` → backend, `rules/frontend-react/` → frontend, `rules/database/` → backend, `rules/core/` → shared
- If no `rules/` dir, check `.claude/rules/` then `~/.claude/rules/`
- Use all 7 default review stages

### Step 2: Gather review context

```bash
# Get changed files by type (use file-types from config if available)
git diff main...HEAD --name-only

# Find spec and plan for this feature
ls .planning/specs/*.md .planning/plans/*.md .planning/designs/*.md 2>/dev/null
```

Classify each changed file into backend/frontend/migration using the `file-types` from config (or defaults: `.kt/.java/.go/.py` = backend, `.tsx/.ts/.vue` = frontend, `.sql` = migration).

### Step 3: Spawn the review agent

Use the `Agent` tool to spawn a reviewer. **The prompt is built from the config.**

```
Agent:
  name: "reviewer"
  subagent_type: "phase-reviewer"
  prompt: |
    You are reviewing code changes for the feature: {feature name}.

    ## What changed
    - Backend files: {list from git diff, classified by file-types config}
    - Frontend files: {list from git diff}
    - Migration files: {list from git diff}
    - Design doc: {path if exists, or "none"}

    ## Spec and plan
    - Spec: {path to spec file, or inline scope block from Stage 1}
    - Plan: {path to plan file, or inline plan from Stage 3}
    Check that the code matches what was specified and planned. Flag missing pieces.

    ## Rules to check against
    Read these rule files BEFORE reviewing code. They are the source of truth.

    {List ALL rule paths from config, grouped by mode. Example:}

    **Backend rules (from .spartan/config.yaml):**
    {for each rule in config.rules.backend + config.rules.shared:}
    - `{rule path}`
    {end for}

    **Frontend rules (from .spartan/config.yaml):**
    {for each rule in config.rules.frontend + config.rules.shared:}
    - `{rule path}`
    {end for}

    **Conditional rules (if any):**
    {for each conditional rule where changed files match applies-to:}
    - `{rule path}` — applies to files matching `{glob}`
    {end for}

    {IF design doc exists:}
    **Design compliance:**
    - Read the design doc at {path}. Check that UI matches the approved design.

    ## Review stages
    {List ONLY the stages that are enabled in config.review-stages.
     For each stage, include its name and description from config.
     If no config, use all 7 defaults below.}

    **Stage 1 — Correctness & Requirements**
    - Does the code match the spec? Any missing requirements?
    - Are all edge cases handled?
    - Error handling follows the project's approach (check the rules)?

    **Stage 2 — Stack Conventions**
    - Code follows the patterns described in the loaded rule files?
    - Stack idioms are correct for this language/framework?

    **Stage 3 — Test Coverage**
    - Tests exist for new code?
    - Tests are independent (no order dependency)?
    - Edge cases covered? Happy path + error paths?

    **Stage 4 — Architecture & Clean Code**
    - Architecture matches what the config says (layered, hexagonal, etc.)?
    - Proper separation between layers?
    - Functions small and focused? No deep nesting?
    - No duplication, no dead code?

    **Stage 5 — Database & API**
    - Schema follows the rules? (check loaded database rules)
    - API design follows the rules? (check loaded API rules)
    - Input validation on public endpoints?

    **Stage 6 — Security**
    - Auth checks on all endpoints?
    - Input validated and sanitized?
    - No sensitive data logged or exposed?
    - No injection risks?

    **Stage 7 — Documentation Gaps**
    - New pattern that should be documented? → flag for rules update
    - New convention established? → flag for .memory/patterns/
    - Recurring issue that should become a rule? → flag it

    ## Output format

    For each issue:
    - File and line number
    - What's wrong
    - Which rule it breaks (with rule file path)
    - Severity: HIGH (must fix) / MEDIUM (should fix) / LOW (nice to have)
    - Suggested fix

    End with:
    - **PASS** or **NEEDS CHANGES** (list all HIGH/MEDIUM issues)
    - **Documentation updates needed** (list any from Stage 7, or "none")
    - **What's clean** (always include — praise good code)
```

### Step 3: Fix loop

When the reviewer reports back:

**If PASS** → save any documentation updates the reviewer flagged, then continue to Ship.

**If NEEDS CHANGES:**

1. Read the reviewer's findings
2. Fix all HIGH issues. Fix MEDIUM issues if they make sense.
3. Commit fixes:
   ```
   fix([scope]): [what review caught]
   ```
4. Run tests again to make sure fixes didn't break anything
5. Spawn the review agent AGAIN with the updated diff — only the remaining/new changes need review
6. Repeat until the reviewer says PASS

**Max 3 review rounds.** If still failing after 3 rounds, stop and ask the user:
> "Review found issues I can't fully fix. Here's what's left: [list]. Want to continue anyway or address these manually?"

### Step 4: Capture review learnings

After the reviewer says PASS, check its output for:

- **Documentation updates needed** → save to `.memory/knowledge/` so the next build knows
- **New pattern flagged** → save to `.memory/patterns/`
- **Rule violation that keeps showing up** → note it for the user to consider adding to rules

### Step 5: Parallel review with Agent Teams

```bash
echo "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-not_set}"
```

**If Agent Teams is enabled**, create a review team for parallel coverage:

```
TeamCreate(team_name: "review-{feature-slug}", description: "Code review for {feature}")

TaskCreate(subject: "Quality review", description: "Stages 1-2, 4: correctness, conventions, architecture")
TaskCreate(subject: "Test review", description: "Stage 3: coverage, edge cases, test quality")
TaskCreate(subject: "Security review", description: "Stage 6: auth, injection, data exposure")

Agent(
  team_name: "review-{feature-slug}",
  name: "quality-reviewer",
  subagent_type: "phase-reviewer",
  prompt: "Review for correctness, stack conventions, architecture.
    Changed files: {list}. Rules: {rule paths from config}.
    Check against spec at {spec path} and plan at {plan path}.
    Output: PASS or NEEDS CHANGES with file:line, rule broken, severity, fix."
)

Agent(
  team_name: "review-{feature-slug}",
  name: "test-reviewer",
  subagent_type: "general-purpose",
  prompt: "Review test coverage, edge cases, test quality.
    Changed files: {list}. Check test independence, assertions, no duplication.
    Output: PASS or NEEDS CHANGES with specifics."
)

Agent(
  team_name: "review-{feature-slug}",
  name: "security-reviewer",
  subagent_type: "general-purpose",
  prompt: "Review security: auth, input validation, data exposure, injection.
    Changed files: {list}. Rules: security-checklist + OWASP top 10.
    Output: PASS or NEEDS CHANGES with specifics."
)
```

All teammates review at the same time. Combine their findings. All must PASS before moving to Ship. If any says NEEDS CHANGES → fix loop (Step 3) applies to the combined findings.

After review completes: `TeamDelete()` to clean up.

**If Agent Teams is NOT enabled**, use a single review agent (Steps 1-2 above).

---

## Stage 6: Ship

### Create PR
Run the approach from `/spartan:pr-ready`:
- Rebase onto main
- Run all checks one final time
- Create PR with clear title, summary, and test plan

### Save to memory (if something notable was learned)

After the PR is created, check if this build revealed anything worth remembering:

- **New pattern discovered?** → Save to `.memory/patterns/`
- **Architecture decision made?** → Save to `.memory/decisions/`
- **Gotcha or workaround found?** → Save to `.memory/knowledge/`
- **Nothing notable?** → Skip. Don't save noise.

```bash
mkdir -p .memory/decisions .memory/patterns .memory/knowledge
```

Update `.memory/index.md` if you saved anything.

**GATE 4 — Done.**
> "PR created: [link]. Here's what's in it: [summary]."

---

## Stage E: Epic Build (multi-feature mode)

**This replaces Stages 1–4 when epic mode is active.** It builds all ready features from the epic on one branch and creates one PR. Review and Ship still run normally after.

### Step 1: Collect and fill gaps

Read the epic file. For each feature with status `spec`, `planned`, or `building`:

1. Read its spec from `.planning/specs/`
2. Read its design from `.planning/designs/` (if exists)
3. Read its plan from `.planning/plans/` (if exists)

**Fill gaps for each feature that's missing something:**

| Missing | Action |
|---------|--------|
| Spec | Skip this feature — tell user to run `/spartan:spec {feature}` first |
| Design (and feature has UI work) | Ask user: create design now or skip? Same logic as Stage 2 |
| Plan | Generate a plan inline (fast path for small, full path for big) |

**Use Agent Teams to fill gaps in parallel** (if enabled): When 2+ features need plans or designs generated, use a team to do this at the same time.

```bash
echo "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-not_set}"
```

If Agent Teams enabled and 2+ features need plans:
```
TeamCreate(team_name: "epic-prep-{slug}", description: "Preparing specs/plans for epic")

// One task + teammate per feature that needs a plan
Agent(
  team_name: "epic-prep-{slug}",
  name: "planner-{feature-1}",
  subagent_type: "general-purpose",
  isolation: "worktree",
  prompt: "Generate the design (if needed) and plan for feature: {feature-1}.
    Read spec at .planning/specs/{feature-1}.md.
    Save design to .planning/designs/, plan to .planning/plans/."
)

Agent(
  team_name: "epic-prep-{slug}",
  name: "planner-{feature-2}",
  subagent_type: "general-purpose",
  isolation: "worktree",
  prompt: "Generate the design (if needed) and plan for feature: {feature-2}. ..."
)
```
Collect results after all finish, then `TeamDelete()`.

### Step 2: Sort by dependency and create branch

Read the epic's Features table. Sort features by dependency order:
- Features with no dependencies → can build first
- Features that depend on others → build after their dependencies are done

```bash
git checkout -b feature/[epic-slug]
```

### Step 3: Implement in dependency order

Go through features in dependency order. **When 2+ features have no dependency between them, build them at the same time using Agent Teams** (if enabled). Otherwise build one by one.

```bash
echo "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-not_set}"
```

**For each feature (or group of parallel features):**

1. **If Agent Teams enabled and 2+ features can run at the same time:**
   ```
   TeamCreate(team_name: "epic-build-{slug}", description: "Building epic features in parallel")

   // One task per feature
   TaskCreate(subject: "Build {feature-A}", description: "...")
   TaskCreate(subject: "Build {feature-B}", description: "...")

   // One teammate per feature — MUST use team_name + name
   Agent(
     team_name: "epic-build-{slug}",
     name: "builder-{feature-A}",
     subagent_type: "general-purpose",
     isolation: "worktree",
     prompt: "Build feature {A}. Spec: .planning/specs/{A}.md. Plan: .planning/plans/{A}.md.
       Design doc: .planning/designs/{A}.md — read FIRST if exists.
       Follow TDD. Mark tasks completed when done."
   )

   Agent(
     team_name: "epic-build-{slug}",
     name: "builder-{feature-B}",
     subagent_type: "general-purpose",
     isolation: "worktree",
     prompt: "Build feature {B}. ..."
   )
   ```
   - **Design doc handoff is MANDATORY** — every frontend/UI teammate must read the design doc first
   - Wait for all teammates to finish (messages arrive automatically)
   - Merge worktrees, run full test suite
   - `TeamDelete()` to clean up
   - If tests fail → fix before moving on

2. **If sequential (Agent Teams not enabled or only one feature ready):**
   - Build each task with TDD: test → implement → refactor → commit
   - Follow the same skill routing as Stage 4

3. **After each feature completes:**
   - Update epic Features table (status → `done`)
   - Check: does this unblock the next features? If yes, start those next.

### Step 4: After all features built

Run the full test suite. Then continue to **Stage 5: Review** — the review agent reviews ALL changes across all features. One review, one fix loop, one PR.

**GATE 3 (Epic):**
> "All {N} features built. {X} tests passing. Starting review."
>
> **Auto mode on?** → Go straight to review.

---

## Resume: Picking Up Where You Left Off

If a previous session was interrupted (context overflow, user stopped, etc.), this workflow can resume.

**How resume works:**
1. Step 0.5 checks for `.handoff/` files and existing `.planning/` artifacts
2. Determine which stage was completed last:
   - Has spec but no plan → resume at Stage 3 (Plan)
   - Has plan but no commits on feature branch → resume at Stage 4 (Implement)
   - Has commits but no PR → resume at Stage 5 (Review) or Stage 6 (Ship)
3. Show the user: "Resuming from [stage]. Here's what was done: [summary]."
4. Continue from that point.

**Don't re-do completed stages.** Read the saved artifacts and move forward.

---

## Rules

- **You are the orchestrator.** Don't tell the user to run `/spartan:spec` or `/spartan:plan` separately. Run those approaches yourself when needed.
- **Fast path is the default for small work.** If the whole thing is 1-4 tasks, do everything inline. Don't force the user through 3 separate commands.
- **Full path for big work.** If 5+ tasks, save artifacts to `.planning/` so future sessions can pick up.
- **Gates are mandatory.** Even small features go through all stages. The stages are fast for small work — that's fine.
- **TDD by default.** Write the test first. Override only when test-first doesn't make sense for that specific task.
- **One commit per task.** Don't batch. Each task = one commit with a clear message.
- **Review is ALWAYS an agent. NEVER skip.** This is the #1 rule. After implementation finishes — whether via Agent Teams or sequential — you MUST spawn the review agent (Stage 5). Never self-review. Never skip review. Never ask the user if they want to skip. Never commit or create a PR without review. Fix issues until the reviewer says PASS.
- **Design gate runs for frontend work.** If the feature has UI work (new components, screens, modals, layouts), you MUST trigger the design question in Stage 2. Only skip for pure data changes (adding a field to an existing table/component).
- **Security check always runs.** Whether backend or frontend, security patterns get checked during review.
- **Frontend checks for backend needs.** If a new page needs data that doesn't exist yet, say so at Stage 3 and add backend tasks first.
- **Don't over-plan.** If the whole thing is 1-2 files and 30 minutes of work, don't force it into this workflow. Just do it. This workflow is for features that need structure — at least 2-3 tasks.
- **Save state for big work.** If 5+ tasks, save artifacts to `.planning/` so future sessions can resume.
- **Full-stack = both layers done.** If the feature touches both backend and frontend, you MUST implement both before creating the PR. Backend-only completion is NOT "done" for a full-stack feature.
- **Epic = one branch, one PR.** When building from an epic, all features go on one branch and ship as one PR. Don't create separate PRs per feature. Parallelize independent features with Agent Teams when available.
- **Epic auto-detection.** If the user's feature name matches an epic in `.planning/epics/`, switch to epic mode automatically. Don't ask.

---

## Definition of Done

A feature is NOT done until every applicable item is checked:

### Backend
- [ ] Database migration (if new/changed table)
- [ ] Kotlin entity, table object, repository with tests
- [ ] Manager with business logic and Either error handling
- [ ] Controller with proper annotations (@ExecuteOn, @Secured, @Validated)
- [ ] Integration tests for all endpoints (happy path, 404, 401)
- [ ] `./gradlew test` passes

### Frontend
- [ ] TypeScript types/interfaces match backend DTOs
- [ ] API client methods for all new/changed endpoints
- [ ] Components built and connected to data
- [ ] Page routing and navigation working
- [ ] `yarn build` (or `npm run build`) passes with no errors
- [ ] Loading, empty, and error states handled

### Full-Stack (ALL of the above, plus)
- [ ] Frontend calls backend API correctly (snake_case conversion, auth headers)
- [ ] Response data renders in the UI
- [ ] End-to-end flow works: user action → API call → backend processing → response → UI update
- [ ] Both `./gradlew test` AND `yarn build` pass

### Always
- [ ] Atomic commits (one per task)
- [ ] Review agent passed (all HIGH/MEDIUM issues fixed)
- [ ] PR created with summary and test plan
