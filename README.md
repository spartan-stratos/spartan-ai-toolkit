<p align="center">
  <h1 align="center">Spartan AI Toolkit</h1>
  <p align="center">
    <strong>Engineering discipline layer for AI coding tools</strong>
    <br />
    Commands &middot; Rules &middot; Skills &middot; Agents &middot; Packs
  </p>
  <p align="center">
    <a href="#install">Install</a> &middot;
    <a href="#pick-your-packs">Pick Your Packs</a> &middot;
    <a href="#what-to-do-first">First Steps</a> &middot;
    <a href="#which-command-do-i-use">Command Guide</a> &middot;
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>
</p>

---

## Why Spartan?

AI coding tools are powerful. But on real projects, they write code without tests, push PRs without rebasing, edit files you didn't ask about, and forget decisions from 20 minutes ago. Every developer on your team gets different code style from the same AI.

Spartan fixes this. It's a set of **commands, rules, skills, and workflows** that make AI coding tools consistent and reliable for production work.

| Without Spartan | With Spartan |
|----------------|-------------|
| "Create a PR" &rarr; pushes without tests or description | `/spartan:pr-ready` &rarr; rebase, tests, lint, security, auto PR description |
| "Debug this" &rarr; guesses a fix, hopes for the best | `/spartan:debug` &rarr; reproduce, isolate, root-cause, verify |
| Team of 5 devs &rarr; each gets different code style | Rule files &rarr; same standards for everyone, every session |
| 3-week feature &rarr; no plan, lost context | `/spartan:project new` &rarr; roadmap, phases, wave execution, persistent memory |

> Not everything needs a command. Questions, small code changes (&lt; 30 min) &mdash; just talk to your AI directly. Commands are for **structured workflows where missing steps cause real problems**.

---

## Install

Three ways to install. Pick one.

### Option 1: npx (recommended)

```bash
npx @c0x12c/spartan-ai-toolkit@latest
```

This opens an interactive menu. Pick your AI tool and packs. Done in 30 seconds.

You can also skip the menu:

```bash
# Pick specific packs
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut,frontend-react

# Install everything
npx @c0x12c/spartan-ai-toolkit@latest --all
```

### Option 2: Setup script

```bash
git clone https://github.com/spartan-stratos/spartan-ai-toolkit.git
cd spartan-ai-toolkit/toolkit
chmod +x scripts/setup.sh && ./scripts/setup.sh --global
```

### Option 3: Claude Code plugin

Search for **"Spartan AI Toolkit"** in the Claude Code plugin marketplace.

### Global vs Local

- **`--global`** (default) &mdash; installs to `~/.claude/`, works across all your projects
- **`--local`** &mdash; installs to `./.claude/` in current project only

### Not using Claude Code?

The installer supports 5 AI tools:

```bash
npx @c0x12c/spartan-ai-toolkit@latest --agent=claude-code  # default
npx @c0x12c/spartan-ai-toolkit@latest --agent=cursor
npx @c0x12c/spartan-ai-toolkit@latest --agent=windsurf
npx @c0x12c/spartan-ai-toolkit@latest --agent=codex
npx @c0x12c/spartan-ai-toolkit@latest --agent=copilot
```

All content is standard markdown &mdash; it works with any AI coding tool.

---

## Pick Your Packs

Packs group commands, rules, skills, and agents by use case. **Core is always installed.** You pick the rest.

Don't overthink it &mdash; find your situation below and copy the command.

### "I build Kotlin + Micronaut backends"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut
```

You get: service scaffolding, migration commands, PR review with Kotlin conventions, testcontainers setup, plus 9 rule files (API design, database, Kotlin standards, etc.), 7 skills (endpoint creator, test patterns, security), and 2 expert agents.

Dependencies `database` and `shared-backend` are pulled in automatically.

### "I build React + Next.js frontends"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=frontend-react
```

You get: Next.js app/feature scaffolding, Figma-to-code, Playwright E2E setup, frontend PR review, UI/UX design skill, and a frontend rule file.

### "I do full-stack (Kotlin + Next.js)"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut,frontend-react
```

Both packs, all their rules and skills. Most common setup for our team.

### "I'm running a multi-week project"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=backend-micronaut,project-mgmt
```

Add `project-mgmt` to your stack pack. You get project lifecycle, milestone tracking, phases, parallel workstreams, and GSD v5 wave execution.

