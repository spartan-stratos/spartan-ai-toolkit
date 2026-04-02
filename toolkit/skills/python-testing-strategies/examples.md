# Testing Examples — FastAPI + pytest

## pyproject.toml Config

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

## conftest.py

```python
import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.database import engine, Base

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

@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    await client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "testpass123",
    })
    response = await client.post("/api/v1/auth/login", data={
        "username": "test@example.com",
        "password": "testpass123",
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

## CRUD Tests

```python
from uuid import uuid4

async def test_create_item(client: AsyncClient):
    response = await client.post(
        "/api/v1/items",
        json={"name": "Test Item", "price": 9.99},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Item"
    assert data["price"] == 9.99
    assert "id" in data
    assert "created_at" in data

async def test_get_item(client: AsyncClient):
    create = await client.post("/api/v1/items", json={"name": "Test", "price": 1.0})
    item_id = create.json()["id"]

    response = await client.get(f"/api/v1/items/item?id={item_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Test"

async def test_get_item_not_found(client: AsyncClient):
    response = await client.get(f"/api/v1/items/item?id={uuid4()}")
    assert response.status_code == 404

async def test_update_item(client: AsyncClient):
    create = await client.post("/api/v1/items", json={"name": "Old", "price": 1.0})
    item_id = create.json()["id"]

    response = await client.post(
        f"/api/v1/items/update?id={item_id}",
        json={"name": "New"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New"
    assert response.json()["price"] == 1.0  # unchanged

async def test_delete_item(client: AsyncClient):
    create = await client.post("/api/v1/items", json={"name": "Test", "price": 1.0})
    item_id = create.json()["id"]

    response = await client.post(f"/api/v1/items/delete?id={item_id}")
    assert response.status_code == 204

    get = await client.get(f"/api/v1/items/item?id={item_id}")
    assert get.status_code == 404  # soft deleted

async def test_list_items_pagination(client: AsyncClient):
    for i in range(5):
        await client.post("/api/v1/items", json={"name": f"Item {i}", "price": 1.0})

    response = await client.get("/api/v1/items?page=1&limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] == 5
    assert data["has_more"] is True
```

## Validation Tests

```python
async def test_create_item_missing_name(client: AsyncClient):
    response = await client.post("/api/v1/items", json={"price": 9.99})
    assert response.status_code == 422

async def test_create_item_negative_price(client: AsyncClient):
    response = await client.post(
        "/api/v1/items",
        json={"name": "Test", "price": -1},
    )
    assert response.status_code == 422

async def test_create_item_empty_name(client: AsyncClient):
    response = await client.post(
        "/api/v1/items",
        json={"name": "", "price": 9.99},
    )
    assert response.status_code == 422
```

## Auth Tests

```python
async def test_protected_route_no_token(client: AsyncClient):
    response = await client.get("/api/v1/me")
    assert response.status_code == 401

async def test_protected_route_with_token(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

async def test_protected_route_invalid_token(client: AsyncClient):
    response = await client.get(
        "/api/v1/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401
```

## Test Data Factory

```python
from uuid import uuid4

def make_item(**overrides) -> dict:
    defaults = {
        "name": f"Item-{uuid4().hex[:8]}",
        "description": "Test description",
        "price": 9.99,
    }
    return {**defaults, **overrides}

# Usage
async def test_with_factory(client: AsyncClient):
    response = await client.post("/api/v1/items", json=make_item(price=19.99))
    assert response.status_code == 201
    assert response.json()["price"] == 19.99
```
