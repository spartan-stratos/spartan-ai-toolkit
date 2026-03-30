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

**If Agent Teams is enabled**, use a coordinated mapping team (NOT sub-agents):

```
TeamCreate(team_name: "map-{project-slug}", description: "Deep codebase analysis")

TaskCreate(subject: "Map tech stack + integrations", description: "Write STACK.md + INTEGRATIONS.md to .planning/codebase/")
TaskCreate(subject: "Map architecture + structure", description: "Write ARCHITECTURE.md + STRUCTURE.md to .planning/codebase/")
TaskCreate(subject: "Map conventions + testing", description: "Write CONVENTIONS.md + TESTING.md to .planning/codebase/")
TaskCreate(subject: "Map concerns", description: "Write CONCERNS.md to .planning/codebase/")

Agent(
  team_name: "map-{project-slug}",
  name: "tech-mapper",
  subagent_type: "Explore",
  prompt: "Write STACK.md and INTEGRATIONS.md to .planning/codebase/.
    Include file paths in backticks. Check TaskList, claim your task.
    If you find security concerns, message concerns-mapper via SendMessage."
)

Agent(
  team_name: "map-{project-slug}",
  name: "arch-mapper",
  subagent_type: "Explore",
  prompt: "Write ARCHITECTURE.md and STRUCTURE.md to .planning/codebase/.
    Trace data flow end-to-end. Check TaskList, claim your task."
)

Agent(
  team_name: "map-{project-slug}",
  name: "quality-mapper",
  subagent_type: "Explore",
  prompt: "Write CONVENTIONS.md and TESTING.md to .planning/codebase/.
    Find patterns, code style, test coverage. Check TaskList, claim your task."
)

Agent(
  team_name: "map-{project-slug}",
  name: "concerns-mapper",
  subagent_type: "Explore",
  prompt: "Write CONCERNS.md to .planning/codebase/.
    Find tech debt, bugs, security risks, fragile areas. Check TaskList, claim your task."
)
```

After all teammates complete, verify 7 documents exist and are non-empty, then `TeamDelete()`.

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
