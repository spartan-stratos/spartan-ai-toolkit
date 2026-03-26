---
name: testing-strategies
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

## Unit Tests with MockK

Use MockK for testing managers and services in isolation.

```kotlin
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.test.runTest

class ChatServiceTest {
  private val mockClient = mockk<ChatClient>()
  private val service = ChatService(mockClient)

  @Test
  fun `should handle basic chat request`() = runTest {
    // Given
    coEvery { mockClient.chat(any()) } returns mockResponse

    // When
    val response = service.chat(messages)

    // Then
    assertNotNull(response)
    coVerify(exactly = 1) { mockClient.chat(any()) }
  }

  @Test
  fun `should send correct model in request`() = runTest {
    // Given — capture the argument to verify WHAT was sent
    val captured = slot<ChatRequest>()
    coEvery { mockClient.chat(capture(captured)) } returns mockResponse

    // When
    service.chat(messages)

    // Then
    assertEquals("gpt-4", captured.captured.model)
  }
}
```

### MockK Rules

- `mockk<T>()` for creating mocks
- `coEvery` / `coVerify` for suspend functions (not `every`/`verify`)
- `slot<T>()` + `capture()` to verify what arguments were passed
- `runTest { }` from `kotlinx.coroutines.test` — NOT `runBlocking`. `runTest` handles virtual time and catches coroutine issues.
- AAA pattern with comments: `// Given`, `// When`, `// Then`

### Organize with @Nested

```kotlin
@Nested
@DisplayName("Chat Operations")
inner class ChatOperations {
  @BeforeEach
  fun setup() {
    coEvery { mockClient.chat(any()) } returns mockResponse
  }

  @Test
  fun `should return zero credits when quota throws`() = runTest {
    coEvery { quotaService.getRemaining(any()) } throws RuntimeException("boom")
    val result = service.getCredits(userId)
    assertThat(result.creditsRemaining).isEqualTo(0)
  }
}
```

---

## Connection Pool for Parallel Tests

If tests fail with "cannot acquire connection" or "connection pool exhausted", bump `maxPoolSize` to 20. Default pool (5 connections) can't handle parallel test execution.

```kotlin
primaryPoolConfig = ConnectionPoolConfig(
  maxPoolSize = 20,
  minimumIdle = 5
)
```

---

## Run Tests

```bash
# All tests
./gradlew test

# Specific test class
./gradlew test --tests "com.yourcompany.EmployeeControllerTest"

# Module tests only
./gradlew :app:module-repository:test
```
