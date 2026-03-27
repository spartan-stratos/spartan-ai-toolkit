---
name: spartan:tf-plan
description: Guided terraform plan workflow — init, plan, review output, flag destructive changes
argument-hint: "[environment]"
preamble-tier: 2
---

# Terraform Plan: {{ args[0] | default: "target environment" }}

Run a guided `terraform plan` with safety checks.

## Step 1: Verify Working Directory

```bash
ls *.tf 2>/dev/null || echo "NO_TF_FILES"
ls backend.tf 2>/dev/null || echo "NO_BACKEND"
```

If no `.tf` files found, ask the user to navigate to the correct environment directory (e.g., `live/dev/`).

## Step 2: Check Backend Config

```bash
cat backend.tf
```

Verify:
- Backend type is `s3` with DynamoDB lock table
- Key path includes the environment name
- Region is set

## Step 3: Initialize

```bash
terraform init -backend-config=../../envs/{{ args[0] | default: "dev" }}.tfbackend
```

If init fails, check:
- AWS credentials are configured (`aws sts get-caller-identity`)
- Backend bucket and DynamoDB table exist
- Network connectivity to AWS

## Step 4: Run Plan

```bash
terraform plan \
  -var-file=../../envs/{{ args[0] | default: "dev" }}.tfvars \
  -out=tfplan \
  -detailed-exitcode
```

Exit codes: `0` = no changes, `1` = error, `2` = changes present.

## Step 5: Review Plan Output

Analyze the plan and categorize changes:

| Symbol | Meaning | Risk |
|--------|---------|------|
| `+` | Create | Low |
| `~` | Update in-place | Medium |
| `-/+` | Destroy and recreate | HIGH |
| `-` | Destroy | CRITICAL |

### Flag Destructive Changes

If the plan shows `-/+` (replace) or `-` (destroy):

> **WARNING: Destructive changes detected.**
>
> The following resources will be destroyed or replaced:
> - `[resource address]` — [reason]
>
> Is this intentional? Common causes:
> - Name change without `moved` block
> - Force-new attribute changed (e.g., `name` on RDS)
> - Provider upgrade changed resource schema

## Step 6: Summary

```
## Plan Summary: {{ args[0] | default: "dev" }}

- **Add:** [N] resources
- **Change:** [N] resources
- **Destroy:** [N] resources

### Destructive changes: [none / list them]
### Estimated impact: [low / medium / high]
### Safe to apply: [yes / review destructive changes first]
```

## Rules

- Never run `terraform apply` from this command — use `/spartan:tf-deploy` for that
- Always use `-out=tfplan` to save the plan for exact apply
- Always use `-var-file` — never rely on auto-loaded `.tfvars`
- Flag every destroy or replace action explicitly
- If credentials are missing, help the user configure them — don't proceed without auth
