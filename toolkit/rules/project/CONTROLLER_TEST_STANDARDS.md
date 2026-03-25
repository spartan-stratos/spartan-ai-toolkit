# Controller Test Standards for Forge Platform

## How to Write Controller Tests Properly

### 1. Test Structure Requirements

**ALWAYS follow this pattern for controller tests:**

1. **Extend AbstractControllerTest** - Never write standalone tests
2. **Use @TestInstance(TestInstance.Lifecycle.PER_CLASS)** - For proper lifecycle management
3. **Create a client interface** - Use Retrofit client for making API calls
4. **Generate JWT tokens** - Use `accessToken()` method to create real JWT tokens
5. **Test through HTTP** - Always test the full HTTP stack, not mocked managers

### 2. Required Test Setup

```kotlin
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class YourControllerTest : AbstractControllerTest() {
    
    private lateinit var yourClient: YourClient
    private lateinit var testUser: UserEntity
    private lateinit var repository: YourRepository
    
    // Override to manage cleanup manually
    override fun cleanDataAfterTest(): Boolean = false
    
    @BeforeAll
    override fun beforeAll() {
        // 1. Create Retrofit client
        val url = embeddedServer.url.toString()
        val jackson = ObjectMapper().configured()
        val retrofit = Retrofits
            .newBuilder(
                url = url.toHttpUrl(),
                jackson = jackson
            )
            .build()
        yourClient = retrofit.create(YourClient::class.java)
        
        // 2. Initialize repositories
        repository = DefaultYourRepository(database)
        
        // 3. Create test users
        testUser = prepareUser(
            email = "test@test.com",
            displayName = "Test User",
            status = UserStatus.ACTIVE,
            role = UserRole.USER
        )
        
        // 4. Clean up any existing test data
        cleanTestData()
    }
    
    @AfterAll
    override fun afterAll() {
        // Clean up all test data
        cleanTestData()
    }
}
```

### 3. Test Pattern

```kotlin
@Test
fun `test name should describe the behavior`() = runBlocking {
    // Given - Setup test data
    val authToken = accessToken(testUser)  // Generate real JWT
    val request = CreateRequest(...)
    
    // When - Make API call through client
    val result = yourClient.createSomething(authToken, request)
    
    // Then - Assert using Strikt
    expectThat(result) {
        get { field }.isEqualTo(expectedValue)
    }
}
```

### 4. Authentication Testing

**ALWAYS test authentication scenarios:**

```kotlin
@Test
fun `should fail without authentication`() = runBlocking {
    // When/Then
    expectThrows<HttpClientResponseException> {
        yourClient.someMethod("")
    }.and {
        get { status }.isEqualTo(HttpStatus.UNAUTHORIZED)
    }
}

@Test
fun `should fail when not owner`() = runBlocking {
    // Given
    val otherUser = prepareUser(email = "other@test.com")
    val otherToken = accessToken(otherUser)
    
    // When/Then
    expectThrows<HttpClientResponseException> {
        yourClient.accessResource(otherToken, resourceId)
    }.and {
        get { status }.isEqualTo(HttpStatus.NOT_FOUND) // Use NOT_FOUND for security
    }
}
```

### 5. Client Interface Requirements

**Create a proper Retrofit client in module-client:**

```kotlin
interface YourClient {
    @POST("/api/resource")
    suspend fun create(
        @Header("Authorization") authorization: String,
        @Body request: CreateRequest
    ): Response
    
    @GET("/api/resource/detail")  // Use query params, not path variables
    suspend fun get(
        @Header("Authorization") authorization: String,
        @Query("id") id: UUID
    ): Response
    
    @PUT("/api/resource/update")
    suspend fun update(
        @Header("Authorization") authorization: String,
        @Query("id") id: UUID,
        @Body request: UpdateRequest
    ): Response
    
    @DELETE("/api/resource/delete")
    suspend fun delete(
        @Header("Authorization") authorization: String,
        @Query("id") id: UUID
    ): Unit
}
```

### 6. Data Cleanup Pattern

```kotlin
private fun hardDeleteTestData() {
    try {
        transaction(database.primary) {
            // Delete in correct order (foreign keys first)
            ChildTable.deleteWhere { 
                ChildTable.parentId inList testIds 
            }
            ParentTable.deleteWhere { 
                ParentTable.userId eq testUser.id 
            }
        }
    } catch (e: Exception) {
        // Ignore if data doesn't exist
    }
}
```

### 7. Common Mistakes to Avoid

**DON'T:**
- Mock the manager or repository in controller tests
- Use @MockBean for dependencies
- Test without authentication
- Forget to clean up test data
- Use path variables in client interfaces
- Skip authorization/ownership tests

**DO:**
- Test the full HTTP stack end-to-end
- Use real JWT tokens via `accessToken()`
- Test all error scenarios
- Track created entities for cleanup
- Use query parameters exclusively
- Test one-to-one/one-to-many relationships

### 8. Assertion Pattern

Use Strikt for readable assertions:

```kotlin
expectThat(result) {
    get { id }.isNotNull()
    get { status }.isEqualTo(expectedStatus)
    get { nestedObject }.isNotNull().and {
        get { field }.isEqualTo(value)
    }
}

expectThat(list) {
    get { size }.isGreaterThanOrEqualTo(2)
    get { map { it.name } }.contains("Name1", "Name2")
}

expectThrows<HttpClientResponseException> {
    // action that should throw
}.and {
    get { status }.isEqualTo(HttpStatus.BAD_REQUEST)
}
```

### 9. Test Coverage Requirements

Every controller should test:
1. ✅ Happy path for each endpoint
2. ✅ Missing authentication (401)
3. ✅ Wrong ownership/authorization (403/404)
4. ✅ Invalid input validation (400)
5. ✅ Resource not found (404)
6. ✅ Business rule violations
7. ✅ One-to-one/one-to-many relationships
8. ✅ Soft delete behavior
9. ✅ Update scenarios (partial updates)
10. ✅ List/filter operations

### 10. Example Full Test

See `ProjectControllerTest` and `UserControllerTest` for complete examples that follow all these patterns correctly.