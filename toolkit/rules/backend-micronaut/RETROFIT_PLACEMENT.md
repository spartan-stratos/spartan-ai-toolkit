# Retrofit Client Placement Rules

> Full guide: use `/kotlin-best-practices` skill

---

## Core Rule

**NEVER place Retrofit client interfaces in modules that have kapt enabled for Micronaut.**

### Correct Pattern

```
module-client/                    # NO kapt
├── src/main/kotlin/
│   └── com/yourcompany/client/
│       ├── TemplateServiceClient.kt    ✅ Retrofit @GET/@POST
│       ├── TerraformServiceClient.kt   ✅ Retrofit interfaces
│       └── dto/
│           ├── template/
│           │   └── TemplateDtos.kt     ✅ Plain data classes
│           └── terraform/
│               └── TerraformDtos.kt    ✅ No Micronaut annotations
└── build.gradle
    # NO kotlin-kapt plugin ✅
    dependencies {
      implementation(libs.networking.retrofit)
      implementation(libs.networking.okhttp)
      implementation(libs.arrow.core)
      implementation(libs.jackson.*)
    }
```

### Incorrect Pattern

```
module-auth/                      # HAS kapt enabled
├── src/main/kotlin/
│   └── com/yourcompany/auth/
│       ├── client/
│       │   ├── TemplateServiceClient.kt    ❌ WILL FAIL
│       │   └── TerraformServiceClient.kt   ❌ kapt can't process
│       └── dto/
│           └── TemplateDtos.kt             ❌ @Serdeable conflicts
└── build.gradle
    plugins {
      id("kotlin-kapt")  ❌ PROBLEM
    }
```

---

## Why This Fails

### Kapt Limitations

1. **Type Alias Issues**
   ```kotlin
   // Kapt can't handle this in stub generation:
   typealias EitherCall<R> = Call<Either<ErrorResponse, R>>
   ```

2. **Complex Generic Types**
   ```kotlin
   // Kapt fails to resolve nested generics:
   fun getStatus(): Call<Either<ErrorResponse, TerraformStatusDto>>
   ```

3. **Annotation Processor Conflicts**
   - Micronaut processors try to process Retrofit interfaces
   - Results in `@error.NonExistentClass()` in generated stubs
   - Build fails with "incompatible types" errors

---

## Implementation Checklist

When adding new external service clients:

### 1. Create Client Interface in module-client

```kotlin
package com.yourcompany.client

import arrow.core.Either
import com.yourcompany.retrofit.ErrorResponse
import retrofit2.Call
import retrofit2.http.*

interface MyServiceClient {
  @GET("/api/resource")
  fun getResource(): Call<Either<ErrorResponse, ResourceDto>>

  @POST("/api/resource")
  fun createResource(@Body request: CreateRequestDto): Call<Either<ErrorResponse, ResourceDto>>
}
```

**Key Points:**
- ✅ Package: `com.yourcompany.client` (NOT `com.yourcompany.auth.client`)
- ✅ Use full type: `Call<Either<ErrorResponse, T>>` (NOT `EitherCall<T>`)
- ✅ Explicit imports (NOT wildcard `import com.yourcompany.client.dto.*`)

### 2. Create DTOs in module-client

```kotlin
package com.yourcompany.client.dto.myservice

// NO Micronaut annotations! ❌ @Serdeable
data class ResourceDto(
  val id: String,
  val name: String,
  val createdAt: Instant
)

data class CreateRequestDto(
  val name: String,
  val options: Map<String, Any>
)
```

**Key Points:**
- ✅ Plain Kotlin data classes
- ✅ NO `@Serdeable` annotation
- ✅ Jackson handles serialization automatically
- ✅ Package: `com.yourcompany.client.dto.*`

### 3. Create Client Factory in module-auth

```kotlin
package com.yourcompany.auth.config

import com.yourcompany.client.MyServiceClient
import io.micronaut.context.annotation.Factory
import jakarta.inject.Singleton

@Factory
class MyServiceConfig(
  @Value("\${app.myservice.url}")
  private val serviceUrl: String,
  private val objectMapper: ObjectMapper
) {

  @Singleton
  fun myServiceClient(): MyServiceClient {
    val retrofit = Retrofits.createRetrofit(
      baseUrl = serviceUrl.toHttpUrl(),
      mapper = objectMapper
    )
    return retrofit.create(MyServiceClient::class.java)
  }
}
```

**Key Points:**
- ✅ Factory is in module-auth (has kapt for `@Factory`)
- ✅ Client interface is in module-client (no kapt)
- ✅ Clean separation of concerns

### 4. Update module-auth Dependencies

```groovy
// module-auth/build.gradle

dependencies {
  // Client module (contains Retrofit interfaces)
  implementation(project(":module-client"))

  // Retrofit runtime (needed for creating clients in factories)
  implementation(libs.networking.retrofit)
  implementation(libs.networking.retrofit.jackson)
  implementation(libs.networking.okhttp)
  implementation(libs.networking.okhttp.logging)

  // Arrow (for Either type)
  implementation(libs.arrow.core)
}
```

---

## Troubleshooting

### Error: `@error.NonExistentClass()`

**Cause:** Retrofit client interface in a module with kapt enabled

**Solution:** Move client to `module-client`

### Error: `Unresolved reference 'Serdeable'`

**Cause:** DTOs use Micronaut annotation but module lacks dependency

**Solution:** Remove `@Serdeable` - Jackson handles it automatically

### Error: `when expression must be exhaustive`

**Cause:** Nullable enum in when expression

**Solution:**
```kotlin
// ❌ Before:
when (task.automationType) { ... }

// ✅ After:
val type = task.automationType ?: return ...
when (type) { ... }
```

---

## Module Architecture

```
backend/
├── app/
│   ├── module-auth/              # Micronaut controllers/services
│   │   ├── build.gradle          # HAS kapt
│   │   ├── controller/           # @Controller, @Get, @Post
│   │   ├── service/              # @Singleton services
│   │   └── config/               # @Factory for clients
│   │
│   └── module-client/            # Retrofit clients ONLY
│       ├── build.gradle          # NO kapt ✅
│       └── src/.../client/       # Retrofit interfaces
│
└── core/
    └── module-retrofit/          # Shared Retrofit utilities
        └── EitherCall.kt         # Type aliases, adapters
```

---

## Benefits

1. **Clean Compilation**
   - Kapt only processes Micronaut beans
   - Retrofit clients compile with standard Kotlin compiler

2. **Clear Separation**
   - Micronaut infrastructure ↔ External API clients
   - Easy to test and mock

3. **Reusability**
   - Clients can be used in other modules
   - No Micronaut dependency pollution

---

## Related Rules

- `.claude/rules/KOTLIN_CODING_STANDARDS.md` - No force unwraps
- `.claude/rules/NAMING_CONVENTIONS.md` - Package naming
- `.claude/rules/DATABASE_DESIGN.md` - Repository patterns

---

**TL;DR:** Retrofit clients → `module-client` (no kapt). Micronaut beans → `module-auth` (has kapt). Never mix.
