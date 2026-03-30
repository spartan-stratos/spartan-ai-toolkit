---
name: spartan:pr-ready
description: Full pre-PR workflow — rebase onto main, run all checks (tests, conventions, security), generate PR description, and create the GitHub PR. Run when a feature/fix is complete.
argument-hint: "[optional: PR title]"
---

# PR Ready: {{ args[0] | default: "current branch" }}

Full workflow: rebase → checks → push → create PR.
Fix ALL blockers before proceeding to the next step.

---

## Step 1: Current State

```bash
git branch --show-current
git status
git log main...HEAD --oneline
git diff main...HEAD --shortstat
```

If uncommitted changes exist → commit or stash before continuing.

---

## Step 2: Rebase onto Main

```bash
# Fetch latest and detect default branch
git fetch origin
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
[ -z "$DEFAULT_BRANCH" ] && DEFAULT_BRANCH=$(git rev-parse --verify origin/master >/dev/null 2>&1 && echo master || echo main)

# See what's new on the default branch
git log HEAD..origin/$DEFAULT_BRANCH --oneline
```

If the default branch has new commits:
```bash
git rebase origin/$DEFAULT_BRANCH
```

**Conflict resolution:**
1. Find conflict markers `<<<<<<<` / `=======` / `>>>>>>>`
2. Resolve each file — keep the correct version
3. `git add [file]` → `git rebase --continue`
4. Repeat until done

Abort if needed: `git rebase --abort`

Verify after rebase:
```bash
git log main...HEAD --oneline    # commits look correct?
git diff main...HEAD --stat      # changes still intact?
```

---

## Step 3: Tests (hard blocker)

```bash
# Kotlin BE
./gradlew clean test
./gradlew integrationTest 2>/dev/null

# Next.js FE
npm run test:run 2>/dev/null
```

**Any failure = stop. Fix tests before continuing.**

---

## Step 4: Code Quality

```bash
./gradlew ktlintCheck 2>/dev/null
./gradlew detekt 2>/dev/null
./gradlew compileKotlin 2>&1 | grep -i "warning"
```

Check the diff for:
- [ ] No `!!` operator (null safety violation)
- [ ] No `println` — use SLF4J
- [ ] No hardcoded values (URLs, secrets, magic numbers)
- [ ] No commented-out code
- [ ] No TODOs without ticket reference

---

## Step 5: Architecture Check

```bash
# Verify layered architecture (Controller → Manager → Repository)
# Controllers should only call Managers
grep -r "Repository\|Service" src/main/kotlin/*/controller/ --include="*.kt" | grep -v "import"
```

- [ ] Controllers are thin — delegate to Manager only
- [ ] `@Secured` annotation on all controllers
- [ ] `@ExecuteOn(TaskExecutors.BLOCKING)` on blocking endpoints
- [ ] Manager returns `Either<ClientException, T>`, not raw types
- [ ] No business logic in controllers or repositories
- [ ] Query parameters only — no path parameters (API_RULES)

---

## Step 6: DB & Security

```bash
# Migration order correct?
ls src/main/resources/db/migration/ | sort | tail -5
./gradlew flywayValidate 2>/dev/null

# Accidental secrets?
git diff main...HEAD | grep -iE "(password|secret|api_key|token)\s*=" \
  | grep -v "test\|mock\|example\|placeholder\|your-"
```

- [ ] Flyway migration version number is next in sequence
- [ ] Migration is backward-compatible
- [ ] No secrets committed

---

## Step 7: Generate PR Description

From `git log main...HEAD` and `git diff`, write:

```markdown
## Summary
[2-3 sentences: what and why]

## Changes
- [change 1]
- [change 2]
- [change 3]

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing: [describe if any]

## DB Changes
[None / Migration V{N}__desc — backward compatible]

## Breaking Changes
[None / describe]

## Related
- Ticket: [if applicable]
```

---

## Step 8: Push & Create PR

```bash
# Push (force-with-lease is safe after rebase — won't overwrite others' work)
git push origin HEAD --force-with-lease
```

**Create PR with GitHub CLI (if installed):**
```bash
gh pr create \
  --title "{{ args[0] | default: "type(scope): description" }}" \
  --body "[PR description from Step 7]" \
  --base main \
  --draft
```

Creates as **draft** — review on GitHub, then mark "Ready for review" when satisfied.

**If `gh` not installed:**
```bash
# Get remote URL to open in browser
git remote get-url origin
```
Go to GitHub → compare & pull request → paste description from Step 7.

Install `gh` CLI for next time: `brew install gh && gh auth login`

---

## Final Verdict

**✅ PR CREATED** — link above. Review on GitHub and mark ready when satisfied.

**❌ BLOCKERS:**
```
[file:line — what to fix]
```
Fix → re-run `/spartan:pr-ready`.

---

## Rebase Rules (Spartan Convention)

- Always rebase **feature/fix branches** onto `main` before PR
- Never rebase `main`, `develop`, or any shared branch
- `--force-with-lease` instead of `--force` — safer, won't overwrite teammates' pushes
