# Database Rules

> Full guide: use `/database-patterns` or `/database-table-creator` skill

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

## Exposed ORM Patterns (CRITICAL)

### Only `id` Uses `.value` — All Other UUID Columns Do NOT

`UUIDTable.id` returns `EntityID<UUID>` which needs `.value` to get the raw `UUID`.
All other `uuid()` columns return `UUID` directly — using `.value` on them causes compilation errors.

```kotlin
// CORRECT
fun toEntity(row: ResultRow) = MyEntity(
  id = row[MyTable.id].value,          // id -> EntityID<UUID> -> needs .value
  projectId = row[MyTable.projectId],  // uuid() column -> UUID directly
  userId = row[MyTable.userId],        // uuid() column -> UUID directly
  name = row[MyTable.name],            // text() column -> String directly
)

// WRONG — causes "Unresolved reference 'value'"
fun toEntity(row: ResultRow) = MyEntity(
  id = row[MyTable.id].value,
  projectId = row[MyTable.projectId].value,  // WRONG! uuid() returns UUID, not EntityID
  userId = row[MyTable.userId].value,        // WRONG!
)
```

**Rule**: In `toEntity()` / `convert()` methods, ONLY `row[Table.id].value` gets `.value`. Every other column maps directly without `.value`.

### SoftDeleteTable Base Class

All tables extend `SoftDeleteTable` which gives these columns automatically:
- `id` (from UUIDTable) — `EntityID<UUID>`
- `createdAt` — `Instant`
- `updatedAt` — `Instant?`
- `deletedAt` — `Instant?`

**Do NOT re-declare these columns in table definitions.**

```kotlin
// CORRECT
object MyTable : SoftDeleteTable("my_table") {
  val projectId = uuid("project_id")
  val name = text("name")
  // createdAt, updatedAt, deletedAt are inherited
}

// WRONG — re-declares inherited columns
object MyTable : SoftDeleteTable("my_table") {
  val projectId = uuid("project_id")
  val name = text("name")
  val createdAt = timestamp("created_at")  // Already in SoftDeleteTable!
}
```

### Entity Must Include All SoftDeleteTable Fields

Entity data classes MUST implement `Entity<Instant>` and include all fields from `SoftDeleteTable`:

```kotlin
data class MyEntity(
  override val id: UUID = UUID.randomUUID(),
  val projectId: UUID,
  val name: String,
  // ... domain fields ...
  override val createdAt: Instant = Instant.now(),
  override val updatedAt: Instant? = null,
  override val deletedAt: Instant? = null
) : Entity<Instant>
```

### toEntity() Must Map ALL Fields

When writing `toEntity()` / `convert()`, map EVERY column including SoftDeleteTable fields:

```kotlin
private fun toEntity(row: ResultRow) = MyEntity(
  id = row[MyTable.id].value,           // .value ONLY for id
  projectId = row[MyTable.projectId],   // NO .value
  name = row[MyTable.name],
  createdAt = row[MyTable.createdAt],
  updatedAt = row[MyTable.updatedAt],
  deletedAt = row[MyTable.deletedAt]
)
```

### Always Filter by `deletedAt.isNull()` for Soft Delete

Every SELECT query on a SoftDeleteTable MUST filter out soft-deleted records:

```kotlin
// CORRECT
fun byId(id: UUID): MyEntity? {
  return transaction(db.replica) {
    MyTable.selectAll()
      .where { MyTable.id eq id and MyTable.deletedAt.isNull() }
      .singleOrNull()
      ?.let { toEntity(it) }
  }
}

// WRONG — returns soft-deleted records
fun byId(id: UUID): MyEntity? {
  return transaction(db.replica) {
    MyTable.selectAll()
      .where { MyTable.id eq id }  // Missing deletedAt.isNull()!
      .singleOrNull()
      ?.let { toEntity(it) }
  }
}
```

### orderBy Uses `SortOrder.DESC` / `SortOrder.ASC`

```kotlin
import org.jetbrains.exposed.sql.SortOrder

// CORRECT
.orderBy(MyTable.createdAt, SortOrder.DESC)

// WRONG — causes compilation error
.orderBy(MyTable.createdAt to false)
```

### Transaction Usage

- **Reads**: `transaction(db.replica) { ... }`
- **Writes**: `transaction(db.primary) { ... }`

