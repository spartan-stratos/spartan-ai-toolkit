# Common Service Issues — Quick Reference

> This file is referenced by SKILL.md. Skim it when investigating a bug to see if it matches a known pattern.

## Database Issues

### "Connection pool exhausted"
**Cause:** Tests or code not returning connections, or pool too small for load.
**Fix:** Increase `maxPoolSize` in config. Check for leaked connections (queries without proper transaction blocks).

### "Column X does not exist"
**Cause:** Migration not applied, or table definition doesn't match the Kotlin code.
**Fix:** Run `./gradlew flywayMigrate`. Compare SQL column names with Kotlin Table object.

### "Unique constraint violation"
**Cause:** Trying to insert a duplicate value on a unique index.
**Fix:** Check if the record exists first, or use upsert pattern. Remember: soft-deleted records might not violate the constraint if the unique index has `WHERE deleted_at IS NULL`.

### Query returns no results but data exists
**Cause:** Missing `deletedAt.isNull()` filter, wrong join condition, or querying the wrong database (replica lag).
**Fix:** Check the query for soft-delete filter. If using replica, check if the write has propagated.

---

## API Issues

### 401 on every request
**Cause:** Token expired, wrong auth header format, or @Secured misconfiguration.
**Fix:** Check token expiry. Verify header is `Authorization: Bearer <token>`. Check controller has correct @Secured annotation.

### 400 with no helpful message
**Cause:** Jackson deserialization failure — field name mismatch between JSON and Kotlin DTO.
**Fix:** Check if frontend sends `snake_case` but Kotlin expects `camelCase` (or vice versa). Verify Jackson SNAKE_CASE naming strategy is configured.

### Endpoint returns empty list but data exists
**Cause:** Query filter too strict, wrong field comparison, or soft-delete filtering out results.
**Fix:** Check the manager query logic. Run the equivalent SQL directly to see what comes back.

---

## Build Issues

### "error.NonExistentClass" in kapt
**Cause:** Retrofit client interface in a module with kapt enabled.
**Fix:** Move Retrofit interfaces to `module-client` (no kapt). See RETROFIT_PLACEMENT rule.

### Tests pass locally but fail in CI
**Cause:** Different database state, missing env vars, or timezone differences.
**Fix:** Check CI environment variables match local `.env`. Ensure tests clean up after themselves (`truncateAllTables` in @BeforeEach).

### Flyway migration fails
**Cause:** Migration number conflicts, or trying to modify an already-applied migration.
**Fix:** Never edit deployed migrations. Create a new migration with the next sequence number. Check `flyway_schema_history` table for applied migrations.

---

## Performance Issues

### Endpoint suddenly slow (>1s)
**Cause:** Missing database index, N+1 query, or full table scan.
**Fix:** Run `EXPLAIN ANALYZE` on the slow query. Add indexes for columns in WHERE/JOIN clauses. Check for loops that query the database per item.

### Memory growing over time
**Cause:** Leaked connections, growing caches without eviction, or large result sets loaded into memory.
**Fix:** Check connection pool metrics. Review cache configurations. Use pagination for large queries (never `findAll()` without limit).
