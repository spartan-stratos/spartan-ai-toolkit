---
name: spartan:testcontainer
description: Set up integration testing infrastructure for a Kotlin Micronaut service using @MicronautTest and Testcontainers
argument-hint: "[postgres | kafka | redis | all]"
---

Set up integration testing in this Kotlin Micronaut project.

**Reference:** `/testing-strategies` skill and `rules/project/API_RULES.md` (testing section)

## Requested containers: {{ args[0] | default: "postgres" }}

### 1. Add Dependencies (build.gradle.kts)

```kotlin
testImplementation("org.testcontainers:testcontainers:1.19.3")
testImplementation("org.testcontainers:junit-jupiter:1.19.3")
testImplementation("org.testcontainers:postgresql:1.19.3")
testImplementation("io.micronaut.test:micronaut-test-junit5")
```

### 2. Create Base Test Configuration

Create `src/test/kotlin/.../AbstractControllerTest.kt`:

```kotlin
@MicronautTest(environments = ["test"], transactional = false)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
abstract class AbstractControllerTest {

    @Inject
    lateinit var embeddedServer: EmbeddedServer

    @BeforeAll
    open fun beforeAll() {
        // Setup test clients from embeddedServer.url
    }

    companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test")

        @DynamicPropertySource
        @JvmStatic
        fun overrideProperties(registry: DynamicPropertyRegistry) {
            registry.add("datasources.default.url", postgres::getJdbcUrl)
            registry.add("datasources.default.username", postgres::getUsername)
            registry.add("datasources.default.password", postgres::getPassword)
        }
    }
}
```

### 3. Create Example Integration Test

```kotlin
class EmployeeControllerTest : AbstractControllerTest() {

    private lateinit var employeeClient: EmployeeClient

    @BeforeAll
    override fun beforeAll() {
        super.beforeAll()
        val url = embeddedServer.url.toString()
        employeeClient = EmployeeClient(url)
    }

    @Test
    fun `create employee returns success`() {
        val request = CreateEmployeeRequest(name = "Test User", email = "test@example.com")
        val response = employeeClient.create(request)
        assertNotNull(response.id)
        assertEquals("Test User", response.name)
    }
}
```

### 4. Application config for test profile

Create `src/test/resources/application-test.yml`:
```yaml
datasources:
  default:
    # Overridden by Testcontainers DynamicPropertySource
    dialect: POSTGRES
flyway:
  datasources:
    default:
      enabled: true
      locations: classpath:db/migration
```

After setup, verify all tests pass with: `./gradlew test`
