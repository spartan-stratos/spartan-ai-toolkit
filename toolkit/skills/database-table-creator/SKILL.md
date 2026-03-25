---
name: database-table-creator
description: Creates database table with full Kotlin synchronization (SQL migration → Table → Entity → Repository → Tests). Use when adding new database tables or entities.
allowed_tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Database Table Creator Skill

Creates complete database table implementation with SQL migration, Kotlin code, and comprehensive tests.

## What This Skill Does

Generates:
1. **SQL Migration** - PostgreSQL table with soft deletes, indexes, triggers
2. **Kotlin Table Object** - Exposed ORM table definition (extends UUIDTable)
3. **Entity Data Class** - Kotlin entity implementing Entity<Instant>
4. **Repository Interface + Implementation** - CRUD operations with soft delete
5. **Repository Tests** - Comprehensive test coverage (7+ tests)
6. **Factory Bean** - Dependency injection registration

## Critical Rules

### Database Design (.claude/rules/project/DATABASE_RULES.md)

**SQL Requirements**:
- ❌ NO foreign key constraints (NEVER use REFERENCES or FOREIGN KEY)
- ✅ Use TEXT for strings (NOT VARCHAR)
- ✅ Include: id (UUID), created_at, updated_at, deleted_at
- ✅ ALL indexes MUST have `WHERE deleted_at IS NULL`
- ✅ Add soft delete index: `WHERE deleted_at IS NOT NULL`
- ✅ Add update trigger for updated_at

**Kotlin Requirements**:
- ✅ Table MUST extend `UUIDTable` (NOT `Table`)
- ✅ Entity MUST implement `Entity<Instant>`
- ✅ ALL queries MUST filter `deletedAt.isNull()`
- ❌ NO `!!` operators (forbidden by pre-commit hooks)
- ✅ Soft delete only (set deletedAt, never hard delete)

## Workflow

### Step 1: Create SQL Migration

Location: `database-migration/sql/{number}-{description}.sql`

```sql
-- ============================================================================
-- Description: [Describe what this migration does]
-- Table: {table_name}
-- ============================================================================

CREATE TABLE {table_name} (
    -- Primary key (REQUIRED)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Business columns
    name TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'active',
    user_id UUID,
    count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,

    -- Standard timestamps (REQUIRED)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Unique index (allows duplicate soft-deleted records)
CREATE UNIQUE INDEX idx_{table_name}_email_unique
    ON {table_name}(email) WHERE deleted_at IS NULL;

-- Foreign key index (NO FK constraint, just index)
CREATE INDEX idx_{table_name}_user_id
    ON {table_name}(user_id) WHERE deleted_at IS NULL;

-- Soft delete index (REQUIRED)
CREATE INDEX idx_{table_name}_deleted_at
    ON {table_name}(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update trigger (REQUIRED)
CREATE TRIGGER update_{table_name}_updated_at
BEFORE UPDATE ON {table_name}
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

**Critical**:
- Use TEXT not VARCHAR
- NO REFERENCES or FOREIGN KEY
- ALL indexes have WHERE clause
- Soft delete index required
- Update trigger required

### Step 2: Run Migration

```bash
./gradlew :app:module-repository:flywayMigrate
```

Verify success before proceeding.

### Step 3: Create Kotlin Table Object

Location: `app/module-repository/src/main/kotlin/insight/c0x12c/postgresql/table/{TableName}Table.kt`

```kotlin
package insight.c0x12c.postgresql.table

