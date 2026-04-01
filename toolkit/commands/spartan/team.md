---
name: spartan:team
description: Manage Claude Code Agent Teams — coordinate multi-agent work with shared tasks, messaging, and parallel execution. Bridges wave-based planning with native agent teams.
argument-hint: "[create | status | wave | review | research | build | clean]"
---

# Agent Teams: {{ args[0] | default: "create" }}

You are managing **Claude Code Agent Teams** — multiple Claude Code sessions working together with shared task lists, direct messaging, and coordinated parallel execution.

**What are Agent Teams?** Native Claude Code feature where one session (team lead) coordinates multiple teammate sessions. Each teammate has its own context window, works independently, and communicates via messages. Unlike subagents, teammates can talk to each other directly.

---

## Prerequisites Check (always run first)

Before any sub-action, check that Agent Teams is enabled:

```bash
echo "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-not_set}"
```

**If `not_set`**, stop and tell the user:

> Agent Teams needs to be enabled first. Add this to your settings:
>
> **Option A — settings.json** (in `~/.claude/settings.json` or `.claude/settings.json`):
> ```json
> {
>   "env": {
>     "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
>   }
> }
> ```
>
> **Option B — shell** (temporary, current session only):
> ```bash
> export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
> ```
>
> Then run `/spartan:team` again.

**If enabled**, proceed to the routed sub-action below.

---

## Route by argument

{% if args[0] == "create" or args[0] == nil %}
## Create Team

Create a new agent team for coordinated parallel work.

### Step 1: Understand the task

Ask the user (if not already clear from context):

> What's the goal for this team?
>
> I'd go with **A** — most tasks fit a small focused team.
>
> - **A) Small team (2-3 agents)** — fast coordination, low token cost, good for most tasks
> - **B) Medium team (4-5 agents)** — parallel research or multi-module builds
> - **C) Custom** — you tell me the roles

### Step 2: Design the team

Based on the task, decide:
- **Team name** — kebab-case, descriptive (e.g., `auth-refactor`, `api-review`, `market-research`)
- **Teammate roles** — what each agent does (e.g., "backend-impl", "frontend-impl", "test-writer")
- **Agent types** — pick the right `subagent_type` for each role:
  - `general-purpose` — for implementation work (has all tools including Edit/Write)
  - `Explore` — for read-only research and codebase exploration
  - `Plan` — for architecture and planning (read-only, no edits)
  - Custom agents from `~/.claude/agents/` — for specialized work (e.g., `phase-reviewer`)

### Step 3: Create the team

Use `TeamCreate` with the team name and description:

```
TeamCreate:
  team_name: "{descriptive-kebab-name}"
  description: "Brief description of what the team is doing"
```

### Step 4: Create tasks

Use `TaskCreate` for each work item. Set up dependencies with `addBlockedBy` where needed.

Good tasks are:
- **Specific** — "Implement user authentication endpoint" not "do backend work"
- **Self-contained** — one agent can finish it without waiting on others
- **Sized right** — 15-60 min of work each. 5-6 tasks per teammate is ideal.

### Step 5: Spawn teammates

For each teammate, use the `Agent` tool with `team_name` and `name` parameters:

```
Agent:
  team_name: "{team-name}"
  name: "{teammate-role}"
  subagent_type: "{agent-type}"
  prompt: |
    You are {role description}.

    Your tasks are in the shared task list. Check TaskList, claim unassigned
    tasks with TaskUpdate (set owner to your name), and work through them.

    Context:
    - Project: {brief project context}
    - Your focus: {what this agent should work on}
    - Key files: {relevant file paths}

    When done with a task, mark it completed and check TaskList for next work.
    Message the team lead if you're blocked or need input.
```

**Key rules for spawn prompts:**
- Tell the agent to check `TaskList` and self-claim tasks
- Give file paths, not inline content (saves context)
- Reference `.memory/` and `.planning/` if they exist
- Use `isolation: "worktree"` when agents edit overlapping files

### Step 6: Monitor and coordinate

After spawning:
- Messages from teammates come in automatically — no polling needed
- Use `SendMessage` to redirect or give feedback
- Teammates go idle between turns — this is normal, send them a message to wake them up
- When all tasks are done, proceed to cleanup

Tell the user: "Team `{name}` is running with {N} teammates. I'll coordinate and report back as they finish."

