---
name: spartan:tf-security
description: Security audit across IAM, networking, encryption, secrets, access control, and compliance
argument-hint: "[optional: focus-area]"
preamble-tier: 3
---

# Terraform Security Audit: {{ args[0] | default: "full audit" }}

Run a comprehensive security audit on Terraform infrastructure code.

**Before auditing, reference:** `terraform-security-audit` skill

## Audit Scope

If a focus area is provided, audit only that area. Otherwise, run all 6 stages.

Focus areas: `iam`, `network`, `encryption`, `secrets`, `access`, `compliance`

## Stage 1: IAM

```bash
grep -rn "aws_iam" *.tf modules/ 2>/dev/null
```

Check for:
- [ ] No `"*"` in IAM policy actions — use specific actions
- [ ] No `"*"` in IAM policy resources — scope to specific ARNs
- [ ] Roles use `assume_role_policy` with specific principals (not `"*"`)
- [ ] Service roles follow least privilege
- [ ] No inline policies on users — use groups or roles
- [ ] MFA condition on sensitive operations
- [ ] IAM policies use conditions where applicable (`aws:SourceIp`, `aws:PrincipalOrgID`)

### Common Violations

```hcl
# WRONG — too permissive
statement {
  actions   = ["*"]
  resources = ["*"]
}

# CORRECT — scoped
statement {
  actions   = ["s3:GetObject", "s3:PutObject"]
  resources = ["arn:aws:s3:::{project}-{env}-*/*"]
}
```

## Stage 2: Network

```bash
grep -rn "aws_security_group" *.tf modules/ 2>/dev/null
grep -rn "cidr_blocks" *.tf modules/ 2>/dev/null
```

Check for:
- [ ] No `0.0.0.0/0` ingress on non-public ports (only 80/443 for ALB)
- [ ] No `0.0.0.0/0` egress unless justified
- [ ] Database security groups only allow app security group ingress
- [ ] SSH access (port 22) restricted to VPN/bastion CIDR
- [ ] Security group descriptions are meaningful
- [ ] VPC flow logs enabled

## Stage 3: Encryption

```bash
grep -rn "encrypted\|kms\|server_side_encryption" *.tf modules/ 2>/dev/null
```

Check for:
- [ ] RDS: `storage_encrypted = true`
- [ ] S3: `server_side_encryption_configuration` block present
- [ ] EBS: `encrypted = true` on volumes
- [ ] ElastiCache: `transit_encryption_enabled = true`, `at_rest_encryption_enabled = true`
- [ ] Secrets Manager / SSM Parameter Store: KMS key specified
- [ ] ALB: HTTPS listeners with TLS 1.2+ policy

## Stage 4: Secrets

```bash
grep -rn "password\|secret\|api_key\|token\|credential" *.tf *.tfvars 2>/dev/null
```

Check for:
- [ ] No plaintext secrets in `.tf` files
- [ ] No secrets in `.tfvars` committed to git
- [ ] Secrets referenced via `aws_secretsmanager_secret` or `aws_ssm_parameter`
- [ ] Sensitive variables marked `sensitive = true`
- [ ] Sensitive outputs marked `sensitive = true`
- [ ] `.gitignore` includes `*.tfvars` (or only example tfvars are committed)

## Stage 5: Access Control

```bash
grep -rn "publicly_accessible\|public_access\|acl" *.tf modules/ 2>/dev/null
```

Check for:
- [ ] RDS: `publicly_accessible = false`
- [ ] S3: `block_public_acls = true`, `block_public_policy = true`
- [ ] ElastiCache: not in public subnet
- [ ] EKS: API server endpoint not public (or restricted by CIDR)
- [ ] Resources in private subnets where possible

## Stage 6: Compliance

Check for:
- [ ] All resources tagged: `project`, `environment`, `service`, `managed_by`
- [ ] Logging enabled: CloudTrail, ALB access logs, S3 access logs
- [ ] Backup configured: RDS automated backups, S3 versioning
- [ ] `prevent_destroy` on stateful resources (databases, S3 buckets with data)
- [ ] Terraform state bucket has versioning and encryption enabled

## Output Format

```
## Security Audit Results

### Critical (must fix before deploy)
- [finding with file:line reference]

### High (fix in next PR)
- [finding with file:line reference]

### Medium (plan to address)
- [finding]

### Low (nice to have)
- [finding]

### Passed Checks
- [what looks good]

### Score: [X/6 stages passed without critical findings]
```

## Rules

- Every finding must include file:line reference
- Critical findings block deployment — no exceptions
- Check `.tfvars` files for secrets even if they're in `.gitignore`
- `0.0.0.0/0` ingress is only acceptable on ALB ports 80/443
- `"*"` in IAM actions/resources is always a critical finding
- Praise good security patterns — teams should know what they're doing right
