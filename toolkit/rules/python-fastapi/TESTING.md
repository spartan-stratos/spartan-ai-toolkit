# Testing Rules

## Configuration (CRITICAL)

Add to `pyproject.toml` — without this, async tests silently skip or fail:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

```python
# WRONG — missing asyncio_mode config, tests hang or skip
@pytest.mark.asyncio
async def test_something():  # May not run!
    ...

# CORRECT — with asyncio_mode = "auto", no decorator needed
async def test_something():
    ...
```

## Test Client Setup

```python
# conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.database import engine, Base, async_session

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

## Test Patterns

### CRUD Tests

```python
async def test_create_item(client: AsyncClient):
    response = await client.post(
        "/api/v1/items",
        json={"name": "Test Item", "price": 9.99},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Item"
    assert "id" in data

async def test_get_item(client: AsyncClient):
    # Create first
    create = await client.post("/api/v1/items", json={"name": "Test", "price": 1.0})
    item_id = create.json()["id"]

    # Get
    response = await client.get(f"/api/v1/items/item?id={item_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Test"

async def test_get_item_not_found(client: AsyncClient):
    response = await client.get(f"/api/v1/items/item?id={uuid4()}")
    assert response.status_code == 404

async def test_delete_item(client: AsyncClient):
    create = await client.post("/api/v1/items", json={"name": "Test", "price": 1.0})
    item_id = create.json()["id"]

    response = await client.post(f"/api/v1/items/delete?id={item_id}")
    assert response.status_code == 204

    # Verify soft deleted — should not be found
    get = await client.get(f"/api/v1/items/item?id={item_id}")
    assert get.status_code == 404
```

### Auth Tests

```python
async def test_protected_route_without_token(client: AsyncClient):
    response = await client.get("/api/v1/me")
    assert response.status_code == 401

async def test_protected_route_with_token(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/me", headers=auth_headers)
    assert response.status_code == 200
```

### Validation Tests

```python
async def test_create_item_missing_required_field(client: AsyncClient):
    response = await client.post("/api/v1/items", json={"price": 9.99})
    assert response.status_code == 422

async def test_create_item_invalid_price(client: AsyncClient):
    response = await client.post(
        "/api/v1/items",
        json={"name": "Test", "price": -1},
    )
    assert response.status_code == 422
```

## Test Data Factories

```python
# tests/factories.py
from uuid import uuid4

def make_item(**overrides) -> dict:
    defaults = {
        "name": f"Item-{uuid4().hex[:8]}",
        "description": "Test item",
        "price": 9.99,
    }
    return {**defaults, **overrides}
```

## Required Coverage Per Endpoint

1. Happy path (create, read, update, delete)
2. Not found (404)
3. Validation error (422)
4. Auth failure (401) — if protected
5. Soft delete behavior — deleted records not returned

## Running Tests

```bash
pytest                           # All tests
pytest tests/test_items.py       # One file
pytest -k "test_create"          # By name pattern
pytest --tb=short -q             # Quiet output
```

## What NOT to Do

- **No `TestClient` for async tests** — use `httpx.AsyncClient` + `ASGITransport`
- **No `@pytest.mark.asyncio` when `asyncio_mode = "auto"`** — it's redundant
- **No shared state between tests** — use fixtures, not module-level variables
- **No mocking the database in integration tests** — use a real test database
