---
name: spartan:migration
description: Create a database migration script following company DATABASE_RULES (TEXT not VARCHAR, no FK, soft deletes, UUID PKs)
argument-hint: "[description of the migration]"
---

Create a migration for: {{ args[0] }}

**Before creating, read:** `rules/database/SCHEMA.md`

## Hard Rules (from DATABASE_RULES)
- **TEXT not VARCHAR** — always
- **No REFERENCES / foreign keys** — handle at application level
- **No CASCADE** — handle deletions in application
- **UUID primary keys** — `gen_random_uuid()`
- **Soft delete** — `deleted_at TIMESTAMP`, never hard delete
- **Standard columns** on every table: `id`, `created_at`, `updated_at`, `deleted_at`

## Steps

1. **Find the next migration version**:
   ```bash
   ls src/main/resources/db/migration/ | sort | tail -5
   ```
   Use the next version number (e.g., if last is V7, create V8).

2. **Create the migration file**:
   Path: `src/main/resources/db/migration/V{N}__{snake_case_description}.sql`

3. **Template for new table**:
```sql
-- Migration: {{ args[0] }}
-- Reason: [explain business need]

CREATE TABLE IF NOT EXISTS table_name (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- business columns here (always TEXT, never VARCHAR)
    name        TEXT        NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'active',
    description TEXT,
    -- NO REFERENCES / FOREIGN KEYS — handle at application level
    -- standard columns (required on ALL tables)
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP
);

CREATE INDEX idx_table_name_column ON table_name(column);
CREATE INDEX idx_table_name_deleted_at ON table_name(deleted_at);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_table_name_updated_at
    BEFORE UPDATE ON table_name
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- To rollback:
-- DROP TABLE IF EXISTS table_name;
```

4. **Template for ALTER TABLE**:
```sql
-- Migration: {{ args[0] }}

ALTER TABLE existing_table
    ADD COLUMN IF NOT EXISTS new_column TEXT,
    ADD COLUMN IF NOT EXISTS another_col BOOLEAN NOT NULL DEFAULT false;

-- To rollback:
-- ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;
```

5. **After creating, also generate Exposed Table object** using `/database-table-creator` skill if this is a new table.

After creating, verify:
```bash
./gradlew flywayValidate
```
