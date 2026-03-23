# Spartan AI Toolkit — Engineering Manager Workflow

## Why Spartan?

Spartan commands are **pre-built, high-quality prompts** for workflows where free-form chat leads to missed steps. They don't replace Claude — they make Claude more reliable for structured work.

Without Spartan: "Create a PR" → Claude pushes code. Forgets to rebase, skips tests, no PR description.
With `/spartan:pr-ready`: 6-step checklist — rebase, tests, lint, architecture check, security scan, PR description generated. Devs usually forget 3 of these.

**When commands add value:** Structured workflows with multiple steps, checklists, or scaffolding that must follow specific conventions.
**When commands don't add value:** Questions, explanations, small code changes, brainstorming — just talk to Claude.

---

## Command or Chat? (Decision Rule)

```
What do you need?
│
├─ Question / explanation / brainstorm → Just ask Claude
├─ Small code change (< 30 min, ≤ 3 files) → Just ask Claude (Superpowers handles TDD/review)
├─ Structured workflow with checklist → Use a /spartan: command
└─ Don't know which command → Type /spartan (smart router asks what you need)
```

**Superpowers is always active.** When you say "review this" or "debug this" in normal chat, Claude auto-triggers the right skill. You don't need a command for that.

**Commands are for when the workflow matters more than the answer** — deploying, creating PRs, scaffolding new services, planning multi-day work.

---

## 3 Journeys

### Journey A: New Project (no code yet)

```
/spartan:init-project [name]        ← Generate CLAUDE.md for the project
       ↓
/spartan:kotlin-service [name]      ← Scaffold BE
  or /spartan:next-app [name]       ← Scaffold FE
       ↓
/spartan:gsd-upgrade fresh          ← Setup .memory/ + wave execution
       ↓
/spartan:project new                ← If project > 3 days: full lifecycle
       ↓
  [→ Daily tasks]
```

### Journey B: Existing Project (has code already)

```
/spartan:brownfield [service]       ← Map codebase before touching it
       ↓
/spartan:init-project               ← Generate CLAUDE.md from code scan
       ↓
/spartan:gsd-upgrade migrate        ← If you want agent memory
       ↓
  [→ Daily tasks]
```

### Journey C: Daily Tasks (daily loop — most used)

```
/spartan:daily                      ← Standup summary
       ↓
/spartan:quickplan "task"           ← Spec + plan + branch (task < 1 day)
  or /spartan:phase execute N        ← If inside large project
       ↓
  [Code — Superpowers auto-triggers TDD, debug, review]
       ↓
/spartan:pr-ready                   ← Checklist + create PR
       ↓
/spartan:deploy [svc] [target]      ← Deploy + verify
```

---

## Task Size → Tool Routing

| Size | Use |
|---|---|
| < 30 min, ≤ 3 files | Just ask Claude (no command needed) |
| < 1 day | `/spartan:quickplan` |
| 1–3 days | `/spartan:project new` (lightweight lifecycle) |
| > 3 days, multi-session | `/spartan:project new` (full lifecycle) |

---

## Tech Stack

**Backend:** Kotlin + Micronaut — coroutines, Either error handling, Exposed ORM
**Frontend:** React / Next.js / TypeScript (App Router) — Vitest + Testing Library, Tailwind CSS
**Infrastructure:** Docker, Kubernetes, Terraform
**Platforms:** Railway (staging) · AWS (production) · GCP (secondary)
**CI/CD:** GitHub Actions

### Company Rules & Skills (synced across all projects)

