# Contributing to Spartan AI Toolkit

Thanks for your interest in contributing! This guide covers what you need to know.

---

## Before You Start

1. **Read the README** — understand what Spartan is and how it works
2. **Install the toolkit** — run `setup.sh --global` and use it for a few days
3. **Check existing issues** — someone may already be working on your idea

---

## What You Can Contribute

| Type | Location | Description |
|------|----------|-------------|
| **Commands** | `toolkit/commands/spartan/` | Slash commands for structured workflows |
| **Rules** | `toolkit/rules/{pack-name}/` | Coding standards Claude enforces automatically |
| **Skills** | `toolkit/skills/` | Reusable prompt templates for common tasks |
| **Agents** | `toolkit/agents/` | Expert agent definitions for specialized guidance |
| **Telegram Bridge** | `bridges/telegram/` | Remote control features |
| **Docs** | `docs/` (root) and `README.md` | Guides, cheatsheet, first-run walkthrough |
| **Setup Script** | `toolkit/scripts/setup.sh` | Installer improvements |

---

## Guidelines by Component

### Commands (`commands/spartan/`)

- **One file per command** — `command-name.md`
- **Must work standalone** — no hidden dependencies between commands
- **Include clear instructions** — Claude reads the file as a prompt, so be explicit about what it should do step by step
- **Use conditional logic** — check project context (has CLAUDE.md? has .planning/? what stack?) before taking action
- **Handle edge cases** — what if the user runs this in an empty repo? In a non-git folder?
- **Test manually** — run the command in Claude Code, verify it behaves correctly

### Rules (`rules/{pack-name}/`)

- **Must be enforceable** — if Claude can't follow the rule consistently, don't add it
- **Be specific** — show code examples for both correct and incorrect patterns
- **Include "Why"** — explain the reasoning, not just the rule
- **Don't duplicate** — check if an existing rule file already covers your topic
- **Keep it scannable** — use tables, code blocks, and clear headings

### Skills (`skills/`)

- **Each skill is a directory** with a `SKILL.md` entry point (follows Agent Skills spec)
- **Include examples** — show input/output pairs so Claude knows what to generate
- **Target a specific task** — "generate API endpoint" not "do backend stuff"
- **Reference rules** — skills should follow the conventions defined in `rules/{pack-name}/`

### Agents (`agents/`)

- **One file per agent** — `agent-name.md`
- **Define expertise clearly** — what the agent knows, what it doesn't
- **Include decision frameworks** — how should the agent approach problems?
- **Keep focused** — an agent that does everything well does nothing well

---

## Content Templates

Before creating new content, copy the right template from `toolkit/templates/content/`:

| Type | Template | Target Lines |
|------|----------|-------------|
| Command | `COMMAND_TEMPLATE.md` | 30-150 |
| Skill | `SKILL_TEMPLATE.md` | 60-200 |
| Agent | `AGENT_TEMPLATE.md` | 50-80 |
| Rule | `RULE_TEMPLATE.md` | 50-150 |

### Token Budget

Every file gets loaded into Claude's context. Shorter = cheaper = faster. Rules:

1. Every line must change Claude's behavior. If it doesn't, cut it.
2. No emoji in headers — `## Core Rule` not `## 🎯 Core Rule`
3. No "Benefits" or "Why This Matters" sections
4. No "Last Updated" dates — git has this
5. No ASCII art diagrams — use tables or inline flow: `Controller → Manager → Repository`
6. Code examples: show the pattern, not a full implementation
7. Skills with heavy code: split into `examples.md` or `patterns.md` supporting files

---

## Codex / OpenAI Agents Support

Claude skills are the source of truth. Codex skills are generated from them.

```bash
# Generate Codex-compatible skills
make codex
# or: node toolkit/scripts/gen-codex-skills.js

# Check if generated skills are fresh (CI)
make codex-dry-run

# Full health check (coverage, no Claude path leaks, description limits)
make codex-check
```

### What changes between hosts

| Aspect | Claude | Codex |
|--------|--------|-------|
| Location | `toolkit/skills/{name}/SKILL.md` (committed) | `.agents/skills/spartan-{name}/SKILL.md` (gitignored) |
| Frontmatter | name, description, allowed_tools | name + description only (1024 char limit) |
| Agent metadata | N/A | `agents/openai.yaml` per skill |

### Adding a new skill

1. Create `toolkit/skills/{name}/SKILL.md` with Claude frontmatter
2. Run `make codex` to generate the Codex version
3. Run `make validate` — includes Codex freshness check
4. Commit the Claude SKILL.md only — `.agents/` is gitignored

### Editing a skill

Edit `toolkit/skills/{name}/SKILL.md`, then run `make codex`. Never edit `.agents/skills/` directly.

---

## Validation

Run before every PR:

```bash
make validate
```

This checks:
- All files in packs.js exist on disk
- Frontmatter has the right fields
- Naming follows conventions (kebab-case, UPPER_SNAKE_CASE)
- packs.js and packs.sh are in sync
- Codex skills are fresh (match Claude sources)
- Warns about bloated files and emoji headers

---

### Telegram Bridge (`bridges/telegram/`)