### insert() Must Include ALL Required Entity Fields

When inserting, map EVERY field from the entity to the table columns, including `deletedAt`:

```kotlin
fun insert(entity: MyEntity): MyEntity {
  return transaction(db.primary) {
    MyTable.insert {
      it[id] = entity.id
      it[projectId] = entity.projectId
      it[name] = entity.name
      // ... all domain fields ...
      it[createdAt] = entity.createdAt
      it[updatedAt] = entity.updatedAt
      it[deletedAt] = entity.deletedAt
    }
    entity
  }
}
```

### Field Names Must Match Entity/Table Exactly

When writing repositories, ALWAYS cross-reference the Table and Entity files:
- Table file: `app/module-repository/.../table/MyTable.kt` — defines column names
- Entity file: `app/module-repository/.../entity/MyEntity.kt` — defines property names

**Common mistakes to avoid:**
- Using field names from a different service (e.g., `triggeredBy` when the table uses `deployedBy`)
- Guessing field names instead of reading the actual Table/Entity definitions
- Missing fields that exist in the Entity but weren't mapped in insert/toEntity

### Ktlint Rules for DB Code

- **Always use braces for if/else** — Ktlint enforces braces on all `if`/`else` blocks, including single-expression ones:

```kotlin
// CORRECT
val result = if (condition) {
  valueA
} else {
  valueB
}

// WRONG — ktlint error: "Missing { ... }"
val result = if (condition) {
  valueA
} else valueB
```

- **Data classes must have at least one parameter** — If a request/DTO truly has no fields, use a regular class or add an optional field:

```kotlin
// CORRECT
data class StartRequest(
  val notes: String? = null
)

// WRONG — compilation error
data class StartRequest(
  // empty body
)
```

---

## Kotlin Code Synchronization Rules

### When Adding a New Table
You MUST create:
1. **SQL migration** in `database-migration/sql/`
2. **Table object** in `app/module-repository/src/main/kotlin/insight/c0x12c/postgresql/table/`
   - Extend `SoftDeleteTable`
   - Use `text()` for strings (not varchar)
   - Don't re-declare `createdAt`, `updatedAt`, `deletedAt` (inherited)
3. **Entity data class** in `app/module-repository/src/main/kotlin/insight/c0x12c/postgresql/entity/`
   - Implement `Entity<Instant>` interface
   - Match all table columns
   - Use proper Kotlin types (String for TEXT, UUID for ids, Instant for timestamps)
4. **Constants/Enums** in `app/module-repository/src/main/kotlin/insight/c0x12c/postgresql/constant/` if needed
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
app/module-repository/src/main/kotlin/
├── insight/c0x12c/postgresql/
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

## Repository Pattern

### Creating a Repository
You MUST create a repository for each table with:

1. **Interface Definition**
   - Define all CRUD operations needed
   - Use domain-specific method names (e.g., `byEmail`, `byToken`)
   - Return entities, not raw database rows
   - Support soft delete operations

2. **Implementation Class**
   - Name: `Default{TableName}Repository`
   - Constructor: Accept `DatabaseContext`
   - Use transactions: `db.primary` for writes, `db.replica` for reads
   - Use soft delete (update `deletedAt`) not hard delete

3. **Standard Methods**
   ```kotlin
   fun insert(entity: Entity): Entity
   fun update(id: UUID, ...fields): Entity?
   fun byId(id: UUID): Entity?
   fun byIds(ids: List<UUID>): List<Entity>
   fun deleteById(id: UUID): Entity?  // Soft delete
   fun restoreById(id: UUID): Entity?  // Restore soft deleted
   ```

4. **Query Patterns**
   - Always check `deletedAt.isNull()` for active records
   - Update `updatedAt` on every modification
   - Use `convert()` method to transform ResultRow to Entity
   - Handle empty lists gracefully

### Repository File Structure
```kotlin
interface {TableName}Repository {
    // Method declarations
}

class Default{TableName}Repository(
    private val db: DatabaseContext
) : {TableName}Repository {

    // Method implementations

    private fun convert(row: ResultRow): Entity = Entity(
        // Map all columns to entity properties
    )
}
```

---

## Testing

### Repository Test Rules
Every repository MUST have test coverage following these rules:

