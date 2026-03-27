# Resource and File Naming Conventions

## File Naming

All Terraform files use `snake_case.tf`. Module call files may use the service/resource name.

```
# CORRECT
variables.tf
locals.tf
outputs.tf
provider.tf
ecr.tf
rds.tf
service_api.tf

# WRONG
Variables.tf
my-locals.tf
serviceApi.tf
```

---

## Variable Naming

Variables use `snake_case` with descriptive prefixes matching the resource type.

### WRONG -- Inconsistent or vague names

```hcl
variable "class" {
  type = string
}

variable "dbSubnets" {
  type = list(string)
}

variable "size" {
  type = string
}
```

### CORRECT -- Descriptive snake_case with resource prefix

```hcl
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for data stores"
  type        = list(string)
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}
```

---

## Resource Naming Patterns

| Resource | Pattern | Example |
|----------|---------|---------|
| ECR repository | `{service}`, `{service}-worker` | `payment-api`, `payment-api-worker` |
| RDS identifier | `{service}-{random}` | `payment-api-abc123` |
| RDS database name | `{service_name}` (underscores) | `payment_api` |
| RDS username | `{service_name}` (underscores) | `payment_api` |
| S3 bucket | `{project}-{service}-{env}` | `myproject-payment-api-dev` |
| K8s namespace | `{service}` | `payment-api` |
| K8s service account | `{service}` | `payment-api` |
| SQS queue | `{service}-{queue_type}-{env}` | `payment-api-durable-job-dev` |
| Security group | `{service}-{purpose}-{env}` | `payment-api-redis-dev` |
| IAM role (IRSA) | `{service}-{env}-irsa` | `payment-api-dev-irsa` |
| S3 state bucket | `{project}-{region_short}-tf-{env}` | `myproject-uswest2-tf-dev` |

### WRONG -- Inconsistent naming

```hcl
module "ecr" {
  name = "MyServiceAPI"  # PascalCase
}

module "rds" {
  identifier    = "prod_database"  # Underscores in identifier
  database_name = "prod-db"        # Hyphens in database name
}

resource "aws_sqs_queue" "jobs" {
  name = "jobs"  # No service or env context
}
```

### CORRECT -- Consistent naming with context

```hcl
module "ecr" {
  name = var.service_name  # "payment-api"
}

module "rds" {
  identifier    = "${var.service_name}-${random_id.rds.hex}"  # "payment-api-abc123"
  database_name = replace(var.service_name, "-", "_")          # "payment_api"
  username      = replace(var.service_name, "-", "_")          # "payment_api"
}

resource "aws_sqs_queue" "durable_job" {
  name = "${var.service_name}-durable-job-${var.environment}"  # "payment-api-durable-job-dev"
}
```

---

## Tagging Strategy

Use provider-level `default_tags` instead of per-resource tags. Tags apply automatically to all AWS resources.

### WRONG -- Per-resource tags

```hcl
resource "aws_s3_bucket" "assets" {
  bucket = "{project}-assets-dev"
  tags = {
    ManagedBy   = "Terraform"
    Environment = "dev"
    Service     = "payment-api"
  }
}

resource "aws_sqs_queue" "jobs" {
  name = "payment-api-jobs-dev"
  tags = {
    ManagedBy   = "Terraform"
    Environment = "dev"
    Service     = "payment-api"
  }
}
```

### CORRECT -- Provider default_tags

```hcl
# provider.tf
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      ManagedBy       = "Terraform"
      Service         = var.service_name
      Environment     = var.environment
      TerraformSource = "${var.service_name}/terraform/live"
    }
  }
}

# Resources inherit tags automatically -- no per-resource tags needed
resource "aws_s3_bucket" "assets" {
  bucket = "${var.project}-assets-${var.environment}"
}

resource "aws_sqs_queue" "jobs" {
  name = "${var.service_name}-jobs-${var.environment}"
}
```

---

## Quick Reference

| Aspect | Rule |
|--------|------|
| File names | `snake_case.tf` |
| Variables | `snake_case` with resource prefix (`rds_instance_class`) |
| ECR | `{service}` or `{service}-{role}` |
| RDS identifier | `{service}-{random}` (hyphens) |
| RDS database/user | `{service_name}` (underscores) |
| S3 buckets | `{project}-{service}-{env}` |
| SQS queues | `{service}-{queue_type}-{env}` |
| IAM roles | `{service}-{env}-irsa` |
| State buckets | `{project}-{region_short}-tf-{env}` |
| Tags | Provider `default_tags`, never per-resource |
| K8s resources | `{service}` for namespace and service account |
