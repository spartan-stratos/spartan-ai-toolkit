# Database Schema Rules

> Full guide: use /database-patterns or /database-table-creator skill

## Core Principles
1. **Simplicity First** — Keep it simple, avoid over-engineering
2. **No Foreign Keys** — Handle relationships at application level
3. **No CASCADE** — Handle deletions in application
4. **Consistent Data Types** — Use TEXT instead of VARCHAR

## Schema Rules

### Table Design
- **No REFERENCES** — Never use foreign key constraints
- **No ON DELETE CASCADE** — Handle deletions in application
- **TEXT not VARCHAR** — Always use TEXT for strings
- **UUID primary keys** — `uuid_generate_v4()`
- **Soft delete** — Use `deleted_at TIMESTAMP`, never hard delete records
- Standard columns: `id`, `created_at`, `updated_at`, `deleted_at`

### Data Type Standards
- Strings: TEXT (not VARCHAR)
- IDs: UUID
- Dates: TIMESTAMP
- Booleans: BOOLEAN
- Flexible data: JSONB
- IP addresses: INET

### Naming Conventions
- Tables: plural, snake_case (users, user_sessions)
- Columns: snake_case (user_id, created_at)
- Indexes: idx_tablename_column (idx_users_email)
- Unique indexes: idx_tablename_column_unique

### Required Features
- Add indexes for frequently queried columns
- Add indexes for foreign key columns (even without constraints)
- Use triggers for updated_at automation
- Keep migrations simple and focused

### What NOT to Include
- No audit logs unless specifically asked
- No 2FA unless specifically asked
- No complex features unless needed
- No foreign key constraints
- No cascading deletes

### Application-Level Handling
Since we don't use database constraints, the application must:
- Validate foreign key relationships
- Handle cascading deletes
- Make sure data stays consistent
- Manage transactions properly

---

## Kotlin Code Synchronization Rules

### When Adding a New Table
You MUST create:
1. **SQL migration** in `migrations/sql/`
2. **Table object** in `module-repository/src/main/kotlin/com/yourcompany/postgresql/table/`
   - Extend `SoftDeleteTable`
   - Use `text()` for strings (not varchar)
   - Don't re-declare `createdAt`, `updatedAt`, `deletedAt` (inherited)
3. **Entity data class** in `module-repository/src/main/kotlin/com/yourcompany/postgresql/entity/`
   - Implement `Entity<Instant>` interface
   - Match all table columns
   - Use proper Kotlin types (String for TEXT, UUID for ids, Instant for timestamps)
4. **Constants/Enums** in `module-repository/src/main/kotlin/com/yourcompany/postgresql/constant/` if needed
   - Create enums for status fields
   - Create constants for roles/types
5. **Repository** in `module-repository/repository/` with soft delete support

### When Modifying a Table
You MUST update:
1. **Table object** — Add/remove/modify column definitions
2. **Entity data class** — Add/remove/modify properties to match
3. **Constants/Enums** — Update if column values changed

### When Deleting a Table
You MUST delete:
1. **Table object** file
2. **Entity data class** file
3. **Related constants/enums** if no longer used

### File Naming Conventions
- Tables: `{TableName}Table.kt` (e.g., `UsersTable.kt`)
- Entities: `{TableName}Entity.kt` (e.g., `UserEntity.kt`)
- Constants: `{FieldName}.kt` (e.g., `UserStatus.kt`, `UserRole.kt`)

### Package Structure
```
module-repository/src/main/kotlin/
├── com/yourcompany/postgresql/
│   ├── table/          # Exposed table definitions
│   ├── entity/         # Data class entities
│   └── constant/       # Enums and constants
└── spartan/exposed/codegen/
    └── Entity.kt       # Base Entity interface
```

### Example Synchronization
When SQL migration adds:
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);
```

You MUST create:
1. `ProductsTable.kt` with all columns
2. `ProductEntity.kt` implementing Entity<Instant>
3. `ProductStatus.kt` enum for status values
4. `ProductRepository.kt` with CRUD operations

---

## Additional Standards (merged from DATABASE_DESIGN.md)

### UUID Generation
- **Always use `uuid_generate_v4()`** — NOT `gen_random_uuid()`
- Ensure consistency across all migrations

### Trigger Functions
- **Reuse existing `update_updated_at()` function** from `000-init.sql`
- Do NOT create duplicate trigger functions in each migration

### Index Strategy for Soft Deletes
- Create **partial indexes** for active record queries:
  ```sql
  CREATE INDEX idx_table_active ON table_name(column) WHERE deleted_at IS NULL;
  ```
- Create **separate index** for cleanup queries:
  ```sql
  CREATE INDEX idx_table_deleted ON table_name(deleted_at) WHERE deleted_at IS NOT NULL;
  ```

### Exposed ORM Compatibility
- Use `TEXT` for flexible data fields (contains JSON) — Exposed reads as String
- JSONB columns use `text()` in Exposed Table definition, serialize/deserialize in Entity
