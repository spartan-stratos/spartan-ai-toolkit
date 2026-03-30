---
name: spartan:brownfield
description: Analyze an existing codebase and generate a structured context map + onboarding spec before making any changes. Use when joining a legacy project or unfamiliar service.
argument-hint: "[service name or directory] [optional: area of focus]"
---

# Brownfield Onboarding: {{ args[0] }}
Focus area: {{ args[1] | default: "full codebase" }}

You are performing a **brownfield analysis** — mapping an existing codebase before touching it.
This prevents the most common AI coding mistake: making changes without understanding the terrain.

Inspired by OpenSpec's change-isolation philosophy: understand first, change second.

---

## Phase 1: Structure Mapping (automated)

Run these commands to get a high-level picture:

```bash
# Project structure
find . -type f -name "*.kt" | head -60
find . -type f -name "*.gradle.kts" | head -10

# Dependencies
cat build.gradle.kts 2>/dev/null || cat pom.xml 2>/dev/null

# Database migrations (Flyway)
ls src/main/resources/db/migration/ 2>/dev/null | sort

# Test coverage picture
find . -path "*/test/*" -name "*.kt" | wc -l
find . -path "*/main/*" -name "*.kt" | wc -l

# Recent git activity
git log --oneline -20
git log --oneline --since="30 days ago" | wc -l
```

---

## Phase 2: Architecture Analysis

Read and analyze these files (if they exist):
- `README.md` / `docs/`
- `CLAUDE.md` / `AGENTS.md`
- `src/main/resources/application.yml`
- Main `@MicronautApplication or Application.kt` class
- Domain model files in `domain/model/`

Then answer:
1. **What does this service do?** (1-2 sentences)
2. **What are the main domain entities?**
3. **What external systems does it talk to?** (DB, Kafka, Redis, HTTP)
4. **What are the main entry points?** (controllers, consumers)
5. **What tech debt is visible?** (TODO comments, deprecated APIs, inconsistent patterns)

---

## Phase 3: Hotspot Detection

```bash
# Most-changed files (potential complexity hotspots)
git log --format=format: --name-only | grep "\.kt$" | sort | uniq -c | sort -rn | head -15

# Largest files (potential god classes)
find . -name "*.kt" -exec wc -l {} \; | sort -rn | head -10

# TODO/FIXME density
grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.kt" | wc -l
grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.kt" | head -10
```

---

## Phase 4: Test Health Check

```bash
# Test types present
find . -name "*Test*.kt" -o -name "*Spec*.kt" | head -20

# Integration tests (Testcontainers)
grep -r "Testcontainers\|@Container" --include="*.kt" -l

# Test coverage (if JaCoCo configured)
cat build.gradle.kts | grep -A5 "jacoco"
```

Assess:
- Unit test coverage (estimate from file count ratio)
- Integration test presence
- Any tests using mocks where Testcontainers would be better

---

## Phase 5: Generate Context Map

Save output as `docs/CONTEXT-MAP.md`:

```markdown
# Context Map: [service name]
Generated: [date]

## Service Purpose
[1-2 sentences]

## Architecture
- Pattern: [layered / hexagonal / other]
- Main layers: [list]
- External dependencies: [list with protocols]

## Domain Model
[key entities and their relationships]

## Entry Points
[controllers + endpoints, consumers + topics]

## Known Tech Debt
[ordered by severity]

## Test Health
- Unit tests: [count / assessment]
- Integration tests: [count / assessment]
- Coverage gaps: [where tests are missing]

## Safe Change Zones
[areas that are well-tested and safe to modify]

## Danger Zones  
[areas that are fragile, under-tested, or have unclear behavior]

## Recommended First Steps
1. [what to do before making any changes]
2. [what tests to add first]
3. [what to refactor before building new features]
```

---

## Phase 6: Change Isolation Setup

For each planned change to this codebase, create a folder:
```
.changes/
  [YYYY-MM-DD]-[change-name]/
    PROPOSAL.md    ← what you want to change and why
    DESIGN.md      ← how you'll change it
    TASKS.md       ← atomic steps (max 4)
    RISKS.md       ← what could break
```

This prevents scope creep and keeps each change independently reviewable.

After analysis, present the Context Map summary and ask:
"Analysis complete. What change would you like to make first?
I'll create a change folder and use `/spartan:spec` → `/spartan:build` for it."
