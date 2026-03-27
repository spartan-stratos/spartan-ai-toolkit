# Provider Configuration

## Providers Only in Live Layer

Providers are declared ONLY in the `live/` layer. Modules inherit providers from the caller. Never declare providers inside modules.

### WRONG -- Provider in module

```hcl
# modules/{service}/rds.tf
provider "aws" {
  region = "us-west-2"  # Provider inside a module
}

module "rds" {
  source  = "c0x12c/rds/aws"
  version = "~> 0.6.6"
}
```

### CORRECT -- Provider in live layer only

```hcl
# live/provider.tf
provider "aws" {
  region = module.config_aws.region

  default_tags {
    tags = module.config_aws.default_tags
  }
}

# modules/{service}/rds.tf -- no provider block, inherits from caller
module "rds" {
  source  = "c0x12c/rds/aws"
  version = "~> 0.6.6"
}
```

---

## AWS Provider with Default Tags

Always configure `default_tags` on the AWS provider. Tags apply automatically to all resources.

### WRONG -- No default tags

```hcl
provider "aws" {
  region = "us-west-2"
  # No default_tags -- every resource needs manual tags
}
```

### CORRECT -- Default tags from config module

```hcl
provider "aws" {
  region = module.config_aws.region

  default_tags {
    tags = {
      ManagedBy       = "Terraform"
      Service         = var.service_name
      Environment     = var.environment
      TerraformSource = "${var.service_name}/terraform/live"
    }
  }
}
```

---

## Provider Aliases for Multi-Region

Use aliases when resources must exist in a different region (e.g., ACM certificates in `us-east-1` for CloudFront).

```hcl
# live/provider.tf
provider "aws" {
  region = module.config_aws.region

  default_tags {
    tags = module.config_aws.default_tags
  }
}

provider "aws" {
  alias  = "global"
  region = "us-east-1"

  default_tags {
    tags = module.config_aws.default_tags
  }
}
```

```hcl
# Usage in resources
resource "aws_acm_certificate" "cdn" {
  provider          = aws.global
  domain_name       = var.domain_name
  validation_method = "DNS"
}
```

---

## GitHub Provider with App Auth

Use GitHub App authentication with the `owner` field. Missing `owner` with App auth causes 403 errors on `/user` endpoint.

### WRONG -- Missing owner with App auth

```hcl
provider "github" {
  # No owner field -- causes 403 on /user endpoint
  app_auth {
    id              = var.github_app_id
    pem_file        = var.github_app_pem_file
    installation_id = var.github_app_installation_id
  }
}
```

### WRONG -- PAT-based authentication

```hcl
provider "github" {
  token = var.github_token  # Personal Access Token -- security risk
}
```

### CORRECT -- App auth with owner

```hcl
provider "github" {
  owner = module.config_github.organization

  app_auth {
    id              = module.config_github.app_id
    pem_file        = module.config_github.pem_file
    installation_id = module.config_github.app_installation_id
  }
}
```

---

## Kubernetes and Helm Providers

Kubernetes and Helm providers depend on EKS cluster outputs. Configure them after the EKS module.

```hcl
# live/provider.tf
data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  token                  = data.aws_eks_cluster_auth.cluster.token
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    token                  = data.aws_eks_cluster_auth.cluster.token
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  }
}
```

---

## Version Constraints

Always specify `required_version` for Terraform and version constraints for all providers.

### WRONG -- No version constraints

```hcl
terraform {
  # No required_version -- any Terraform version accepted
  required_providers {
    aws = {
      source = "hashicorp/aws"
      # No version -- pulls latest, unpredictable
    }
  }
}
```

### CORRECT -- Explicit version constraints

```hcl
terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}
```

---

## Complete Provider File Example

```hcl
# live/provider.tf

provider "aws" {
  region = module.config_aws.region

  default_tags {
    tags = {
      ManagedBy       = "Terraform"
      Service         = var.service_name
      Environment     = var.environment
      TerraformSource = "${var.service_name}/terraform/live"
    }
  }
}

provider "aws" {
  alias  = "global"
  region = "us-east-1"

  default_tags {
    tags = {
      ManagedBy       = "Terraform"
      Service         = var.service_name
      Environment     = var.environment
      TerraformSource = "${var.service_name}/terraform/live"
    }
  }
}

provider "github" {
  owner = module.config_github.organization

  app_auth {
    id              = module.config_github.app_id
    pem_file        = module.config_github.pem_file
    installation_id = module.config_github.app_installation_id
  }
}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  token                  = data.aws_eks_cluster_auth.cluster.token
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    token                  = data.aws_eks_cluster_auth.cluster.token
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  }
}
```

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| Provider location | Only in `live/` layer, never in modules |
| AWS default_tags | Always configured, applied to all resources |
| Multi-region | Use `alias = "global"` for us-east-1 resources |
| GitHub auth | App auth with `owner` field, never PATs |
| GitHub owner | REQUIRED with App auth (403 without it) |
| Kubernetes/Helm | Configured from EKS module outputs |
| required_version | Always set (e.g., `>= 1.11`) |
| Provider versions | Pessimistic pinning (`~> X.Y`) on all providers |
| Module providers | Modules inherit, never declare their own |
