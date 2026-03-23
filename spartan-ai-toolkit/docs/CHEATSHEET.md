# Spartan AI Toolkit — Cheatsheet

> Print this and pin it next to your monitor. Glance for 5 seconds, know what to type.

---

## Rule #1: Command or Chat?

```
What do you need?
│
├─ Structured workflow (multi-step, checklist, scaffold) → Use /spartan:command
│
└─ Everything else (ask, explain, small code < 30 min) → Just talk to Claude
```

**Not sure which command?** → Type `/spartan` — it asks what you need and routes.

---

## 3 Journeys

### 🟢 Journey A: New Project (no code yet)

```
/spartan:init-project     ← Generate CLAUDE.md for project
       ↓
/spartan:kotlin-service   ← Scaffold BE (or /spartan:next-app for FE)
       ↓
/spartan:gsd-upgrade      ← Setup agent memory + wave execution
       ↓
/spartan:project new      ← If project > 3 days
       ↓
  [Daily task cycle]
```

### 🔵 Journey B: Existing Project (has code)

```
/spartan:brownfield       ← Map codebase before touching it
       ↓
/spartan:init-project     ← Generate CLAUDE.md from code scan
       ↓
  [Daily task cycle]
```

### 🟡 Journey C: Daily Tasks (daily loop)

```
/spartan:daily                  ← Standup: what's done, what's next
       ↓
/spartan:quickplan "task"       ← Spec + plan + branch (task < 1 day)
       ↓                          Or /spartan:phase execute N (large project)
  [Code — Claude auto-triggers Superpowers: TDD, debug, review]
       ↓
/spartan:pr-ready               ← Checklist + create PR
       ↓
/spartan:deploy [svc] [target]  ← Deploy + verify
```

---

## Top 5 Most Used Commands

| # | Command | When |
|---|---|---|
| 1 | `/spartan:quickplan "task"` | Starting any task < 1 day |
| 2 | `/spartan:pr-ready` | Before creating any PR (never skip) |
| 3 | `/spartan:debug "symptom"` | Bug with unclear root cause |
| 4 | `/spartan:context-save` | Claude getting slow/confused → save + new session |
| 5 | `/spartan` | Not sure what to use → smart router |

---

## When You DON'T Need a Command

- "Explain how X works" → Just ask Claude directly
- "Fix typo on line 42" → Claude fixes it, no command needed
- "Add a field to the DTO" → Claude does it, no `/spartan:quickplan`
- "Review this code" → Paste code, Claude auto-triggers Superpowers review
- Brainstorming ideas → Just have a normal conversation

**Rule of thumb:** If the task takes < 30 min and < 3 files → no command needed.

---

## Context Window (auto-managed)

```
Claude self-manages context:
│
├─ Getting heavy (forgetting, slow) → Claude auto-compacts
│
├─ Already compacted but still heavy → Claude auto-saves + asks for new session
│
└─ You can also trigger manually:
   /spartan:context-save             → Save + new session anytime
```

Claude always notifies you — it never silently degrades quality.

---

## Auto Mode

```
"auto on"   → Claude runs straight through, no confirmations. Max velocity.
"auto off"  → Claude asks for confirmation each step. Default.
"stop"      → Stop immediately mid-execution (both auto and manual).
```

Auto mode skips confirmations but STILL STOPS when: careful mode active, git force push, drop table, delete files.

---

## Safety Guardrails

```
/spartan:careful          → Warn before any destructive operation (rm -rf, DROP, force-push)
/spartan:freeze <dir>     → Lock edits to one directory only
/spartan:guard <dir>      → Careful + Freeze together. Maximum safety.
/spartan:unfreeze         → Remove directory lock
```

**When to use:**
- Database migration → `/spartan:guard db/migration/`
- Production hotfix → `/spartan:guard src/main/kotlin/.../hotfix-module/`
- Debugging one module → `/spartan:freeze src/main/kotlin/.../auth/`

**Careful mode overrides auto mode.** Destructive actions always require confirmation.

---

## Office Hours (GSD)

When running `/spartan:phase discuss N`, Claude MUST ask 3 questions first:

1. "What pain are we actually solving?"
2. "What's the narrowest version we can ship to learn?"
3. "What assumption are we making that could be wrong?"

Cannot be skipped — not even in auto mode.

---

## Quick Reference — All Commands

| Phase | Command | Description |
|---|---|---|
| **Start** | `/spartan` | Smart router — asks what you need, routes |
| **Start** | `/spartan:project [action]` | Large project: `new`, `status`, `milestone-new`, `milestone-complete`, `milestone-summary`, `manager` |
| **Start** | `/spartan:phase [action] [N]` | Phase: `discuss`, `plan`, `execute`, `verify` |
| **Start** | `/spartan:init-project` | Scan code → generate CLAUDE.md |
| **Start** | `/spartan:brownfield` | Map unfamiliar codebase before touching |
| **Start** | `/spartan:gsd-upgrade` | Upgrade GSD v5 (memory + waves) |
| **Start** | `/spartan:workstreams` | Parallel workstreams: list, create, switch, progress, complete |
| **Start** | `/spartan:forensics` | Post-mortem investigation for failed workflows |
| **Build** | `/spartan:quickplan` | Spec + plan + branch (< 1 day) |
| **Build** | `/spartan:debug` | 4-phase root cause investigation |
| **Build** | `/spartan:figma-to-code` | Figma MCP → production React |
| **Build** | `/spartan:migration` | Create Flyway migration |
| **Ship** | `/spartan:pr-ready` | Pre-PR checklist + create PR |
| **Ship** | `/spartan:review` | PR review Kotlin/Micronaut conventions |
| **Ship** | `/spartan:fe-review` | PR review Next.js conventions |
| **Ship** | `/spartan:deploy` | Deploy + verify |
| **Setup** | `/spartan:kotlin-service` | Scaffold Micronaut service |
| **Setup** | `/spartan:next-app` | Scaffold Next.js app |
| **Setup** | `/spartan:next-feature` | Add feature to Next.js app |
| **Setup** | `/spartan:e2e` | Setup Playwright E2E |
| **Setup** | `/spartan:testcontainer` | Setup Testcontainers |
| **Ops** | `/spartan:daily` | Standup summary |
| **Ops** | `/spartan:env-setup` | Audit env vars |
| **Ops** | `/spartan:context-save` | Save session → resume later |
| **Safety** | `/spartan:careful` | Warn before destructive ops |
| **Safety** | `/spartan:freeze <dir>` | Lock edits to one directory |
| **Safety** | `/spartan:unfreeze` | Remove directory lock |
| **Safety** | `/spartan:guard <dir>` | Careful + freeze combined |
