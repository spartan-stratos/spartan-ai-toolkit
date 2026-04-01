---
name: spartan:build
description: "Build a new feature end-to-end — backend, frontend, or full-stack with auto-detection"
argument-hint: "[backend|frontend] [feature description]"
preamble-tier: 4
---

# Build: {{ args[0] | default: "a new feature" }}

You are the **Build workflow leader** — go from requirement to merged PR.

```
SINGLE FEATURE:
  Context → Spec → Design? → Workspace → Plan → Implement → Review → Ship
                                  ↑                            ↑
                            git worktree                  Spawn agent
                            (MANDATORY)                   (MANDATORY)

PARALLEL (multiple terminals — each gets its own worktree):
  Terminal 1: /spartan:build auth     → .worktrees/auth/     → PR #1
  Terminal 2: /spartan:build payments → .worktrees/payments/  → PR #2
```

### Mandatory Stages

| Stage | Can skip? |
|-------|-----------|
| 1 Spec | NO |
| 2 Design | Only if pure data change (no UI) |
| 3 Workspace + Plan | NO |
| 4 Implement | NO |
| 5 Review | **NEVER** — spawn review agent, never self-review |
| 6 Ship | NO |

**Auto mode:** Show output at each stage but don't pause for confirmation. Still stop for destructive actions and the 3 forcing questions.

**Fast path:** Small work (< 1 day, ≤ 4 tasks) → spec + plan inline. No separate commands.
**Full path:** Bigger work → `/spartan:spec`, `/spartan:ux prototype`, `/spartan:plan` as sub-steps.
**Epic path:** Feature name matches epic with 2+ specs → build all together, one branch, one PR. See Stage E.

---

## Preamble

```bash
mkdir -p ~/.spartan/sessions
touch ~/.spartan/sessions/"$PPID"
_SESSIONS=$(find ~/.spartan/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.spartan/sessions -mmin +120 -type f -delete 2>/dev/null || true
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_PROJECT=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || basename "$(pwd)")
echo "SESSIONS: $_SESSIONS"
echo "BRANCH: $_BRANCH"
echo "PROJECT: $_PROJECT"
cat .spartan/build.yaml 2>/dev/null || true
cat .spartan/commands.yaml 2>/dev/null || true
```

If `SESSIONS` >= 3, start every response with: **[PROJECT / BRANCH]** Currently working on: [task]

If `.spartan/commands.yaml` has `prompts.build`, apply those instructions alongside built-in ones.

### Build Config (`.spartan/build.yaml`)

All fields optional:

| Field | Default | What it does |
|-------|---------|-------------|
| `branch-prefix` | `"feature"` | Branch name: `[prefix]/[slug]` |
| `max-review-rounds` | `3` | Max review-fix cycles before asking user |
| `skip-stages` | `[]` | Stages to skip. Never `review`. |
| `prompts.*` | — | Custom instructions per stage: `spec`, `plan`, `implement`, `review`, `ship` |

---

## Step 0: Detect Mode & Stack (silent)

Parse input: `backend`/`be` → backend, `frontend`/`fe` → frontend, else auto-detect:

```bash
ls build.gradle.kts settings.gradle.kts 2>/dev/null && echo "STACK:kotlin-micronaut"
ls package.json 2>/dev/null && cat package.json 2>/dev/null | grep -q '"next"' && echo "STACK:nextjs-react"
ls .planning/PROJECT.md 2>/dev/null && echo "GSD_ACTIVE"
```

| Detected | Mode |
|----------|------|
| Kotlin only | Backend |
| Next.js only | Frontend |
| Both | Ask: "Backend, frontend, or both?" |

Check for installed skills — if backend mode but no `kotlin-best-practices` skill, or frontend mode but no `ui-ux-pro-max` skill → warn user to install the pack.

---

## Step 0.5: Check Context (silent)

```bash
ls .memory/index.md 2>/dev/null
ls .planning/specs/*.md .planning/designs/*.md .planning/plans/*.md 2>/dev/null
ls .planning/epics/*.md 2>/dev/null
ls .handoff/*.md 2>/dev/null
ls .worktrees/ 2>/dev/null
git worktree list 2>/dev/null
```

- **Memory exists** → read `.memory/index.md`, mention relevant context
- **Handoff exists** → resume from previous session
- **Spec/design/plan exist** → skip completed stages, jump ahead
- **Worktree exists for feature** → set WORKSPACE, resume from last stage
- **Epic matches feature name** with 2+ specs ready → switch to Epic mode (Stage E)

---

## Stage 1: Spec

