---
name: spartan:js-security
description: Security audit for JS/TS projects across npm setup, dependency hygiene, CI/CD, Dependabot, and incident response
argument-hint: "[optional: focus-area]"
---

# JS Security Audit: {{ args[0] | default: "full audit" }}

Run a comprehensive security audit on a JS/TS codebase against the NPM Security Guidelines.

**Before auditing, reference:** `js-security-audit` skill

## Audit Scope

If a focus area is provided, audit only that area. Otherwise, run all 5 stages.

Focus areas: `setup`, `deps`, `ci`, `dependabot`, `incident`

## Detect Package Manager

```bash
ls package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null
```

| Lockfile | Manager |
|----------|---------|
| `package-lock.json` | npm |
| `yarn.lock` | yarn |
| `pnpm-lock.yaml` | pnpm |

If multiple lockfiles exist — that's a Critical finding. Pick one and remove the others.

## Stage 1: Project Setup

```bash
ls -la .npmrc .gitignore package.json 2>/dev/null
git ls-files | grep -E "(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$"
```

Check for:
- [ ] Lockfile committed to git (not in `.gitignore`)
- [ ] `.npmrc` includes `audit=true`, `ignore-scripts=true`, `engine-strict=true`, `save-exact=true`
- [ ] `.gitignore` covers `.env`, `.env.*`, `*.pem`, `*.key`
- [ ] No `latest` tag in dependencies — `grep '"latest"' package.json`
- [ ] Critical packages pinned to exact versions (no `^` / `~` for axios, prisma, esbuild, sharp, bcrypt)

## Stage 2: Dependency Hygiene

```bash
npm audit --audit-level=high   # or yarn npm audit / pnpm audit
npm outdated                   # or yarn outdated / pnpm outdated; which deps are stale
```

Check for:
- [ ] `npm audit` clean at high+ severity (or documented overrides for known-safe issues)
- [ ] No trivial-functionality deps (`is-odd`, `is-even`, `left-pad`)
- [ ] Recently-added deps published more than 3 days ago (check `git log -- package.json` and `npm view <pkg> time`)
- [ ] Internal packages use scoped names (`@yourorg/...`)

## Stage 3: CI/CD Pipeline

```bash
ls .github/workflows/ 2>/dev/null
grep -rn "npm install\|npm ci\|yarn install\|pnpm install" .github/ 2>/dev/null
```

Check for:
- [ ] CI uses `npm ci --ignore-scripts` (not `npm install`)
- [ ] Selective `npm rebuild` allowlist with documented justifications
- [ ] `npm audit --audit-level=high` runs as a CI gate
- [ ] `npx lockfile-lint` runs in CI
- [ ] GitHub Actions pinned by SHA, not tag — `grep -E "uses:.*@v[0-9]" .github/workflows/`
- [ ] SBOM generation step exists for production builds
- [ ] Separate `eslint.security.js` config (see `eslint-security.md`)

## Stage 4: GitHub Dependabot

```bash
ls .github/dependabot.yml 2>/dev/null
```

Check for:
- [ ] `.github/dependabot.yml` exists with `package-ecosystem: "npm"`
- [ ] Weekly schedule configured
- [ ] Reviewers / labels assigned
- [ ] Minor/patch grouped to reduce noise
- [ ] Branch protection requires CI on Dependabot PRs

## Stage 5: Incident Response Readiness

Check for:
- [ ] Documented incident playbook (or pointer to `incident-playbook.md`)
- [ ] Override mechanism documented (`overrides` / `resolutions` / `pnpm.overrides`)
- [ ] Credential rotation runbook covers npm tokens, SSH, cloud creds, DB, API keys
- [ ] No `node_modules/` cached in CI without lockfile validation

## Output Format

```
## JS Security Audit Results

### Overall: Pass | Fail

### Critical (must fix before merge)
- [finding with file:line reference]

### High (fix in next PR)
- [finding with file:line reference]

### Medium (plan to address)
- [finding]

### Low (nice to have)
- [finding]

### Passed Checks
- [what looks good]

### Score: [X/5 stages passed without critical findings]
```

## Rules

- Every finding must include file path or config key
- Critical findings block merge — no exceptions
- `latest` tag in production deps is always Critical
- Missing `npm audit` gate in CI is always Critical
- Secrets in repo or `.env` not in `.gitignore` is always Critical
- Praise good patterns — teams should know what they're doing right
