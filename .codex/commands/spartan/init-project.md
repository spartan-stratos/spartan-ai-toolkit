---
name: spartan:init-project
description: Scan current codebase and auto-generate a project-level CLAUDE.md with stack detection, conventions, domain context, and team rules. Use when joining a project or setting up AI workflow for an existing repo.
argument-hint: "[optional: project name]"
---

# Initialize Project: {{ args[0] | default: "auto-detect" }}

You are generating a **project-level CLAUDE.md** by scanning the codebase.
This file tells Claude Code everything it needs to know about THIS specific project.

The global `~/.claude/CLAUDE.md` (Spartan Toolkit) provides generic rules.
This project CLAUDE.md provides project-specific overrides and context.

---

## Step 1: Auto-Detect Stack

```bash
# Package managers & frameworks
ls package.json tsconfig.json next.config.* vite.config.* 2>/dev/null
ls build.gradle.kts pom.xml Cargo.toml go.mod 2>/dev/null
ls Dockerfile docker-compose.yml railway.toml 2>/dev/null
ls terraform/ k8s/ .github/workflows/ 2>/dev/null

# Framework detection
cat package.json 2>/dev/null | grep -E '"next"|"react"|"vue"|"angular"|"svelte"'
cat build.gradle.kts 2>/dev/null | grep -E 'micronaut|ktor|quarkus'

# Language breakdown
find . -name '*.kt' -not -path '*/build/*' | wc -l
find . -name '*.tsx' -o -name '*.ts' | grep -v node_modules | wc -l
find . -name '*.py' -not -path '*/venv/*' | wc -l

# Database
ls src/main/resources/db/migration/ 2>/dev/null | head -3
cat docker-compose.yml 2>/dev/null | grep -E 'postgres|mysql|redis|kafka|mongo'
grep -r "prisma\|typeorm\|drizzle" package.json 2>/dev/null
```

---

## Step 2: Detect Domain & Conventions

```bash
# Project description
cat README.md 2>/dev/null | head -30

# Existing AI config
cat CLAUDE.md AGENTS.md .cursorrules 2>/dev/null

# Package structure / architecture pattern
find src/main/kotlin -type d -maxdepth 4 2>/dev/null | head -20
ls src/app/ 2>/dev/null | head -20

# Key domain entities
find . -path '*/domain/model/*' -o -path '*/entities/*' -o -path '*/types/*' | head -15

# External integrations
grep -r "stripe\|cloudinary\|aws\|firebase\|supabase\|twilio" \
  --include='*.kt' --include='*.ts' --include='*.yml' -l 2>/dev/null | head -10

# Test patterns
find . -name '*Test*' -o -name '*spec*' -o -name '*.test.*' | head -10

# Git conventions
git log --oneline -20 2>/dev/null
git log --format='%s' -20 2>/dev/null | grep -oP '^[a-z]+' | sort | uniq -c | sort -rn

# Environment variables
cat .env.example .env.local 2>/dev/null | grep -v '^#' | cut -d= -f1 | head -20
```

---

## Step 3: Ask Clarifying Questions

Based on scan results, ask the user to fill in gaps:

1. **What does this project do?** (1-2 sentences for the "About" section)
2. **Any domain rules that aren't obvious from code?** (e.g., "all amounts in cents", "never call X from Y layer")
3. **Current focus / active milestone?** (what's being built right now)
4. **Deployment targets?** (Railway staging → AWS prod, etc.)
5. **Team size / who else codes here?** (affects review conventions)

**Auto mode on?** → Infer what you can from README, git log, and codebase structure. Use sensible defaults for unknowns. Proceed immediately.
**Auto mode off?** → Wait for answers.

---

## Step 4: Generate CLAUDE.md

Write `CLAUDE.md` at project root with this structure:

```markdown
# Project: [name]

## About
[1-2 sentences from user + README]

## Tech Stack
[auto-detected from Step 1]
- Backend: [framework + language]
- Frontend: [framework + language]
- Database: [type]
- Infrastructure: [Docker/K8s/Terraform]
- Deployment: [platforms]
- CI: [pipeline]

## Architecture
[detected pattern: layered / hexagonal / feature-based]
- [layer/directory] → [purpose]

## Domain Model
[key entities from code scan]
- [Entity1]: [brief description]
- [Entity2]: [brief description]

## External Integrations
[from grep scan]
- [Service]: [what it's used for]

## Specific Rules
[from user answers + detected patterns]
- [Rule 1 — e.g., "All monetary amounts stored as Long (cents)"]
- [Rule 2 — e.g., "!! operator banned — use Either error handling (CORE_RULES)"]
- [Rule 3]

## Commit Convention
[detected from git log]
type(scope): description
Types: [detected types]

## Environment Variables
[from .env.example scan]
Key vars: [list critical ones]

## Current Focus
[from user answer]
- Active: [what's being built]
- Next: [what's planned]

## Testing
- Unit: [framework + pattern]
- Integration: [framework — Testcontainers?]
- E2E: [if configured]
- Run: [commands]

## GSD State
[if .planning/ exists, show current milestone/phase]
[if not, note "Not using GSD yet — run /gsd:new-project to start"]
```

---

## Step 5: Validate

Read back the generated CLAUDE.md and verify:
- [ ] Stack detection is accurate (user confirms)
- [ ] Domain rules are complete
- [ ] No sensitive information (secrets, internal URLs)
- [ ] File is under 200 lines (concise enough for Claude to read quickly)

---

## Step 6: Optional — Generate .cursorrules

If user also uses Cursor, offer to generate `.cursorrules` with a subset of the same info.

**Auto mode on?** → Skip `.cursorrules` generation unless Cursor config already exists in project.
**Auto mode off?** → Ask: "Also generate `.cursorrules` for Cursor? (y/n)"

---

After generating, say:
"✅ Project CLAUDE.md created. Claude Code will now read this file automatically in every session.
Review it and edit any details that need correcting.
The global toolkit rules (from `~/.claude/CLAUDE.md`) still apply — this file adds project-specific context on top."