- **Node.js, ES modules** — `import` not `require`
- **Security first** — never expose secrets, always validate chat ID
- **Test with a real Telegram bot** — mock testing won't catch Telegram API quirks
- **Keep bridge.js reasonable** — if adding major features, consider splitting into modules

### Docs

- **README.md is the single source of truth** — all commands, packs, examples live here
- **docs/ROADMAP.md** — future plans only
- **If you add a command** — update README.md command table + add to the right pack in both `packs.sh` and `lib/packs.js`

---

## CLAUDE.md — The Brain File

`toolkit/CLAUDE.md` is the most important file in the project. Claude reads it at the start of every session. Rules for editing it:

- **Keep it under 200 lines of actionable content** — every line has a cost (tokens)
- **No filler** — if a section doesn't change Claude's behavior, remove it
- **Test after editing** — run `setup.sh --global`, open Claude Code, verify the change works
- **Don't duplicate rules** — if something belongs in `rules/{pack-name}/`, put it there, not in CLAUDE.md

---

## Commit Convention

```
type(scope): what changed

- why / detail (optional)
```

**Types:** `feat` | `fix` | `docs` | `refactor` | `chore`

**Scopes:** `commands` | `rules` | `skills` | `agents` | `bridge` | `setup` | `docs`

**Examples:**
```
feat(commands): add /spartan:rollback for deployment rollbacks
fix(bridge): handle Telegram rate limit (429) with exponential backoff
docs: update README with new wave execution section
refactor(setup): simplify backup logic in setup.sh
```

---

## Pull Request Process

### Before Submitting

1. **Test with clean install** — back up your `~/.claude/`, delete it, run `setup.sh --global`, verify everything works
2. **Run the affected commands** — if you changed a command, run it in Claude Code
3. **Check for conflicts** — your changes shouldn't break existing commands or rules
4. **Update docs** — if you added/changed a command, update README.md + both pack files (packs.sh, packs.js)

### PR Description

Include:
- **What** — what you changed and why
- **Testing** — how you verified it works
- **Screenshots** (if applicable) — especially for Telegram bridge UI changes

### Review Criteria

PRs are evaluated on:

1. **Does it work?** — manual testing required, there's no automated test suite
2. **Is it focused?** — one PR = one feature/fix, not a grab bag
3. **Does it follow conventions?** — commit messages, file locations, naming
4. **Is it documented?** — new features need docs updates
5. **Does it respect token budget?** — CLAUDE.md and rules are read every session, bloat hurts everyone

---

## Testing (Manual)

There's no automated test suite — this is a config distribution toolkit. Testing means:

1. **Clean install test** — `setup.sh --global` on fresh `~/.claude/`
2. **Command test** — run the command in Claude Code, check output
3. **Rule test** — ask Claude to do something the rule forbids, verify it refuses
4. **Skill test** — invoke the skill, check generated output follows conventions
5. **Cross-platform** — if you changed `setup.sh`, test on macOS and Linux

---

## Architecture Decisions

If your change involves a significant design choice, document it:

1. **What** — the decision
2. **Why** — the reasoning
3. **Alternatives considered** — what you didn't pick and why
4. **Trade-offs** — what's the downside of this approach

Add this to your PR description. Significant decisions may also be captured in the project's `.memory/decisions/` directory.

---

## Creating a Community Pack

A pack bundles commands, rules, skills, and agents for a specific tech stack. Anyone can create one and share it.

### Pack Directory Structure

```
my-pack/
├── packs/
│   └── go-backend.yaml       # Pack manifest (required)
├── commands/spartan/
│   └── go-service.md          # Slash commands
├── rules/
│   └── go-backend/
│       └── CONVENTIONS.md     # Rules in a subdirectory matching pack name
├── skills/
│   └── go-patterns/
│       └── SKILL.md           # Each skill is a directory with SKILL.md
└── agents/
    └── go-expert.md           # Agent definitions
```

### Pack Manifest Format

Create a YAML file in `packs/`:

```yaml
name: go-backend                    # Required: kebab-case, unique
description: "Go backend with Gin"  # Required: one-line description
category: Backend                   # Optional: groups in CLI menu
priority: 100                       # Optional: sort order (100+ for community)
depends:                            # Optional: built-in packs to depend on
  - core

commands:
  - go-service                      # → commands/spartan/go-service.md
rules:
  - go-backend/CONVENTIONS.md       # → rules/go-backend/CONVENTIONS.md
skills:
  - go-patterns                     # → skills/go-patterns/SKILL.md
agents:
  - go-expert.md                    # → agents/go-expert.md
claude-sections: []
```

### Installing a Community Pack

```bash
npx @c0x12c/ai-toolkit@latest --pack-dir=./my-pack
```

The CLI validates your pack (name format, no collisions, deps exist), merges it with built-in packs, and shows it in the menu.

### Validation Checks

- `name` exists and is kebab-case
- `description` exists
- No name collision with built-in packs
- Dependencies reference valid built-in packs
- Referenced files exist (warns if missing)

### Sharing

Push to GitHub. Users install with `--pack-dir=path/to/your-pack`. Use priority 100+ so community packs sort after built-in ones.

---

## Questions?

Open an issue with the `question` label, or reach out in the discussions tab.
