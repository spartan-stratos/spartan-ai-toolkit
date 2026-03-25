---
name: spartan:onboard
description: "Understand a new codebase — scan, map architecture, set up rules, and get ready to build"
argument-hint: ""
---

# Onboard to This Codebase

You are running the **Onboard workflow** — go from "I just joined" to "I'm ready to build."

```
STAGE 1: SCAN              STAGE 2: MAP              STAGE 3: SETUP
─────────────             ────────────              ──────────────
Project files             Architecture              Generate CLAUDE.md
Stack detection           Key files + roles          Pick right packs
Existing docs             Data flow                 Configure rules
Git history               External deps             Ready to build

Gate 1                    Gate 2                    Gate 3
"Here's what I see"       "Here's how it works"     "You're set up"
```

---

## Stage 1: Scan

**Goal:** Understand what this project is at a surface level.

### Check project basics
```bash
# What's in the root?
ls -la

# Package/build files
ls build.gradle.kts settings.gradle.kts pom.xml 2>/dev/null
ls package.json tsconfig.json next.config.* 2>/dev/null
ls Dockerfile docker-compose.yml 2>/dev/null
ls Makefile 2>/dev/null

# Existing docs
ls CLAUDE.md README.md CONTRIBUTING.md 2>/dev/null
ls .planning/ .memory/ .handoff/ 2>/dev/null

# Git info
git log --oneline -20
git shortlog -sn --no-merges | head -10
git branch -a | head -20
```

### Classify the project

| Signal | Meaning |
|--------|---------|
| `build.gradle.kts` + `src/main/kotlin/` | Kotlin/Micronaut backend |
| `package.json` + `next.config.*` | Next.js/React frontend |
| Both | Full-stack monorepo |
| `docker-compose.yml` with multiple services | Microservices |
| Already has `CLAUDE.md` | Someone set this up before — read it |
| Has `.planning/` | GSD project — check status |

### Produce a quick summary

```markdown
## Project Scan

**Name:** [from package.json, settings.gradle, or folder name]
**Stack:** [what you detected]
**Size:** [file count, line count estimate]
**Team:** [from git shortlog — who contributes most]
**Activity:** [last commit date, commit frequency]
**Existing docs:** [what exists already]
**Tests:** [test framework, rough coverage indicator]
```

**GATE 1 — STOP and ask:**
> "Here's what I see: [summary]. Does this match your understanding? Anything I should know that's not in the code?"

---

## Stage 2: Map

**Goal:** Understand how the pieces fit together. Build a mental model.

### Architecture mapping

Use the approach from `/spartan:map-codebase` internally:
- Identify the main modules/packages
- Trace a request from entry point to response (for backends) or from page load to render (for frontends)
- Find the data model (entities, schemas, types)
- Identify external dependencies (databases, APIs, message queues)

### For backend projects
```
Request flow:
  Client → Controller → Manager/Service → Repository → Database
                     ↘ External APIs (if any)

Key directories:
  controllers/   — HTTP endpoints
  managers/      — Business logic
  repositories/  — Data access
  models/        — Entities + DTOs
  config/        — Application config
```

### For frontend projects
```
Render flow:
  Route → Page → Layout → Components → Hooks → API client → Backend

Key directories:
  app/           — Pages and routes
  components/    — Reusable UI
  hooks/         — Custom hooks
  lib/           — Utilities and API client
  types/         — TypeScript types
```

### Produce an architecture overview

```markdown
## Architecture

**Pattern:** [MVC, layered, microservices, etc.]
**Entry points:** [main files, route handlers]
**Data model:** [key entities and their relationships]
**External deps:** [databases, APIs, queues, caches]
**Config:** [how config works — env vars, files, etc.]

**Request flow:**
[trace one typical request end-to-end]

**Key decisions:**
[any non-obvious architecture choices — why things are the way they are]
```

### Check for gotchas
- Any code that looks unused but might be important?
- Unusual patterns that a new dev would trip on?
- Known tech debt? (look for TODO comments, fixme markers)

```bash
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.kt" --include="*.tsx" --include="*.ts" src/ | head -20
```

**GATE 2 — STOP and ask:**
> "Here's how this project works: [architecture overview]. Questions before I set things up?"
>
> This is the most important gate. Make sure the user's mental model matches reality.

---

## Stage 3: Setup

**Goal:** Configure the AI tools for this specific project.

### Generate or update CLAUDE.md
Use the approach from `/spartan:init-project`:
- Tech stack section
- Architecture section (from Stage 2)
- Conventions (detected from code patterns)
- Key commands (build, test, run)
- Domain context

If CLAUDE.md already exists, don't overwrite — merge your findings into it.

### Recommend packs
Based on the detected stack:

| Stack detected | Recommended packs |
|----------------|-------------------|
| Kotlin/Micronaut | `core` + `backend-micronaut` (pulls in `database` + `shared-backend`) |
| Next.js/React | `core` + `frontend-react` |
| Full-stack | `core` + `backend-micronaut` + `frontend-react` |
| Unknown | `core` only, ask about stack |

If packs aren't installed yet:
> "This is a [stack] project. I'd add the [pack] pack for stack-specific guidance. Want me to set it up?"

### Verify setup
```bash
# Check CLAUDE.md exists and has content
ls -la CLAUDE.md
wc -l CLAUDE.md

# Check if rules are in place
ls ~/.claude/rules/ 2>/dev/null
```

**GATE 3 — Done.**
> "You're set up. Here's what's ready:
> - CLAUDE.md: [created/updated]
> - Stack: [detected stack]
> - Packs: [what's installed]
>
> Start building with `/spartan:build [feature]` or explore with `/spartan` anytime."

---

## If the codebase is legacy / brownfield

If the scan reveals a messy or unfamiliar codebase (no docs, no tests, tangled dependencies), use `/spartan:brownfield` internally for a deeper analysis before mapping.

Signs of brownfield:
- No tests or very few tests
- No documentation
- Multiple frameworks or patterns mixed together
- Large files (1000+ lines)
- Circular dependencies

In this case, add a warning:
> "This codebase has some legacy patterns. Here's what to watch out for: [specific issues]. I'd suggest adding tests before making changes in [risky areas]."

---

## Rules

- **Don't change any code during onboarding.** This is read-only. Understand first.
- **Ask about what's NOT in the code.** Business context, deployment process, team conventions — things you can't see in files.
- **Don't assume conventions from one file apply everywhere.** Check multiple files for consistency.
- **If CLAUDE.md exists, read it before scanning.** Someone already did this work — build on it.
- **The architecture overview should fit on one screen.** If it's longer, you're over-explaining.
