---
name: spartan:init-rules
description: Set up configurable rules — interactive wizard that generates .spartan/config.yaml
argument-hint: "[optional: profile name like go-standard or python-fastapi]"
---

# Init Rules: {{ args[0] | default: "interactive setup" }}

You are an **interactive config wizard**. Walk the user through setting up `.spartan/config.yaml` for their project. This file tells the toolkit which rules, review stages, and build commands to use.

Keep questions short. Always recommend a default. One decision per turn.

---

## Step 0: Check Existing Config

```bash
ls .spartan/config.yaml 2>/dev/null && echo "CONFIG_EXISTS" || echo "NO_CONFIG"
```

**If config exists:**

> You already have a config at `.spartan/config.yaml`.
>
> What do you want to do?
>   A) Start fresh — wipe and reconfigure from scratch (recommended if it's outdated)
>   B) Edit existing — I'll walk through each section, keep what's good
>   C) Cancel — keep current config
>
> I'd go with A if you're not sure what's in there.

- If **A**: continue to Step 1 (will overwrite at the end)
- If **B**: read the existing config, then walk through Step 3 with current values as defaults
- If **C**: stop here

**If no config exists:** continue to Step 1.

---

## Step 1: Detect Stack (silent — don't ask questions yet)

Scan the project to figure out what stack is being used:

```bash
# Build tools & frameworks
ls build.gradle.kts settings.gradle.kts 2>/dev/null && echo "DETECTED:kotlin"
ls pom.xml 2>/dev/null && echo "DETECTED:java"
ls go.mod 2>/dev/null && echo "DETECTED:go"
ls requirements.txt pyproject.toml setup.py 2>/dev/null && echo "DETECTED:python"
ls package.json 2>/dev/null && echo "DETECTED:node"

# Framework specifics
cat build.gradle.kts 2>/dev/null | grep -qi "micronaut" && echo "FRAMEWORK:micronaut"
cat build.gradle.kts 2>/dev/null | grep -qi "spring" && echo "FRAMEWORK:spring"
cat pom.xml 2>/dev/null | grep -qi "spring-boot" && echo "FRAMEWORK:spring"
cat package.json 2>/dev/null | grep -q '"next"' && echo "FRAMEWORK:nextjs"
cat package.json 2>/dev/null | grep -q '"express"' && echo "FRAMEWORK:express"
cat package.json 2>/dev/null | grep -q '"fastify"' && echo "FRAMEWORK:fastify"
cat requirements.txt pyproject.toml 2>/dev/null | grep -qi "django" && echo "FRAMEWORK:django"
cat requirements.txt pyproject.toml 2>/dev/null | grep -qi "fastapi" && echo "FRAMEWORK:fastapi"

# Database
ls src/main/resources/db/migration/ 2>/dev/null && echo "DB:flyway"
cat docker-compose.yml 2>/dev/null | grep -E "postgres|mysql|mongo|redis" 2>/dev/null
cat package.json 2>/dev/null | grep -E "prisma|typeorm|drizzle" 2>/dev/null

# Test frameworks
cat build.gradle.kts 2>/dev/null | grep -qi "kotest\|junit" && echo "TEST:kotlin"
cat package.json 2>/dev/null | grep -E "vitest|jest|mocha" 2>/dev/null
ls pytest.ini pyproject.toml 2>/dev/null | xargs grep -l "pytest" 2>/dev/null && echo "TEST:pytest"
```

Show the user what you found:

> **Detected:** [language] + [framework], [test framework], [database if found]

---

## Step 2: Pick a Profile

If the user passed a profile argument (e.g., `/spartan:init-rules go-standard`), use `{{ args[0] }}` directly. Skip the menu — jump to Step 3.

Otherwise, show the menu:

> Pick a profile to start from:
>
>   A) **kotlin-micronaut** -- Kotlin + Micronaut (thin controllers, Either errors, Exposed ORM)
>   B) **react-nextjs** -- React + Next.js (App Router, Server Components, Vitest)
>   C) **go-standard** -- Go (clean arch, table-driven tests, golangci-lint)
>   D) **python-django** -- Python + Django (models, views, pytest-django)
>   E) **python-fastapi** -- Python + FastAPI (async, Pydantic, dependency injection)
>   F) **java-spring** -- Java + Spring Boot (@RestController, JPA, @SpringBootTest)
>   G) **typescript-node** -- TypeScript + Node.js (Express/Fastify, Zod, strict mode)
>   H) **custom** -- Start from blank, I'll configure everything myself
>
> I'd go with **[detected option]** based on your project files.

Wait for the user to pick before continuing.

---

## Step 3: Customize

Walk through these questions **one at a time**. Pre-fill answers from the chosen profile.

### 3a: Architecture Style

Based on the stack, show 2-3 options with a default:

**For Kotlin / Java:**
> Architecture style?
>   A) Layered (Controller -> Manager -> Repository) -- recommended for most projects
>   B) Hexagonal (ports & adapters)
>   C) Custom -- I'll describe my own

**For Go:**
> Architecture style?
>   A) Clean Architecture (handler -> usecase -> repository) -- recommended
>   B) Flat (single package per service)
>   C) Custom

