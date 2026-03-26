# Project: Spartan AI Toolkit

## About
Spartan AI Toolkit is an engineering discipline layer for AI coding tools. It has 56 slash commands (11 packs), 11 coding rules, 20 skills, 7 agents, 13 frameworks, and 13 templates. Native integration with Claude Code (npx, plugin, setup script). All content is standard markdown — usable with any AI coding tool (Codex, Gemini, Copilot, Cursor, etc.). Includes a Telegram bridge for remote session control.

## Tech Stack
- **Primary language**: Markdown (commands, rules, skills, docs)
- **Setup script**: Bash (scripts/setup.sh)
- **Telegram bridge**: Node.js (ES modules, node-telegram-bot-api)
- **UI/UX skill scripts**: Python 3 (CSV data processing)
- **CLI installer**: Node.js ES modules (bin/cli.js, lib/packs.js, lib/assembler.js)
- **Dependencies**: Claude Code CLI, GSD (Get Shit Done), Superpowers plugin
- **Target stack**: Kotlin + Micronaut (BE), React + Next.js (FE)

## Architecture
This is a **distribution toolkit** — it installs config files into `~/.claude/` for global use across all projects.

```
spartan-ai-toolkit/
├── docs/                        # User docs
├── .claude/
│   └── settings.json            # Project-level config only (nothing else here)
├── toolkit/                     # Distribution content (npm: spartan-ai-toolkit)
│   ├── commands/spartan/        # 51 slash commands
│   ├── commands/spartan.md      # Smart router (entry point)
│   ├── skills/                  # 19 skill sets (each a directory with SKILL.md)
│   ├── agents/                  # 4 agent definitions
│   ├── rules/{pack}/            # 11 coding standard files (grouped by pack)
│   ├── frameworks/              # 13 startup/product frameworks
│   ├── templates/               # 13 reusable templates
│   ├── claude-md/               # CLAUDE.md sections (assembled per pack)
│   ├── .claude-plugin/          # Claude Code plugin manifest
│   ├── packs/*.yaml             # Pack manifests (source of truth)
│   ├── bin/cli.js               # npx installer (multi-agent)
│   ├── lib/packs.js             # Loads from YAML manifests
│   ├── lib/resolver.js          # Dependency resolution + cycle detection
│   ├── lib/assembler.js         # CLAUDE.md assembly logic
│   └── package.json             # npm package config
├── bridges/                     # Remote control (provider-based)
│   ├── core/                    # Shared engine (sessions, Claude SDK, permissions)
│   └── telegram/                # Telegram provider
├── Makefile                     # Dev shortcuts
└── .github/                     # CI + PR template
```

**Important:** `.claude/` only holds `settings.json`. ALL distributable content lives in `toolkit/`. Don't put skills, commands, agents, or other content in `.claude/`.

## The Pack System

Packs are how content gets grouped and installed. Defined in YAML manifests in `toolkit/packs/*.yaml`.

**11 packs** (with dependencies):

| Pack | Category | Depends | What's in it |
|------|----------|---------|-------------|
| `core` | Core | -- | Always installed. 11 commands, NAMING_CONVENTIONS. |
| `database` | Backend | -- | **Hidden.** 1 command, 3 rules, 2 skills. |
| `shared-backend` | Backend | -- | **Hidden.** ARCHITECTURE rule. |
| `backend-micronaut` | Backend | database, shared-backend | 3 commands, 5 rules, 5 skills, 2 agents. |
| `backend-nodejs` | Backend | database, shared-backend | **Coming soon.** |
| `backend-python` | Backend | database, shared-backend | **Coming soon.** |
| `frontend-react` | Frontend | -- | 5 commands, 1 rule, 1 skill. |
| `project-mgmt` | Planning | -- | 7 commands. |
| `product` | Planning | -- | 6 commands. |
| `ops` | Ship | -- | 2 commands. |
| `research` | Research | product | 9 commands, 10 skills, 2 agents. |

Hidden packs don't show in the CLI menu — they get pulled in as dependencies.
"Coming soon" packs show in the menu but have no content yet.

### How Packs Work
1. User picks packs during install (CLI or setup script)
2. **Resolver** resolves dependencies (BFS) — e.g., `backend-micronaut` pulls in `database` + `shared-backend`
3. CLI collects all items from resolved packs, dedupes
4. Copies commands → `~/.claude/commands/spartan/`
5. Copies rules → `~/.claude/rules/{pack-subdir}/` (e.g., `rules/database/SCHEMA.md`)
6. Copies skills → `~/.claude/skills/` (as directories)
7. Copies agents → `~/.claude/agents/`
8. Assembles CLAUDE.md from pack sections (header + core + pack sections + footer)

### Single Source of Truth
YAML manifests in `toolkit/packs/*.yaml` are the source of truth. `toolkit/lib/packs.js` loads them.
Backward-compatible aliases: `backend` → `backend-micronaut`, `frontend` → `frontend-react`.

---

## Authoring Standards

When adding new content to the toolkit, follow these formats exactly. The CLI and pack system depend on them.

### Command Format

**Location:** `toolkit/commands/spartan/{command-name}.md`

```yaml
---
name: spartan:{command-name}
description: Brief one-line description — no period
argument-hint: "[what the user passes]"
preamble-tier: 3
---
```

**Preamble tiers:** Controls how much context the router loads before running the command.
- `1` = Minimal (toggles, simple actions like careful/freeze)
- `2` = Light (status checks, quick tasks like daily/contribute)
- `3` = Standard (most commands — default if omitted)
- `4` = Full (complex multi-phase workflows like project/phase/onboard)