### "I'm exploring startup ideas"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --packs=research
```

Research pulls in `product` as a dependency. You get the full pipeline: brainstorm &rarr; validate &rarr; market research &rarr; competitor teardowns &rarr; pitch materials &rarr; investor outreach.

### "Just give me everything"

```bash
npx @c0x12c/spartan-ai-toolkit@latest --all
```

### All Packs at a Glance

| Pack | Category | Auto-pulls | What's inside |
|------|----------|------------|---------------|
| **core** | Core | &mdash; | Always installed. Daily workflow commands + safety guardrails |
| **backend-micronaut** | Backend | database, shared-backend | Kotlin + Micronaut: commands, rules, skills, agents |
| **backend-nodejs** | Backend | database, shared-backend | Coming soon |
| **backend-python** | Backend | database, shared-backend | Coming soon |
| **frontend-react** | Frontend | &mdash; | React + Next.js: commands, rules, skills |
| **project-mgmt** | Planning | &mdash; | Project lifecycle, phases, workstreams |
| **product** | Planning | &mdash; | Product thinking before building |
| **ops** | Ship | &mdash; | Deploy + environment management |
| **research** | Research | product | Full startup pipeline: idea to investor |

---

## What to Do First

You installed the toolkit. Now what?

### Step 1: Open a project and test it

```
cd your-project
claude
```

Then type:

```
/spartan
```

The smart router will ask what you need and route you to the right command. If you don't know which command to use, always start here.

### Step 2: Generate your project's CLAUDE.md

```
/spartan:init-project
```

This scans your codebase and generates a CLAUDE.md file with your stack, conventions, and domain context. Claude reads this every session so it knows your project.

### Step 3: Start your day

```
/spartan:daily
```

Generates a standup summary from your recent git history. Good way to pick up where you left off.

### Step 4: Plan a task

```
/spartan:quickplan "add user profile endpoint"
```

Creates a spec + plan + git branch in one shot. Good for tasks under a day.

For bigger work (multi-day), use `/spartan:project new` instead.

---

## Which Command Do I Use?

Don't memorize the list. Use `/spartan` and it'll figure it out. But if you want to go direct:

### "I need to start a task"

| What you're doing | Command |
|-------------------|---------|
| Small task (< 1 day) | `/spartan:quickplan "task"` |
| Big project (multi-day) | `/spartan:project new` |
| New Kotlin microservice | `/spartan:kotlin-service "name"` |
| New Next.js app | `/spartan:next-app "name"` |
| New feature in existing Next.js | `/spartan:next-feature "name"` |
| New database migration | `/spartan:migration "description"` |
| Joining unfamiliar codebase | `/spartan:brownfield "service"` |

### "I need to fix something"

| What you're doing | Command |
|-------------------|---------|
| Bug with unclear cause | `/spartan:debug "symptom"` |
| Something broke in workflow | `/spartan:forensics "problem"` |

### "I need to ship"

| What you're doing | Command |
|-------------------|---------|
| Ready to create PR | `/spartan:pr-ready` |
| Review a backend PR | `/spartan:review` |
| Review a frontend PR | `/spartan:fe-review` |
| Deploy a service | `/spartan:deploy "service" "target"` |

### "I need to think before building"

| What you're doing | Command |
|-------------------|---------|
| Think through a problem first | `/spartan:think` |
| Validate an idea | `/spartan:validate` |
| Analyze a competitor | `/spartan:teardown` |
| Interview users | `/spartan:interview` |
| Build a lean canvas | `/spartan:lean-canvas` |

### "I need to research"

| What you're doing | Command |
|-------------------|---------|
| Deep research on a topic | `/spartan:research` |
| Full startup pipeline | `/spartan:full-run` |
| Market research + competitors | `/spartan:deep-dive` |
| Create pitch materials | `/spartan:pitch` |
| Write investor emails | `/spartan:outreach` |

### "I need to manage a project"

| What you're doing | Command |
|-------------------|---------|
| Run a project phase | `/spartan:phase discuss/plan/execute/verify` |
| Manage workstreams | `/spartan:workstreams list/create/switch` |
| Upgrade to GSD v5 | `/spartan:gsd-upgrade` |
| Map an entire codebase | `/spartan:map-codebase` |

### "I need safety"

| What you're doing | Command |
|-------------------|---------|
| Warn before destructive ops | `/spartan:careful` |
| Lock edits to one directory | `/spartan:freeze src/api` |
| Remove the lock | `/spartan:unfreeze` |
| Max safety (both combined) | `/spartan:guard src/api` |

---

## What Gets Installed

Spartan installs four types of content:

**Commands** &mdash; slash commands like `/spartan:quickplan`. Pre-built prompts for structured workflows.

**Rules** &mdash; coding standards enforced every session. Things like "no `!!` in Kotlin", "TEXT not VARCHAR", "Controller &rarr; Manager &rarr; Repository layers". You don't call these &mdash; they're always active.

**Skills** &mdash; deep knowledge in specific areas. API endpoint patterns, database design, test strategies, UI/UX design intelligence. Claude loads them when relevant.

**Agents** &mdash; expert personas. A Micronaut backend expert, a CTO for architecture decisions, an idea-killer for stress-testing, a research planner for coordinating research.

---

## Target Stack

Rules and skills are tuned for:

| Layer | Technology |
|-------|-----------|
| Backend | Kotlin + Micronaut |
| Frontend | React + Next.js + TypeScript |
| Database | PostgreSQL |
| CI/CD | GitHub Actions |

> **Different stack?** Fork the repo, edit the rules and skills, run the installer. The command framework works with any language or framework.

---

## Telegram Bridge

Control your AI coding sessions from your phone. Provider-based &mdash; currently supports Telegram.

```
Phone (Telegram) <-> Bridge (Node.js) <-> Claude Agent SDK <-> Claude API
```

See [`bridges/`](bridges/) for setup.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add commands, skills, rules, and agents.

---

## License

MIT
