---
name: spartan:env-setup
description: Set up and audit environment variables for a service across local, Railway, and AWS environments. Generates .env.example, validates required vars, and flags missing ones.
argument-hint: "[service name] [local | railway | aws | audit]"
---

# Environment Setup: {{ args[0] }}
Mode: {{ args[1] | default: "audit" }}

Environment variables are the #1 cause of "works locally but breaks in prod."
This command audits, generates, and validates env vars across environments.

---

## Step 1: Discover required variables

Scan the codebase to find all env var references:

```bash
# Kotlin Micronaut — application.yml and @Property annotations
grep -r "\${" src/main/resources/ --include="*.yml" | grep -v "^Binary"
grep -r "@Property\|@ConfigurationProperties\|Environment\|System.getenv" \
  src/main/kotlin/ --include="*.kt" | grep -v "test\|Test"

# Next.js — process.env references
grep -r "process\.env\." --include="*.ts" --include="*.tsx" src/ app/ lib/ 2>/dev/null | \
  grep -v "test\|spec\|node_modules"

# Docker Compose
cat docker-compose.yml 2>/dev/null | grep "environment\|env_file" -A5
```

---

## Step 2: Generate .env.example

Based on findings, create/update `.env.example` (safe to commit — no real values):

### Kotlin Micronaut template:
```bash
# .env.example for [service-name]
# Copy to .env.local and fill in values

# === Database ===
DATASOURCES_DEFAULT_URL=jdbc:postgresql://localhost:5432/[dbname]
DATASOURCES_DEFAULT_USERNAME=postgres
DATASOURCES_DEFAULT_PASSWORD=changeme

# === Application ===
MICRONAUT_ENVIRONMENTS=local
MICRONAUT_SERVER_PORT=8080

# === External Services ===
# [SERVICE]_API_KEY=your-key-here
# [SERVICE]_BASE_URL=https://api.example.com

# === Auth (if applicable) ===
# JWT_SECRET=generate-with: openssl rand -base64 32
# JWT_EXPIRY_MS=86400000

# === Observability ===
# SENTRY_DSN=
# DATADOG_API_KEY=
```

### Next.js template:
```bash
# .env.example for [fe-service]

# === API Connection ===
NEXT_PUBLIC_API_URL=http://localhost:8080

# === Auth ===
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=generate-with: openssl rand -base64 32

# === External Services ===
# NEXT_PUBLIC_ANALYTICS_ID=
```

---

## Step 3: Audit current environments

### Local
```bash
# Check .env.local exists and has all required vars
cat .env.local 2>/dev/null || echo "⚠️  .env.local missing"

# Find vars in .env.example but missing from .env.local
comm -23 <(grep "^[A-Z]" .env.example | cut -d= -f1 | sort) \
         <(grep "^[A-Z]" .env.local 2>/dev/null | cut -d= -f1 | sort)
```

### Railway
```bash
railway variables 2>/dev/null || echo "Not linked to Railway project"

# Check for missing vars (compare with .env.example)
railway variables --json 2>/dev/null | \
  python3 -c "import json,sys; vars=json.load(sys.stdin); [print(k) for k in vars]"
```

### AWS (if applicable)
```bash
# List SSM Parameter Store entries for this service
aws ssm get-parameters-by-path \
  --path "/spartan/[service-name]/" \
  --query "Parameters[*].Name"

# Or check Secrets Manager
aws secretsmanager list-secrets \
  --query "SecretList[?contains(Name, '[service-name]')].Name"
```

---

## Step 4: Output audit report

```markdown
## Env Audit: [service-name]

### Variables found in code: [N]

### Status by environment:

| Variable | Local | Railway | AWS | Notes |
|---|---|---|---|---|
| DATASOURCES_DEFAULT_URL | ✅ | ✅ | ✅ | |
| JWT_SECRET | ✅ | ✅ | ❌ | Missing in AWS |
| SENTRY_DSN | ❌ | ✅ | ✅ | Missing locally (ok) |

### Issues Found:
- [MISSING_VAR]: Required in prod but not set in Railway
- [SECRET_IN_CODE]: Found hardcoded value in [file:line] — move to env var

### All clear:
- .env.example is up to date
- No secrets committed to git
```

---

## Step 5: Security check

```bash
# Check nothing sensitive was committed
git log --all --full-history -- "*.env" "**/.env" "**/.env.local"
git grep -I "password\|secret\|api_key\|apikey\|token" -- '*.yml' '*.yaml' '*.properties' | \
  grep -v "placeholder\|example\|changeme\|your-"

# Verify .gitignore covers env files
grep "\.env" .gitignore || echo "⚠️  .env files not in .gitignore!"
```

If any secrets found in git history:
```bash
# Remove from history (nuclear option — coordinate with team first)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.local' HEAD
```

---

After audit, summarize what's missing and offer to set the Railway vars interactively:
"Found [N] missing variables. Want me to help set them in Railway now? I'll ask for each value one at a time."
