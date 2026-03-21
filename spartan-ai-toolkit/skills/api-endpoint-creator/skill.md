---
name: API Endpoint Creator
description: Creates REST endpoint following layered architecture (Controller → Manager → Repository). Use when creating new API endpoints or CRUD operations.
allowed_tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# API Endpoint Creator Skill

Creates complete REST API endpoints following strict layered architecture patterns.

## What This Skill Does

Generates:
1. **Controller** - Thin HTTP handler (@ExecuteOn, @Secured, delegates to Manager)
2. **Manager Interface** - Business logic contract (returns `Either<ClientException, T>`)
3. **Manager Implementation** - Business logic with transaction management
4. **Response/Request Models** - In module-client (never inline in controllers)
5. **Factory Bean** - DI registration
6. **Retrofit Client** - For integration tests
7. **Integration Tests** - Using Retrofit clients

## Critical Rules

### RESTful API with Query Parameters (Not Path Params)

This project uses **query parameters for all IDs** and RESTful endpoints:

```
GET  /api/v1/employees              # List employees (plural)
GET  /api/v1/employee               # Get one employee (?id=xxx)
POST /api/v1/employee               # Create employee
POST /api/v1/employee/update        # Update employee
POST /api/v1/employee/delete        # Delete employee (soft)
```

**Rules from API_RULES.md:**
- NEVER use path parameters (`/{id}`)
- Use query parameters: `@QueryValue id: UUID`
- Singular nouns for single resource, plural for collections
- Use verb sub-paths for actions (`/delete`, `/restore`)

### Layered Architecture

```
HTTP Request → Controller → Manager → Repository → Database
```

**Controller**: Thin (just delegation), HTTP annotations, @ExecuteOn(TaskExecutors.IO), @Secured, unwrap Either with `.throwOrValue()`

**Manager**: All business logic, returns `Either<ClientException, T>`, wraps DB operations in transactions, never throws exceptions

**Repository**: Data access only (already exists)

### NO !! Operator

```kotlin
val employee = employeeRepository.byId(id)
  ?: return ClientError.EMPLOYEE_NOT_FOUND.asException().left()
```

## Workflow

### Step 1: Create Response/Request Models

Location: `app/module-client/src/main/kotlin/insight/c0x12c/client/response/{domain}/`

```kotlin
package insight.c0x12c.client.response.{domain}

import insight.c0x12c.postgresql.entity.{Domain}Entity
import java.time.Instant
import java.util.UUID

data class {Domain}Response(
  val id: UUID,
  val name: String,
  val status: String,
  val createdAt: Instant,
  val updatedAt: Instant?
) {
  companion object {
    fun from(entity: {Domain}Entity): {Domain}Response = {Domain}Response(
      id = entity.id,
      name = entity.name,
      status = entity.status,
      createdAt = entity.createdAt,
      updatedAt = entity.updatedAt
    )
  }
}

data class {Domain}ListResponse(
  val items: List<{Domain}Response>,
  val total: Int,
  val page: Int,
  val limit: Int,
  val hasMore: Boolean
)
```

Location: `app/module-client/src/main/kotlin/insight/c0x12c/client/request/{domain}/`

```kotlin
package insight.c0x12c.client.request.{domain}

data class Create{Domain}Request(
  val name: String,
  val description: String? = null
)

data class Update{Domain}Request(
  val name: String? = null,
  val description: String? = null,
  val status: String? = null
)
```

**Key**: All models in module-client, never in controllers or managers.

### Step 2: Create Controller

Location: `app/api-application/src/main/kotlin/insight/c0x12c/controller/{Domain}Controller.kt`

