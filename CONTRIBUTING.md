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
| **Commands** | `.claude/commands/spartan/` | Slash commands for structured workflows |
| **Rules** | `rules/project/` | Coding standards Claude enforces automatically |
| **Skills** | `skills/` | Reusable prompt templates for common tasks |
| **Agents** | `agents/` | Expert agent definitions for specialized guidance |
| **Telegram Bridge** | `claude-telegram-bridge/` | Remote control features |
| **Docs** | `docs/` (root) and `README.md` | Guides, cheatsheet, first-run walkthrough |
| **Setup Script** | `scripts/setup.sh` | Installer improvements |

---

## Guidelines by Component

### Commands (`.claude/commands/spartan/`)

- **One file per command** — `command-name.md`
- **Must work standalone** — no hidden dependencies between commands
- **Include clear instructions** — Claude reads the file as a prompt, so be explicit about what it should do step by step
- **Use conditional logic** — check project context (has CLAUDE.md? has .planning/? what stack?) before taking action
- **Handle edge cases** — what if the user runs this in an empty repo? In a non-git folder?
- **Test manually** — run the command in Claude Code, verify it behaves correctly

### Rules (`rules/project/`)

- **Must be enforceable** — if Claude can't follow the rule consistently, don't add it
- **Be specific** — show code examples for both correct and incorrect patterns
- **Include "Why"** — explain the reasoning, not just the rule
- **Don't duplicate** — check if an existing rule file already covers your topic
- **Keep it scannable** — use tables, code blocks, and clear headings

### Skills (`skills/`)

- **Each skill is a directory** with a `skill.md` entry point
- **Include examples** — show input/output pairs so Claude knows what to generate
- **Target a specific task** — "generate API endpoint" not "do backend stuff"
- **Reference rules** — skills should follow the conventions defined in `rules/project/`

### Agents (`agents/`)

- **One file per agent** — `agent-name.md`
- **Define expertise clearly** — what the agent knows, what it doesn't
- **Include decision frameworks** — how should the agent approach problems?
- **Keep focused** — an agent that does everything well does nothing well

### Telegram Bridge (`claude-telegram-bridge/`)

- **Node.js, ES modules** — `import` not `require`
- **Security first** — never expose secrets, always validate chat ID
- **Test with a real Telegram bot** — mock testing won't catch Telegram API quirks
- **Keep bridge.js reasonable** — if adding major features, consider splitting into modules

### Docs (`docs/` at repo root)

- **Keep CHEATSHEET.md to 1 page** — it's meant to be printed
- **GUIDE.md is the comprehensive reference** — detailed explanations go here
- **FIRST-RUN.md is a tutorial** — step-by-step, no skipping steps
- **Update all affected docs** — if you add a command, update README, GUIDE, and CHEATSHEET

---

## CLAUDE.md — The Brain File

`toolkit/CLAUDE.md` is the most important file in the project. Claude reads it at the start of every session. Rules for editing it:

- **Keep it under 200 lines of actionable content** — every line has a cost (tokens)
- **No filler** — if a section doesn't change Claude's behavior, remove it
- **Test after editing** — run `setup.sh --global`, open Claude Code, verify the change works
- **Don't duplicate rules** — if something belongs in `rules/project/`, put it there, not in CLAUDE.md

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
docs: update GUIDE.md with new wave execution section
refactor(setup): simplify backup logic in setup.sh
```

---

## Pull Request Process

### Before Submitting

1. **Test with clean install** — back up your `~/.claude/`, delete it, run `setup.sh --global`, verify everything works
2. **Run the affected commands** — if you changed a command, run it in Claude Code
3. **Check for conflicts** — your changes shouldn't break existing commands or rules
4. **Update docs** — if you added/changed a command, update README + GUIDE + CHEATSHEET

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

## Questions?

Open an issue with the `question` label, or reach out in the discussions tab.
