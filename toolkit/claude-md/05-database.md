
---

## Database Patterns

Rules in `rules/database/` enforce database standards:
- `SCHEMA.md` — No FK, TEXT not VARCHAR, soft deletes, uuid_generate_v4(), partial indexes
- `ORM_AND_REPO.md` — Exposed ORM patterns, repository pattern, testing
- `TRANSACTIONS.md` — Multi-table operations MUST use `transaction(db.primary) {}`

### Database Skills

- `/database-table-creator` — SQL migration → Exposed Table → Entity → Repository → Tests
- `/database-patterns` — Schema design, migrations, Exposed ORM patterns

### Database Commands

| Command | Purpose |
|---|---|
| `/spartan:migration "desc"` | Create versioned Flyway migration |
