---
name: Testing Strategies
description: Testing patterns for Micronaut/Kotlin backend including repository tests, integration tests, and test data builders. Use when writing tests, setting up test infrastructure, or improving coverage.
---

# Testing Strategies — Quick Reference

## Integration Tests (MANDATORY for every endpoint)

```kotlin
@MicronautTest(environments = ["test"], transactional = false)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class EmployeeControllerTest : AbstractControllerTest() {

  private lateinit var employeeClient: EmployeeClient

  @BeforeAll
  override fun beforeAll() {
    val url = embeddedServer.url.toString()
    val jackson = ObjectMapper().configured()
    val retrofit = Retrofits
      .newBuilder(url = url.toHttpUrl(), jackson = jackson)
      .build()
    employeeClient = retrofit.create(EmployeeClient::class.java)
  }

  @AfterEach
  fun cleanup() {
    database.primary.truncateAllTables()
  }
}
```

## ALWAYS Use Retrofit Clients

```kotlin
// RIGHT — Retrofit client from module-client
val response = employeeClient.getEmployee(
  authorization = bearerToken(adminUser),
  id = employee.id
)

// WRONG — raw HttpRequest
val request = HttpRequest.GET<Any>("/api/v1/employee?id=$id")  // NEVER
```

## Test Naming

```kotlin
@Test
fun `{action} - {expected outcome}`() = runBlocking { }

// Examples:
fun `getEmployee - returns employee by id`() = runBlocking { }
fun `getEmployee - returns 404 when not found`() = runBlocking { }
fun `createEmployee - fails with 401 when not authenticated`() = runBlocking { }
```

## Required Test Coverage Per Endpoint

1. **Happy path** — basic success case
2. **Not found** — 404 for missing resource
3. **Auth failure** — 401 without token
4. **Soft delete** — deleted records not returned

```kotlin
@Test
fun `getById - returns 404 when not found`() = runBlocking {
  val token = accessToken(prepareUser())
  assertThrows<HttpException> {
    runBlocking {
      client.getById(authorization = token, id = UUID.randomUUID())
    }
  }.also {
    assertThat(it.code()).isEqualTo(404)
  }
}
```

## Repository Tests

```kotlin
class DefaultEmployeeRepositoryTest : AbstractRepositoryTest() {

  private val repository = DefaultEmployeeRepository(database)

  @BeforeEach
  fun cleanup() { database.primary.truncateAllTables() }

  @Test
  fun `insert - happy path`() { }

  @Test
  fun `byId - returns entity when exists`() { }

  @Test
  fun `byId - returns null when not exists`() { }

  @Test
  fun `byId - returns null when soft deleted`() { }

  @Test
  fun `deleteById - soft deletes entity`() { }

  @Test
  fun `update - updates selected fields`() { }
}
```

## Test Data Builders

```kotlin
private fun dummyEntity(
  id: UUID = UUID.randomUUID(),
  name: String = randomText(),
  email: String = randomEmail(),
  status: String = EmployeeStatus.ACTIVE.value
) = EmployeeEntity(
  id = id,
  name = name,
  email = email,
  status = status,
  createdAt = Instant.now(),
  updatedAt = null,
  deletedAt = null
)
```

## Assertions

```kotlin
// Use AssertJ
assertThat(result).isNotNull
assertThat(result.id).isEqualTo(expected.id)
assertThat(list).hasSize(3)
assertThat(entity.deletedAt).isNull()

// Compare ignoring timestamps
assertThat(result)
  .usingRecursiveComparison()
  .ignoringFields("createdAt", "updatedAt")
  .isEqualTo(expected)
```

## Run Tests

```bash
# All tests
./gradlew test

# Specific test class
./gradlew test --tests "insight.c0x12c.EmployeeControllerTest"

# Module tests only
./gradlew :app:module-repository:test
```