{% elif args[0] == "status" %}
## Team Status

Show the current state of the active team.

### Step 1: Find active teams

```bash
ls -la ~/.claude/teams/ 2>/dev/null || echo "NO_TEAMS_DIR"
```

If no teams directory or empty, tell user: "No active teams. Run `/spartan:team create` to start one."

### Step 2: Read team config

For each team found, read the config:

```bash
cat ~/.claude/teams/*/config.json 2>/dev/null
```

### Step 3: Show task progress

Use `TaskList` to show all tasks and their status.

Display as a table:

```
## Team: {team-name}
| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Implement auth endpoint | backend-dev | completed |
| 2 | Write auth tests | test-writer | in_progress |
| 3 | Add login page | frontend-dev | pending |
```

**Summary:** X of Y tasks done. Teammates: {list with idle/active state}.

Suggest next actions:
- All done? → "Run `/spartan:team clean` to shut down"
- Some stuck? → "I can message {teammate} to check on task #{N}"
- Need more work? → "I can add more tasks with TaskCreate"

{% elif args[0] == "wave" %}
## Wave Execution with Agent Teams

Execute a GSD wave plan using Agent Teams instead of manual multi-tab work.

### Step 1: Find the wave plan

```bash
# Look for the current phase plan
ls .planning/milestones/*/phases/*/PLAN.md 2>/dev/null
ls .planning/PLAN.md 2>/dev/null
```

If no plan found:
> No wave plan found. Run `/spartan:phase plan N` first to create a plan with wave decomposition.
> Or run `/spartan:team create` to build a team from scratch.

If found, read the plan and look for wave structure (sections like "Wave 1", "Wave 2", or work units with dependency info).

### Step 2: Parse waves

From the plan, extract:
- **Work units (WUs)** — each atomic task
- **Wave assignments** — which WUs can run in parallel (Wave 1), which depend on earlier waves
- **File paths** — what each WU touches

### Step 3: Create team for current wave

Identify which wave to execute (usually the first incomplete one).

Use `TeamCreate`:
```
team_name: "{milestone}-wave-{N}"
description: "Wave {N} execution: {list of WU names}"
```

### Step 4: Create tasks from WUs

For each WU in the current wave, `TaskCreate` with:
- Subject from WU name
- Description from WU spec + acceptance criteria
- For Wave 2+ WUs, set `addBlockedBy` pointing to Wave 1 task IDs

### Step 5: Spawn one agent per WU

Each agent gets:
- A worktree (`isolation: "worktree"`) for safe parallel edits
- The WU spec as its prompt
- References to `.memory/` for project context
- The specific file paths it should touch

```
Agent:
  team_name: "{team-name}"
  name: "wu-{N}-{short-slug}"
  subagent_type: "general-purpose"
  isolation: "worktree"
  prompt: |
    You are implementing Work Unit {N}: {WU title}.

    Spec: {WU description from plan}
    Files to touch: {file list}
    Acceptance criteria: {from plan}

    Read .memory/index.md for project context.
    Follow TDD: write test first, then implement, then verify.

    When done, mark your task completed and message the lead.
```

### Step 6: Monitor wave completion

Wait for all Wave N agents to complete. Between waves:

1. Verify all tests pass:
```bash
# Run the project's test command
./gradlew test 2>&1 | tail -20  # or npm test, etc.
```

2. If tests pass → advance to Wave N+1 (create new tasks, spawn new agents)
3. If tests fail → message the relevant agent to fix, or handle it yourself

### Step 7: Complete

After all waves finish:
- Run full test suite
- Tell user: "All {N} waves complete. {X} work units done. Tests: {pass/fail}."
- Suggest: "Run `/spartan:team clean` to shut down, then `/spartan:pr-ready` to ship."

{% elif args[0] == "review" %}
## Quick Spawn: Review Team

Spin up a parallel review team for a PR or set of changes.

### Step 1: Identify what to review

Check for a PR number in args, or detect changes:
```bash
git diff --stat main...HEAD 2>/dev/null || git diff --stat HEAD~3..HEAD
```

### Step 2: Create review team

```
TeamCreate:
  team_name: "review-{branch-or-pr}"
  description: "Parallel code review"
```

### Step 3: Create review tasks

