---
name: spartan:tf-scaffold
description: Scaffold service-level Terraform with live/, modules/, envs/ structure and CI/CD
argument-hint: "[service-name]"
preamble-tier: 3
---
@rules/infrastructure/STRUCTURE.md
@rules/infrastructure/NAMING.md
@rules/infrastructure/VARIABLES.md

# Terraform Scaffold: {{ args[0] | default: "new service" }}

Scaffold production-ready Terraform infrastructure for a service.

**Before scaffolding, reference:** `terraform-service-scaffold` skill

## Step 1: Gather Requirements

Ask the user:

> **Container host:** Which platform runs this service?
>
> I'd go with **A** — ECS is simpler for single-service deployments.
>
> - **A) ECS Fargate** — serverless containers, simpler ops
> - **B) EKS** — Kubernetes, more control, higher complexity
> - **C) Other** — specify (Lambda, EC2, etc.)

> **Resources needed:** What does this service depend on?
> - Database (RDS PostgreSQL / Aurora)
> - Cache (ElastiCache Redis)
> - Queue (SQS)
> - Object storage (S3)
> - CDN (CloudFront)
> - Other

## Step 2: Detect Infrastructure Remote State

```bash
# Check for existing infra state
find . -name "backend.tf" -o -name "*.tfbackend" 2>/dev/null | head -20
find . -name "remote-state*" -o -name "terraform.tfstate" 2>/dev/null | head -20
```

Identify the remote state backend pattern (S3 + DynamoDB lock table) and region convention.

## Step 3: Scaffold Directory Structure

Create the standard layout:

```
{service}/
├── live/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── backend.tf
│   │   └── dev.tfvars
│   ├── staging/
│   │   └── ... (same structure)
│   └── prod/
│       └── ... (same structure)
├── modules/
│   ├── service/          # ECS/EKS task + service
│   ├── networking/       # Security groups, ALB target groups
│   └── {resource}/       # One module per resource type
└── envs/
    ├── dev.tfvars
    ├── staging.tfvars
    └── prod.tfvars
```

## Step 4: Generate Module Stubs

For each resource the user selected, create a module with:
- `main.tf` — resource definitions
- `variables.tf` — input variables with descriptions and types
- `outputs.tf` — exported values other modules consume

## Step 5: Wire Up Live Environments

Each environment's `main.tf` calls modules with environment-specific values. Use `data` sources to reference shared infrastructure (VPC, subnets, DNS).

## Step 6: Generate CI/CD Pipeline

Create pipeline config that runs:
1. `terraform fmt -check`
2. `terraform validate`
3. `terraform plan` (on PR)
4. `terraform apply` (on merge to main, with approval gate for prod)

## Step 7: Verify

```bash
cd {service}/live/dev
terraform init
terraform validate
terraform plan -var-file=../../envs/dev.tfvars
```

## Rules

- Every variable must have a `description` and explicit `type`
- Use `locals` for computed values — never repeat expressions
- Remote state backend must use S3 + DynamoDB lock table
- Environment differences live in `.tfvars` files, not conditionals
- Tag all resources with `project`, `environment`, `service`, `managed_by = "terraform"`
- Never hardcode AWS account IDs, regions, or resource ARNs