Rules in `rules/project/` enforce coding standards — Claude MUST follow them:
- `CORE_RULES.md` — Kotlin null safety (`!!` banned), Either error handling, controller patterns
- `ARCHITECTURE_RULES.md` — Layered architecture: Controller → Manager → Service/Repository
- `API_RULES.md` — RPC-style API design, query params only (no path params), testing
- `DATABASE_RULES.md` — No foreign keys, TEXT not VARCHAR, soft deletes, `uuid_generate_v4()`, partial indexes
- `FRONTEND_RULES.md` — Build check before commit, cleanup imports, API response null safety
- `CONTROLLER_TEST_STANDARDS.md` — `@MicronautTest` patterns, AbstractControllerTest, Retrofit clients
- `NAMING_CONVENTIONS.md` — snake_case DB/JSON, camelCase Kotlin/TypeScript, Jackson SNAKE_CASE config
- `RETROFIT_CLIENT_PLACEMENT.md` — Never place Retrofit interfaces in kapt-enabled modules
- `TRANSACTION_RULES.md` — Multi-table operations MUST use `transaction(db.primary) {}`

Skills in `skills/` are Claude Code slash commands for common tasks:
- `/api-endpoint-creator` — Generate full Controller → Manager → Repository stack
- `/database-table-creator` — SQL migration → Exposed Table → Entity → Repository → Tests
- `/backend-api-design` — RPC-style API design reference
- `/database-patterns` — Schema design, migrations, Exposed ORM patterns
- `/kotlin-best-practices` — Null safety, Either, coroutines quick reference
- `/testing-strategies` — Integration test patterns for Micronaut
- `/security-checklist` — Auth, validation, OWASP prevention
- `/ui-ux-pro-max` — Design system with 67 styles, 96 palettes, 13 stacks

Agents in `agents/` provide specialized expert guidance:
- `micronaut-backend-expert` — Deep Micronaut framework expertise, DB design, API architecture
- `solution-architect-cto` — Strategic tech decisions, system design, scalability planning

---

## Core Principles (Always Enforce)

### 1. Spec Before Code
- Task < 1 day → `/spartan:quickplan` for fast spec + plan
- Task > 1 day → `/spartan:project new` or `/spartan:project milestone-new`
- Never write production code without a written spec or plan

### 2. TDD is Non-Negotiable
- Red → Green → Refactor, always
- Kotlin: `@MicronautTest` integration tests are mandatory for every endpoint (see `/testing-strategies` skill)
- Next.js: Vitest + Testing Library

### 3. Atomic Commits
Each commit = one task, tests passing:
```
type(scope): what changed

- why / detail
```
Types: `feat` · `fix` · `test` · `refactor` · `chore` · `docs`

### 4. Context Hygiene (Auto-Managed)
Claude proactively manages its own context window:
- When detecting context pressure (slow responses, forgetting earlier context, long conversation) → auto-run `/compact` to summarize and free space
- If compaction isn't enough → auto-save critical state to `.handoff/` and `.memory/`, then tell user to start a fresh session
- User can also manually trigger `/spartan:context-save` at any time
- Session > 60% → hard stop, no exceptions
- State is in `.planning/` (GSD), `.memory/` (permanent), or `.handoff/` (session), never in chat history

**Self-monitoring signals** (Claude watches for these in its own behavior):
- Starting to lose track of earlier decisions → compact NOW
- Repeating questions already answered → compact NOW
- Response quality dropping → warn user + compact
- Multi-step command taking unusually long → consider compacting between steps

### 5. Auto Mode
When user says **"auto on"** or **"auto mode"**, all Spartan commands skip confirmation prompts and execute straight through. Claude will:
- Show the spec/plan/output but NOT pause to ask "does this match?" or "shall I proceed?"
- Continue to the next step automatically after each step completes
- Still STOP for destructive actions (git force push, dropping tables, deleting files)
- Still SHOW output at each step (user can interrupt with "stop" or "wait")

Turn off with **"auto off"**. Default is **auto off** (commands ask for confirmation).

Auto mode is ideal for experienced users who trust the workflow and want maximum velocity.

### 6. Safety Guardrails
Three levels of protection, activated on-demand:

| Command | What it does |
|---|---|
| `/spartan:careful` | Warn + require confirm before destructive ops (rm -rf, DROP TABLE, force-push, etc.) |
| `/spartan:freeze <dir>` | Lock file edits to ONE directory only (+ its test directory) |
| `/spartan:guard <dir>` | Both careful + freeze at once. Maximum safety for production work. |

**Careful mode overrides auto mode.** Even in auto mode, destructive operations always require "I confirm".

