# Batch Processing Patterns

## Core Rule

Any operation that processes a dataset that could grow beyond memory MUST use chunked pagination with safety guards.

---

## The Pattern

```kotlin
companion object {
  const val CHUNK_SIZE = 500
  const val MAX_CHUNKS = 100  // Prevents infinite loops / OOM
}

suspend fun processAllUsers(action: suspend (User) -> Unit): BatchResult {
  var offset = 0
  var chunksProcessed = 0
  val failures = mutableListOf<BatchFailure>()

  while (chunksProcessed < MAX_CHUNKS) {
    val chunk = userRepository.findAll(limit = CHUNK_SIZE, offset = offset)
    if (chunk.isEmpty()) break

    chunk.forEach { user ->
      runCatching { action(user) }
        .onFailure { e ->
          logger.warn("Failed to process user ${user.id}", e)
          failures.add(BatchFailure(userId = user.id, error = e.message))
        }
    }

    if (chunk.size < CHUNK_SIZE) break  // Last page
    offset += CHUNK_SIZE
    chunksProcessed++
  }

  return BatchResult(processed = offset, failures = failures)
}
```

---

## Rules

- Always define `CHUNK_SIZE` and `MAX_CHUNKS` as named constants (see KOTLIN.md § No Magic Numbers)
- `MAX_CHUNKS` guard prevents runaway loops if the dataset keeps growing
- Early exit when `chunk.size < CHUNK_SIZE` (last page)
- Never `findAll()` without limit — always paginate
- Log + collect failures per item, don't abort the whole batch for one bad record
- Return a result with failure count so the caller can decide
- Small fixed-size lists (< 100 items) don't need chunking

---

## Cancellation Check

For long-running jobs, check cancellation inside the loop:

```kotlin
while (chunksProcessed < MAX_CHUNKS) {
  if (context.isCancelled(selfId, initiatorId)) {
    logger.info("Batch cancelled after $chunksProcessed chunks")
    break
  }
  // ... process chunk
}
```

---

## Bad Patterns

```kotlin
// WRONG — loads entire table into memory
val allUsers = userRepository.findAll()  // 2M users → OOM
allUsers.forEach { sendEmail(it) }

// WRONG — no safety limit
var offset = 0
while (true) {  // Never terminates if new records keep appearing
  val chunk = repo.findAll(limit = 500, offset = offset)
  if (chunk.isEmpty()) break
  offset += 500
}

// WRONG — one bad record kills the whole batch
chunk.forEach { user ->
  action(user)  // Throws on user #47 → users #48-500 never processed
}
```