import org.jetbrains.exposed.dao.id.UUIDTable
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object {TableName}Table : UUIDTable("{table_name}") {  // ✓ MUST extend UUIDTable
  // Business columns
  val name = text("name")  // ✓ Use text() not varchar()
  val email = text("email").nullable()
  val status = text("status").default("active")
  val userId = uuid("user_id").nullable()
  val count = integer("count").default(0)
  val isActive = bool("is_active").default(true)
  val metadata = jsonb<Map<String, Any>>("metadata").nullable()

  // Standard timestamps (REQUIRED)
  val createdAt = timestamp("created_at").clientDefault { Instant.now() }
  val updatedAt = timestamp("updated_at").nullable()
  val deletedAt = timestamp("deleted_at").nullable()
}
```

**Key Points**:
- MUST extend `UUIDTable` (not `Table`)
- Use `text()` for strings (not `varchar()`)
- Column names match SQL exactly (snake_case in SQL)
- Use `.nullable()` for optional fields
- All three timestamp columns required

### Step 4: Create Entity Data Class

Location: `app/module-repository/src/main/kotlin/insight/c0x12c/postgresql/entity/{TableName}Entity.kt`

```kotlin
package insight.c0x12c.postgresql.entity

import java.time.Instant
import java.util.UUID

data class {TableName}Entity(
  override val id: UUID = UUID.randomUUID(),  // ✓ Override from Entity
  val name: String,
  val email: String? = null,
  val status: String = "active",
  val userId: UUID? = null,
  val count: Int = 0,
  val isActive: Boolean = true,
  val metadata: Map<String, Any>? = null,
  override val createdAt: Instant = Instant.now(),  // ✓ Override
  override val updatedAt: Instant? = null,  // ✓ Override
  override val deletedAt: Instant? = null  // ✓ Override
) : Entity<Instant>  // ✓ MUST implement Entity<Instant>
```

**Key Points**:
- MUST be `data class`
- MUST implement `Entity<Instant>`
- MUST override: id, createdAt, updatedAt, deletedAt
- Use proper Kotlin types (String for TEXT, UUID for ids, Instant for timestamps)
- Nullable fields have `? = null` defaults

### Step 5: Create Constants/Enums (if needed)

Location: `app/module-repository/src/main/kotlin/insight/c0x12c/postgresql/constant/`

```kotlin
package insight.c0x12c.postgresql.constant

enum class {TableName}Status {
  ACTIVE,
  INACTIVE,
  ARCHIVED
}
```

Create enums for status, type, or role columns.

### Step 6: Create Repository Interface

Location: `app/module-repository/src/main/kotlin/insight/c0x12c/postgresql/repository/{TableName}Repository.kt`

```kotlin
package insight.c0x12c.postgresql.repository

import insight.c0x12c.postgresql.entity.{TableName}Entity
import java.util.UUID

interface {TableName}Repository {
  fun insert(entity: {TableName}Entity): {TableName}Entity
  fun update(id: UUID, name: String?, email: String?): {TableName}Entity?
  fun byId(id: UUID): {TableName}Entity?
  fun byEmail(email: String): {TableName}Entity?
  fun deleteById(id: UUID): {TableName}Entity?
  fun restoreById(id: UUID): {TableName}Entity?
}
```

### Step 7: Create Repository Implementation

Location: `app/module-repository/src/main/kotlin/insight/c0x12c/postgresql/repository/Default{TableName}Repository.kt`

```kotlin
package insight.c0x12c.postgresql.repository

import com.c0x12c.database.DatabaseContext
import insight.c0x12c.postgresql.entity.{TableName}Entity
import insight.c0x12c.postgresql.table.{TableName}Table
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant
import java.util.UUID

