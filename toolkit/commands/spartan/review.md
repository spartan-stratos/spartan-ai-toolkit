---
name: spartan:review
description: Perform a thorough PR review using your project's configured rules
argument-hint: "[optional: branch name or PR description]"
---

# Code Review: {{ args[0] | default: "current changes" }}

Perform a thorough review of the current changes. Use `git diff` to inspect all modified files.

---

## Step 0: Load rules

```bash
# 1. Check for project config
cat .spartan/config.yaml 2>/dev/null

# 2. If no config, scan for installed rules
ls rules/ .claude/rules/ ~/.claude/rules/ 2>/dev/null

# 3. Classify changed files
git diff main...HEAD --name-only
```

**If `.spartan/config.yaml` exists:**
- Read `rules.backend`, `rules.frontend`, `rules.shared` — these are the rules to check against
- Read `file-types` — use these to classify changed files into backend/frontend/migration
- Read `review-stages` — only run enabled stages
- If `extends` is set, load the base profile, then apply `rules-add`/`rules-remove`/`rules-override`
- If `conditional-rules` is set, match rules to changed files by glob pattern

**If no config (fallback):**
- Scan `rules/` for all `.md` files, group by subdirectory
- If no `rules/`, check `.claude/rules/` then `~/.claude/rules/`
- Use all stages below
- Classify files by extension: `.kt/.java/.go/.py` = backend, `.tsx/.ts/.vue` = frontend, `.sql` = migration

**Read all matched rule files** before reviewing any code. These are the source of truth.

---

## Review Checklist

Run each enabled stage. Skip stages that are disabled in the config.

### Stage 1: Correctness & Business Logic
- [ ] Does the code match the stated requirements/ticket?
- [ ] Are all edge cases handled?
- [ ] Is error handling following the project's pattern? (check the loaded rules)
- [ ] Are there any banned patterns? (check the loaded rules for forbidden items)

### Stage 2: Stack Conventions
- [ ] Code follows the patterns in the loaded rule files
- [ ] Stack idioms are correct for this language/framework
- [ ] Naming conventions match the project style (check NAMING rules if loaded)

### Stage 3: Test Coverage
- [ ] New code has tests
- [ ] Tests are independent (no test order dependencies)
- [ ] Edge cases are tested
- [ ] Tests verify behavior, not implementation details

### Stage 4: Clean Code & Architecture
- [ ] Architecture matches what the config says (layered, hexagonal, clean, mvc, etc.)
- [ ] No business logic in the wrong layer (check loaded arch rules)
- [ ] No cyclic dependencies between packages/modules
- [ ] Functions are small and single-purpose

### Stage 5: Database & API
- [ ] Schema follows the loaded database rules (if any)
- [ ] API design follows the loaded API rules (if any)
- [ ] Input validation on all public endpoints
- [ ] No sensitive data logged or exposed

### Stage 6: Security
- [ ] Auth checks present where needed
- [ ] Input validated and sanitized
- [ ] No injection risks (SQL, XSS, command injection)
- [ ] No sensitive data in logs or error responses
- [ ] No hardcoded secrets or credentials

### Stage 7: Documentation Gap Analysis
After reviewing, check if any patterns should be documented:
- [ ] New pattern used that isn't in the rules yet? → flag for rules update
- [ ] New convention established? → flag for `.memory/patterns/` or new rule file
- [ ] Recurring issue? → suggest creating a rule so it gets caught automatically

---

## Output Format

```
## PR Review Summary

### Approved / Needs Changes / Blocked

### Rules Checked
- [list of rule files that were loaded and checked against]

### Critical Issues (must fix)
- [issue with file:line reference and which rule it breaks]

### Suggestions (nice to have)
- [suggestion]

### Praise (what was done well)
- [positive note]

### Documentation Updates Needed
- [rule file or .memory/ path]: [what to add/update] — OR "none"

### Verdict
[Final recommendation]
```

---

## Rules

- Always use `git diff` to inspect actual changes — don't guess from filenames
- Read rule files from config BEFORE reviewing code — they're the source of truth
- Every finding must include file:line reference
- Every finding must cite which rule it breaks (or which checklist item)
- Separate "must fix" from "nice to have" — don't block PRs on style nits
- Praise good code — reviews aren't just for finding problems
- If no config and no rules found, still review using the generic checklist above
