---
name: spartan:tf-import
description: Import existing AWS resources into Terraform state with config generation
argument-hint: "[resource-type resource-id]"
preamble-tier: 3
---
@rules/infrastructure/STRUCTURE.md
@rules/infrastructure/NAMING.md

# Terraform Import: {{ args[0] | default: "existing resource" }}

Import an existing resource into Terraform management.

## Step 1: Identify the Resource

Parse the user's input to determine:
- **Resource type** — AWS resource type (e.g., `aws_s3_bucket`, `aws_rds_instance`)
- **Resource ID** — The identifier used by AWS (ARN, name, or ID)

If not provided, ask:

> **What resource are you importing?**
>
> Examples:
> - `aws_s3_bucket my-bucket-name`
> - `aws_db_instance my-rds-instance`
> - `aws_security_group sg-0123456789abcdef`
> - `aws_iam_role my-role-name`

## Step 2: Write Terraform Config

Before importing, write the resource block that matches the existing resource.

```bash
# Describe the resource to get current config
aws s3api get-bucket-versioning --bucket {bucket-name} 2>/dev/null
aws rds describe-db-instances --db-instance-identifier {instance-id} 2>/dev/null
aws ec2 describe-security-groups --group-ids {sg-id} 2>/dev/null
aws iam get-role --role-name {role-name} 2>/dev/null
```

Write a resource block that matches the existing state as closely as possible:

```hcl
resource "aws_resource_type" "this" {
  # Match existing configuration exactly
  # to minimize drift on first plan
}
```

## Step 3: Run Import

```bash
terraform import aws_resource_type.this {resource-id}
```

### Common Import Patterns

| Resource | Import ID Format |
|----------|-----------------|
| `aws_s3_bucket` | Bucket name |
| `aws_db_instance` | DB instance identifier |
| `aws_security_group` | Security group ID (`sg-xxx`) |
| `aws_iam_role` | Role name |
| `aws_ecs_service` | `{cluster}/{service}` |
| `aws_lb` | ALB ARN |
| `aws_route53_record` | `{zone_id}_{name}_{type}` |
| `aws_ecr_repository` | Repository name |

## Step 4: Verify State

```bash
terraform state show aws_resource_type.this
```

Confirm the state contains the expected attributes.

## Step 5: Plan to Check Drift

```bash
terraform plan -var-file=../../envs/{env}.tfvars
```

Review the plan output:
- **No changes** — config matches reality. Done.
- **In-place updates** — config differs from reality. Update your `.tf` to match, or accept the change.
- **Replace** — a force-new attribute differs. Update your `.tf` to match exactly.

Iterate: adjust the resource block until `terraform plan` shows no changes.

## Step 6: Commit

Once plan shows no changes:

```bash
git add -A
git commit -m "feat(infra): import {resource-type} into terraform state"
```

## Rules

- Always write the resource config BEFORE running import
- After import, run plan immediately — never leave imported resources with drift
- Iterate until plan shows zero changes
- Import one resource at a time — don't batch
- For resources with dependencies, import in dependency order (VPC → subnet → security group → instance)
- Never import resources managed by another Terraform workspace