**Body rules:**
- Title: `# Command Name: {{ args[0] | default: "fallback" }}`
- Use `{{ args[0] }}` for arguments, NOT `$ARGUMENTS`
- Step-by-step with `##` headings for sections
- Reference other commands as `/spartan:command-name`
- Keep frontmatter `name` in kebab-case with `spartan:` prefix
- **Questions must follow the Structured Question Format:** simplify → recommend → options (A/B/C) → one decision per turn. Always pick a side. Never ask without options.

### Skill Format

**Location:** `toolkit/skills/{skill-name}/SKILL.md` (directory, not flat file)

```yaml
---
name: {skill-name}
description: What this skill does (one line)
allowed_tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---
```

**Directory structure:**
```
toolkit/skills/{skill-name}/
  ├── SKILL.md          # Main definition (required)
  ├── examples.md       # Code examples (optional)
  └── [reference].md    # Supporting docs (optional)
```

**Body rules:**
- "What This Skill Does" section with numbered outputs
- "Critical Rules" with code examples
- "Workflow" with step-by-step generation guide
- Supporting files for examples and reference

### Agent Format

**Location:** `toolkit/agents/{agent-name}.md`

```yaml
---
name: {agent-name}
description: |
  Multi-line description with <example> tags showing when to use
model: sonnet
color: blue
---
```

**Body rules:**
- Start with "You are a..." identity statement
- Core Expertise Areas (numbered list)
- Working Principles (bullets)
- Communication Style section
- No steps or checklists — agents improvise within expertise bounds

### Rule Format

**Location:** `toolkit/rules/{pack-name}/RULE_NAME.md`

**No frontmatter.** Plain markdown.

- Filename: `UPPER_SNAKE_CASE.md` inside a pack-named subdirectory
- Start with `#` title
- Optional: `> Full guide: use /skill-name skill`
- Mark forbidden patterns in ALL CAPS with WRONG vs CORRECT examples
- Include code before/after comparisons
- End with quick reference table

**Rule subdirectories:**
```
toolkit/rules/
  core/                    # Cross-stack (NAMING_CONVENTIONS)
  shared-backend/          # Shared arch concepts (ARCHITECTURE)
  database/                # SCHEMA, ORM_AND_REPO, TRANSACTIONS
  backend-micronaut/       # KOTLIN, CONTROLLERS, SERVICES_AND_BEANS, API_DESIGN, RETROFIT_PLACEMENT
  frontend-react/          # FRONTEND
```

### Claude-MD Section Format

**Location:** `toolkit/claude-md/{NN}-{name}.md`

- Numbered prefix for ordering: `00-header`, `01-core`, `10-backend`, `20-frontend`, etc.
- These are fragments, not standalone docs
- Start with blank line + `---` separator (except 00-header)
- Include command tables, tech stack, decision guides
- Assembly order: header (00) + core (01) + pack sections + footer (90)

### Framework and Template Format

- Frameworks: `toolkit/frameworks/{NN}-{name}.md` — numbered, standalone reference docs
- Templates: `toolkit/templates/{name}.md` — fill-in-the-blank style, kebab-case

### Adding a New Pack

1. Create `toolkit/packs/{pack-name}.yaml` manifest with: name, description, category, priority, hidden, depends, commands, rules, skills, agents, claude-sections
2. Create rule files in `toolkit/rules/{pack-name}/` if the pack has rules
3. Create claude-md section file (`toolkit/claude-md/{NN}-{pack}.md`) if the pack has visible content
4. Run `make validate` to check everything links up
5. Update counts in this CLAUDE.md and toolkit/README.md

### Pack Manifest Format

```yaml
name: my-pack
description: "What this pack does"
category: Backend       # for CLI menu grouping
priority: 15            # controls install/display order
hidden: false           # hidden packs don't show in menu
depends: [database]     # auto-installed dependencies

commands: [my-command]
rules: [my-pack/MY_RULE.md]
skills: [my-skill]
agents: [my-agent.md]
claude-sections: [15-my-pack.md]
```

### Naming Rules

| Type | Convention | Example |
|------|-----------|---------|
| Commands | `kebab-case` | `spartan:deep-dive` |
| Skills | `kebab-case` directory | `toolkit/skills/market-research/` |
| Agents | `kebab-case.md` | `idea-killer.md` |
| Rules | `UPPER_SNAKE_CASE.md` | `CORE_RULES.md` |
| Claude-md | `{NN}-{name}.md` | `60-research.md` |
| Frameworks | `{NN}-{name}.md` | `01-lean-canvas.md` |
| Templates | `kebab-case.md` | `competitor-analysis.md` |

### Version Management

These 4 files must have the same version:
- `toolkit/VERSION` (source of truth, single line, semver)
- `toolkit/package.json` → `version` field
- `toolkit/.claude-plugin/plugin.json` → `version` field
- `toolkit/.claude-plugin/marketplace.json` → plugins[0].version

---

## Dev Workflow
- `make setup` — run the installer
- `make validate` — check all files are in place
- `make lint` — shellcheck + markdown lint
- `make bridge-dev` — start telegram bridge in dev mode
- CI runs on push/PR: shellcheck, markdown lint, structure validation

## Specific Rules
- Setup script supports `--global` (all projects) and `--local` (current project only)
- Script creates backups before overwriting existing files
- Rules/skills check for conflicts and offer backup/skip choice
- CLAUDE.md is the "workflow brain" — Claude reads it every session
- GSD is installed via `npx get-shit-done-cc@latest`
- Superpowers needs manual install in Claude Code (plugin marketplace)

## Testing
- `cd toolkit && node --test lib/resolver.test.js` — 13 tests for dependency resolver
- `make validate` — checks file structure, content format, naming, manifests
- Verification: run `/spartan` in Claude Code after install

## Current Focus
Preparing for public GitHub release and npm publish.