Create 2-3 focused review tasks:
1. **Code quality** — design, SOLID, clean code, stack conventions
2. **Test coverage** — are tests adequate, edge cases covered, test quality
3. **Security** (if applicable) — auth, input validation, data handling

### Step 4: Spawn reviewers — MUST use `team_name` + `name` params

```
Agent(
  team_name: "review-{branch-or-pr}",
  name: "quality-reviewer",
  subagent_type: "phase-reviewer",
  prompt: "Review code design, SOLID, clean code, stack conventions.
    Changed files: {list}. Check TaskList, claim your task.
    Output: ACCEPT or NEEDS CHANGES with file:line, rule, severity, fix."
)

Agent(
  team_name: "review-{branch-or-pr}",
  name: "test-reviewer",
  subagent_type: "general-purpose",
  prompt: "Review test coverage, edge cases, test quality.
    Changed files: {list}. Check TaskList, claim your task.
    Output: ACCEPT or NEEDS CHANGES."
)

Agent(
  team_name: "review-{branch-or-pr}",
  name: "security-reviewer",
  subagent_type: "general-purpose",
  prompt: "Review auth, input validation, data exposure, injection.
    Changed files: {list}. Check TaskList, claim your task.
    Output: ACCEPT or NEEDS CHANGES."
)
```

### Step 5: Synthesize

When all reviewers report back:
- Combine findings into one review summary
- Deduplicate overlapping issues
- Prioritize: HIGH (must fix) → MEDIUM (should fix) → LOW (nice to have)
- Give verdict: **ACCEPT** or **NEEDS CHANGES**

{% elif args[0] == "research" %}
## Quick Spawn: Research Team

Spin up a research swarm to explore a topic from multiple angles.

### Step 1: Get the topic

Use `{{ args[1] }}` if provided, otherwise ask the user what to research.

### Step 2: Create research team

```
TeamCreate:
  team_name: "research-{topic-slug}"
  description: "Research: {topic}"
```

### Step 3: Design research angles

Create 2-3 complementary research tasks:
1. **Breadth search** — survey the landscape, find key sources, map the space
2. **Depth analysis** — go deep on the most promising findings from breadth
3. **Contrarian view** (optional) — find counterarguments, risks, things that could go wrong

### Step 4: Spawn researchers — MUST use `team_name` + `name` params

```
Agent(
  team_name: "research-{topic-slug}",
  name: "surveyor",
  subagent_type: "general-purpose",
  prompt: "Broad survey of: {topic}. Find 8-15 sources, map the landscape.
    Track sources with credibility scores (1-5). Check TaskList, claim your task."
)

Agent(
  team_name: "research-{topic-slug}",
  name: "analyst",
  subagent_type: "general-purpose",
  prompt: "Deep analysis of top sources for: {topic}.
    Cross-reference claims, extract data. Check TaskList, claim your task."
)

Agent(
  team_name: "research-{topic-slug}",
  name: "contrarian",
  subagent_type: "general-purpose",
  prompt: "Challenge assumptions about: {topic}. Find counterarguments, risks, failures.
    Play devil's advocate. Check TaskList, claim your task."
)
```

### Step 5: Synthesize

Combine into a structured report:
- Key findings (agreed across agents)
- Disagreements (where agents had different conclusions)
- Recommendations
- Sources and confidence levels

Save to `.planning/research/{topic-slug}.md` if in a project context.

{% elif args[0] == "build" %}
## Quick Spawn: Build Team

Spin up a parallel implementation team for a feature.

### Step 1: Understand the feature

Check for existing artifacts:
```bash
ls .planning/specs/ .planning/PLAN.md 2>/dev/null
ls .planning/designs/*.md 2>/dev/null
```

If no spec exists, tell user: "No spec found. Run `/spartan:spec` first, or describe the feature and I'll split it into parallel work."

If a design doc exists, note its path — you'll pass it to frontend/UI agents in Step 5.

### Step 2: Detect stack and split work

```bash
ls build.gradle.kts package.json next.config.* 2>/dev/null
```

Split strategy:
- **Full-stack** → one backend agent + one frontend agent
- **Backend only** → split by service boundaries or layers (API + data + tests)
- **Frontend only** → split by pages/components + tests

### Step 3: Create build team

```
TeamCreate:
  team_name: "build-{feature-slug}"
  description: "Building: {feature name}"
```

### Step 4: Create implementation tasks

