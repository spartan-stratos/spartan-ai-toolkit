# Project: Spartan AI Toolkit

## About
Spartan AI Toolkit is a Claude Code workflow enhancement system for Engineering Managers. It provides 26 slash commands, 9 coding rule sets, 8 skills, and 2 expert agents — all installed via a single setup script. Includes a standalone Telegram bridge for remote Claude Code control.

## Tech Stack
- **Primary language**: Markdown (commands, rules, skills, docs)
- **Setup script**: Bash (scripts/setup.sh)
- **Telegram bridge**: Node.js (ES modules, node-telegram-bot-api)
- **UI/UX skill scripts**: Python 3 (CSV data processing)
- **Dependencies**: Claude Code CLI, GSD (Get Shit Done), Superpowers plugin
- **Target stack**: Kotlin + Micronaut (BE), React + Next.js (FE)

## Architecture
This is a **distribution toolkit** — it installs config files into `~/.claude/` for global use across all projects.

```
spartan-ai-toolkit/              # Root repo
├── docs/                        # User-facing documentation
│   ├── GUIDE.md                 # Comprehensive 15-min guide
│   ├── CHEATSHEET.md            # Quick reference card
│   ├── FIRST-RUN.md             # First-run walkthrough
│   └── ROADMAP.md               # Development roadmap
├── .claude/
│   └── settings.json            # Project-level Claude Code config
├── toolkit/                     # Distribution content (npm: spartan-ai-toolkit)
│   ├── CLAUDE.md                # Workflow brain (copied to ~/.claude/)
│   ├── scripts/setup.sh         # 11-step installer with pack selection
│   ├── rules/project/           # 9 coding standard files
│   ├── skills/                  # 8 Claude Code skill sets (Agent Skills spec)
│   ├── agents/                  # 2 expert agent definitions
│   ├── commands/                # 35 slash command prompts
│   │   ├── spartan.md           # Smart router (entry point)
│   │   └── spartan/             # Subcommands (6 packs)
│   ├── claude-md/               # CLAUDE.md sections (assembled per pack)
│   ├── .claude-plugin/          # Claude Code plugin manifest
│   ├── bin/cli.js               # npx installer (multi-agent)
│   ├── lib/packs.js             # Pack definitions
│   └── package.json             # npm package config
├── claude-telegram-bridge/      # Standalone remote control tool
│   ├── bridge.js                # Main bridge (~400 lines)
│   ├── package.json             # node-telegram-bot-api + dotenv
│   └── README.md                # Setup guide
├── Makefile                     # Dev shortcuts
├── .claudeignore                # Reduce context noise
└── .github/                     # CI + PR template
    ├── pull_request_template.md
    └── workflows/validate.yml
```

## Key Components

### Slash Commands (26 total)
Installed to `~/.claude/commands/spartan/`. Groups: Start (8), Build (5), Ship (4), Setup (3), Ops (2), Safety (4).

### Rules (9 files)
Installed to `~/.claude/rules/project/`. Enforce: null safety, layered architecture, RPC-style APIs, soft deletes, naming conventions, test standards, transaction safety.

### Skills (8 sets)
Installed to `~/.claude/skills/`. Generate: API endpoints, database tables, Kotlin patterns, tests, security checklists, UI/UX designs.

### Agents (2)
Installed to `~/.claude/agents/`. Provide: Micronaut backend expertise, CTO-level architecture guidance.

### Telegram Bridge
Standalone Node.js process. Uses Claude Agent SDK, forwards prompts to Telegram, accepts responses via bot keyboard.

## Monorepo Structure
This repo has two packages:
- `toolkit/` — the toolkit content that gets distributed
- `claude-telegram-bridge/` — standalone remote control tool

Root-level `.claude/settings.json` holds project dev config. The `toolkit/.claude/` contains distribution content (commands) — not the same thing.

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

## File Counts
- Markdown files: 56 (commands, rules, skills, docs, agents)
- JavaScript: 1 (bridge.js)
- Python: 3 (UI/UX skill scripts)
- Shell: 1 (setup.sh)
- CSV data: 18 (UI/UX design system data)
- SQL template: 1 (migration template)

## Current Focus
Preparing for public GitHub release — professional README, clean repo structure, documentation polish.

## Testing
- No automated tests (this is a config distribution toolkit)
- Verification: run `/spartan` in Claude Code after install
- `make validate` checks file structure is correct
- Integration: GSD and Superpowers auto-test via their own mechanisms
