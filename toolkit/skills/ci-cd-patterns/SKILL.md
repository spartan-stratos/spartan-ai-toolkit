---
name: ci-cd-patterns
description: "CI/CD pipeline patterns for GitHub Actions, PR automation, and deployment workflows. Use when setting up CI, fixing broken pipelines, automating PR checks, or configuring deployment."
allowed_tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# CI/CD Patterns

Patterns for GitHub Actions, PR automation, and deployment workflows.

## When to Use

- Setting up or fixing GitHub Actions workflows
- Automating PR checks (lint, test, build)
- Configuring deployment pipelines
- Monitoring PR status and retrying flaky CI
- Setting up multi-environment deployment (dev, staging, prod)

## GitHub Actions --- Common Patterns

### Basic CI Workflow
```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: ./gradlew test
```

### PR Check Workflow
```yaml
name: PR Check
on: pull_request

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./gradlew ktlintCheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./gradlew test

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - run: ./gradlew build
```

## PR Babysitting Pattern

Monitor a PR through CI, handle common failures:

1. **Check CI status** --- `gh pr checks <number>`
2. **Identify failure type** --- flaky test, lint error, build failure
3. **Fix and push** --- for lint/build errors, fix locally and push
4. **Retry flaky tests** --- re-run the workflow: `gh run rerun <run-id> --failed`
5. **Resolve merge conflicts** --- rebase onto target branch
6. **Enable auto-merge** --- `gh pr merge <number> --auto --squash`

> See `workflows.md` for ready-to-use GitHub Actions YAML templates.

## Deployment Checklist

Before deploying:
- [ ] All CI checks pass
- [ ] No merge conflicts
- [ ] Database migrations reviewed (if any)
- [ ] Environment variables set in target environment
- [ ] Rollback plan identified

## Gotchas

- **Caching saves minutes per run.** Always cache dependencies (`actions/cache` or `actions/setup-java` with cache). A cold Gradle build takes 3-5 minutes, cached takes 30 seconds.
- **`needs:` creates sequential dependencies.** Without it, all jobs run in parallel. Use `needs: [lint, test]` to make build wait for checks.
- **Secret names are case-sensitive.** `secrets.DB_PASSWORD` and `secrets.db_password` are different. Match the exact name from Settings > Secrets.
- **Don't use `actions/checkout@v3` --- use `v4`.** v3 uses Node 16 which is deprecated. v4 uses Node 20.
- **Flaky tests need investigation, not just retry.** If you re-run a workflow more than twice for the same test, fix the test. Common causes: race conditions, time-dependent assertions, shared test state.
- **Force-pushing during CI review resets the check suite.** Wait for CI to finish before force-pushing, or you'll waste runner minutes.

## Rules

- Every PR must pass CI before merge
- Don't skip CI checks (`[skip ci]`) unless it's docs-only
- Keep workflows under 10 minutes total
- Use matrix builds for multi-version testing
- Store secrets in GitHub Secrets, never in code
