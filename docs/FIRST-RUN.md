# First Run Guide — Spartan AI Toolkit

This guide takes you from zero to a working workflow on your **first new project**.
Time: **~20 minutes**.

---

## Part 1: Prerequisites (5 min)

### Check tools

```bash
node --version    # need >= 18.x
npm --version     # need >= 9.x
git --version     # any version
claude --version  # Claude Code CLI
```

**Don't have Claude Code CLI?**
```bash
npm install -g @anthropic-ai/claude-code
```

Then login:
```bash
claude login
# Opens browser, auth with Anthropic account
```

---

## Part 2: Install Toolkit (5 min)

### Step 1 — Clone the toolkit repo

```bash
git clone https://github.com/spartan-stratos/spartan-ai-toolkit.git
cd spartan-ai-toolkit/spartan-ai-toolkit
chmod +x scripts/setup.sh
```

### Step 2 — Run setup (global — applies to all projects)

```bash
./scripts/setup.sh --global
```

The script will:
1. ✓ Check Node.js, npm, git, claude CLI
2. ⏸ Guide you to install Superpowers in Claude Code (see next step)
3. ✓ Install GSD automatically via `npx`
4. ✓ Copy `CLAUDE.md` to `~/.claude/CLAUDE.md` (asks backup if already exists)
5. ✓ Copy smart router + 25 Spartan commands to `~/.claude/commands/`
6. ✓ Copy 9 company rule files to `~/.claude/rules/project/` (asks backup if already exists)
7. ✓ Copy 8 company skills to `~/.claude/skills/` (asks backup if already exists)
8. ✓ Copy 2 agents to `~/.claude/agents/`

### Where does everything go?

After setup, everything lives in `~/.claude/` — Claude reads these files automatically in every project:

```
~/.claude/
├── CLAUDE.md              ← The "brain" — Claude reads this every session
│                            All workflow rules, conventions, and routing logic
├── commands/
│   ├── spartan.md         ← Smart router (/spartan)
│   └── spartan/           ← 25 subcommands (/spartan:quickplan, etc.)
├── rules/project/         ← 9 coding rule files (enforced automatically)
├── skills/                ← 8 skill sets (/api-endpoint-creator, etc.)
└── agents/                ← 2 expert agents
```

**Want to customize?** Edit `~/.claude/CLAUDE.md` — that's the single file that controls Claude's behavior across all your projects.

### Step 3 — Install Superpowers in Claude Code

When the script pauses at step 2 and asks, open **Claude Code** and run:

```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

Wait for install to complete → return to terminal → press **Enter** to continue.

### Step 4 — Restart Claude Code

**Required.** Superpowers only activates after restart.

After restart, Claude Code will inject the Superpowers prompt automatically in every session.

---

## Part 3: Verify Installation (2 min)

Open terminal in **any folder** and run Claude Code:

```bash
cd ~/dev/any-project
claude
```

**Test 1 — Smart Router (main entry point):**
Type in Claude Code:
```
/spartan
```
→ Claude asks what you need and routes to the right command = Toolkit working ✓

**Test 2 — Project Management:**
```
/spartan:project status
```
→ Shows message (no project yet is normal) = Project commands working ✓

**Test 3 — Company Rules:**
```
Write a Kotlin function using the !! operator
```
→ Claude refuses to use `!!` and suggests safe call + elvis = Company rules being enforced ✓

**Test 4 — Superpowers:**
```
help me plan a new feature
```
→ Claude starts asking questions to refine spec (doesn't code immediately) = Superpowers working ✓

---

## Part 4: Try a New Project (10 min)

Now test with a real project. Two scenarios:

---

### Scenario A: New Kotlin BE project

```bash
mkdir my-new-service && cd my-new-service
git init
claude
```

In Claude Code:
```
/spartan:kotlin-service my-service "A service that handles user authentication"
```

Claude will:
1. Ask about domain events, external dependencies, main entities
2. Create full project structure following company rules (Controller → Manager → Repository)
3. Create `build.gradle.kts` with Micronaut + Exposed dependencies
4. Setup Either error handling pattern (per CORE_RULES)
5. Create `docker-compose.yml` with PostgreSQL
6. Write first test with `@MicronautTest`

---

### Scenario B: New Next.js FE project

```bash
cd ~/dev
claude
```

In Claude Code:
```
/spartan:next-app my-frontend "Dashboard for Spartan platform"
```

Claude will:
1. Ask about auth, state management, BE connection, deploy target
2. Run `create-next-app` with correct flags
3. Install Vitest + Testing Library
4. Create project structure (route groups, `_components/`, `_actions/`)
5. Create typed base API client
6. Configure Railway deployment
7. Write first smoke test

---

### Scenario C: Large multi-session project

```bash
mkdir forge-v2 && cd forge-v2
git init
claude
```

In Claude Code:
```
/spartan:project new
```

Claude will interview you about:
- What is the project?
- Tech stack?
- Milestones and goals?

Then create:
- `PROJECT.md` — full brief
- `ROADMAP.md` — all milestones + phases
- `.planning/config.json` — GSD settings

Then run Phase 1:
```
/spartan:phase discuss 1
/spartan:phase plan 1
/spartan:phase execute 1
/spartan:phase verify 1
```

---

## Part 5: Daily Workflow After That

Every day when opening your project:

```bash
cd my-project
claude
```

**Not sure where to start?**
```
/spartan
```
→ Smart router asks what you need and routes to the right command.

**Want to run fast without confirmations?**
```
auto on
```
→ All commands execute straight through. Say `auto off` to return to default.

**Continuing a large project?**
```
/spartan:project status
```
→ Claude shows current phase, where to continue.

**New small task?**
```
/spartan:quickplan "add rate limiting to the login endpoint"
```

**Need to debug?**
```
/spartan:debug "NullPointerException in AuthService.kt:142"
```

**Before creating a PR?**
```
/spartan:pr-ready
```

**Working with production config or migrations?**
```
/spartan:guard src/main/resources/db/migration/
```
→ Careful mode + freeze — maximum safety.

**Context window?** Claude self-manages — auto-compacts when needed, notifies you.
Or trigger manually: `/spartan:context-save`

---

## Part 6: Customize for Specific Projects

Each project can have its own `CLAUDE.md` in the root directory.
Easiest way: use `/spartan:init-project` to auto-generate from codebase scan.

Or create manually:

```bash
cat > CLAUDE.md << 'EOF'
# Project: Forge

