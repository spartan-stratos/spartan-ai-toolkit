---
name: spartan:map-codebase
description: Deep codebase analysis with parallel agents. Produces 7 structured documents covering stack, architecture, conventions, testing, integrations, and concerns. Use before major refactoring, milestone planning, or team onboarding.
argument-hint: "[optional: focus area e.g. 'auth' or 'api']"
---

# Map Codebase: {{ args[0] | default: "full analysis" }}

You are performing a **deep codebase analysis** using parallel mapper agents. This produces structured documentation that feeds into GSD planning and execution.

---

## When to Use This vs /spartan:brownfield

| Command | Purpose | Output | Depth |
|---------|---------|--------|-------|
| `/spartan:brownfield` | Quick onboarding overview | 1 file: CONTEXT-MAP.md | Surface-level, 10 min |
| `/spartan:map-codebase` | Deep technical analysis | 7 files in .planning/codebase/ | Thorough, 4 parallel agents |

**Use brownfield** when joining a project for the first time and need a quick overview.
**Use map-codebase** when preparing for major work: refactoring, new milestone, architecture review, or team onboarding docs.

---

## What Gets Produced

7 documents in `.planning/codebase/`:

| Document | Focus | What It Captures |
|----------|-------|-----------------|
| `STACK.md` | Tech | Languages, frameworks, dependencies, build tools, runtime |
| `INTEGRATIONS.md` | Tech | External APIs, databases, auth providers, webhooks, env vars |
| `ARCHITECTURE.md` | Architecture | Patterns, layers, data flow, entry points, error handling |
| `STRUCTURE.md` | Architecture | Directory layout, key file locations, where to add new code |
| `CONVENTIONS.md` | Quality | Code style, naming patterns, import organization, formatting |
| `TESTING.md` | Quality | Test framework, patterns, coverage, mocking, fixtures |
| `CONCERNS.md` | Concerns | Tech debt, known bugs, security risks, fragile areas, scaling limits |

All documents include **file paths in backticks** so Claude can navigate directly to relevant code during planning and execution.

---

## Execution

### Agent Teams boost (if enabled)

```bash
echo "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-not_set}"
```

**If Agent Teams is enabled**, use a coordinated mapping team instead of independent subagents:

1. Use `TeamCreate` with name `map-{project-slug}`
2. Create 4 tasks — one per domain (tech, architecture, quality, concerns)
3. Spawn 4 agents in parallel:
   - **tech-mapper** — STACK.md + INTEGRATIONS.md
   - **arch-mapper** — ARCHITECTURE.md + STRUCTURE.md
   - **quality-mapper** — CONVENTIONS.md + TESTING.md
   - **concerns-mapper** — CONCERNS.md
4. Agents can message each other if they find cross-cutting issues (e.g., tech mapper finds a security concern → messages concerns-mapper)
5. After all complete, verify 7 documents exist and are non-empty
6. Clean up team with `TeamDelete`

**If Agent Teams is NOT enabled**, delegate to GSD:

**Run this command now:**

```
/gsd:map-codebase {{ args[0] }}
```

GSD will:
1. Check for existing maps in `.planning/codebase/` (offer refresh/skip if found)
2. Spawn 4 parallel mapper agents (tech, arch, quality, concerns)
3. Each agent writes documents directly to `.planning/codebase/`
4. Verify all 7 documents exist and are non-empty
5. Scan for accidentally leaked secrets
6. Commit results

---

## After Mapping

Once mapping is complete, suggest next steps based on context:

- **Starting a new project?** → `/spartan:project new` (map feeds into roadmap creation)
- **Planning a phase?** → `/spartan:phase plan N` (agents read codebase docs automatically)
- **Major refactoring?** → `/spartan:spec "refactor description"` → `/spartan:build` (informed by CONCERNS.md)
- **Team onboarding?** → Share `.planning/codebase/` docs with new team members

The codebase map is consumed automatically by GSD planning and execution agents — no manual wiring needed.