**Freeze prevents scope creep.** Claude won't "helpfully" fix files outside your focus area.

Deactivate: `/spartan:careful off`, `/spartan:unfreeze`, or `/spartan:guard off`.

### 7. Office Hours (GSD Discuss Phase)
When running `/spartan:phase discuss N`, Claude MUST ask these 3 forcing questions BEFORE gathering requirements:

1. **"What pain are we actually solving?"** (not the feature — the underlying pain)
2. **"What's the narrowest version we can ship to learn?"** (force MVP thinking)
3. **"What assumption are we making that could be wrong?"** (surface hidden risks)

Only after user answers all 3 → proceed to normal requirement gathering.
**Auto mode on?** → Still ask these 3 questions. They exist to prevent building the wrong thing — skipping them defeats the purpose.

---

## All Spartan Commands (grouped by journey phase)

### Start (project setup, one-time)
| Command | Purpose |
|---|---|
| `/spartan` | **Smart router** — asks what you need, routes to right command |
| `/spartan:project [action]` | Manage large projects: `new`, `status`, `milestone-new`, `milestone-complete`, `milestone-summary`, `manager` |
| `/spartan:phase [action] [N]` | Manage phases: `discuss`, `plan`, `execute`, `verify` |
| `/spartan:init-project [name]` | Auto-generate project CLAUDE.md from codebase scan |
| `/spartan:brownfield [svc]` | Map existing codebase; generates CONTEXT-MAP.md |
| `/spartan:kotlin-service [name]` | Scaffold Micronaut microservice |
| `/spartan:next-app [name]` | Scaffold Next.js app (App Router, Vitest, Docker, CI) |
| `/spartan:gsd-upgrade [mode]` | Upgrade GSD to v5 (decompose + memory + waves) |
| `/spartan:workstreams [action]` | Parallel workstreams: `list`, `create`, `switch`, `status`, `progress`, `complete`, `resume` |
| `/spartan:forensics "problem"` | Post-mortem investigation — diagnose failed workflows |

### Build (daily task work)
| Command | Purpose |
|---|---|
| `/spartan:quickplan "task"` | Spec + plan + branch in one shot (< 1 day tasks) |
| `/spartan:next-feature [name]` | Add feature to existing Next.js app |
| `/spartan:debug "symptom"` | 4-phase root-cause investigation + Debug Report |
| `/spartan:figma-to-code [url]` | Convert Figma screen to production code via MCP |
| `/spartan:migration "desc"` | Create versioned Flyway migration |

### Ship (review, PR, deploy)
| Command | Purpose |
|---|---|
| `/spartan:pr-ready` | Full pre-PR checklist + auto-generates PR description |
| `/spartan:review` | PR review with Kotlin/Micronaut conventions |
| `/spartan:fe-review` | PR review with Next.js App Router conventions |
| `/spartan:deploy [svc] [target]` | Deploy guide with pre-flight checks |

### Setup (integration & tooling, as-needed)
| Command | Purpose |
|---|---|
| `/spartan:e2e [feature]` | Scaffold Playwright E2E testing |
| `/spartan:testcontainer [type]` | Setup Testcontainers (postgres/kafka/redis) |
| `/spartan:env-setup [svc]` | Audit env vars, generate `.env.example` |

### Ops (daily routine, session management)
| Command | Purpose |
|---|---|
| `/spartan:daily` | Standup summary from git log + GSD status |
| `/spartan:context-save` | Smart context management: compact first, full save if needed |

### Safety (guardrails, on-demand)
| Command | Purpose |
|---|---|
| `/spartan:careful` | Warn + confirm before destructive ops (rm, DROP, force-push) |
| `/spartan:freeze <dir>` | Lock file edits to one directory only |
| `/spartan:unfreeze` | Remove directory lock |
| `/spartan:guard <dir>` | Careful + freeze combined. Maximum safety. |

---

## GSD v5 — Decompose + Agent Memory + Wave Execution