```kotlin
package insight.c0x12c.controller

import insight.c0x12c.{domain}.contract.{Domain}Manager
import insight.c0x12c.client.request.{domain}.Create{Domain}Request
import insight.c0x12c.client.request.{domain}.Update{Domain}Request
import insight.c0x12c.client.response.{domain}.{Domain}Response
import insight.c0x12c.client.response.{domain}.{Domain}ListResponse
import insight.c0x12c.exception.throwOrValue
import io.micronaut.http.annotation.*
import io.micronaut.scheduling.TaskExecutors
import io.micronaut.scheduling.annotation.ExecuteOn
import io.micronaut.security.annotation.Secured
import io.micronaut.validation.Validated
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import java.util.UUID

@ExecuteOn(TaskExecutors.IO)
@Validated
@Controller("/api/v1/{domain}")
@Tag(name = "{Domain}", description = "{Domain} API")
@Secured(SecurityRule.IS_AUTHENTICATED)
class {Domain}Controller(
  private val {domain}Manager: {Domain}Manager
) {

  @Get("/{domain}s")
  suspend fun list(
    @QueryValue page: Int?,
    @QueryValue limit: Int?,
    @QueryValue status: String?
  ): {Domain}ListResponse {
    return {domain}Manager.list(
      page = page ?: 1,
      limit = limit ?: 20,
      status = status
    ).throwOrValue()
  }

  @Get("/{domain}")
  suspend fun getById(
    @QueryValue id: UUID
  ): {Domain}Response {
    return {domain}Manager.byId(id).throwOrValue()
  }

  @Post("/{domain}")
  suspend fun create(
    @Valid @Body request: Create{Domain}Request
  ): {Domain}Response {
    return {domain}Manager.create(request).throwOrValue()
  }

  @Post("/{domain}/update")
  suspend fun update(
    @QueryValue id: UUID,
    @Valid @Body request: Update{Domain}Request
  ): {Domain}Response {
    return {domain}Manager.update(id, request).throwOrValue()
  }

  @Post("/{domain}/delete")
  suspend fun delete(
    @QueryValue id: UUID
  ): Boolean {
    return {domain}Manager.deleteById(id).throwOrValue()
  }
}
```

**Key Points**:
- `@ExecuteOn(TaskExecutors.IO)` required for suspend functions
- Query params for ALL identifiers (`@QueryValue id: UUID`)
- Thin methods - just delegate to manager
- `.throwOrValue()` to unwrap Either
- Inject Manager only (never Repository)
- NO inline data classes

### Step 3: Create Manager Interface

Location: `app/module-{domain}/module-api/src/main/kotlin/insight/c0x12c/{domain}/contract/{Domain}Manager.kt`

```kotlin
package insight.c0x12c.{domain}.contract

import arrow.core.Either
import insight.c0x12c.client.request.{domain}.Create{Domain}Request
import insight.c0x12c.client.request.{domain}.Update{Domain}Request
import insight.c0x12c.client.response.{domain}.{Domain}Response
import insight.c0x12c.client.response.{domain}.{Domain}ListResponse
import insight.c0x12c.exception.ClientException
import java.util.UUID

interface {Domain}Manager {
  suspend fun list(
    page: Int,
    limit: Int,
    status: String?
  ): Either<ClientException, {Domain}ListResponse>

  suspend fun byId(id: UUID): Either<ClientException, {Domain}Response>

  suspend fun create(
    request: Create{Domain}Request
  ): Either<ClientException, {Domain}Response>

  suspend fun update(
    id: UUID,
    request: Update{Domain}Request
  ): Either<ClientException, {Domain}Response>

  suspend fun deleteById(id: UUID): Either<ClientException, Boolean>
}
```

### Step 4: Create Manager Implementation

Location: `app/module-{domain}/module-impl/src/main/kotlin/insight/c0x12c/{domain}/impl/Default{Domain}Manager.kt`

