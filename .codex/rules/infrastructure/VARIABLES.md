---
paths:
  - "**/*.tf"
  - "**/*.hcl"
  - "**/*.tfvars"
---
# Variable Design and Validation

## Validation Blocks

Add validation blocks to constrain variable values at plan time, not apply time.

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Must be dev, staging, or prod."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "Must be a valid AWS region (e.g., us-west-2)."
  }
}

variable "service_name" {
  description = "Service name (kebab-case)"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]+$", var.service_name))
    error_message = "Must be lowercase kebab-case."
  }
}
```

### WRONG -- No validation on constrained values

```hcl
variable "environment" {
  type = string
  # No validation -- "production", "PROD", "p" all accepted
}
```

### CORRECT -- Validation with clear error message

```hcl
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Must be dev, staging, or prod."
  }
}
```

---

## Sensitive Flag

Mark all credential variables with `sensitive = true`. This prevents values from appearing in plan output and logs.

```hcl
variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "datadog_api_key" {
  description = "Datadog API key"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  sensitive   = true
}
```

---

## Flat Locals Pattern

Extract remote state values into flat locals in `locals.tf`. Reference locals throughout the module instead of repeating `data.terraform_remote_state` lookups.

### WRONG -- Nested lookups in module calls

```hcl
# rds.tf
module "rds" {
  source     = "c0x12c/rds/aws"
  version    = "~> 0.6.6"
  vpc_id     = data.terraform_remote_state.infra.outputs.vpc_id
  subnet_ids = data.terraform_remote_state.infra.outputs.private_subnet_ids
}

# redis.tf
module "redis" {
  source     = "c0x12c/redis/aws"
  version    = "~> 0.2.0"
  vpc_id     = data.terraform_remote_state.infra.outputs.vpc_id       # Repeated
  subnet_ids = data.terraform_remote_state.infra.outputs.private_subnet_ids  # Repeated
}
```

### CORRECT -- Flat locals, reference once

```hcl
# locals.tf
locals {
  vpc_id             = data.terraform_remote_state.infra.outputs.vpc_id
  private_subnet_ids = data.terraform_remote_state.infra.outputs.private_subnet_ids
  vpc_cidr_block     = data.terraform_remote_state.infra.outputs.vpc_cidr_block
  eks_cluster_name   = data.terraform_remote_state.infra.outputs.eks_cluster_name
}

# rds.tf
module "rds" {
  source     = "c0x12c/rds/aws"
  version    = "~> 0.6.6"
  vpc_id     = local.vpc_id
  subnet_ids = local.private_subnet_ids
}

# redis.tf
module "redis" {
  source     = "c0x12c/redis/aws"
  version    = "~> 0.2.0"
  vpc_id     = local.vpc_id
  subnet_ids = local.private_subnet_ids
}
```

---

## ALL Locals in locals.tf

Never scatter `locals {}` blocks across multiple files. One file, one block.

### WRONG -- Locals in multiple files

```hcl
# rds.tf
locals {
  db_name = replace(var.service_name, "-", "_")
}

# eks.tf
locals {
  namespace = var.service_name
}
```

### CORRECT -- Single locals.tf

```hcl
# locals.tf
locals {
  db_name   = replace(var.service_name, "-", "_")
  namespace = var.service_name

  vpc_id             = data.terraform_remote_state.infra.outputs.vpc_id
  private_subnet_ids = data.terraform_remote_state.infra.outputs.private_subnet_ids
}
```

---

## .tfvars Separation

Split variable values into two files per environment:

- `terraform.tfvars` -- public, version-controlled, non-sensitive
- `secrets.tfvars` -- encrypted via git-secret-protector, sensitive values only

```hcl
# envs/dev/terraform.tfvars
environment        = "dev"
aws_region         = "us-west-2"
service_name       = "{service}"
rds_instance_class = "db.t3.micro"
redis_node_type    = "cache.t3.micro"

# envs/dev/secrets.tfvars (encrypted in git)
openai_api_key    = "sk-..."
datadog_api_key   = "dd-..."
slack_webhook_url = "https://hooks.slack.com/..."
```

Apply with both files:

```bash
terraform plan \
  -var-file=envs/dev/terraform.tfvars \
  -var-file=envs/dev/secrets.tfvars
```

---

## Default Values for Sizing

Provide sensible defaults for sizing parameters. Override per environment in `.tfvars`.

```hcl
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"  # Dev default, override for prod
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "eks_cluster_version" {
  description = "EKS cluster Kubernetes version"
  type        = string
  default     = "1.31"
}
```

---

## Config Modules for Shared Constants

Use config modules (in `config/`) for values shared across layers (region, AZs, stack name, default tags). Import in both bootstrap and live.

```hcl
# config/aws/main.tf
output "region" {
  value = "us-west-2"
}

output "availability_zones" {
  value = ["us-west-2a", "us-west-2b"]
}

output "default_tags" {
  value = {
    ManagedBy = "Terraform"
    Project   = var.project_name
  }
}

# live/config.tf
module "config_aws" {
  source = "../config/aws"
}
```

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| Validation | Add `validation {}` blocks for constrained values |
| Sensitive | `sensitive = true` on all credentials |
| Flat locals | Extract remote state to `locals {}`, reference `local.*` |
| Locals file | ALL locals in `locals.tf`, never scattered |
| tfvars split | `terraform.tfvars` (public) + `secrets.tfvars` (encrypted) |
| Sizing defaults | Provide dev-appropriate defaults, override in tfvars |
| Config modules | `config/` for shared constants (region, AZs, tags) |
| Variable naming | `snake_case` with resource prefix |
| Descriptions | Every variable must have a `description` |