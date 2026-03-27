# State Management

> Full guide: use `/spartan:tf-plan` or `/spartan:tf-deploy` commands

## S3 Backend Configuration

All Terraform state uses S3 with encryption and lock files enabled.

```hcl
# terraform.tf
terraform {
  backend "s3" {
    bucket       = "{project}-{region_short}-tf-{env}"
    key          = "live-{env}.tfstate"
    region       = "us-west-2"
    encrypt      = true
    use_lockfile = true
  }
}
```

---

## Backend Config Files

Use partial backend configuration with `envs/{env}/state.config` files. Initialize with `-backend-config`:

```bash
terraform init -backend-config=envs/dev/state.config
```

### state.config format

```
# envs/dev/state.config
bucket       = "{project}-uswest2-tf-dev"
key          = "live-dev.tfstate"
region       = "us-west-2"
use_lockfile = true
```

```
# envs/prod/state.config
bucket       = "{project}-uswest2-tf-prod"
key          = "live-prod.tfstate"
region       = "us-west-2"
use_lockfile = true
```

### Service-namespaced keys

For service-level Terraform, namespace the state key by service:

```
# {service}-repo/terraform/envs/dev/state.config
bucket       = "{project}-uswest2-tf-dev"
key          = "{service}/live-dev.tfstate"
region       = "us-west-2"
use_lockfile = true
```

---

## State Isolation

Every environment gets its own state file. Never share state across environments.

### WRONG -- Single state for all environments

```hcl
terraform {
  backend "s3" {
    bucket = "{project}-tf"
    key    = "infrastructure.tfstate"  # One file for everything
  }
}
```

### CORRECT -- Per-environment state isolation

```hcl
# Dev state: {project}-uswest2-tf-dev/live-dev.tfstate
# Prod state: {project}-uswest2-tf-prod/live-prod.tfstate
# Service state: {project}-uswest2-tf-dev/{service}/live-dev.tfstate
```

---

## Remote State References

Services read platform infrastructure outputs via `terraform_remote_state`.

```hcl
# data.tf
data "terraform_remote_state" "infra" {
  backend = "s3"
  config = {
    bucket = var.infra_state_bucket
    key    = var.infra_state_key
    region = var.aws_region
  }
}
```

Extract remote state values into flat locals (see VARIABLES rule):

```hcl
# locals.tf
locals {
  vpc_id             = data.terraform_remote_state.infra.outputs.vpc_id
  private_subnet_ids = data.terraform_remote_state.infra.outputs.private_subnet_ids
  eks_cluster_name   = data.terraform_remote_state.infra.outputs.eks_cluster_name
}
```

---

## Bootstrap to Live Dependency Chain

Bootstrap creates foundational resources. Live reads them via remote state.

```hcl
# bootstrap/outputs.tf
output "state_bucket_arn" {
  value = aws_s3_bucket.tf_state.arn
}

output "route53_zone_id" {
  value = aws_route53_zone.main.zone_id
}

# live/data.tf
data "terraform_remote_state" "bootstrap" {
  backend = "s3"
  config = {
    bucket = var.state_bucket
    key    = "bootstrap.tfstate"
    region = var.aws_region
  }
}
```

---

## State Movement

Use `terraform state mv` for index changes (e.g., when refactoring resources).

```bash
# Moving a resource from index to named key
terraform state mv 'module.rds.random_password.password[0]' \
  'module.rds.random_password.password["main"]'

# Moving a resource between modules
terraform state mv 'module.old.aws_ecr_repository.repo' \
  'module.new.aws_ecr_repository.repo'
```

Always run `terraform plan` after state moves to verify no changes.

---

## Anti-Patterns

### WRONG -- Local backend for shared infrastructure

```hcl
terraform {
  backend "local" {
    path = "terraform.tfstate"  # Only on your machine
  }
}
```

### WRONG -- No encryption on state backend

```hcl
terraform {
  backend "s3" {
    bucket  = "{project}-tf-dev"
    key     = "live-dev.tfstate"
    region  = "us-west-2"
    # Missing encrypt = true -- state contains secrets in plaintext
  }
}
```

### WRONG -- No lock files

```hcl
terraform {
  backend "s3" {
    bucket  = "{project}-tf-dev"
    key     = "live-dev.tfstate"
    region  = "us-west-2"
    encrypt = true
    # Missing use_lockfile = true -- concurrent access risk
  }
}
```

### CORRECT -- Full backend configuration

```hcl
terraform {
  backend "s3" {
    bucket       = "{project}-uswest2-tf-dev"
    key          = "live-dev.tfstate"
    region       = "us-west-2"
    encrypt      = true
    use_lockfile = true
  }
}
```

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| Backend | S3 with `encrypt = true` and `use_lockfile = true` |
| State bucket naming | `{project}-{region_short}-tf-{env}` |
| State key (platform) | `live-{env}.tfstate` |
| State key (service) | `{service}/live-{env}.tfstate` |
| Bootstrap state key | `bootstrap.tfstate` |
| Env config | `envs/{env}/state.config` with partial backend config |
| Init command | `terraform init -backend-config=envs/{env}/state.config` |
| Isolation | One state file per environment, never shared |
| Remote state | `terraform_remote_state` to read other layers |
| State moves | `terraform state mv` + verify with `terraform plan` |
