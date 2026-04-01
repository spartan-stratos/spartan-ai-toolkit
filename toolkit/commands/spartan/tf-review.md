---
name: spartan:tf-review
description: PR review for Terraform changes — 8-stage checklist covering structure, security, naming, and state safety
argument-hint: "[optional: branch or PR]"
---
@rules/infrastructure/STRUCTURE.md
@rules/infrastructure/MODULES.md
@rules/infrastructure/PROVIDERS.md
@rules/infrastructure/NAMING.md

# Terraform Review: {{ args[0] | default: "current changes" }}

Perform a comprehensive review of Terraform changes.

**Before reviewing, reference these infrastructure rules:**
- `rules/infrastructure/STRUCTURE.md` — Directory layout and file organization
- `rules/infrastructure/MODULES.md` — Module design and composition
- `rules/infrastructure/NAMING.md` — Resource and variable naming
- `rules/infrastructure/SECURITY.md` — IAM, encryption, network security
- `rules/infrastructure/VARIABLES.md` — Variable definitions and validation
- `rules/infrastructure/PROVIDERS.md` — Provider configuration and versioning
- `rules/infrastructure/STATE_AND_BACKEND.md` — State management and locking

## Review Checklist

Run the full 8-category checklist from the `terraform-review` skill:
1. Structure, 2. State Safety, 3. Security, 4. Naming, 5. Modules, 6. Variables, 7. Providers, 8. CI/CD

See the skill for detailed checks, code examples, and pass/fail criteria per category.

## Output Format

```
## Terraform Review Summary

### Approved / Needs Changes / Blocked

### Critical Issues (must fix)
- [issue with file:line reference]

### State Safety Warnings
- [any resource replacements or deletions flagged]

### Security Findings
- [IAM, network, encryption issues]

### Suggestions (nice to have)
- [improvements]

### Verdict
[Final recommendation]
```

## Rules

- Always use `git diff` to inspect actual changes — don't guess from filenames
- Every finding must include file:line reference
- Flag ALL destructive plan actions (destroy, replace) as critical unless justified
- Separate "must fix" from "nice to have" — don't block PRs on formatting
- Check `.tfvars` files for accidentally committed secrets