class Default{TableName}Repository(
  private val db: DatabaseContext
) : {TableName}Repository {

  override fun insert(entity: {TableName}Entity): {TableName}Entity {
    return transaction(db.primary) {  // ✓ Use db.primary for writes
      {TableName}Table.insert {
        it[id] = entity.id
        it[name] = entity.name
        it[email] = entity.email
        it[status] = entity.status
        // ... map all fields
        it[createdAt] = entity.createdAt
        it[updatedAt] = entity.updatedAt
        it[deletedAt] = entity.deletedAt
      }
      entity
    }
  }

  override fun update(
    id: UUID,
    name: String?,
    email: String?
  ): {TableName}Entity? {
    return transaction(db.primary) {
      val updated = {TableName}Table.update(
        where = {
          {TableName}Table.id eq id and
          {TableName}Table.deletedAt.isNull()  // ✓ CRITICAL: Filter soft deletes
        }
      ) {
        name?.let { value -> it[{TableName}Table.name] = value }
        email?.let { value -> it[{TableName}Table.email] = value }
        // updatedAt automatically set by trigger
      }
      if (updated > 0) byId(id) else null
    }
  }

  override fun byId(id: UUID): {TableName}Entity? {
    return transaction(db.replica) {  // ✓ Use db.replica for reads
      {TableName}Table
        .selectAll()
        .where { {TableName}Table.id eq id }
        .andWhere { {TableName}Table.deletedAt.isNull() }  // ✓ CRITICAL
        .map { convert(it) }
        .singleOrNull()  // ✓ Return null if not found
    }
  }

  override fun byEmail(email: String): {TableName}Entity? {
    return transaction(db.replica) {
      {TableName}Table
        .selectAll()
        .where { {TableName}Table.email eq email }
        .andWhere { {TableName}Table.deletedAt.isNull() }  // ✓ ALWAYS filter
        .map { convert(it) }
        .singleOrNull()
    }
  }

  override fun deleteById(id: UUID): {TableName}Entity? {
    return transaction(db.primary) {
      val updated = {TableName}Table.update(
        where = {
          {TableName}Table.id eq id and
          {TableName}Table.deletedAt.isNull()  // ✓ Only delete active records
        }
      ) {
        it[deletedAt] = Instant.now()  // ✓ Soft delete: set timestamp
      }
      if (updated > 0) {
        // Return soft-deleted entity
        {TableName}Table
          .selectAll()
          .where { {TableName}Table.id eq id }
          .map { convert(it) }
          .singleOrNull()
      } else null
    }
  }

  override fun restoreById(id: UUID): {TableName}Entity? {
    return transaction(db.primary) {
      val updated = {TableName}Table.update(
        where = {
          {TableName}Table.id eq id and
          {TableName}Table.deletedAt.isNotNull()  // ✓ Only restore deleted
        }
      ) {
        it[deletedAt] = null  // ✓ Restore: clear timestamp
      }
      if (updated > 0) byId(id) else null
    }
  }

  // ✓ Private helper for mapping
  private fun convert(row: ResultRow): {TableName}Entity {
    return {TableName}Entity(
      id = row[{TableName}Table.id].value,  // ✓ UUID needs .value
      name = row[{TableName}Table.name],
      email = row[{TableName}Table.email],
      status = row[{TableName}Table.status],
      userId = row[{TableName}Table.userId],
      count = row[{TableName}Table.count],
      isActive = row[{TableName}Table.isActive],
      metadata = row[{TableName}Table.metadata],
      createdAt = row[{TableName}Table.createdAt],
      updatedAt = row[{TableName}Table.updatedAt],
      deletedAt = row[{TableName}Table.deletedAt]
    )
  }
}
```

**Critical**:
- Use `transaction(db.primary)` for writes
- Use `transaction(db.replica)` for reads
- ALWAYS filter `deletedAt.isNull()` in queries
- Soft delete sets `deletedAt = Instant.now()`
- Return null when not found (don't throw)
- NO `!!` operators anywhere

### Step 8: Register Factory Bean

Edit `app/module-repository/src/main/kotlin/insight/c0x12c/runtime/factory/RepositoryFactory.kt`:

```kotlin
@Factory
class RepositoryFactory {

  @Singleton
  fun provide{TableName}Repository(db: DatabaseContext): {TableName}Repository {
    return Default{TableName}Repository(db)
  }
}
```

### Step 9: Write Repository Tests

Location: `app/module-repository/src/test/kotlin/insight/c0x12c/postgresql/repository/Default{TableName}RepositoryTest.kt`

```kotlin
package insight.c0x12c.postgresql.repository

