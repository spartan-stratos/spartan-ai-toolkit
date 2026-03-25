---
name: database-patterns
description: Database design patterns including schema design, migrations, soft deletes, and Exposed ORM. Use when creating tables, writing migrations, or implementing repositories.
---

# Database Patterns — Quick Reference

## Migration Template

```sql
CREATE TABLE {table_name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- business columns here, always TEXT not VARCHAR
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  description TEXT,
  -- standard columns (required on ALL tables)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Updated_at trigger (required)
CREATE TRIGGER set_{table_name}_updated_at
  BEFORE UPDATE ON {table_name}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes (include deleted_at IS NULL for soft delete)
CREATE INDEX idx_{table_name}_status
  ON {table_name} (status)
  WHERE deleted_at IS NULL;
```

## Hard Rules

| Rule | Do | Don't |
|------|------|-------|
| Data types | TEXT | VARCHAR |
| Primary keys | UUID | SERIAL, BIGINT |
| Soft delete | deleted_at TIMESTAMP | DELETE FROM |
| Foreign keys | App-level validation | REFERENCES, ON DELETE CASCADE |
| Standard columns | id, created_at, updated_at, deleted_at | Skip any of these |

## Exposed Table Object

```kotlin
object EmployeesTable : UUIDTable("employees") {
  val name = text("name")
  val email = text("email")
  val status = text("status").default(EmployeeStatus.ACTIVE.value)
  val description = text("description").nullable()
  val createdAt = timestamp("created_at")
  val updatedAt = timestamp("updated_at").nullable()
  val deletedAt = timestamp("deleted_at").nullable()
}
```

## Entity Data Class

```kotlin
data class EmployeeEntity(
  override val id: UUID = UUID.randomUUID(),
  val name: String,
  val email: String,
  val status: String,
  val description: String?,
  override val createdAt: Instant,
  override val updatedAt: Instant?,
  override val deletedAt: Instant?
) : Entity<Instant>
```

## Repository Pattern

```kotlin
interface EmployeeRepository {
  fun insert(entity: EmployeeEntity): EmployeeEntity
  fun update(id: UUID, name: String?, status: String?): EmployeeEntity?
  fun byId(id: UUID): EmployeeEntity?
  fun byIds(ids: List<UUID>): List<EmployeeEntity>
  fun deleteById(id: UUID): EmployeeEntity?
}

class DefaultEmployeeRepository(
  private val db: DatabaseContext
) : EmployeeRepository {

  override fun byId(id: UUID): EmployeeEntity? {
    return transaction(db.replica) {
      EmployeesTable
        .selectAll()
        .where { (EmployeesTable.id eq id) and EmployeesTable.deletedAt.isNull() }
        .singleOrNull()
        ?.let { convert(it) }
    }
  }

  override fun deleteById(id: UUID): EmployeeEntity? {
    return transaction(db.primary) {
      EmployeesTable.update(
        where = { (EmployeesTable.id eq id) and EmployeesTable.deletedAt.isNull() }
      ) {
        it[deletedAt] = Instant.now()
        it[updatedAt] = Instant.now()
      }
      // Return the soft-deleted entity
      EmployeesTable
        .selectAll()
        .where { EmployeesTable.id eq id }
        .singleOrNull()
        ?.let { convert(it) }
    }
  }

  private fun convert(row: ResultRow) = EmployeeEntity(
    id = row[EmployeesTable.id].value,
    name = row[EmployeesTable.name],
    email = row[EmployeesTable.email],
    status = row[EmployeesTable.status],
    description = row[EmployeesTable.description],
    createdAt = row[EmployeesTable.createdAt],
    updatedAt = row[EmployeesTable.updatedAt],
    deletedAt = row[EmployeesTable.deletedAt]
  )
}
```

## When Creating a New Table

Full checklist:
1. SQL migration file (next number in sequence)
2. Table object in `module-repository/table/`
3. Entity data class in `module-repository/entity/`
4. Enum/constants in `module-repository/constant/` (if needed)
5. Repository interface + implementation
6. Factory bean for repository
7. Repository tests

## Flyway Rules

- NEVER add a migration that fills a gap in deployed sequence
- NEVER rename an already-deployed migration file
- Migration numbers must be sequential from the latest
- Keep migrations simple and focused (one table per migration)