**Size check:** Small (< 1 day, ≤ 4 tasks) → inline. Big (multi-day, 5+) → run `/spartan:spec` approach.

### Fast path (small)

Ask 3 forcing questions (always, even in auto mode):
1. **"What pain does this solve?"** — the pain, not the feature
2. **"What's the narrowest version we can ship?"** — force MVP
3. **"What assumption could be wrong?"** — surface risks

Produce:

```markdown
## Scope: [feature name]
**Pain:** [one sentence]
**Stack:** [backend / frontend / full-stack]

**IN:**
- [what will be built]

**OUT:**
- [what is NOT in scope]

**Risk:** [the assumption that could be wrong]
```

### Full path (big)

> "This is bigger work — running a proper spec."

Use `/spartan:spec` approach internally. Save to `.planning/specs/`.

If `.spartan/build.yaml` has `prompts.spec`, apply now.

**GATE 1:** "Here's the scope. Anything to change before I plan?"

---

## Stage 2: Design (UI work only)

Skip for pure backend. Check:
```bash
ls .planning/designs/*.md .planning/design/screens/*.md 2>/dev/null

# Check if AI asset generation is available
SCRIPTS_DIR=""
for dir in "$HOME/.claude/scripts/design" ".claude/scripts/design"; do
  [ -d "$dir" ] && SCRIPTS_DIR="$dir" && break
done
AI_KEY_FOUND=""
for env_file in ".spartan/ai.env" ".env" "$HOME/.spartan/ai.env"; do
  [ -f "$env_file" ] && grep -q "GEMINI_API_KEY" "$env_file" 2>/dev/null && AI_KEY_FOUND="yes" && break
done
echo "AI_DESIGN: scripts=${SCRIPTS_DIR:-none} key=${AI_KEY_FOUND:-none}"
```

If no design and feature has UI work, ask:

**If AI scripts + key are configured:**
> - **A) AI Design** — run full design workflow with AI brainstorming + asset generation + design-critic review
> - **B) Quick Design** — design as I build (no AI assets, just specs)
> - **C) I have Figma** — point me to them

**If AI is NOT configured:**
> - **A) Yes** — run design workflow with design-critic agent
> - **B) Skip** — design as I build (fine for simple UI)
> - **C) I have Figma** — point me to them

**If user picks AI Design (A with AI):**

1. Spawn the `ai-designer` agent with the feature spec and design-config.md
2. AI designer calls Gemini for layout/flow/components direction
3. AI designer generates assets using `ai-image.sh`
4. AI designer builds prototype HTML with real assets
5. Spawn `design-critic` to review — loop until both accept
6. Clean up preview screenshots
7. Save design doc + prototype + assets to `.planning/design/screens/{feature}/`

This gives you a complete visual prototype with real generated images before writing any code.

**Always ask for frontend work.** Only skip silently for pure data changes (no new screens/components/modals).

---

## Stage 3: Workspace + Plan

### 3.1 Create workspace (MANDATORY — run FIRST)

**CRITICAL: NEVER use `git checkout -b`. NEVER work in the main repo. Every build runs in a git worktree.**

Generate a slug from the feature name (lowercase, dashes, no special chars: "user auth flow" → `user-auth-flow`). Then run immediately:

```bash
SLUG="the-slug-you-generated"
BRANCH="feature/$SLUG"
MAIN_REPO="$(git rev-parse --show-toplevel)"
WORKSPACE="$MAIN_REPO/.worktrees/$SLUG"
if [ -d "$WORKSPACE" ]; then echo "RESUMING: $WORKSPACE"; else git worktree add "$WORKSPACE" -b "$BRANCH" 2>/dev/null || git worktree add "$WORKSPACE" "$BRANCH"; fi
for dir in .planning .memory .handoff .spartan; do [ -d "$MAIN_REPO/$dir" ] && [ ! -e "$WORKSPACE/$dir" ] && ln -s "$MAIN_REPO/$dir" "$WORKSPACE/$dir"; done
[ -f "$MAIN_REPO/.env" ] && [ ! -f "$WORKSPACE/.env" ] && cp "$MAIN_REPO/.env" "$WORKSPACE/.env"
grep -qxF '.worktrees/' "$MAIN_REPO/.gitignore" 2>/dev/null || echo '.worktrees/' >> "$MAIN_REPO/.gitignore"
echo "WORKSPACE=$WORKSPACE"
echo "BRANCH=$BRANCH"
```

**Read the output.** If `WORKSPACE` is missing → worktree failed, STOP.