import assertk.assertThat
import assertk.assertions.*
import insight.c0x12c.postgresql.entity.{TableName}Entity
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import jakarta.inject.Inject
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.util.UUID

@MicronautTest(environments = ["test"])
class Default{TableName}RepositoryTest : AbstractRepositoryTest() {

  @Inject
  lateinit var repository: {TableName}Repository

  @BeforeEach
  fun setup() {
    database.primary.truncateAllTables()
  }

  @Test
  fun `insert - creates entity successfully`() {
    val entity = dummyEntity()

    val result = repository.insert(entity)

    assertThat(result.id).isEqualTo(entity.id)
    assertThat(result.name).isEqualTo(entity.name)
  }

  @Test
  fun `update - updates selected fields only`() {
    val entity = repository.insert(dummyEntity())
    val newName = "Updated Name"

    val updated = repository.update(
      id = entity.id,
      name = newName,
      email = null
    )

    assertThat(updated).isNotNull()
    assertThat(updated?.name).isEqualTo(newName)
    assertThat(updated?.email).isEqualTo(entity.email)  // Unchanged
  }

  @Test
  fun `byId - returns entity when exists`() {
    val entity = repository.insert(dummyEntity())

    val result = repository.byId(entity.id)

    assertThat(result).isNotNull()
    assertThat(result?.id).isEqualTo(entity.id)
  }

  @Test
  fun `byId - returns null when not exists`() {
    val randomId = UUID.randomUUID()

    val result = repository.byId(randomId)

    assertThat(result).isNull()
  }

  @Test
  fun `byId - returns null when soft deleted`() {
    val entity = repository.insert(dummyEntity())
    repository.deleteById(entity.id)

    val result = repository.byId(entity.id)

    assertThat(result).isNull()  // ✓ Critical: soft deleted not returned
  }

  @Test
  fun `deleteById - soft deletes entity`() {
    val entity = repository.insert(dummyEntity())

    val deleted = repository.deleteById(entity.id)

    assertThat(deleted).isNotNull()
    assertThat(deleted?.deletedAt).isNotNull()  // ✓ Has timestamp
    assertThat(repository.byId(entity.id)).isNull()  // ✓ Not found
  }

  @Test
  fun `restoreById - restores soft deleted entity`() {
    val entity = repository.insert(dummyEntity())
    repository.deleteById(entity.id)

    val restored = repository.restoreById(entity.id)

    assertThat(restored).isNotNull()
    assertThat(restored?.deletedAt).isNull()  // ✓ Timestamp cleared
    assertThat(repository.byId(entity.id)).isNotNull()  // ✓ Found again
  }

  private fun dummyEntity(
    id: UUID = UUID.randomUUID(),
    name: String = randomText(),
    email: String = randomEmail()
  ) = {TableName}Entity(
    id = id,
    name = name,
    email = email
  )
}
```

**Required tests** (minimum 7):
1. Insert happy path
2. Update modifies fields
3. byId returns entity when exists
4. byId returns null when not exists
5. byId returns null when soft deleted ← **Critical**
6. deleteById soft deletes
7. restoreById restores soft deleted

### Step 10: Run Tests

```bash
# Run repository tests
./gradlew :app:module-repository:test --tests "Default{TableName}RepositoryTest"

# Run all tests
./gradlew test
```

All tests MUST pass.

## Common Mistakes to Avoid

> See `examples.md` for common mistakes and anti-patterns.

## Success Criteria

✅ SQL migration runs successfully
✅ Uses TEXT (not VARCHAR)
✅ NO foreign key constraints
✅ All indexes have WHERE clause
✅ Kotlin Table extends UUIDTable
✅ Entity implements Entity<Instant>
✅ All queries filter deletedAt.isNull()
✅ No !! operators
✅ Soft delete only (no hard delete)
✅ Factory bean registered
✅ All 7+ tests pass
