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
spartan-ai-toolkit/          # Root repo
├── spartan-ai-toolkit/      # Main toolkit content
│   ├── CLAUDE.md            # Workflow brain (copied to ~/.claude/)
│   ├── scripts/setup.sh     # 8-step installer
│   ├── docs/                # User-facing documentation
│   │   ├── GUIDE.md         # Comprehensive 15-min guide
│   │   ├── CHEATSHEET.md    # Quick reference card
│   │   └── FIRST-RUN.md     # First-run walkthrough
│   ├── rules/project/       # 9 coding standard files
│   ├── skills/              # 8 Claude Code skill sets
│   ├── agents/              # 2 expert agent definitions
│   └── .claude/commands/    # 26 slash command prompts
│       ├── spartan.md       # Smart router (entry point)
│       └── spartan/         # 25 subcommands
└── claude-telegram-bridge/  # Standalone remote control tool
    ├── bridge.js            # Main bridge (~400 lines)
    ├── package.json         # node-telegram-bot-api + dotenv
    └── README.md            # Setup guide (Vietnamese)
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
Standalone Node.js process. Spawns Claude Code as child process, forwards prompts to Telegram, accepts responses via bot keyboard.

## Specific Rules
- Setup script supports `--global` (all projects) and `--local` (current project only)
- Script creates backups before overwriting existing files
- Rules/skills check for conflicts and offer backup/skip choice
- CLAUDE.md is the "workflow brain" — Claude reads it every session
- GSD is installed via `npx get-shit-done-cc@latest`
- Superpowers requires manual install in Claude Code (plugin marketplace)

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
- Integration: GSD and Superpowers auto-test via their own mechanisms

## GSD State
Not using GSD yet — run `/gsd:new-project` to start
