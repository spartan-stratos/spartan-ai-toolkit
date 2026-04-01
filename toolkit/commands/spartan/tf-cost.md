---
name: spartan:tf-cost
description: Cost estimation guidance — sizing recommendations, common patterns, optimization tips
argument-hint: "[optional: resource-type]"
---
@rules/infrastructure/STRUCTURE.md
@rules/infrastructure/MODULES.md

# Terraform Cost Estimation: {{ args[0] | default: "infrastructure review" }}

Review infrastructure costs and provide sizing recommendations.

## Step 1: Identify Resources

```bash
# List all resource types in the current config
grep -r "^resource " *.tf modules/ 2>/dev/null | awk '{print $2}' | sort | uniq -c | sort -rn
```

## Step 2: Common Cost Patterns

### RDS (PostgreSQL/Aurora)

| Environment | Instance | Storage | Multi-AZ | Est. Monthly |
|-------------|----------|---------|----------|-------------|
| dev | `db.t3.micro` | 20 GB gp3 | No | ~$15 |
| staging | `db.t3.small` | 50 GB gp3 | No | ~$30 |
| prod | `db.r6g.large` | 100 GB gp3 | Yes | ~$400 |

**Optimization:**
- Use `db.t3.*` for dev/staging — burstable is fine for low traffic
- Enable storage autoscaling with a max limit
- Aurora Serverless v2 for variable workloads (0.5-128 ACU)

### ElastiCache (Redis)

| Environment | Instance | Replicas | Est. Monthly |
|-------------|----------|----------|-------------|
| dev | `cache.t3.micro` | 0 | ~$12 |
| staging | `cache.t3.small` | 0 | ~$25 |
| prod | `cache.r6g.large` | 1 | ~$300 |

### NAT Gateway

> **Cost trap:** NAT gateways charge per hour AND per GB processed.

| Setup | Est. Monthly |
|-------|-------------|
| 1 NAT per AZ (3 AZs) | ~$100 + data |
| 1 shared NAT | ~$33 + data |
| NAT instance (t3.micro) | ~$8 |

**Optimization:**
- Dev: use a single NAT or NAT instance
- Prod: one NAT per AZ for high availability
- Route S3/DynamoDB through VPC endpoints (free) instead of NAT

### ECS Fargate

| Size | vCPU | Memory | Est. Monthly (24/7) |
|------|------|--------|-------------------|
| Micro | 0.25 | 0.5 GB | ~$9 |
| Small | 0.5 | 1 GB | ~$18 |
| Medium | 1 | 2 GB | ~$36 |
| Large | 2 | 4 GB | ~$73 |

**Optimization:**
- Use Fargate Spot for dev/staging (up to 70% savings)
- Right-size: check CloudWatch CPU/memory utilization
- Scale to zero in dev after hours

### EKS Node Groups

| Environment | Instance | Nodes | Est. Monthly |
|-------------|----------|-------|-------------|
| dev | `t3.medium` | 2 | ~$60 + $75 (control plane) |
| prod | `m6i.xlarge` | 3-6 | ~$300-600 + $75 |

**Note:** EKS control plane is $75/month regardless of size.

## Step 3: Dev vs Prod Sizing

| Resource | Dev | Prod | Savings |
|----------|-----|------|---------|
| RDS | t3.micro, no Multi-AZ | r6g.large, Multi-AZ | 95% |
| Redis | t3.micro, no replica | r6g.large, 1 replica | 95% |
| NAT | 1 shared or NAT instance | 1 per AZ | 70% |
| Fargate | Spot, min replicas | On-demand, auto-scale | 60% |
| EKS | Spot nodes, smaller | On-demand, right-sized | 50% |

## Step 4: Cost Optimization Tips

1. **VPC Endpoints** — S3 and DynamoDB gateway endpoints are free. Saves NAT data costs.
2. **Reserved Instances** — 1-year no-upfront saves ~30% on RDS/ElastiCache in prod.
3. **Scheduled scaling** — Scale down dev/staging outside business hours.
4. **S3 lifecycle rules** — Move old objects to Glacier or Intelligent-Tiering.
5. **Right-size** — Review CloudWatch metrics monthly. Downsize over-provisioned resources.
6. **Clean up** — Delete unused EBS snapshots, old AMIs, unattached EIPs.

## Step 5: Estimate for Current Config

Review the Terraform config and produce:

```
## Cost Estimate: {env}

| Resource | Type | Size | Est. Monthly |
|----------|------|------|-------------|
| RDS | PostgreSQL | db.t3.small | $30 |
| ... | ... | ... | ... |

**Total estimated:** $X/month
**Potential savings:** $Y/month with [recommendations]
```

## Rules

- These are estimates — use AWS Pricing Calculator for exact numbers
- Always compare dev vs prod sizing — dev should be minimal
- Flag NAT gateway costs explicitly — they surprise teams
- Recommend VPC endpoints before adding NAT gateways for AWS service traffic
- Cost reviews should happen before deploying new infrastructure, not after
