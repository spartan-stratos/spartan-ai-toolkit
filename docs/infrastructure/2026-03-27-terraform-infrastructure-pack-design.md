# Design: Terraform Infrastructure Pack for Spartan AI Toolkit

**Date:** 2026-03-27
**Status:** Approved
**Scope:** AWS-only, Intermediate+ audience, Standalone pack

## Overview

Add a new `infrastructure` pack to Spartan AI Toolkit providing Terraform + AWS coding rules, skills, agents, and commands. Modeled after the `backend-micronaut` pack's density and format. Derived from two official Spartan Terraform templates and production usage:

- **Template v1 — Multi-Root** ([spartan-stratos/template-infra-terraform-multiple-root](https://github.com/spartan-stratos/template-infra-terraform-multiple-root)): 3-tier bootstrap → config → live pattern with per-environment directories
- **Template v2 — Single-Root** ([spartan-stratos/template-infra-terraform-single-root](https://github.com/spartan-stratos/template-infra-terraform-single-root)): Evolved with centralized config modules, envs/ layout, Karpenter, flat locals. Supports both **AWS ECS** and **EKS** as container hosts.
- **Service-level pattern**: Consumer pattern — thin live/ orchestration reading infra remote state + service-specific modules/

## Pack Manifest

```yaml
name: infrastructure
description: "Terraform + AWS infrastructure rules, skills, and commands"
category: Ops
priority: 30
hidden: false
depends: []

commands:
  - tf-scaffold
  - tf-module
  - tf-review
  - tf-plan
  - tf-deploy
  - tf-import
  - tf-drift
  - tf-cost
  - tf-security

rules:
  - infrastructure/STRUCTURE.md
  - infrastructure/MODULES.md
  - infrastructure/STATE_AND_BACKEND.md
  - infrastructure/NAMING.md
  - infrastructure/SECURITY.md
  - infrastructure/VARIABLES.md
  - infrastructure/PROVIDERS.md

skills:
  - terraform-service-scaffold
  - terraform-module-creator
  - terraform-review
  - terraform-security-audit
  - terraform-best-practices

agents:
  - infrastructure-expert.md
  - sre-architect.md

claude-sections:
  - 30-infrastructure.md
```

---

## Rules (7)

Each rule follows the established format: no frontmatter, plain markdown, WRONG vs CORRECT examples, code comparisons, reference tables.

### 1. STRUCTURE.md — Project Organization and Layering

**What it covers:**

- **Two template variants:**
  - **Multi-Root** (template v1): Separate root modules per environment (`live/dev/`, `live/prod/`) with `live/shared/` modules. Best for multi-account setups.
  - **Single-Root** (template v2): One root module with `envs/{env}/` variable files. Supports both **ECS** and **EKS** as container hosts. Best for simpler setups.

- **3-tier architecture** for platform infrastructure:
  - `bootstrap/` — Foundational resources (S3 state bucket, OIDC roles, Route53, SSM). Manual admin setup, local or S3 backend.
  - `config/` — Centralized config modules (aws, general, github, eks/ecs, slack, datadog). Imported by both bootstrap and live layers. DRY constants.
  - `live/` — Active infrastructure. Contains `shared/` modules (multi-root) or flat orchestration (single-root).

- **Service-level Terraform** (in service repos, not infra-terraform):
  - Thin `live/` orchestration reading infra remote state
  - `modules/{service}/` with resource-per-file pattern
  - `envs/{env}/` with state.config, terraform.tfvars, secrets.tfvars

- **File conventions per directory:**

  | File | Purpose |
  |------|---------|
  | `terraform.tf` | Backend config, required_providers, required_version |
  | `variables.tf` | Input variable declarations |
  | `locals.tf` | ALL locals blocks (never scattered) |
  | `outputs.tf` | Module/layer outputs |
  | `config.tf` | Config module references |
  | `provider.tf` | Provider configurations (live layer only) |
  | `data.tf` | Data sources and remote state references |

- **Environment layout:**
  ```
  envs/
  ├── dev/
  │   ├── state.config        # S3 backend config
  │   ├── terraform.tfvars    # Non-sensitive variables
  │   └── secrets.tfvars      # Encrypted secrets (git-secret-protector)
  └── prod/
      ├── state.config
      ├── terraform.tfvars
      └── secrets.tfvars
  ```

- **Anti-patterns:**
  - WRONG: Flat structure with all resources in root
  - WRONG: Mixing bootstrap and live resources in one state
  - WRONG: Putting service infrastructure in the infra-terraform repo
  - WRONG: Scattering `locals {}` blocks across multiple files
  - CORRECT: Layered separation with clear dependency chain
  - CORRECT: Service Terraform in service repo, consuming infra remote state

### 2. MODULES.md — Module Design and Composition

**What it covers:**

- **c0x12c registry modules** with version pinning:
  ```hcl
  module "rds" {
    source  = "c0x12c/rds/aws"
    version = "~> 0.6.6"
  }
  ```

- **Local modules** in `modules/` for service-specific composition:
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

- **One resource type per file** — never combine ECR and RDS in the same `.tf` file

- **Module interface rules:**
  - Explicit `variables.tf` with descriptions and types
  - Explicit `outputs.tf` for all consumed values
  - No hardcoded values in modules — parameterize everything
  - Declare all variables even if sourced from remote state (avoids IDE warnings)

- **Version pinning:**
  - WRONG: `version = ">= 0.6.0"` (unbounded)
  - WRONG: no version constraint (latest, unpredictable)
  - CORRECT: `version = "~> 0.6.6"` (patch-level pinning)

- **Sensitive `for_each` gotcha:**
  - Outputs marked `sensitive = true` break `for_each` — fix at source module, not consumer
  - Document: `c0x12c-module-rules.md` pattern

- **Shared modules** (in `live/shared/`) for cross-environment reuse with parametrization

### 3. STATE_AND_BACKEND.md — State Management

**What it covers:**

- **S3 backend** with encryption and lock files:
  ```hcl
  terraform {
    backend "s3" {
      bucket       = "project-region-tf-env"
      key          = "live-env.tfstate"
      region       = "us-west-2"
      encrypt      = true
      use_lockfile = true
    }
  }
  ```

- **Backend config files** (`envs/{env}/state.config`):
  ```
  bucket       = "{project}-{region_short}-tf-{env}"
  key          = "live-{env}.tfstate"
  region       = "us-west-2"
  use_lockfile = true
  ```

- **State isolation:**
  - Per-environment state files: `live-dev.tfstate`, `live-prod.tfstate`
  - Service-namespaced keys: `{service}/live-dev.tfstate`
  - Separate S3 buckets per AWS account

- **Remote state references:**
  ```hcl
  data "terraform_remote_state" "infra" {
    backend = "s3"
    config = {
      bucket = var.infra_state_bucket
      key    = var.infra_state_key
      region = var.aws_region
    }
  }
  ```

- **Bootstrap → Live dependency chain:**
  - Bootstrap creates S3 bucket, OIDC roles, Route53 zone
  - Live reads bootstrap outputs via `terraform_remote_state`

- **State movement:** `terraform state mv` for index changes (e.g., `password[0]`)

- **Anti-patterns:**
  - WRONG: Local backend for shared infrastructure
  - WRONG: Single state file for all environments
  - WRONG: No encryption on state backend
  - WRONG: No lock files (concurrent access risk)

### 4. NAMING.md — Resource and File Naming Conventions

**What it covers:**

- **File naming:** `snake_case.tf` (e.g., `service-backend.tf` for module calls, `ecr.tf` for resources within modules)

- **Variable naming:** `snake_case` with descriptive prefixes:
  - `eks_cluster_version`, `rds_instance_class`, `redis_node_type`

- **Resource naming patterns:**

  | Resource | Pattern | Example |
  |----------|---------|---------|
  | ECR | `{service}`, `{service}-worker`, `{service}/cache` | `service-api`, `service-api-worker` |
  | RDS identifier | `{service}-{random}` | `service-api-abc123` |
  | RDS database | `{service_name}` (underscores) | `service_api` |
  | RDS username | `{service_name}` (underscores) | `service_api` |
  | S3 bucket | `{stack}-{service}-{env}` | `myproject-service-api-dev` |
  | K8s namespace | `{service}` | `service-api` |
  | K8s service account | `{service}` | `service-api` |
  | SQS queue | `{service}-{queue-type}-{env}` | `service-api-durable-job-dev` |
  | Security group | `{service}-{purpose}-{env}` | `service-api-redis-dev` |
  | IAM role | `{service}-{env}-irsa` | `service-api-dev-irsa` |
  | S3 state bucket | `{project}-{region_short}-tf-{env}` | `myproject-uswest2-tf-dev` |

- **Tagging strategy:**
  ```hcl
  default_tags {
    tags = {
      ManagedBy       = "Terraform"
      Service         = var.service_name
      Environment     = var.environment
      TerraformSource = "{service}/terraform/live"
    }
  }
  ```

- **Anti-patterns:**
  - WRONG: Mixing hyphens and underscores inconsistently
  - WRONG: Missing environment suffix on resources
  - WRONG: Per-resource tags instead of provider default_tags

### 5. SECURITY.md — Security Patterns and Requirements

**What it covers:**

- **Authentication:**
  - OIDC for CI/CD (GitHub Actions → STS temporary credentials)
  - GitHub App auth for provider (not PATs)
  - OIDC case sensitivity: org name must match exactly
  - IRSA for pod-level AWS access (no node-level IAM roles)

- **Secrets management:**
  - git-secret-protector with `.gitattributes` smudge/clean filters
  - `secrets.tfvars` encrypted in git, decrypted during CI/CD
  - `sensitive = true` on all credential variables and outputs
  - RDS passwords: auto-generated, stored in state, exported to K8s Secret
  - API keys: in secrets.tfvars, exported to K8s Secret

- **Network security:**
  - Databases and cache in private subnets ONLY
  - Security groups scoped to VPC CIDR, never `0.0.0.0/0`
  - S3: block public access, versioning, SSE

- **Resource-level security:**

  | Resource | Requirements |
  |----------|-------------|
  | RDS | Private subnet, encrypted storage, auto-generated password, backup enabled |
  | Redis | Transit encryption enabled, private subnet, VPC CIDR security group |
  | S3 | Block public access, versioning, SSE (AES256), granular IAM policy |
  | EKS | Access entries (not aws-auth ConfigMap), SSO roles, IRSA |
  | SQS | Encryption at rest, IAM policy scoped to service |

- **Anti-patterns:**
  - WRONG: Hardcoded credentials in `.tfvars`
  - WRONG: Public subnet for RDS or Redis
  - WRONG: `0.0.0.0/0` in security group ingress
  - WRONG: Wildcard IAM policies (`s3:*`)
  - WRONG: PAT-based GitHub authentication
  - CORRECT: Encrypted secrets.tfvars, private subnets, scoped IAM

### 6. VARIABLES.md — Variable Design and Validation

**What it covers:**

- **Validation blocks:**
  ```hcl
  variable "environment" {
    type = string
    validation {
      condition     = can(regex("^(dev|staging|prod)$", var.environment))
      error_message = "Must be dev, staging, or prod."
    }
  }
  ```

- **Sensitive flag** for all credentials:
  ```hcl
  variable "openai_api_key" {
    sensitive = true
    type      = string
  }
  ```

- **Flat locals pattern** — extract remote state into flat locals:
  ```hcl
  # CORRECT: Flat locals in locals.tf
  locals {
    vpc_id             = data.terraform_remote_state.infra.outputs.vpc_id
    private_subnet_ids = data.terraform_remote_state.infra.outputs.private_subnet_ids
  }

  # WRONG: Nested lookups in module calls
  module "rds" {
    vpc_id = data.terraform_remote_state.infra.outputs.vpc_id  # Repeated everywhere
  }
  ```

- **ALL `locals {}` in `locals.tf`** — never scatter across files

- **`.tfvars` separation:**
  - `terraform.tfvars` — public, version-controlled
  - `secrets.tfvars` — encrypted via git-secret-protector

- **Default values** for sizing parameters:
  ```hcl
  variable "rds_instance_class" {
    type    = string
    default = "db.t3.micro"  # Override per environment
  }
  ```

- **Config modules** for shared constants (region, AZs, stack name, default tags)

### 7. PROVIDERS.md — Provider Configuration

**What it covers:**

- **Providers ONLY in live/ layer** — modules inherit, never declare providers in modules

- **AWS provider with default tags:**
  ```hcl
  provider "aws" {
    region = module.config_aws.region
    default_tags {
      tags = module.config_aws.default_tags
    }
  }
  ```

- **Provider aliases for multi-region:**
  ```hcl
  provider "aws" {
    region = "us-east-1"
    alias  = "global"
  }
  ```

- **GitHub provider with App auth:**
  ```hcl
  provider "github" {
    owner = module.config_github.organization  # REQUIRED with App auth
    app_auth {
      id              = module.config_github.app_id
      pem_file        = module.config_github.pem_file
      installation_id = module.config_github.app_installation_id
    }
  }
  ```

- **Kubernetes/Helm providers** depend on EKS outputs:
  ```hcl
  provider "kubernetes" {
    host                   = module.eks.cluster_endpoint
    token                  = data.aws_eks_cluster_auth.eks_cluster.token
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  }
  ```

- **Version constraints:**
  ```hcl
  terraform {
    required_version = ">= 1.11"
    required_providers {
      aws        = { source = "hashicorp/aws", version = "~> 6" }
      github     = { source = "integrations/github", version = "~> 6" }
      kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.20" }
    }
  }
  ```

- **Anti-patterns:**
  - WRONG: Provider blocks in modules
  - WRONG: Missing `owner` in GitHub provider with App auth (causes 403 on `/user`)
  - WRONG: No `required_version` constraint
  - WRONG: Missing default_tags on AWS provider

---

## Skills (5)

### 1. terraform-service-scaffold

**Purpose:** Generate complete service-level Terraform from scratch.

**Process:**
1. Ask for service name, container host (ECS or EKS), and required resources (ECR, RDS, Redis, S3, SQS, etc.)
2. Read infra-terraform remote state outputs to understand available infrastructure
3. Create `terraform/live/` orchestration layer (terraform.tf, variables.tf, locals.tf, outputs.tf, service module call)
4. Create `terraform/modules/{service}/` with resource-per-file pattern using c0x12c modules
5. Create `terraform/live/envs/dev/` with state.config, terraform.tfvars, secrets.tfvars templates
6. Generate GitHub Actions CI/CD workflow for terraform plan/apply
7. Output checklist: init, plan, apply verification

**Templates for each resource type:**
- ECR: backend + worker + cache repos
- RDS: PostgreSQL with private subnet, auto-password, encryption
- Redis: ElastiCache with transit encryption, VPC CIDR security group
- S3: Versioning, SSE, block public access, read/write IAM policy
- EKS: Namespace, service account, IRSA role, K8s secrets/configmaps
- ECS: Task definition, service, target group, IAM execution/task roles
- SQS: Queue with DLQ pattern

### 2. terraform-module-creator

**Purpose:** Create or extend reusable Terraform modules.

**Process:**
1. Determine module purpose and resource types
2. Create module directory with standard files (variables.tf, outputs.tf, locals.tf, versions.tf)
3. Create resource files (one per resource type)
4. Add appropriate variable declarations with descriptions, types, defaults
5. Add output declarations for all values consumed by other modules
6. Add version constraints for required providers
7. Verify module interface completeness

### 3. terraform-review

**Purpose:** PR review checklist for Terraform changes.

**Checklist categories:**
1. **Structure:** Files in correct locations, modules properly organized
2. **State safety:** No destructive state changes, state key isolation
3. **Security:** No public subnets for data, IRSA patterns, encryption, sensitive variables
4. **Naming:** Resource names follow conventions, tags applied
5. **Modules:** Version pinned, registry modules preferred, no inline resources
6. **Variables:** Validation blocks, sensitive flags, flat locals
7. **Providers:** Only in live layer, aliases correct, version constraints
8. **CI/CD:** Workflows updated if needed, secret decryption configured

### 4. terraform-security-audit

**Purpose:** Comprehensive security review of Terraform codebase.

**Audit areas:**
1. **IAM:** OIDC authentication, IRSA roles, no wildcard policies, least privilege
2. **Network:** Private subnets for data stores, security group rules, no 0.0.0.0/0
3. **Encryption:** S3 SSE, RDS encryption, Redis transit encryption, state encryption
4. **Secrets:** git-secret-protector, sensitive variables, no plaintext credentials
5. **Access:** EKS access entries, SSO roles, cross-account patterns
6. **Compliance:** Default tags, resource naming, backup policies

**Output:** Security report with pass/fail per category, remediation guidance for failures.

### 5. terraform-best-practices

**Purpose:** Quick reference for all Terraform conventions (condensed format like `kotlin-best-practices`).

**Sections:**
- File organization quick reference
- Naming convention table
- Module pattern templates
- State management patterns
- Security checklist
- Common anti-patterns
- CI/CD workflow patterns

---

## Agents (2)

### 1. infrastructure-expert

**Identity:** Senior SRE with 10+ years AWS + Terraform experience. Deep knowledge of c0x12c module ecosystem, EKS, RDS, ElastiCache, S3, IAM, OIDC patterns.

**Expertise areas:**
1. AWS infrastructure design (VPC, EKS, RDS, ElastiCache, S3, SQS, IAM)
2. Terraform module design and composition
3. State management and migration
4. Security and compliance
5. Cost optimization

**Analogous to:** `micronaut-backend-expert`

### 2. sre-architect

**Identity:** Strategic infrastructure architect with 20+ years experience. Led platform teams from startup to enterprise scale.

**Expertise areas:**
1. Multi-account AWS strategy
2. Cost optimization and right-sizing
3. Disaster recovery and high availability
4. Environment strategy (dev/staging/prod)
5. CI/CD pipeline design
6. Observability and monitoring architecture
7. Team scaling and infrastructure as code adoption

**Analogous to:** `solution-architect-cto`

---

## Commands (9)

| Command | Preamble Tier | Purpose |
|---------|---------------|---------|
| `spartan:tf-scaffold` | 3 | Scaffold service-level Terraform (ECR, RDS, Redis, S3, EKS, SQS) |
| `spartan:tf-module` | 3 | Create or extend a Terraform module |
| `spartan:tf-review` | 3 | PR review for Terraform changes |
| `spartan:tf-plan` | 2 | Guided `terraform plan` with safety checks |
| `spartan:tf-deploy` | 3 | Deployment checklist with pre/post verification |
| `spartan:tf-import` | 3 | Import existing AWS resources into Terraform state |
| `spartan:tf-drift` | 2 | Detect and remediate infrastructure drift |
| `spartan:tf-cost` | 2 | Cost estimation guidance and optimization |
| `spartan:tf-security` | 3 | Security audit of Terraform codebase |

---

## Claude-MD Section

**File:** `toolkit/claude-md/30-infrastructure.md`

```markdown
---

## Terraform + AWS Infrastructure

Terraform with AWS (EKS, RDS, ElastiCache, S3, SQS). 3-tier layout (bootstrap → config → live),
c0x12c registry modules, git-secret-protector for secrets, ArgoCD for GitOps deployments.

> Rules: `rules/infrastructure/` — STRUCTURE, MODULES, STATE_AND_BACKEND, NAMING, SECURITY, VARIABLES, PROVIDERS

### Infrastructure Commands

| Command | Purpose |
|---------|---------|
| `/spartan:tf-scaffold` | Scaffold service-level Terraform |
| `/spartan:tf-module` | Create/extend Terraform modules |
| `/spartan:tf-review` | PR review for Terraform changes |
| `/spartan:tf-plan` | Guided plan workflow |
| `/spartan:tf-deploy` | Deployment checklist |
| `/spartan:tf-import` | Import existing resources |
| `/spartan:tf-drift` | Detect infrastructure drift |
| `/spartan:tf-cost` | Cost estimation guidance |
| `/spartan:tf-security` | Security audit |
```

---

## File Inventory

When implemented, this pack creates:

```
toolkit/
├── packs/infrastructure.yaml
├── rules/infrastructure/
│   ├── STRUCTURE.md
│   ├── MODULES.md
│   ├── STATE_AND_BACKEND.md
│   ├── NAMING.md
│   ├── SECURITY.md
│   ├── VARIABLES.md
│   └── PROVIDERS.md
├── skills/
│   ├── terraform-service-scaffold/SKILL.md
│   ├── terraform-module-creator/SKILL.md
│   ├── terraform-review/SKILL.md
│   ├── terraform-security-audit/SKILL.md
│   └── terraform-best-practices/SKILL.md
├── agents/
│   ├── infrastructure-expert.md
│   └── sre-architect.md
├── commands/spartan/
│   ├── tf-scaffold.md
│   ├── tf-module.md
│   ├── tf-review.md
│   ├── tf-plan.md
│   ├── tf-deploy.md
│   ├── tf-import.md
│   ├── tf-drift.md
│   ├── tf-cost.md
│   └── tf-security.md
└── claude-md/
    └── 30-infrastructure.md
```

**Total: 24 new files** (7 rules + 5 skills + 2 agents + 9 commands + 1 claude-md section)

---

## Implementation Notes

- Rules should reference the two official Spartan templates for real examples (not theoretical patterns)
  - Multi-Root: https://github.com/spartan-stratos/template-infra-terraform-multiple-root
  - Single-Root: https://github.com/spartan-stratos/template-infra-terraform-single-root
- Skills should generate code using c0x12c registry module versions
- The `terraform-service-scaffold` skill should support both ECS and EKS container host patterns
- CI/CD workflow templates should match Spartan GitHub Actions patterns (reusable workflows, OIDC, git-secret-protector)
- All resource sizing defaults should match typical dev environment defaults (db.t3.micro, cache.t3.micro, etc.)
- Never use client/project-specific names in templates — use `{project}`, `{service}`, `{env}` placeholders

## Version Impact

After implementation, update these counts:
- CLAUDE.md: "56 slash commands" → "65 slash commands" (+9)
- CLAUDE.md: "11 packs" → "12 packs" (+1)
- CLAUDE.md: "11 coding rules" → "18 coding rules" (+7)
- CLAUDE.md: "20 skills" → "25 skills" (+5)
- CLAUDE.md: "7 agents" → "9 agents" (+2)