From the spec/plan, create tasks for each parallel track. Set `addBlockedBy` for tasks that depend on earlier ones (e.g., frontend depends on API being done).

### Step 5: Spawn builders — MUST use `team_name` + `name` params

```
Agent(
  team_name: "build-{feature-slug}",
  name: "backend-dev",
  subagent_type: "general-purpose",
  isolation: "worktree",
  prompt: "Backend implementation for {feature}.
    Read .memory/index.md for context. Rules: ~/.claude/rules/backend-micronaut/.
    Follow TDD. Check TaskList, claim backend tasks."
)

Agent(
  team_name: "build-{feature-slug}",
  name: "frontend-dev",
  subagent_type: "general-purpose",
  isolation: "worktree",
  prompt: "Frontend implementation for {feature}.
    Read design doc at .planning/designs/{feature}.md FIRST — follow it exactly.
    Rules: ~/.claude/rules/frontend-react/. Follow TDD.
    Check TaskList, claim frontend tasks."
)
```

Each builder teammate gets:
- Worktree isolation (`isolation: "worktree"`)
- Their track's tasks and file paths
- Instructions to follow TDD
- References to relevant rules from installed packs
- `.memory/` context
- **Design doc path** (if `.planning/designs/*.md` exists) — frontend/UI teammates MUST read the design doc before building.

### Step 6: Integration

After parallel tracks complete:
1. Merge worktree changes
2. Run full test suite
3. Fix any integration issues
4. Report results to user

{% elif args[0] == "clean" %}
## Clean Up Team

Shut down all teammates and clean up team resources.

### Step 1: Find active teams

```bash
ls ~/.claude/teams/ 2>/dev/null || echo "NO_TEAMS"
```

If no teams, tell user: "No active teams to clean up."

### Step 2: Check for active teammates

Read team config to find members. For each active teammate, send a shutdown request:

```
SendMessage:
  to: "{teammate-name}"
  message:
    type: "shutdown_request"
    reason: "Team work complete, shutting down"
```

Wait for shutdown responses. If a teammate rejects, tell the user why.

### Step 3: Delete team

After all teammates are shut down, use `TeamDelete` to clean up:

```
TeamDelete: {}
```

This removes:
- `~/.claude/teams/{team-name}/`
- `~/.claude/tasks/{team-name}/`

### Step 4: Report

Tell user: "Team `{name}` cleaned up. {N} teammates shut down, task list removed."

If there were orphaned tmux sessions:
```bash
tmux ls 2>/dev/null | grep -i "{team-name}" || echo "no orphaned sessions"
```

If found, suggest: `tmux kill-session -t {session-name}`

{% else %}
## Unknown argument: {{ args[0] }}

Available options:
- `/spartan:team` — Create a new agent team (default)
- `/spartan:team create` — Create a team with smart defaults
- `/spartan:team status` — Show team progress and teammate states
- `/spartan:team wave` — Execute a GSD wave plan using Agent Teams
- `/spartan:team review` — Quick-spawn: parallel review team
- `/spartan:team research` — Quick-spawn: research swarm
- `/spartan:team build` — Quick-spawn: parallel build team
- `/spartan:team clean` — Shut down teammates and clean up
{% endif %}

---

## Best Practices (applies to all sub-actions)

### Team Size
- **2-3 agents** for most tasks. Start small.
- **4-5 agents** only when work is truly independent (no shared files).
- More agents = more tokens. Each agent has its own context window.

### Task Design
- 5-6 tasks per teammate keeps everyone productive.
- Each task should be 15-60 min of work.
- Set `addBlockedBy` for real dependencies. Don't block unnecessarily.

### Isolation
- Use `isolation: "worktree"` when agents might edit the same files.
- Without worktrees, agents work in the same repo — last write wins.

### Communication
- Messages are delivered automatically. Don't poll.
- Teammates go idle between turns — send a message to wake them up.
- Use `SendMessage` with `to: "*"` sparingly — it costs tokens for every teammate.

### Integration with Spartan Workflow
- **After team work** → `/spartan:pr-ready` for the full pre-PR checklist
- **Wave execution** → `/spartan:team wave` replaces manual multi-tab work from GSD v5
- **Review teams** → works alongside `/spartan:gate-review` for dual-agent reviews
- **Research teams** → feeds into `/spartan:research` report format
