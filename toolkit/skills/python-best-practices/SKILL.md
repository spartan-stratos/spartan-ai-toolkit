---
name: python-best-practices
description: "Python/FastAPI coding standards including async patterns, Pydantic v2, SQLAlchemy 2.0, and project structure. Use when writing Python code, reviewing FastAPI projects, or learning FastAPI conventions."
allowed_tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Python + FastAPI Best Practices — Quick Reference

## Layered Architecture

Router → Service → Repository → Database. Each layer only calls the one below it.

> See code-patterns.md for full project structure and layer examples.

## Pydantic v2

Separate Create/Update/Response schemas. Use `ConfigDict(from_attributes=True)` for ORM integration. Use `str | None` syntax (not `Optional[str]`).

> See code-patterns.md for schema examples.

## Async Patterns

`async def` for I/O routes, plain `def` for CPU-bound. Use lifespan context manager (not `on_event`). Use `httpx.AsyncClient` for external HTTP calls.

> See code-patterns.md for async examples.

## Soft Delete

Use a `SoftDeleteMixin` on SQLAlchemy models. Filter `where(Model.deleted_at.is_(None))` in all queries.

> See code-patterns.md for mixin and repository patterns.

## Configuration

Use `pydantic-settings` for all config. Never hardcode secrets, URLs, or magic numbers.

> See code-patterns.md for Settings class pattern.

## Pagination

Use a generic `PaginatedResponse[T]` for all list endpoints. Always return `total`, `page`, `limit`, `has_more`.

> See code-patterns.md for the pattern.

## Gotchas

- **`async def` vs `def` matters for performance.** An `async def` route that calls blocking code (like `time.sleep()` or sync DB drivers) blocks the entire event loop. Use plain `def` for CPU-bound work — FastAPI runs it in a threadpool. Use `async def` only when you `await` something.

- **`datetime.utcnow()` is deprecated since Python 3.12.** Use `datetime.now(UTC)` instead. The old function returns a naive datetime (no timezone), which causes comparison bugs. The new one returns timezone-aware UTC.

- **Mutable default arguments in Pydantic look safe but have a catch.** `tags: list[str] = []` works in Pydantic (it copies the default). But `tags: list[str] = Field(default_factory=list)` is explicit and safer for nested models. For simple fields, either works. For complex nested defaults, always use `default_factory`.

- **`from_attributes=True` replaces `orm_mode=True`.** Pydantic v2 changed the config API. Using the old `orm_mode` silently does nothing — your ORM objects won't serialize correctly.

- **SQLAlchemy `Column()` is legacy.** Use `Mapped[type]` with `mapped_column()` for SQLAlchemy 2.0. The old `Column(String)` still works but loses type checker support and IDE autocomplete.
