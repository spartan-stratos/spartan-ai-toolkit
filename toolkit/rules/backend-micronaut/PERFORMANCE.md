# Performance Rules

## N+1 Query Prevention (CRITICAL)

**NEVER call a repository method inside `.map {}`, `.forEach {}`, or `.filter {}` loops.**

This creates N+1 queries — 1 query to get the list, then N queries per item. Under load, this kills performance.

### Bad — N+1 Pattern

```kotlin
// BAD — N queries for N participants
val payouts = participants.mapNotNull { participant ->
  payoutRequestRepository.byBountyParticipantId(participant.id)
}.toMap()

// BAD — N queries for N submissions
val submissions = submissionIds.mapNotNull { id ->
  submissionRepository.byId(id)
}

// BAD — cache-in-loop is still N queries for cache misses
val cache = mutableMapOf<UUID, Entity>()
items.map { item ->
  cache.getOrPut(item.foreignId) {
    repository.byId(item.foreignId)  // Still N queries!
  }
}
```

### Good — Batch Fetch Before Loop

```kotlin
// GOOD — 1 query, then map in memory
val bountyIds = participants.map { it.bountyId }.distinct()
val bountiesById = bountyRepository.byIds(bountyIds).associateBy { it.id }

participants.map { participant ->
  val bounty = bountiesById[participant.bountyId]
  // ... use bounty without DB call
}

// GOOD — batch fetch submissions
val submissions = submissionRepository.byIds(submissionIds)

// GOOD — batch count
val counts = bountyParticipantRepository.countByBountyIds(bountyIds)
```

### Rule
Before writing a `.map {}` or `.forEach {}` block:
1. Check if ANY repository call is inside the loop
2. If yes, extract the IDs, batch-fetch BEFORE the loop
3. Use `.associateBy { it.id }` to create a lookup map

**Common batch methods that should exist for every relationship:**
- `byIds(ids: List<UUID>): List<Entity>`
- `countByForeignIds(ids: List<UUID>): Map<UUID, Long>`
- `byForeignIds(ids: List<UUID>): List<Entity>` (for 1:N relationships)

If a batch method doesn't exist, **create it** rather than looping with single-item fetches.

---

## Redundant Database Calls

**NEVER fetch the same data twice in the same method.**

### Bad

```kotlin
val approved1 = submissionRepository.listApprovedByContributorId(id)
val approved2 = submissionRepository.listApprovedByCreatedBy(id)
// ... later in same method ...
val participants = bountyParticipantRepository.listAllByContributorId(id)  // already fetched above!
```

### Good

```kotlin
// Fetch once, reuse
val approved1 = submissionRepository.listApprovedByContributorId(id)
val approved2 = submissionRepository.listApprovedByCreatedBy(id)
val allApproved = (approved1 + approved2).distinctBy { it.id }
// Use allApproved throughout the method
```

---

## Unbounded Queries

**NEVER load "all" records without a reasonable limit.**

### Bad

```kotlin
val allSubmissions = submissionRepository.listAll(
  limit = 10000,  // Arbitrary huge number
  offset = 0
)
```

### Good

```kotlin
// Use chunked pagination for batch processing
companion object {
  const val CHUNK_SIZE = 100
  const val MAX_CHUNKS = 100
}
```

See `BATCH_PROCESSING.md` for the full chunked pattern.

---

## Fire-and-Forget Async

**NEVER use `CoroutineScope(Dispatchers.IO).launch` for background work without error tracking.**

### Bad

```kotlin
CoroutineScope(Dispatchers.IO).launch {
  // Work happens here but caller has no way to track it
  items.forEach { process(it) }
}
return Response(status = "processing")  // Lies — no way to check status
```

### Good

```kotlin
// Option 1: Do the work synchronously if it's fast enough
val results = items.map { process(it) }
return Response(results = results)

// Option 2: Use proper job tracking if async is needed
val jobId = backgroundJobService.submit(items)
return Response(jobId = jobId, status = "processing")
```

---

## Magic Numbers

**All thresholds, limits, and timeouts MUST come from config classes.**

See `KOTLIN.md` § No Magic Numbers for the full pattern.

Common offenders:
- SLA thresholds (hours)
- Max batch sizes
- Pagination limits
- Ban thresholds
- Logo URLs, email addresses

---

## Checklist Before Writing Manager Code

- [ ] No repository calls inside `.map {}` / `.forEach {}` — batch-fetch first
- [ ] No duplicate fetches of same data in one method
- [ ] All queries have reasonable limits
- [ ] Multi-table writes wrapped in `transaction(db.primary) {}`
- [ ] No fire-and-forget coroutines without error tracking
- [ ] No hardcoded numbers — use config classes
