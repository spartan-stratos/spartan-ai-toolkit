
---

## Ops & Infrastructure

### Ops Commands

| Command | Purpose |
|---|---|
| `/spartan:deploy [svc] [target]` | Deploy guide with pre-flight checks |
| `/spartan:env-setup [svc]` | Audit env vars, generate `.env.example` |
| `/spartan:ops-investigate-alert <alert>` | Investigate a monitoring alert end-to-end (metrics, logs, traces, code) |
| `/spartan:ops-oncall-log [date range]` | Create on-call log from monitoring alerts to wiki |

---

## Infrastructure Conventions

**Kubernetes:** Always set resource limits + liveness/readiness probes for Micronaut services.

**Terraform:** `terraform plan` review required before every `apply`. No manual console changes.

**Platforms:** Railway (staging) · AWS (production) · GCP (secondary)

**Railway** (`railway.toml`):
```toml
[build]
builder = "nixpacks"
[deploy]
startCommand = "java -jar build/libs/*-all.jar"
healthcheckPath = "/health"
healthcheckTimeout = 60
restartPolicyType = "on-failure"
```

**AWS (production):** ECS Fargate + RDS + Secrets Manager (never plain env vars for secrets).
