# Layered Architecture

> Full guide: use `/api-endpoint-creator` or `/backend-api-design` skill

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LAYERED ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CONTROLLER                                                                  │
│  ───────────                                                                 │
│  HTTP handling, validation, authentication                                   │
│  Calls: Managers ONLY                                                        │
│                                                                              │
│         │                                                                    │
│         ▼                                                                    │
│                                                                              │
│  MANAGER                                                                     │
│  ────────                                                                    │
│  Business logic, orchestration, transactions, persistence                    │
│  Calls: Services (for external data), Repositories (for DB)                  │
│                                                                              │
│         │                    │                                               │
│         ▼                    ▼                                               │
│                                                                              │
│  SERVICE                 REPOSITORY                                          │
│  ────────                ───────────                                         │
│  External API calls      Database access                                     │
│  Data transformation     CRUD operations                                     │
│  Returns DTOs            Returns Entities                                    │
│                                                                              │
│         │                                                                    │
│         ▼                                                                    │
│                                                                              │
│  EXTERNAL APIs           DATABASE                                            │
│  (GitHub, Slack, etc)    (PostgreSQL)                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Layer | Can Call | Cannot Call |
|-------|----------|-------------|
| Controller | Managers, Detectors | Repositories, DB Context |
| Manager | Repositories, Services, Other Managers | External APIs directly |
| Service | External API clients, Config | Repositories, DB Context |
| Repository | Database | - |