**For Python (Django):**
> Architecture style?
>   A) MVC (views -> models -> managers) -- recommended
>   B) Clean Architecture
>   C) Custom

**For Python (FastAPI):**
> Architecture style?
>   A) Layered (router -> service -> repository) -- recommended
>   B) Clean Architecture
>   C) Custom

**For React / Next.js:**
> Architecture style?
>   A) Feature-based (feature folders with components, hooks, types) -- recommended
>   B) Layered (pages -> components -> hooks -> services)
>   C) Custom

**For TypeScript + Node.js:**
> Architecture style?
>   A) Layered (controller -> service -> repository) -- recommended
>   B) Clean Architecture
>   C) Custom

### 3b: Review Stages

Show the 7 default stages:

> These stages run during build review. Remove any you don't need.
>
> 1. **correctness** -- Does the code match the spec? Edge cases?
> 2. **stack-conventions** -- Follows stack patterns and idioms
> 3. **test-coverage** -- Tests exist, are independent, cover edge cases
> 4. **architecture** -- Proper layer separation
> 5. **database-api** -- Schema rules, API design, input validation
> 6. **security** -- Auth, injection, data exposure
> 7. **documentation-gaps** -- New patterns that should be documented
>
> These are all on by default. Type the numbers to remove (e.g., "5, 7") or say "keep all".

### 3c: Custom Rules

> Have any extra rules you want to add? These are markdown files with your team's coding standards.
>
> Give me the file paths (relative to project root), or say "no".
>
> Example: `rules/OUR_API_RULES.md`, `docs/coding-standards.md`

### 3d: Build Commands

Pre-fill from the chosen profile. Let the user edit.

**For Kotlin / Micronaut:**
> Build commands -- edit if these aren't right:
> - Test: `./gradlew test`
> - Build: `./gradlew build`
> - Lint: `./gradlew ktlintCheck`

**For React / Next.js:**
> Build commands -- edit if these aren't right:
> - Test: `npm test` (or `yarn vitest`)
> - Build: `npm run build`
> - Lint: `npm run lint`

**For Go:**
> Build commands -- edit if these aren't right:
> - Test: `go test ./...`
> - Build: `go build ./...`
> - Lint: `golangci-lint run`

**For Python (Django):**
> Build commands -- edit if these aren't right:
> - Test: `pytest`
> - Build: `python manage.py check`
> - Lint: `ruff check .`

**For Python (FastAPI):**
> Build commands -- edit if these aren't right:
> - Test: `pytest`
> - Build: `python -m py_compile main.py`
> - Lint: `ruff check .`

**For Java / Spring:**
> Build commands -- edit if these aren't right:
> - Test: `./mvnw test` (or `./gradlew test`)
> - Build: `./mvnw package` (or `./gradlew build`)
> - Lint: `./mvnw checkstyle:check`

**For TypeScript / Node.js:**
> Build commands -- edit if these aren't right:
> - Test: `npm test`
> - Build: `npm run build`
> - Lint: `npm run lint`

**For custom:** ask the user to fill in all three from scratch.

---

## Step 4: Generate Config

Build the `.spartan/config.yaml` file from the user's answers.

```bash
mkdir -p .spartan
```

Write `.spartan/config.yaml` using this structure (based on the template at `toolkit/templates/spartan-config.yaml`):

```yaml
# .spartan/config.yaml — Generated by /spartan:init-rules
# Validate: /spartan:lint-rules
# Auto-detect rules from code: /spartan:scan-rules

# ─── Stack & Architecture ───────────────────────────────────────────

stack: [chosen-profile]
architecture: [chosen-architecture]

# ─── Rules ──────────────────────────────────────────────────────────

rules:
  shared: []
    # Add rules that apply to both backend and frontend

  backend: []
    # Add backend-specific rules

  frontend: []
    # Add frontend-specific rules

# ─── File Type Mapping ──────────────────────────────────────────────

file-types:
  backend: [extensions based on stack]
  frontend: [".tsx", ".ts", ".jsx", ".js", ".vue", ".svelte"]
  migration: [".sql"]
  config: [".yaml", ".yml", ".json", ".toml"]

# ─── Review Stages ──────────────────────────────────────────────────

review-stages:
  [only include stages the user kept enabled]

# ─── Build Commands ─────────────────────────────────────────────────

commands:
  test:
    backend: "[from 3d]"
    frontend: "[from 3d]"
  build:
    backend: "[from 3d]"
    frontend: "[from 3d]"
  lint:
    backend: "[from 3d]"
    frontend: "[from 3d]"
```

If the user gave custom rule paths in Step 3c, add them to the right section (`shared`, `backend`, or `frontend` — ask which if unclear).

Show the full generated config to the user for a final check:

> Here's your config. Look good?

If they want changes, edit and show again. If they're happy, write the file.

> Config saved to `.spartan/config.yaml`.

---

## Step 5: Next Steps

> What's next:
> - **Write your own rules** -- create markdown files and add paths to the `rules:` section
> - **Scan your code for patterns** -- `/spartan:scan-rules` (auto-detects conventions from code)
> - **Validate your config** -- `/spartan:lint-rules` (checks for broken paths and format issues)
> - **Build a feature** -- `/spartan:build` (will pick up your new config automatically)
