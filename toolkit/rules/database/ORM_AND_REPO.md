# Exposed ORM and Repository Patterns

> Full guide: use /database-patterns skill

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

### Chaining WHERE Conditions

Calling `.where {}` twice **replaces** the first condition. Use `.andWhere {}` to add conditions:

```kotlin
// CORRECT — andWhere adds to existing condition
MyTable.selectAll()
  .where { MyTable.deletedAt.isNull() }
  .andWhere { MyTable.status eq "active" }

// WRONG — second where replaces the deletedAt filter!
MyTable.selectAll()
  .where { MyTable.deletedAt.isNull() }
  .where { MyTable.status eq "active" }  // REPLACES the first where!
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
- Table file: `module-repository/.../table/MyTable.kt` — defines column names
- Entity file: `module-repository/.../entity/MyEntity.kt` — defines property names

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

> Full guide: use `/testing-strategies` skill

**Key rules:**
- Extend `AbstractRepositoryTest`. Name: `Default{TableName}RepositoryTest`
- Required coverage: insert, update, byId (exists/not exists/soft deleted), deleteById, restoreById
- Use `dummyEntity()` helper with defaults. Use AssertJ assertions.
- Always run `./gradlew :module-repository:test` after modifying repository code
- Test edge cases: null optionals, empty lists, non-existent IDs, already-deleted entities

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
