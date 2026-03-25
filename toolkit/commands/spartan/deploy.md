---
name: spartan:deploy
description: Deployment guide and checklist for Railway (primary), AWS, or GCP. Validates readiness, generates config, and walks through the deployment steps.
argument-hint: "[service name] [railway | aws | gcp]"
---

# Deploy: {{ args[0] }}
Target: {{ args[1] | default: "railway" }}

---

## Pre-flight Checklist (run first, always)

```bash
# Tests must all pass
./gradlew test                          # Kotlin BE
npm test -- --run 2>/dev/null           # Next.js FE (if applicable)

# Build must succeed
./gradlew build -x test                 # Kotlin
npm run build 2>/dev/null               # Next.js

# No uncommitted changes
git status
git diff --stat

# Current branch
git branch --show-current
```

**Blocker:** Any failing test or build error = do NOT deploy.

---

{% if args[1] == "railway" or args[1] == nil %}
## Railway Deployment

### First-time setup (new service)

```bash
# Install Railway CLI if needed
npm install -g @railway/cli

# Login
railway login

# Link to project (if not already)
railway link

# Check current project
railway status
```

### Validate railway.toml

Ensure `railway.toml` exists at project root:

```toml
[build]
builder = "nixpacks"

[deploy]
# Kotlin/Micronaut:
startCommand = "java -jar build/libs/*-all.jar"
# OR: startCommand = "./gradlew bootRun"

# Next.js:
# startCommand = "npm start"

healthcheckPath = "/health"      # Kotlin
# healthcheckPath = "/api/health"         # Next.js custom
healthcheckTimeout = 60
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3
```

### Environment variables check

```bash
# List current vars
railway variables

# Set missing vars (one by one)
railway variables set KEY=value

# Critical vars to verify for Kotlin BE:
# DATASOURCES_DEFAULT_URL
# DATASOURCES_DEFAULT_USERNAME  
# DATASOURCES_DEFAULT_PASSWORD
# MICRONAUT_ENVIRONMENTS=prod

# Critical vars for Next.js:
# NEXT_PUBLIC_API_URL (pointing to BE service)
# Any auth secrets
```

### Deploy

```bash
# Deploy current branch
railway up

# Or deploy a specific service
railway up --service [service-name]

# Watch logs during deploy
railway logs --follow
```

### Post-deploy verification

```bash
# Check service is healthy
railway status

# Check health endpoint
curl https://[service-url]/health

# Check recent logs for errors
railway logs | tail -50
```

### Rollback if needed

```bash
# View deployment history in Railway dashboard
# Or redeploy previous commit:
git log --oneline -5
railway up --detach  # after checking out previous commit
```
{% endif %}

{% if args[1] == "aws" %}
## AWS Deployment

### Service type check

Ask: What AWS service is this deploying to?
- **ECS (Fargate)** — containerized service
- **Lambda** — serverless function
- **Elastic Beanstalk** — managed app platform
- **S3 + CloudFront** — static Next.js export

### ECS Fargate (Kotlin BE)

```bash
# Build and push Docker image
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin [account].dkr.ecr.ap-southeast-1.amazonaws.com

docker build -t [service-name] .
docker tag [service-name]:latest [account].dkr.ecr.ap-southeast-1.amazonaws.com/[service-name]:latest
docker push [account].dkr.ecr.ap-southeast-1.amazonaws.com/[service-name]:latest

# Update ECS service
aws ecs update-service \
  --cluster [cluster-name] \
  --service [service-name] \
  --force-new-deployment
```

### Post-deploy

```bash
# Watch deployment status
aws ecs describe-services \
  --cluster [cluster-name] \
  --services [service-name] \
  --query 'services[0].deployments'

# Check task health
aws ecs list-tasks --cluster [cluster-name] --service-name [service-name]
```
{% endif %}

---

## Common Issues & Fixes

| Issue | Fix |
|---|---|
| Health check failing | Check `/health` returns 200, increase `healthcheckTimeout` |
| Out of memory | Increase Railway service RAM, or tune JVM: `-Xmx512m` |
| DB connection failed | Verify `DATABASE_URL` env var, check Railway DB is in same project |
| Build timeout | Gradle daemon issue — add `org.gradle.daemon=false` to `gradle.properties` |
| CORS errors | Check `ALLOWED_ORIGINS` env var includes FE URL |
| Cold start too slow | For Railway: disable `sleep` on free tier, or upgrade plan |

---

## Deployment Summary

After successful deploy, output:

```markdown
## Deploy Summary: [service] → [target]

- URL: [service URL]
- Git commit: [hash]
- Deploy time: [timestamp]
- Health: ✅ / ❌

## Smoke Tests Run
- [ ] Health endpoint: [result]
- [ ] Key user-facing endpoint: [result]
- [ ] Logs clean (no errors): [result]
```