```kotlin
package insight.c0x12c.{domain}.impl

import arrow.core.Either
import arrow.core.left
import arrow.core.right
import com.c0x12c.database.DatabaseContext
import insight.c0x12c.{domain}.contract.{Domain}Manager
import insight.c0x12c.client.request.{domain}.Create{Domain}Request
import insight.c0x12c.client.request.{domain}.Update{Domain}Request
import insight.c0x12c.client.response.{domain}.{Domain}Response
import insight.c0x12c.client.response.{domain}.{Domain}ListResponse
import insight.c0x12c.exception.ClientError
import insight.c0x12c.exception.ClientException
import insight.c0x12c.postgresql.entity.{Domain}Entity
import insight.c0x12c.postgresql.repository.{Domain}Repository
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.UUID

class Default{Domain}Manager(
  private val {domain}Repository: {Domain}Repository,
  private val db: DatabaseContext
) : {Domain}Manager {

  override suspend fun byId(id: UUID): Either<ClientException, {Domain}Response> {
    val entity = {domain}Repository.byId(id)
      ?: return ClientError.{DOMAIN}_NOT_FOUND.asException().left()

    return {Domain}Response.from(entity).right()
  }

  override suspend fun create(
    request: Create{Domain}Request
  ): Either<ClientException, {Domain}Response> {
    val entity = {Domain}Entity(
      name = request.name,
      description = request.description
    )

    val inserted = transaction(db.primary) {
      {domain}Repository.insert(entity)
    }

    return {Domain}Response.from(inserted).right()
  }

  override suspend fun update(
    id: UUID,
    request: Update{Domain}Request
  ): Either<ClientException, {Domain}Response> {
    val existing = {domain}Repository.byId(id)
      ?: return ClientError.{DOMAIN}_NOT_FOUND.asException().left()

    val updated = transaction(db.primary) {
      {domain}Repository.update(
        id = id,
        name = request.name,
        description = request.description,
        status = request.status
      )
    } ?: return ClientError.{DOMAIN}_NOT_FOUND.asException().left()

    return {Domain}Response.from(updated).right()
  }

  override suspend fun deleteById(id: UUID): Either<ClientException, Boolean> {
    val deleted = transaction(db.primary) {
      {domain}Repository.deleteById(id)
    }

    return if (deleted != null) {
      true.right()
    } else {
      ClientError.{DOMAIN}_NOT_FOUND.asException().left()
    }
  }
}
```

**Key Points**:
- Use `{Domain}Response.from(entity)` for conversions (companion object pattern)
- `transaction(db.primary)` for writes
- Return `Either.left()` for errors, `Either.right()` for success
- NO `!!` operators

### Step 5: Register Factory Bean

Location: `app/module-{domain}/module-impl/src/main/kotlin/insight/c0x12c/runtime/factory/{Domain}ManagerFactory.kt`

```kotlin
package insight.c0x12c.runtime.factory

import com.c0x12c.database.DatabaseContext
import insight.c0x12c.{domain}.impl.Default{Domain}Manager
import insight.c0x12c.{domain}.contract.{Domain}Manager
import insight.c0x12c.postgresql.repository.{Domain}Repository
import io.micronaut.context.annotation.Factory
import jakarta.inject.Singleton

@Factory
class {Domain}ManagerFactory {

  @Singleton
  fun provide{Domain}Manager(
    {domain}Repository: {Domain}Repository,
    db: DatabaseContext
  ): {Domain}Manager {
    return Default{Domain}Manager({domain}Repository, db)
  }
}
```

### Step 6: Create Retrofit Client

Location: `app/module-client/src/main/kotlin/insight/c0x12c/client/{Domain}Client.kt`

```kotlin
package insight.c0x12c.client

import insight.c0x12c.client.request.{domain}.Create{Domain}Request
import insight.c0x12c.client.request.{domain}.Update{Domain}Request
import insight.c0x12c.client.response.{domain}.{Domain}Response
import insight.c0x12c.client.response.{domain}.{Domain}ListResponse
import retrofit2.http.*
import java.util.UUID

interface {Domain}Client {

  @GET("/api/v1/{domain}s")
  suspend fun list(
    @Header("Authorization") authorization: String,
    @Query("page") page: Int? = null,
    @Query("limit") limit: Int? = null,
    @Query("status") status: String? = null
  ): {Domain}ListResponse

  @GET("/api/v1/{domain}")
  suspend fun getById(
    @Header("Authorization") authorization: String,
    @Query("id") id: UUID
  ): {Domain}Response

  @POST("/api/v1/{domain}")
  suspend fun create(
    @Header("Authorization") authorization: String,
    @Body request: Create{Domain}Request
  ): {Domain}Response

  @POST("/api/v1/{domain}/update")
  suspend fun update(
    @Header("Authorization") authorization: String,
    @Query("id") id: UUID,
    @Body request: Update{Domain}Request
  ): {Domain}Response

  @POST("/api/v1/{domain}/delete")
  suspend fun delete(
    @Header("Authorization") authorization: String,
    @Query("id") id: UUID
  ): Boolean
}
```