### Decompose Step
Complex requirements are broken into **work units (WUs)** before planning:
- Each WU: max 3 files, max half-day, one commit
- WUs are grouped into **waves** by dependency
- Wave 1 = no dependencies → can run in parallel Claude Code tabs
- Wave N+1 = depends on Wave N outputs

### Agent Memory (`.memory/`)
Persistent project knowledge that survives all sessions:
```
.memory/
  index.md            ← Quick reference to all knowledge
  decisions/          ← ADRs (architectural decision records)
  patterns/           ← Reusable code patterns discovered
  knowledge/          ← Domain facts, API gotchas, business rules
  blockers/           ← Known issues and workarounds
```
- **Always** check `.memory/index.md` at session start
- **Always** capture new decisions/patterns after significant work
- `/spartan:context-save` now also updates `.memory/`

### Wave Execution
```
Wave 1 (parallel): WU-1, WU-3, WU-5  ← no dependencies
  ── verify tests ──
Wave 2 (after 1):  WU-2, WU-4        ← depends on wave 1
  ── verify tests ──
Wave 3 (final):    WU-6              ← integration
```
Multi-tab: each Claude Code tab handles one WU from the same wave.

### Workstreams & Workspaces (new in GSD v1.28)

**Workstreams** (`/spartan:workstreams`) — run multiple milestones in parallel:
- `create <name>` — spin up an independent work track
- `switch <name>` — change active context between workstreams
- `progress` — see all workstreams' completion at a glance
- Useful when multiple features/initiatives need to move forward simultaneously

**Workspaces** — isolated repo copies for safe parallel work:
- Each workspace gets its own `.planning/` directory
- No interference between concurrent work tracks
- GSD manages workspace lifecycle automatically

**Forensics** (`/spartan:forensics`) — post-mortem for failed workflows:
- Analyzes git history, planning artifacts, and state
- Diagnoses what went wrong and why
- Read-only diagnostic tool — does not modify anything

**Milestone Summary** (`/spartan:project milestone-summary`) — generate onboarding doc:
- Comprehensive summary from completed milestone artifacts
- Share with team members joining mid-project

**Manager** (`/spartan:project manager`) — interactive command center:
- Dashboard view of all phases and their status
- Quick actions from one terminal for power users

### Project Lifecycle Commands (wraps GSD under the hood)
```
/spartan:project new               Create project → PROJECT.md → ROADMAP.md
/spartan:project status             Where are we? Current milestone/phase
/spartan:project milestone-new      Start next milestone
/spartan:project milestone-complete Archive milestone + git tag
/spartan:project milestone-summary  Generate onboarding doc from milestone
/spartan:project manager            Interactive command center for power users

/spartan:phase discuss N            Office Hours (3 questions) → decompose → requirements
/spartan:phase plan N               Generate wave-parallel execution plan
/spartan:phase execute N            Execute tasks wave by wave (TDD, safety)
/spartan:phase verify N             UAT + acceptance criteria + capture to .memory/

/spartan:workstreams [action]       Manage parallel workstreams (list/create/switch/complete)
/spartan:forensics "problem"        Post-mortem investigation for failed workflows
/spartan:quickplan "task"           Ad-hoc task < 1 day (no full lifecycle needed)
```

Users never need to type `/gsd:*` commands — the wrappers handle everything.

---

## Kotlin + Micronaut Conventions

> Full details: read `rules/project/CORE_RULES.md` and `rules/project/ARCHITECTURE_RULES.md`

