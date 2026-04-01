---
name: python-testing-strategies
description: "Testing patterns for FastAPI with pytest-asyncio, httpx AsyncClient, fixtures, and test data factories. Use when writing tests, setting up test infrastructure, or improving coverage in a FastAPI project."
allowed_tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Python Testing Strategies — Quick Reference

## Setup (CRITICAL)

`asyncio_mode = "auto"` in `pyproject.toml` is required. Without it, async tests silently fail.

> See examples.md for the complete conftest.py and pyproject.toml setup.

## Test Client

Use `httpx.AsyncClient` + `ASGITransport` — never `TestClient` for async tests.

> See examples.md for client fixture setup.

## Required Coverage Per Endpoint

1. Happy path (create, read, update, delete)
2. Not found (404)
3. Validation error (422)
4. Auth failure (401) — if protected
5. Soft delete — deleted records not returned

## Test Naming

```python
async def test_create_item():           # Happy path
async def test_create_item_missing_name():  # Validation
async def test_get_item_not_found():    # 404
async def test_get_item_soft_deleted(): # Soft delete
```

## Test Data Factories

Use simple factory functions with sensible defaults. Override only what the test cares about.

> See examples.md for factory patterns.

## Running Tests

```bash
pytest                           # All tests
pytest tests/test_items.py       # One file
pytest -k "test_create"          # By name pattern
pytest --tb=short -q             # Quiet output
```

## Gotchas

- **Missing `asyncio_mode = "auto"` silently breaks everything.** Tests appear to pass (0 collected) or hang indefinitely. Add `[tool.pytest.ini_options] asyncio_mode = "auto"` to `pyproject.toml` before writing any async test. This is the #1 cause of "my tests don't run."

- **`TestClient` and `AsyncClient` are not interchangeable.** `TestClient` (from Starlette) is synchronous — it blocks. `AsyncClient` (from httpx) is async — it uses the event loop. If your app uses `async def` routes with `await`, you must use `AsyncClient` with `ASGITransport`. Using `TestClient` may hide async bugs because it runs synchronously.

- **Database state leaks between tests without proper cleanup.** Each test needs a clean database. Use an `autouse=True` fixture that creates/drops tables, or truncate between tests. Without this, test order matters and random failures appear in CI.

- **`response.json()` returns snake_case from FastAPI by default.** If your Pydantic models use `alias_generator`, the JSON keys may differ from your Python field names. Always assert against the actual JSON keys, not the Python attribute names.

- **Forgetting to `await` in async tests gives confusing errors.** If you see `<coroutine object ...>` in test output instead of actual data, you forgot an `await`. Every `client.get()`, `client.post()`, etc. must be awaited.
