# Transaction Rules

## CRITICAL: Multi-Table Operations Must Use Transactions

### 1. Always Use Transactions for Multi-Table Operations
**Any operation that modifies data in 2 or more tables MUST be wrapped in a transaction.**

#### Why This Is Critical
- Ensures data consistency and integrity
- Prevents partial updates if one operation fails
- Allows rollback of all changes if any error occurs
- Maintains referential integrity between related tables
- Prevents orphaned records

### 2. Transaction Pattern for Managers

**Required pattern for multi-table operations:**

```kotlin
class DefaultSomeManager(
  private val db: DatabaseContext,  // MUST have DatabaseContext
  private val repository1: Repository1,
  private val repository2: Repository2
) : SomeManager {

  override suspend fun multiTableOperation(
    params: Params
  ): Either<ClientException, Result> {
    return transaction(db.primary) {
      try {
        // Operation 1 on table 1
        val result1 = repository1.insert(entity1)

        // Operation 2 on table 2
        val result2 = repository2.insert(entity2)

        // Return success
        Result.right()
      } catch (e: Exception) {
        rollback()
        ClientError.SOME_ERROR.asException().left()
      }
    }
  }
}
```

### 3. Examples of Operations That MUST Use Transactions

#### Creating Related Entities
```kotlin
// BAD - No transaction
override suspend fun createProject(request: CreateProjectRequest): Either<ClientException, Project> {
  val project = projectRepository.insert(projectEntity)
  val idea = projectIdeasRepository.insert(ideaEntity)  // Could fail, leaving orphaned project
  return toProject(project, idea).right()
}

// GOOD - With transaction
override suspend fun createProject(request: CreateProjectRequest): Either<ClientException, Project> {
  return transaction(db.primary) {
    try {
      val project = projectRepository.insert(projectEntity)
      val idea = projectIdeasRepository.insert(ideaEntity)
      toProject(project, idea).right()
    } catch (e: Exception) {
      rollback()
      ClientError.USER_NOT_FOUND.asException().left()
    }
  }
}
```

#### Updating Related Entities
```kotlin
// BAD - No transaction
override suspend fun submitIdea(projectId: UUID, request: SubmitIdeaRequest): Either<ClientException, Project> {
  val idea = projectIdeasRepository.insert(ideaEntity)
  projectRepository.update(projectId, status = ProjectStatus.VALIDATING)  // Could fail
  return project.right()
}

// GOOD - With transaction
override suspend fun submitIdea(projectId: UUID, request: SubmitIdeaRequest): Either<ClientException, Project> {
  return transaction(db.primary) {
    try {
      val idea = projectIdeasRepository.insert(ideaEntity)
      projectRepository.update(projectId, status = ProjectStatus.VALIDATING)
      project.right()
    } catch (e: Exception) {
      rollback()
      ClientError.USER_NOT_FOUND.asException().left()
    }
  }
}
```

#### Deleting Related Entities
```kotlin
// BAD - No transaction
override suspend fun deleteProject(projectId: UUID): Either<ClientException, Boolean> {
  projectRepository.deleteById(projectId)
  projectIdeasRepository.deleteByProjectId(projectId)  // Could fail, leaving orphaned ideas
  validationSessionsRepository.deleteByProjectId(projectId)  // Could fail
  return true.right()
}

// GOOD - With transaction
override suspend fun deleteProject(projectId: UUID): Either<ClientException, Boolean> {
  return transaction(db.primary) {
    try {
      // Delete in correct order (children first)
      validationSessionsRepository.deleteByProjectId(projectId)
      projectIdeasRepository.deleteByProjectId(projectId)
      projectRepository.deleteById(projectId)
      true.right()
    } catch (e: Exception) {
      rollback()
      ClientError.USER_NOT_FOUND.asException().left()
    }
  }
}
```

### 4. Manager Constructor Requirements

**When a manager needs to perform multi-table operations:**

```kotlin
// Manager Factory must provide DatabaseContext
@Singleton
fun provideProjectManager(
  databaseContext: DatabaseContext,  // REQUIRED for transactions
  projectRepository: ProjectRepository,
  projectIdeasRepository: ProjectIdeasRepository,
  validationSessionsRepository: ValidationSessionsRepository
): ProjectManager = DefaultProjectManager(
  db = databaseContext,
  projectRepository = projectRepository,
  projectIdeasRepository = projectIdeasRepository,
  validationSessionsRepository = validationSessionsRepository
)
```

### 5. Single Table Operations

**Single table operations DON'T need explicit transactions** (repositories handle them internally):

```kotlin
// OK - Single table operation
override suspend fun getProject(projectId: UUID): Either<ClientException, Project> {
  val project = projectRepository.byId(projectId)
    ?: return ClientError.USER_NOT_FOUND.asException().left()
  return project.right()
}
```