```kotlin
// Error handling — Either, not exceptions (Arrow)
suspend fun findUser(id: UUID): Either<ClientException, UserResponse>

// !! is BANNED — use safe call + elvis
val email = token.email ?: return AuthError.INVALID_CREDENTIALS.asException().left()

// Layered architecture: Controller → Manager → Service/Repository
@Controller("/api/v1")
@Secured(SecurityRule.IS_AUTHENTICATED)
class UserController(private val userManager: UserManager) {
    @Get("/user")
    @ExecuteOn(TaskExecutors.BLOCKING)
    suspend fun getUser(@QueryValue id: UUID) = userManager.getUser(id)
}

// Manager = business logic (returns Either)
interface UserManager {
    suspend fun getUser(id: UUID): Either<ClientException, UserResponse>
}

// API design — query params only, no path params
// GET  /api/v1/users           (list)
// GET  /api/v1/user?id=xxx     (get one)
// POST /api/v1/user            (create)
// POST /api/v1/user/update     (update)
// POST /api/v1/user/delete     (soft delete)

// Database — Exposed ORM, TEXT not VARCHAR, soft deletes
object UsersTable : UUIDTable("users") {
    val name = text("name")
    val email = text("email")
    val deletedAt = timestamp("deleted_at").nullable()
    val createdAt = timestamp("created_at").defaultExpression(CurrentTimestamp)
    val updatedAt = timestamp("updated_at").defaultExpression(CurrentTimestamp)
}

// Package structure
com.spartan.{module}/
  controller/      # HTTP handling, validation, @Secured
  manager/         # Business logic, orchestration (interface + impl)
  service/         # External API calls
  repository/      # Database access (Exposed)
  model/           # Entities, DTOs, enums
```

---

## Next.js Conventions

```typescript
// Server Component by default — 'use client' only for:
// event handlers / useState / browser APIs

// Fetch data directly in Server Components
async function UsersPage() {
  const users = await ApiClient.get<UserDto[]>('/api/v1/users')
  return <UserList users={users} />
}

// Mutations via Server Actions
async function createUser(data: CreateUserInput) {
  'use server'
  await ApiClient.post('/api/v1/users', data)
  revalidatePath('/users')
}

// Types in _types/ must mirror Kotlin DTOs exactly
// TypeScript interface ↔ Kotlin data class (same field names)
```

---

## Infrastructure Conventions

**Kubernetes:** Always set resource limits + liveness/readiness probes for Micronaut services.

**Terraform:** `terraform plan` review required before every `apply`. No manual console changes.

**Railway** (`railway.toml`):
```toml
[build]
builder = "nixpacks"
[deploy]
startCommand = "java -jar build/libs/*-all.jar"
healthcheckPath = "/health"
healthcheckTimeout = 60
restartPolicyType = "on-failure"
```

**AWS (production):** ECS Fargate + RDS + Secrets Manager (never plain env vars for secrets).

---

## Git Branching

- `main` — production only, protected
- `develop` — integration branch
- `feature/{ticket}-{slug}` — new features
- `fix/{ticket}-{slug}` — bug fixes

GSD manages branch creation per phase automatically.

---

## Figma MCP Workflow

- **Budget:** One Figma screen per Claude Code session (~13k tokens per MCP response)
- **Workflow:** `/spartan:figma-to-code [url]` → extract tokens → generate components (TDD)
- **Config:** `claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp`
- **Auth:** Run `/mcp` inside Claude Code to authenticate
- **Multi-screen features:** Use `/spartan:context-save` between screens

---

## Stripe Conventions

- All amounts: `Long` (cents) — use `Money` value class
- Every Stripe mutation: idempotency key required
- Webhook signature: always verify with `Webhook.constructEvent()`
- Secret key: backend only, never in frontend, never in git
- Test card: `4242 4242 4242 4242`

---

## What NOT to Do
- Don't write code without a spec
- Don't skip tests — every endpoint needs `@MicronautTest` integration test
- Don't continue a session past 60% context
- Don't manually edit `.planning/` files — let GSD handle them
- Don't commit secrets or hardcoded credentials
- Don't use `!!` in Kotlin — banned, use safe call + elvis
- Don't use exceptions for business errors — use `Either<ClientException, T>`
- Don't use path parameters — query params only (see `rules/project/API_RULES.md`)
- Don't use VARCHAR — always TEXT (see `rules/project/DATABASE_RULES.md`)
- Don't use foreign keys — handle relationships at application level
- Don't use `'use client'` in Next.js unless truly interactive
- Don't make multiple Figma MCP calls per session (budget: 1 screen = ~13k tokens)
- Don't use `Double`/`Float` for money — always `Long` (cents)
- Don't force a command when a simple chat answer is enough
