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

### Stage 1: Structure
- [ ] Files follow standard layout (`main.tf`, `variables.tf`, `outputs.tf`, `versions.tf`)
- [ ] Modules are in `modules/` directory, environments in `live/` or `envs/`
- [ ] No monolithic files — resources grouped by logical concern
- [ ] Backend config is separate per environment

### Stage 2: State Safety
- [ ] No resources moved or renamed without `moved` blocks or import
- [ ] State backend uses S3 + DynamoDB lock table
- [ ] No `terraform state` commands in scripts without safeguards
- [ ] Destructive changes (replace, destroy) are intentional and documented
- [ ] `prevent_destroy` lifecycle on critical resources (databases, S3 buckets)

### Stage 3: Security
- [ ] No secrets in `.tf` files or `.tfvars` committed to repo
- [ ] IAM policies follow least privilege — no `*` actions or resources
- [ ] Security groups restrict ingress to required ports only
- [ ] Encryption enabled: RDS `storage_encrypted`, S3 `server_side_encryption`, EBS volumes
- [ ] No public access unless explicitly required (S3 ACLs, RDS `publicly_accessible`)
- [ ] KMS keys used for sensitive resources

### Stage 4: Naming
- [ ] Resources use consistent naming: `{project}-{env}-{service}-{resource}`
- [ ] Variables are descriptive with `_` separators (not camelCase)
- [ ] All resources tagged: `project`, `environment`, `service`, `managed_by`

### Stage 5: Modules
- [ ] Modules have a single responsibility
- [ ] No provider blocks inside modules
- [ ] No backend blocks inside modules
- [ ] Variables have `description` and explicit `type`
- [ ] Outputs have `description`
- [ ] `for_each` preferred over `count`

### Stage 6: Variables
- [ ] All variables have `description` and `type`
- [ ] Sensitive variables marked `sensitive = true`
- [ ] Validation blocks for constrained inputs (environment names, CIDR blocks)
- [ ] Defaults are sensible — no default for required values

### Stage 7: Providers
- [ ] Provider versions pinned with `>=` lower bound
- [ ] `required_version` set for Terraform itself
- [ ] No deprecated provider features used

### Stage 8: CI/CD
- [ ] Pipeline runs `fmt -check`, `validate`, `plan` on PR
- [ ] Apply requires approval for production
- [ ] Plan output is posted to PR for review

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