### 6. Common Scenarios Requiring Transactions

1. **Creating parent-child relationships**
   - Project + ProjectIdea
   - User + UserCredentials
   - Order + OrderItems

2. **Updating status across tables**
   - Updating project status when idea is submitted
   - Updating user status when subscription changes

3. **Cascading deletes**
   - Deleting project and all related data
   - Deleting user and all related records

4. **Complex business operations**
   - Processing payments (update multiple records)
   - Starting validation (create session + update project)

### 7. Transaction Checklist

Before implementing any manager method, ask:
- [ ] Does this operation touch more than one table?
- [ ] Could partial failure leave the database inconsistent?
- [ ] Are there parent-child relationships involved?
- [ ] Does the operation need to be atomic?

If ANY answer is YES → **USE A TRANSACTION**

### 8. Error Handling in Transactions

```kotlin
return transaction(db.primary) {
  try {
    // Your operations here
    successResult.right()
  } catch (e: Exception) {
    rollback()  // Always rollback on error
    // Log the actual error for debugging
    logger.error("Transaction failed", e)
    // Return appropriate client error
    ClientError.APPROPRIATE_ERROR.asException().left()
  }
}
```

### 9. Testing Transactions

Always test transaction rollback scenarios:
- Simulate failures in the second operation
- Verify first operation is rolled back
- Ensure no partial data remains

### Remember:
**When in doubt, use a transaction. It's better to have an unnecessary transaction than risk data inconsistency.**

---

## CRITICAL: Atomic Operations for Balance Updates

### 10. Race Condition Prevention with Atomic Operations

**Any operation that updates a numeric balance (points, allowance, count) for multiple records MUST use atomic SQL operations.**

#### Why This Is Critical
- Prevents race conditions when updating multiple records in a loop
- Avoids stale data issues from read-modify-write pattern
- Ensures accurate calculations even with concurrent requests

#### Bad Pattern (Race Condition Risk)
```kotlin
// BAD - Fetches data first, then uses stale values in loop
val receivers = userRepository.findByIds(receiverIds)  // Fetched at T=0

receivers.forEach { receiver ->
  userRepository.update(
    id = receiver.id,
    pointsBalance = receiver.pointsBalance + points  // Uses T=0 value, not current!
  )
}
```

**Problem**: If `receiver.pointsBalance` was 100 at fetch time, and another request updated it to 120 before this loop runs, this code will set it to 100 + 10 = 110 instead of 120 + 10 = 130.

#### Good Pattern (Atomic SQL Operations)
```kotlin
// GOOD - Uses SQL-level increment, always reads current value
receivers.forEach { receiver ->
  userRepository.incrementPointsBalance(receiver.id, points)
}
```

**Implementation in Repository:**
```kotlin
import org.jetbrains.exposed.sql.SqlExpressionBuilder.plus
import org.jetbrains.exposed.sql.SqlExpressionBuilder.minus

override fun incrementPointsBalance(id: UUID, amount: Int): UserEntity? {
  return transaction(db.primary) {
    val updated = UsersTable.update({
      (UsersTable.id eq id) and (UsersTable.deletedAt.isNull())
    }) {
      it[pointsBalance] = pointsBalance + amount  // SQL: points_balance = points_balance + ?
      it[updatedAt] = Instant.now()
    }
    if (updated > 0) {
      UsersTable.selectAll()
        .where { UsersTable.id eq id }
        .singleOrNull()
        ?.let { convert(it) }
    } else null
  }
}

override fun decrementAllowanceBalance(id: UUID, amount: Int): UserEntity? {
  return transaction(db.primary) {
    val updated = UsersTable.update({
      (UsersTable.id eq id) and (UsersTable.deletedAt.isNull())
    }) {
      it[allowanceBalance] = allowanceBalance - amount  // SQL: allowance_balance = allowance_balance - ?
      it[updatedAt] = Instant.now()
    }
    if (updated > 0) {
      UsersTable.selectAll()
        .where { UsersTable.id eq id }
        .singleOrNull()
        ?.let { convert(it) }
    } else null
  }
}
```

### 11. Common Scenarios Requiring Atomic Operations

1. **Recognition points distribution**
   - Incrementing receiver's points balance
   - Decrementing giver's allowance balance

2. **Redemption processing**
   - Deducting user's points on redeem
   - Refunding points on reject/cancel

3. **Any counter increment/decrement**
   - View counts, like counts, comment counts
   - Stock quantities, inventory levels

### 12. Atomic Operations Checklist

Before implementing any balance update, ask:
- [ ] Am I updating a numeric value that could be modified by concurrent requests?
- [ ] Am I using a value fetched earlier in the same method?
- [ ] Am I updating multiple records in a loop?

If ANY answer is YES → **USE ATOMIC SQL OPERATIONS**
