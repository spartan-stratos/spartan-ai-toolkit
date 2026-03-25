
---

## Core Principles (Always Enforce)

### 1. Spec Before Code
- Task < 1 day → `/spartan:quickplan` for fast spec + plan
- Task > 1 day → `/spartan:project new` or `/spartan:project milestone-new`
- Never write production code without a written spec or plan

### 2. TDD is Non-Negotiable
- Red → Green → Refactor, always
- Write tests first, then the code that makes them pass

### 3. Atomic Commits
Each commit = one task, tests passing:
```
type(scope): what changed

- why / detail
```
Types: `feat` · `fix` · `test` · `refactor` · `chore` · `docs`

### 4. Context Hygiene (Auto-Managed)
Claude proactively manages its own context window:
- When detecting context pressure (slow responses, forgetting earlier context, long conversation) → auto-run `/compact` to summarize and free space
- If compaction isn't enough → auto-save critical state to `.handoff/` and `.memory/`, then tell user to start a fresh session
- User can also manually trigger `/spartan:context-save` at any time
- Session > 60% → hard stop, no exceptions
- State is in `.planning/` (GSD), `.memory/` (permanent), or `.handoff/` (session), never in chat history

**Self-monitoring signals** (Claude watches for these in its own behavior):
- Starting to lose track of earlier decisions → compact NOW
- Repeating questions already answered → compact NOW
- Response quality dropping → warn user + compact
- Multi-step command taking unusually long → consider compacting between steps

### 5. Auto Mode
When user says **"auto on"** or **"auto mode"**, all Spartan commands skip confirmation prompts and execute straight through. Claude will:
- Show the spec/plan/output but NOT pause to ask "does this match?" or "shall I proceed?"
- Continue to the next step automatically after each step completes
- Still STOP for destructive actions (git force push, dropping tables, deleting files)
- Still SHOW output at each step (user can interrupt with "stop" or "wait")

Turn off with **"auto off"**. Default is **auto off** (commands ask for confirmation).

Auto mode is ideal for experienced users who trust the workflow and want maximum velocity.

### 6. Safety Guardrails
Three levels of protection, activated on-demand:

| Command | What it does |
|---|---|
| `/spartan:careful` | Warn + require confirm before destructive ops (rm -rf, DROP TABLE, force-push, etc.) |
| `/spartan:freeze <dir>` | Lock file edits to ONE directory only (+ its test directory) |
| `/spartan:guard <dir>` | Both careful + freeze at once. Maximum safety for production work. |

**Careful mode overrides auto mode.** Even in auto mode, destructive operations always require "I confirm".

**Freeze prevents scope creep.** Claude won't "helpfully" fix files outside your focus area.

Deactivate: `/spartan:careful off`, `/spartan:unfreeze`, or `/spartan:guard off`.

---

## Core Commands (always available)

### Build (daily task work)
| Command | Purpose |
|---|---|
| `/spartan` | **Smart router** — asks what you need, routes to right command |
| `/spartan:quickplan "task"` | Spec + plan + branch in one shot (< 1 day tasks) |
| `/spartan:debug "symptom"` | 4-phase root-cause investigation + Debug Report |
| `/spartan:init-project [name]` | Auto-generate project CLAUDE.md from codebase scan |

### Ship
| Command | Purpose |
|---|---|
| `/spartan:pr-ready` | Full pre-PR checklist + auto-generates PR description |

### Ops (daily routine, session management)
| Command | Purpose |
|---|---|
| `/spartan:daily` | Standup summary from git log + GSD status |
| `/spartan:context-save` | Smart context management: compact first, full save if needed |
| `/spartan:update` | Check for updates and upgrade Spartan to latest version |

### Safety (guardrails, on-demand)
| Command | Purpose |
|---|---|
| `/spartan:careful` | Warn + confirm before destructive ops (rm, DROP, force-push) |
| `/spartan:freeze <dir>` | Lock file edits to one directory only |
| `/spartan:unfreeze` | Remove directory lock |
| `/spartan:guard <dir>` | Careful + freeze combined. Maximum safety. |