### Step 7: Create Integration Test

Location: `app/api-application/src/test/kotlin/insight/c0x12c/{Domain}ControllerTest.kt`

```kotlin
package insight.c0x12c

import com.c0x12c.database.exposed.extension.truncateAllTables
import com.c0x12c.jackson.configured
import com.c0x12c.retrofit.Retrofits
import com.fasterxml.jackson.databind.ObjectMapper
import insight.c0x12c.base.AbstractControllerTest
import insight.c0x12c.client.{Domain}Client
import insight.c0x12c.client.request.{domain}.Create{Domain}Request
import insight.c0x12c.postgresql.repository.{Domain}Repository
import insight.c0x12c.postgresql.repository.Default{Domain}Repository
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import kotlinx.coroutines.runBlocking
import okhttp3.HttpUrl.Companion.toHttpUrl
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.*
import retrofit2.HttpException
import java.util.UUID

@MicronautTest(environments = ["test"], transactional = false)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class {Domain}ControllerTest : AbstractControllerTest() {

  private lateinit var {domain}Client: {Domain}Client

  private val {domain}Repository: {Domain}Repository by lazy {
    Default{Domain}Repository(database)
  }

  @BeforeAll
  override fun beforeAll() {
    val url = embeddedServer.url.toString()
    val jackson = ObjectMapper().configured()
    val retrofit = Retrofits
      .newBuilder(url = url.toHttpUrl(), jackson = jackson)
      .build()

    {domain}Client = retrofit.create({Domain}Client::class.java)
  }

  @AfterEach
  fun cleanupAfterEach() {
    database.primary.truncateAllTables()
  }

  @Test
  fun `getById - returns entity when exists`() = runBlocking {
    val entity = createTest{Domain}()
    val token = accessToken(prepareUser())

    val response = {domain}Client.getById(
      authorization = token,
      id = entity.id
    )

    assertThat(response.id).isEqualTo(entity.id)
  }

  @Test
  fun `getById - returns 404 when not found`() = runBlocking {
    val token = accessToken(prepareUser())

    assertThrows<HttpException> {
      runBlocking {
        {domain}Client.getById(
          authorization = token,
          id = UUID.randomUUID()
        )
      }
    }.also {
      assertThat(it.code()).isEqualTo(404)
    }
  }

  @Test
  fun `create - creates entity successfully`() = runBlocking {
    val token = accessToken(prepareUser())
    val request = Create{Domain}Request(name = "Test")

    val response = {domain}Client.create(
      authorization = token,
      request = request
    )

    assertThat(response.name).isEqualTo("Test")

    val saved = {domain}Repository.byId(response.id)
    assertThat(saved).isNotNull
  }

  @Test
  fun `should return 401 when not authenticated`() = runBlocking {
    assertThrows<HttpException> {
      runBlocking {
        {domain}Client.getById(
          authorization = "",
          id = UUID.randomUUID()
        )
      }
    }.also {
      assertThat(it.code()).isEqualTo(401)
    }
  }
}
```

### Step 8: Run Tests

```bash
./gradlew :app:api-application:test --tests "{Domain}ControllerTest"
./gradlew test
```

## Error Handling Patterns

### Not Found
```kotlin
val entity = repository.byId(id)
  ?: return ClientError.{DOMAIN}_NOT_FOUND.asException().left()
```

### Already Exists
```kotlin
val existing = repository.byEmail(email)
if (existing != null) {
  return ClientError.EMAIL_ALREADY_IN_USE.asException().left()
}
```

## Success Criteria

- Controller is thin (just delegation)
- Controller has `@ExecuteOn(TaskExecutors.IO)`
- NO path parameters (use `@QueryValue` for all IDs)
- Manager returns Either (never throws)
- Transactions wrap DB operations
- No `!!` operator
- Response models in module-client with `companion object { fun from() }`
- NO inline data classes in controllers
- Integration tests use Retrofit client
- All tests pass
