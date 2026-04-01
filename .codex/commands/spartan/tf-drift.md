---
name: spartan:tf-drift
description: Detect and categorize infrastructure drift — benign vs concerning changes
argument-hint: "[environment]"
---
@rules/infrastructure/STATE_AND_BACKEND.md

# Terraform Drift Detection: {{ args[0] | default: "target environment" }}

Detect and analyze differences between Terraform state and actual infrastructure.

## Step 1: Initialize

```bash
terraform init -backend-config=../../envs/{{ args[0] | default: "dev" }}.tfbackend
```

## Step 2: Refresh and Plan

```bash
terraform plan \
  -var-file=../../envs/{{ args[0] | default: "dev" }}.tfvars \
  -refresh-only \
  -detailed-exitcode
```

Exit code `2` means drift was detected.

For a full view including config vs state:

```bash
terraform plan \
  -var-file=../../envs/{{ args[0] | default: "dev" }}.tfvars \
  -detailed-exitcode
```

## Step 3: Analyze Drift

For each drifted resource, determine the cause:

| Category | Examples | Action |
|----------|----------|--------|
| **Benign** | Auto-scaling changed instance count, AWS updated default SSL policy, tags added by AWS | Ignore or update config |
| **Expected** | Manual hotfix applied, console change during incident | Adopt into config or revert |
| **Concerning** | Security group rules changed, IAM policy modified, encryption disabled | Investigate immediately |
| **Critical** | Resources deleted outside Terraform, access controls weakened | Escalate and remediate |

## Step 4: Categorize Findings

```
## Drift Report: {{ args[0] | default: "dev" }}

### Benign (no action needed)
- `aws_autoscaling_group.this` — desired_count changed by auto-scaler

### Expected (adopt or revert)
- `aws_security_group_rule.hotfix` — added during incident on [date]
  → Recommendation: adopt into config

### Concerning (investigate)
- `aws_iam_policy.service_role` — permissions widened
  → Recommendation: review who changed this and why

### Critical (immediate action)
- [none found / list items]
```

## Step 5: Remediate

For each category:

- **Benign** — Update Terraform config to match reality, or add `lifecycle { ignore_changes }`:
  ```hcl
  lifecycle {
    ignore_changes = [desired_count]
  }
  ```

- **Expected** — Either update config to match (adopt) or run `terraform apply` to revert to config.

- **Concerning** — Investigate through CloudTrail, then decide: adopt or revert.

- **Critical** — Revert immediately with `terraform apply`, then investigate.

## Step 6: Apply Corrections

```bash
terraform plan -var-file=../../envs/{env}.tfvars -out=tfplan
# Review the plan
terraform apply tfplan
```

## Rules

- Run drift detection on a schedule — weekly for prod, bi-weekly for other envs
- Never auto-apply drift corrections without human review
- Use CloudTrail to identify who made out-of-band changes
- Add `ignore_changes` only for attributes that legitimately change outside Terraform (e.g., auto-scaling counts)
- Document all adopted drift in commit messages explaining why the manual change was made