**From this point, ALL work uses WORKSPACE paths:**
- Bash: `cd $WORKSPACE && ./gradlew test`
- Read/Write/Edit: `$WORKSPACE/src/...` absolute paths
- Git: `git -C $WORKSPACE add` / `git -C $WORKSPACE commit`

> "Working in: `$WORKSPACE` on branch `$BRANCH`"

### 3.2 Plan

If saved plan exists at `.planning/plans/` → use it.

**Fast path (1-4 tasks):**

```markdown
## Plan: [feature name]
Branch: `feature/[slug]`

### Task 1: [name]
Files: [exact paths]
Test first: [what test]
Implementation: [what to change]
```

Max 4 tasks inline. More → full path.

**Full path (5+ tasks):** Use `/spartan:plan` approach. Save to `.planning/plans/`.

**Task order by mode:**
- Backend: Migration → Entity/Table/Repo + tests → Service/Manager + tests → Controller + integration tests
- Frontend: Types → API client → Components (bottom-up) → Page + routing + tests
- Full-stack: Backend first, then frontend. Mark integration point. ALL layers must complete.

Uses skills: `database-patterns`, `api-endpoint-creator`, `kotlin-best-practices`, `testing-strategies`, `ui-ux-pro-max`, `security-checklist`

If `.spartan/build.yaml` has `prompts.plan`, apply now.

Write the first failing test for Task 1. Show it fails.

**GATE 2:** "Plan has [N] tasks. Does this make sense?"

---

## Stage 4: Implement

### GUARD: Verify workspace (run before writing any code)

```bash
MAIN_REPO="$(git worktree list | head -1 | awk '{print $1}')"
CURRENT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ "$MAIN_REPO" = "$CURRENT" ]; then echo "ERROR: In main repo, not a worktree!"; else echo "OK: Worktree at $CURRENT"; fi
```

**If ERROR → STOP. Go back to 3.1 and create workspace.**

### Route: parallel or sequential

```bash
echo "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-not_set}"
```

**Agent Teams enabled AND 2+ parallel tasks?** → Create team with `TeamCreate`. One teammate per parallel track:
- Full-stack: backend-dev + frontend-dev
- Backend: data-layer + api-layer
- Frontend: components + pages

Frontend/UI teammates MUST get design doc path in their prompt.

After team completes → continue to Stage 5.

**Otherwise → sequential execution:**

### TDD per task

For each task:
1. **Write test** → run → confirm fail (red)
2. **Write code** → run → confirm pass (green)
3. **Refactor** if needed (tests still green)
4. **Commit:** `feat([scope]): [what this task does]`
5. Brief status: "Task [N]/[total] done."

If a task is hard to test-first (UI, config) → implement-then-test. Always have a test when done.

If `.spartan/build.yaml` has `prompts.implement`, apply now.

### Verify all layers

| Mode | Must pass before review |
|------|------------------------|
| Backend | Migration + Entity/Table/Repo + Manager + Controller + `./gradlew test` |
| Frontend | Types + API client + Components + Page + `npm test && npm run build` |
| Full-stack | ALL backend + ALL frontend + frontend calls backend correctly |

```bash
# Backend
./gradlew test
# Frontend
npm test && npm run build
```

**GATE 3:** "All [N] tasks done. [X] tests passing. Starting review."

**You MUST run Stage 5 next. Do NOT create a PR. Do NOT skip review.**

---

## Stage 5: Review (MANDATORY — NEVER SKIP)

> Not optional. Not skippable. Spawn a separate agent. Never self-review. Never ask user if they want to skip.

### Load rules

```bash
cat .spartan/config.yaml 2>/dev/null || cat ~/.spartan/config.yaml 2>/dev/null
```

**Config exists** → read `rules`, `review-stages`, `file-types`, `extends`, `conditional-rules`.

**No config** → auto-generate from installed packs:
```bash
cat .claude/.spartan-packs 2>/dev/null || cat ~/.claude/.spartan-packs 2>/dev/null
```
Match to profile: `backend-micronaut` → `kotlin-micronaut`, `frontend-react` → `react-nextjs`, etc. Copy profile to `.spartan/config.yaml`.

**Nothing found** → scan `rules/` or `.claude/rules/` or `~/.claude/rules/`. Use all 7 default review stages.

### Gather context

```bash
git diff main...HEAD --name-only
ls .planning/specs/*.md .planning/plans/*.md .planning/designs/*.md 2>/dev/null
```

Classify changed files: `.kt/.java/.go/.py` = backend, `.tsx/.ts/.vue` = frontend, `.sql` = migration.