1. **Test Class Structure**
   - Extend `AbstractRepositoryTest` base class
   - Name: `Default{TableName}RepositoryTest`
   - Location: `app/module-repository/src/test/kotlin/insight/c0x12c/postgresql/repository/`
   - Clean database state in `@BeforeEach` method

2. **Required Test Coverage**
   ```kotlin
   @Test fun `insert - happy path`()
   @Test fun `update - updates selected fields`()
   @Test fun `byId - returns entity when exists`()
   @Test fun `byId - returns null when not exists`()
   @Test fun `byId - returns null when soft deleted`()
   @Test fun `deleteById - soft deletes entity`()
   @Test fun `restoreById - restores soft deleted entity`()
   ```

3. **Test Helper Methods**
   Use methods from `AbstractRepositoryTest`:
   - `randomText()` — Generate random strings
   - `randomEmail()` — Generate random emails
   - `randomInt()` — Generate random integers
   - `randomUUID()` — Generate random UUIDs

4. **Test Data Builders**
   Create helper methods for test entities:
   ```kotlin
   private fun dummyEntity(
       id: UUID = UUID.randomUUID(),
       // other fields with defaults
   ) = Entity(...)
   ```

5. **Assertion Patterns**
   ```kotlin
   // Use AssertJ for assertions
   assertThat(result).isNotNull
   assertThat(result).isEqualTo(expected)
   assertThat(list).hasSize(3)
   assertThat(entity.deletedAt).isNull()

   // Compare entities ignoring timestamps
   assertThat(result)
       .usingCustomRecursiveComparison()
       .ignoringFields("createdAt", "updatedAt")
       .isEqualTo(expected)
   ```

6. **Edge Case Testing**
   - Null values for optional fields
   - Empty lists for batch operations
   - Non-existent IDs for queries
   - Already deleted entities
   - Concurrent operations (if applicable)

7. **Running Tests**
   ```bash
   # Run all repository tests
   ./gradlew :app:module-repository:test

   # Run specific test class
   ./gradlew :app:module-repository:test --tests "ai.insight.postgresql.repository.DefaultUserRepositoryTest"

   # Run with detailed output
   ./gradlew :app:module-repository:test --info
   ```

8. **Test Verification Rule**
   **ALWAYS run tests after modifying any repository code:**
   - Run tests before committing changes
   - Fix any failing tests right away
   - Make sure 100% pass rate
   - Update tests when changing repository behavior

### Common Test Patterns

**Soft Delete Testing:**
```kotlin
@Test
fun `deleteById - soft deletes entity`() {
    val entity = repository.insert(dummyEntity())

    val deleted = repository.deleteById(entity.id)

    assertThat(deleted?.deletedAt).isNotNull
    assertThat(repository.byId(entity.id)).isNull()
}
```

**Update Testing:**
```kotlin
@Test
fun `update - only updates provided fields`() {
    val entity = repository.insert(dummyEntity())

    val updated = repository.update(
        id = entity.id,
        name = "New Name"
        // Other fields stay the same
    )

    assertThat(updated?.name).isEqualTo("New Name")
    assertThat(updated?.otherField).isEqualTo(entity.otherField)
}
```

**Query Testing:**
```kotlin
@Test
fun `byEmail - returns null when soft deleted`() {
    val entity = repository.insert(dummyEntity())
    repository.deleteById(entity.id)

    val result = repository.byEmail(entity.email)

    assertThat(result).isNull()
}
```

### Test Maintenance
- Update tests when SQL schema changes
- Add tests for new repository methods
- Remove tests for deleted stuff
- Keep test data builders up to date
- Make sure tests stay fast and isolated

---

## Checklist Before Writing Repository Code

- [ ] Read the Table file to know exact column names and types
- [ ] Read the Entity file to know exact property names and types
- [ ] Only `.value` on `id` column, never on other uuid columns
- [ ] Include `deletedAt.isNull()` in ALL select queries
- [ ] Use `SortOrder.DESC`/`SortOrder.ASC` for orderBy (import `org.jetbrains.exposed.sql.SortOrder`)
- [ ] Map ALL fields in `insert()` including `createdAt`, `updatedAt`, `deletedAt`
- [ ] Map ALL fields in `toEntity()` including `createdAt`, `updatedAt`, `deletedAt`
- [ ] Use `db.primary` for writes, `db.replica` for reads
- [ ] Always use braces for if/else blocks (ktlint)

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
