---
name: spartan:tf-module
description: Create or extend a Terraform module with proper interface, docs, and examples
argument-hint: "[module-name]"
preamble-tier: 3
---

# Terraform Module: {{ args[0] | default: "new module" }}

Create a reusable Terraform module following best practices.

**Before creating, reference:** `terraform-module-creator` skill

## Step 1: Determine Purpose

Ask the user:

> **What does this module manage?** Describe the AWS resources and their purpose.
>
> Examples: "RDS PostgreSQL instance with parameter group and subnet group",
> "ECS service with task definition, ALB target group, and auto-scaling"

## Step 2: Create Module Structure

```
modules/{module-name}/
├── main.tf           # Resource definitions
├── variables.tf      # Input variables
├── outputs.tf        # Exported attributes
├── versions.tf       # Required providers and terraform version
├── locals.tf         # Computed values (if needed)
└── README.md         # Auto-generated docs
```

## Step 3: Define the Interface

### variables.tf

Group variables logically with comments:

```hcl
# --- Required ---
variable "name" {
  description = "Name prefix for all resources"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

# --- Optional ---
variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
```

### outputs.tf

Export everything downstream modules might need:

```hcl
output "id" {
  description = "The ID of the primary resource"
  value       = aws_resource.this.id
}

output "arn" {
  description = "The ARN of the primary resource"
  value       = aws_resource.this.arn
}
```

## Step 4: Add Resources

Write `main.tf` with:
- Merge tags using `locals` — combine module defaults with user-provided tags
- Use `for_each` over `count` when creating multiple similar resources
- Reference variables — never hardcode values

## Step 5: Set Provider Constraints

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}
```

## Step 6: Validate

```bash
cd modules/{module-name}
terraform init
terraform validate
terraform fmt -check
```

## Rules

- One module = one logical concern (don't mix unrelated resources)
- Every variable needs `description` and explicit `type`
- Every output needs `description`
- Use `locals` for tag merging and computed values
- No provider blocks inside modules — let the caller configure providers
- No backend blocks inside modules
- Use `for_each` over `count` — it handles additions/removals without index shifting
- Sensitive outputs must be marked `sensitive = true`
