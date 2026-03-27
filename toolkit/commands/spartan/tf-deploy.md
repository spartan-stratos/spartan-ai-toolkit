---
name: spartan:tf-deploy
description: Deployment checklist — pre-deploy verification, apply, post-deploy health checks
argument-hint: "[environment]"
preamble-tier: 3
---

# Terraform Deploy: {{ args[0] | default: "target environment" }}

Deploy Terraform changes with a full pre/post checklist.

## Pre-Deploy Checklist

### 1. Verify Branch

```bash
git branch --show-current
git status --short
```

- [ ] On the correct branch (not `main` for direct apply)
- [ ] No uncommitted changes to `.tf` files
- [ ] PR approved (for staging/prod)

### 2. Run Plan

```bash
terraform plan \
  -var-file=../../envs/{{ args[0] | default: "dev" }}.tfvars \
  -out=tfplan \
  -detailed-exitcode
```

- [ ] Plan reviewed and understood
- [ ] No unexpected destroys or replacements
- [ ] Resource count matches expectations

### 3. Review Changes

Summarize what will change:

| Action | Resource | Detail |
|--------|----------|--------|
| create | `aws_...` | New resource |
| update | `aws_...` | What's changing |
| replace | `aws_...` | WHY it's being replaced |

### 4. Check State Locks

```bash
# Verify no one else is running terraform
terraform plan -lock=true 2>&1 | grep -i "lock"
```

If state is locked, identify who holds the lock before proceeding.

## Deploy

### 5. Apply

```bash
terraform apply tfplan
```

- Monitor output for errors
- If apply fails mid-way, DO NOT re-plan — the state has partially updated
- On partial failure: fix the issue, then run `terraform plan` again to see remaining changes

### 6. Verify Apply Output

- [ ] All resources show `Creation complete` or `Modifications complete`
- [ ] No errors in output
- [ ] Apply completed with `Apply complete! Resources: X added, Y changed, Z destroyed.`

## Post-Deploy

### 7. Verify Resources

```bash
# Check key resources exist and are healthy
aws ecs describe-services --cluster {project}-{env} --services {service} 2>/dev/null
aws rds describe-db-instances --db-instance-identifier {project}-{env}-{service} 2>/dev/null
```

- [ ] Service is running / database is available
- [ ] Security groups are correctly attached
- [ ] DNS records resolve (if applicable)

### 8. Health Check

- [ ] Application health endpoint returns 200
- [ ] Logs show successful startup (no crash loops)
- [ ] Metrics pipeline receiving data

### 9. Notify

Post deployment summary:

```
## Deploy Complete: {service} → {{ args[0] | default: "dev" }}

- **Resources:** X added, Y changed, Z destroyed
- **Commit:** [hash]
- **Health:** [passing / issues]
- **Rollback plan:** [revert commit and re-apply / restore from state backup]
```

## Rules

- Never apply without reviewing the plan first
- Never apply directly to prod without approval
- Always use saved plan file (`tfplan`) — never `terraform apply` without `-out`
- If apply fails partially, do NOT run `terraform destroy` — fix forward
- Keep the terminal open during apply — interrupted applies can corrupt state
- For prod deployments, have a rollback plan documented before applying
