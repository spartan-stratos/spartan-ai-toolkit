# Project: Spartan AI Toolkit

## About
Spartan AI Toolkit is an engineering discipline layer for AI coding tools. It has 44 slash commands (7 packs), 9 coding rules, 18 skills, 4 agents, 13 frameworks, and 6 templates. Native integration with Claude Code (npx, plugin, setup script). All content is standard markdown — usable with any AI coding tool (Codex, Gemini, Copilot, Cursor, etc.). Includes a Telegram bridge for remote session control.

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
│   ├── commands/spartan/        # 44 slash commands
│   ├── commands/spartan.md      # Smart router (entry point)
│   ├── skills/                  # 18 skill sets (each a directory with SKILL.md)
│   ├── agents/                  # 4 agent definitions
│   ├── rules/project/           # 9 coding standard files
│   ├── frameworks/              # 13 startup/product frameworks
│   ├── templates/               # 6 reusable templates
│   ├── claude-md/               # CLAUDE.md sections (assembled per pack)
│   ├── .claude-plugin/          # Claude Code plugin manifest
│   ├── bin/cli.js               # npx installer (multi-agent)
│   ├── lib/packs.js             # Pack definitions (source of truth)
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

Packs are how content gets grouped and installed. Defined in `toolkit/lib/packs.js`.

**7 packs:**

| Pack | What's in it |
|------|-------------|
| `core` | Always installed. 11 workflow commands. |
| `backend` | Kotlin + Micronaut. 4 commands, 8 rules, 7 skills, 2 agents. |
| `frontend` | React + Next.js. 5 commands, 2 rules, 1 skill. |
| `project-mgmt` | Large projects (GSD). 7 commands. |
| `product` | Product thinking before building. 6 commands. |
| `ops` | Deploy and infra. 2 commands. |
| `research` | Startup pipeline. 9 commands, 10 skills, 2 agents. |

Each pack has: commands, rules, skills, agents, claudeSections.
`PACK_ORDER` in packs.js controls install order.

### How Packs Work
1. User picks packs during install (CLI or setup script)
2. CLI collects all items from selected packs, dedupes
3. Copies commands → `~/.claude/commands/spartan/`
4. Copies rules → `~/.claude/rules/project/`
5. Copies skills → `~/.claude/skills/` (as directories)
6. Copies agents → `~/.claude/agents/`
7. Assembles CLAUDE.md from pack sections (header + core + pack sections + footer)

### Dual Source of Truth
- `toolkit/lib/packs.js` — Node.js CLI uses this
- `toolkit/scripts/packs.sh` — Bash setup script uses this
- **Keep them in sync** when adding/removing content

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
---
```

**Body rules:**
- Title: `# Command Name: {{ args[0] | default: "fallback" }}`
- Use `{{ args[0] }}` for arguments, NOT `$ARGUMENTS`
- Step-by-step with `##` headings for sections
- Reference other commands as `/spartan:command-name`
- Keep frontmatter `name` in kebab-case with `spartan:` prefix

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

**Location:** `toolkit/rules/project/RULE_NAME.md`

**No frontmatter.** Plain markdown.

- Filename: `UPPER_SNAKE_CASE.md`
- Start with `#` title
- Optional: `> Full guide: use /skill-name skill`
- Mark forbidden patterns in ALL CAPS with WRONG vs CORRECT examples
- Include code before/after comparisons
- End with quick reference table

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

1. Add pack object to `toolkit/lib/packs.js` with: commands, rules, skills, agents, claudeSections
2. Add pack name to `PACK_ORDER` array
3. Create claude-md section file (`toolkit/claude-md/{NN}-{pack}.md`)
4. Update `toolkit/scripts/packs.sh` to match (keep dual source in sync)
5. Update `toolkit/package.json` files array if adding new top-level directories
6. Update counts in this CLAUDE.md and toolkit/README.md

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
- No automated tests (this is a config distribution toolkit)
- Verification: run `/spartan` in Claude Code after install
- `make validate` checks file structure is correct

## Current Focus
Preparing for public GitHub release and npm publish.
