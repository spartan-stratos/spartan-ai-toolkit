# Security Patterns and Requirements

> Full guide: use `/spartan:tf-security` command

## Authentication

### OIDC for CI/CD

GitHub Actions authenticate to AWS via OIDC -- temporary STS credentials, no static keys.

```hcl
# bootstrap/oidc.tf
module "github_oidc" {
  source  = "c0x12c/github-oidc/aws"
  version = "~> 0.2.0"

  github_organization = var.github_organization
  repositories        = var.github_repositories

  # OIDC is case-sensitive -- org name must match exactly
  # "MyOrg" != "myorg"
}
```

### WRONG -- Static AWS credentials in CI/CD

```yaml
# .github/workflows/deploy.yml
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### CORRECT -- OIDC authentication

```yaml
# .github/workflows/deploy.yml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: ${{ vars.AWS_ROLE_ARN }}
      aws-region: us-west-2
```

### GitHub App Authentication

Use GitHub App auth for the Terraform GitHub provider. Never use PATs.

### WRONG -- Personal Access Token

```hcl
provider "github" {
  token = var.github_token  # PAT -- tied to individual, security risk
}
```

### CORRECT -- GitHub App auth with owner

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

### IRSA for Pods

Pods access AWS via IAM Roles for Service Accounts (IRSA). Never attach IAM roles to nodes.

```hcl
# modules/{service}/eks.tf
module "irsa" {
  source  = "c0x12c/eks-irsa/aws"
  version = "~> 0.3.0"

  service_account_name = var.service_name
  namespace            = var.service_name
  oidc_provider_arn    = var.eks_oidc_provider_arn

  policy_arns = [
    aws_iam_policy.s3_access.arn,
    aws_iam_policy.sqs_access.arn,
  ]
}
```

---

## Secrets Management

### git-secret-protector

Sensitive variable files are encrypted in git using `.gitattributes` smudge/clean filters.

```
# .gitattributes
envs/*/secrets.tfvars filter=git-secret-protector diff=git-secret-protector
```

- `secrets.tfvars` -- encrypted in git, decrypted during CI/CD
- `terraform.tfvars` -- public, version-controlled, non-sensitive values

### Sensitive Variables

Mark all credential variables and outputs with `sensitive = true`.

### WRONG -- Credentials without sensitive flag

```hcl
variable "database_password" {
  type = string
  # Missing sensitive = true -- shows in plan output
}

output "rds_password" {
  value = module.rds.password
  # Missing sensitive = true -- visible in state output
}
```

### CORRECT -- Sensitive flag on credentials

```hcl
variable "database_password" {
  type      = string
  sensitive = true
}

output "rds_password" {
  value     = module.rds.password
  sensitive = true
}
```

---

## Network Security

### WRONG -- Public subnet for data stores

```hcl
module "rds" {
  source     = "c0x12c/rds/aws"
  version    = "~> 0.6.6"
  subnet_ids = var.public_subnet_ids  # Data stores in public subnet
}
```

### WRONG -- Open security group

```hcl
resource "aws_security_group_rule" "redis" {
  type        = "ingress"
  from_port   = 6379
  to_port     = 6379
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]  # Open to the world
}
```

### CORRECT -- Private subnets with VPC CIDR scoping

```hcl
module "rds" {
  source     = "c0x12c/rds/aws"
  version    = "~> 0.6.6"
  subnet_ids = var.private_subnet_ids  # Private subnets only
}

resource "aws_security_group_rule" "redis" {
  type        = "ingress"
  from_port   = 6379
  to_port     = 6379
  protocol    = "tcp"
  cidr_blocks = [var.vpc_cidr_block]  # VPC CIDR only
}
```

### WRONG -- Wildcard IAM policies

```hcl
resource "aws_iam_policy" "s3_access" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:*"
      Resource = "*"
    }]
  })
}
```

### CORRECT -- Scoped IAM policies

```hcl
resource "aws_iam_policy" "s3_access" {
  policy = jsonencode({
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
      ]
      Resource = [
        "${aws_s3_bucket.assets.arn}/*",
      ]
    }]
  })
}
```

---

## Resource Security Requirements

| Resource | Requirements |
|----------|-------------|
| RDS | Private subnet, encrypted storage, auto-generated password, backup enabled |
| Redis | Transit encryption enabled, private subnet, VPC CIDR security group |
| S3 | Block public access, versioning, SSE (AES256), granular IAM policy |
| EKS | Access entries (not aws-auth ConfigMap), SSO roles, IRSA |
| ECS | Private subnet, task role with least privilege, execution role scoped |
| SQS | Encryption at rest, IAM policy scoped to service |

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| CI/CD auth | OIDC (temporary STS credentials), never static keys |
| GitHub provider | App auth with `owner` field, never PATs |
| Pod AWS access | IRSA, never node-level IAM roles |
| Secrets in git | git-secret-protector with `.gitattributes` filters |
| Sensitive vars | `sensitive = true` on all credentials |
| Data stores | Private subnets only, never public |
| Security groups | VPC CIDR scoped, never `0.0.0.0/0` |
| IAM policies | Least privilege, specific actions and resources |
| S3 | Block public access, versioning, SSE |
| Encryption | At rest and in transit for all data stores |