### Spawn reviewer

```
Agent:
  name: "reviewer"
  subagent_type: "phase-reviewer"
  prompt: |
    Review code for: {feature name}.
    Changed files — backend: {list}, frontend: {list}, migrations: {list}.
    Spec: {path}. Plan: {path}. Design: {path or "none"}.

    Read ALL rule files BEFORE reviewing:
    Backend: {paths from config.rules.backend + config.rules.shared}
    Frontend: {paths from config.rules.frontend + config.rules.shared}
    Conditional: {rules matching changed file globs}
    {If design doc exists: check UI matches approved design.}

    Review stages (skip any disabled in config.review-stages):
    1. Correctness — matches spec? edge cases? error handling?
    2. Stack Conventions — follows loaded rule files? idiomatic?
    3. Test Coverage — tests exist? independent? edge cases + error paths?
    4. Architecture — proper layers? no duplication? no dead code?
    5. Database & API — schema rules? API design rules? input validation?
    6. Security — auth? sanitized input? no data leaks? no injection?
    7. Doc Gaps — new pattern to document? flag for .memory/

    Per issue: file:line, what's wrong, which rule, severity (HIGH/MEDIUM/LOW), fix.
    End with: PASS or NEEDS CHANGES + what's clean (always praise good code).
```

**Agent Teams enabled?** → Split into 3 parallel reviewers: quality (stages 1-2,4), tests (stage 3), security (stage 6). All must PASS. `TeamDelete` after.

If `.spartan/build.yaml` has `prompts.review`, inject into reviewer prompt.

### Fix loop

- **PASS** → save any flagged docs to `.memory/`, continue to Ship
- **NEEDS CHANGES** → fix HIGH + reasonable MEDIUM, commit `fix([scope]): [what review caught]`, re-run tests, spawn reviewer again with updated diff
- Max rounds: 3 (configurable via `max-review-rounds`). After max → ask user what to do

---

## Stage 6: Ship

If `.spartan/build.yaml` has `prompts.ship`, apply now.

Run `/spartan:pr-ready` approach: rebase onto main, final checks, create PR.

Save notable learnings to `.memory/` if any.

Worktree stays for review fixes. When user says PR is merged:

```bash
MAIN_REPO="$(git worktree list | head -1 | awk '{print $1}')"
SLUG="the-actual-slug"
git -C "$MAIN_REPO" worktree remove ".worktrees/$SLUG" --force 2>/dev/null
git -C "$MAIN_REPO" worktree prune 2>/dev/null
echo "Cleaned up worktree: $SLUG"
```

**GATE 4:** "PR created: [link]. Here's what's in it: [summary]."

---

## Stage E: Epic Build

Replaces Stages 1–4 when epic mode is active. One branch, one PR for all features.

### E.1: Collect and fill gaps

For each feature in epic with status `spec`/`planned`/`building`:
- Read spec, design, plan from `.planning/`
- Missing spec → skip feature, tell user to run `/spartan:spec`
- Missing design (with UI) → ask user: create now or skip?
- Missing plan → generate inline

Agent Teams enabled + 2+ features need plans → parallelize with one teammate per feature (`isolation: "worktree"`).

### E.2: Create workspace + sort

Create worktree using epic name as slug (same bash block as Stage 3.1).

Sort features by dependency: no-deps first (can run in parallel), then dependents.

### E.3: Implement

**Agent Teams enabled + 2+ independent features** → one teammate per feature. Frontend teammates MUST get design doc path. Wait for all, merge worktrees, run tests.

**Sequential** → build each feature with TDD, update epic status → `done` after each.

### E.4: Verify

Run full test suite. Then continue to Stage 5 (Review) — one review for all features.

**GATE 3 (Epic):** "All {N} features built. {X} tests passing. Starting review."

---

## Rules

- **Orchestrate everything.** Don't tell user to run separate commands — run them yourself.
- **Fast path for small work** (1-4 tasks). Full path for big (5+).
- **TDD by default.** One commit per task. Override only when test-first doesn't fit.
- **Review is ALWAYS an agent. NEVER skip.** Fix until reviewer says PASS.
- **Design gate for frontend.** Any new component/screen/modal → ask. Pure data → skip.
- **Full-stack = both layers.** Don't create PR with only backend done.
- **Every build uses a worktree. NEVER `git checkout -b`.** Multiple terminals get separate worktrees.
- **Epic = one branch, one PR.** Auto-detect from `.planning/epics/`.
- **Don't over-plan.** If 1-2 files and 30 min of work, just do it. This workflow is for features that need structure.
