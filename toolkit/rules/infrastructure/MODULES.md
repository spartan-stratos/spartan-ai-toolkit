# Module Design and Composition

> Full guide: use `/spartan:tf-module` command

## Registry Modules

Use c0x12c registry modules with pessimistic version pinning. Always pin to patch level.

```hcl
module "rds" {
  source  = "c0x12c/rds/aws"
  version = "~> 0.6.6"

  identifier     = var.rds_identifier
  instance_class = var.rds_instance_class
  subnet_ids     = var.private_subnet_ids
}
```

### WRONG -- Unbounded version constraint

```hcl
module "rds" {
  source  = "c0x12c/rds/aws"
  version = ">= 0.6.0"  # Could pull breaking changes
}
```

### WRONG -- No version constraint

```hcl
module "rds" {
  source = "c0x12c/rds/aws"
  # No version -- pulls latest, unpredictable
}
```

### CORRECT -- Patch-level pessimistic pinning

```hcl
module "rds" {
  source  = "c0x12c/rds/aws"
  version = "~> 0.6.6"  # Allows 0.6.x, blocks 0.7.0+
}
```

---

## Local Modules

Service-specific modules live in `modules/{service}/` with resource-per-file pattern.

```
modules/
└── {service}/
    ├── variables.tf    # All inputs declared
    ├── outputs.tf      # All outputs declared
    ├── locals.tf       # Computed values
    ├── ecr.tf          # ECR repositories
    ├── rds.tf          # RDS PostgreSQL
    ├── redis.tf        # ElastiCache Redis
    ├── s3.tf           # S3 buckets
    ├── eks.tf          # K8s namespace, IRSA, secrets, configmaps
    └── sqs.tf          # SQS queues
```

### WRONG -- Multiple resource types in one file

```hcl
# resources.tf -- mixing ECR, RDS, and Redis
module "ecr" {
  source  = "c0x12c/ecr/aws"
  version = "~> 0.1.0"
  name    = var.service_name
}

module "rds" {
  source  = "c0x12c/rds/aws"
  version = "~> 0.6.6"
  # ...
}

module "redis" {
  source  = "c0x12c/redis/aws"
  version = "~> 0.2.0"
  # ...
}
```

### CORRECT -- One resource type per file

```hcl
# ecr.tf
module "ecr" {
  source  = "c0x12c/ecr/aws"
  version = "~> 0.1.0"
  name    = var.service_name
}

# rds.tf
module "rds" {
  source  = "c0x12c/rds/aws"
  version = "~> 0.6.6"
  # ...
}

# redis.tf
module "redis" {
  source  = "c0x12c/redis/aws"
  version = "~> 0.2.0"
  # ...
}
```

---

## Module Interface Rules

Every module must have explicit `variables.tf` and `outputs.tf`. No hardcoded values.

### WRONG -- Hardcoded values in module

```hcl
# modules/{service}/rds.tf
module "rds" {
  source         = "c0x12c/rds/aws"
  version        = "~> 0.6.6"
  instance_class = "db.t3.micro"          # Hardcoded
  subnet_ids     = ["subnet-abc123"]      # Hardcoded
}
```

### CORRECT -- Parameterized module

```hcl
# modules/{service}/variables.tf
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for data stores"
  type        = list(string)
}

# modules/{service}/rds.tf
module "rds" {
  source         = "c0x12c/rds/aws"
  version        = "~> 0.6.6"
  instance_class = var.rds_instance_class
  subnet_ids     = var.private_subnet_ids
}

# modules/{service}/outputs.tf
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
}

output "rds_password" {
  description = "RDS auto-generated password"
  value       = module.rds.password
  sensitive   = true
}
```

---

## Sensitive for_each Gotcha

Outputs marked `sensitive = true` in source modules break `for_each` in consumer modules. Terraform cannot use sensitive values as map keys.

### WRONG -- Trying to iterate over sensitive output

```hcl
# This fails at plan time
resource "kubernetes_secret" "db_creds" {
  for_each = module.rds.connection_map  # Error: sensitive value in for_each
}
```

### CORRECT -- Fix at source module or use nonsensitive()

```hcl
# Option 1: Fix the source module output to not be sensitive
output "connection_map" {
  value = { for k, v in local.connections : k => v }
  # Remove sensitive = true if the map keys are not sensitive
}

# Option 2: Use nonsensitive() on non-secret parts only
resource "kubernetes_secret" "db_creds" {
  for_each = nonsensitive(module.rds.connection_names)

  metadata {
    name = each.value
  }
}
```

---

## Shared Modules Pattern

In multi-root setups, use `live/shared/` for cross-environment reusable compositions.

```
live/
├── shared/
│   ├── ecr/
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── main.tf
│   └── rds/
│       ├── variables.tf
│       ├── outputs.tf
│       └── main.tf
├── dev/
│   └── main.tf          # Calls shared modules with dev params
└── prod/
    └── main.tf          # Calls shared modules with prod params
```

```hcl
# live/dev/main.tf
module "rds" {
  source         = "../shared/rds"
  environment    = "dev"
  instance_class = "db.t3.micro"
}

# live/prod/main.tf
module "rds" {
  source         = "../shared/rds"
  environment    = "prod"
  instance_class = "db.r6g.large"
}
```

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| Registry modules | c0x12c registry with `~> X.Y.Z` pinning |
| Version constraint | Pessimistic (`~>`) at patch level, never unbounded (`>=`) |
| Local modules | `modules/{service}/` with resource-per-file |
| File pattern | One resource type per `.tf` file |
| Module interface | Explicit `variables.tf` + `outputs.tf`, no hardcoded values |
| Sensitive for_each | Fix at source module, not consumer |
| Shared modules | `live/shared/` for multi-root cross-environment reuse |
| Variable declarations | Declare all variables, even if sourced from remote state |
