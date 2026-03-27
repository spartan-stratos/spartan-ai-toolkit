
---

## Terraform + AWS Infrastructure

**Stack:** Terraform with AWS — EKS/ECS, RDS, ElastiCache, S3, SQS, IAM, OIDC

Two template variants: [Multi-Root](https://github.com/spartan-stratos/template-infra-terraform-multiple-root) (per-env directories) and [Single-Root](https://github.com/spartan-stratos/template-infra-terraform-single-root) (envs/ layout, supports ECS + EKS).

Rules in `rules/infrastructure/` are loaded automatically.

### Infrastructure Commands

| Command | Purpose |
|---|---|
| `/spartan:tf-scaffold [service]` | Scaffold service-level Terraform |
| `/spartan:tf-module [name]` | Create/extend Terraform modules |
| `/spartan:tf-review` | PR review for Terraform changes |
| `/spartan:tf-plan [env]` | Guided plan workflow |
| `/spartan:tf-deploy [env]` | Deployment checklist |
| `/spartan:tf-import [resource]` | Import existing resources |
| `/spartan:tf-drift [env]` | Detect infrastructure drift |
| `/spartan:tf-cost` | Cost estimation guidance |
| `/spartan:tf-security` | Security audit |