## About
Payment processing microservice. Handles subscription billing and invoicing.

## Specific Context
- Kotlin + Micronaut backend
- PostgreSQL with Exposed ORM
- Either<ClientException, T> for all error handling
- SLA: < 200ms p99 for payment processing

## Extra Rules
- All amounts in cents (Long), never Double/Float
- Soft delete only — never hard delete records
- Query parameters only — no path parameters

## Current Milestone
Milestone 2: Subscription management (phases 3-5)
EOF
```

Claude reads **both**: global `~/.claude/CLAUDE.md` (toolkit) + project-level `CLAUDE.md`. Project-level overrides global when there's a conflict.

Company rules (`rules/project/`) and skills (`skills/`) are also read automatically if installed globally.

---

## Quick Troubleshooting

| Issue | Fix |
|---|---|
| `/spartan` not working | Check `~/.claude/commands/spartan.md` exists |
| Superpowers not triggering | Restart Claude Code after install |
| `/spartan:project` not working | Check `~/.claude/commands/spartan/project.md` exists |
| Claude uses `!!` operator | Company rules not loaded — re-run `setup.sh --global` |
| Claude uses path parameters | API_RULES not loaded — check `~/.claude/rules/project/` |
| Claude codes immediately without asking | Superpowers not active — restart Claude Code |
| Session quality degrading | Claude will auto-compact. If not, type `/spartan:context-save` |
| Setup asks backup/skip | Project already has rules/skills — choose backup to update, skip to keep existing |

---

## Update Toolkit

```bash
# When a new version is available
cd ~/dev/spartan-ai-toolkit
git pull
./scripts/setup.sh --global  # re-run — script asks backup/skip if conflicts exist

# GSD auto-updates every session start
# Superpowers auto-updates every session start
```

---

## Share with Team

```bash
# Everyone just needs:
git clone https://github.com/spartan-stratos/spartan-ai-toolkit.git
cd spartan-ai-toolkit
./scripts/setup.sh --global
# Follow the prompts — 8 steps, ~15 minutes
```

The setup script ensures all devs use the same:
- CLAUDE.md (workflow rules)
- Company rules (CORE, ARCHITECTURE, API, DATABASE, FRONTEND + 4 more)
- Company skills (api-endpoint-creator, database-table-creator, etc.)
- 26 Spartan commands + 2 agents

To customize for a team with a different stack:
1. Fork the repo
2. Edit `CLAUDE.md` — change stack conventions
3. Edit `rules/project/` — change coding rules
4. Add/replace commands + skills
5. Share the fork link
