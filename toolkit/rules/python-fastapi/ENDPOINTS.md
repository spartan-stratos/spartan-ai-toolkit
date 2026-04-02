# FastAPI Endpoint Rules

## Layered Architecture

```text
Router (APIRouter)  →  Service  →  Repository  →  Database
      ↓                  ↓            ↓
  Depends()        Business logic  SQLAlchemy
  Pydantic schemas Error handling  AsyncSession
```

| Layer | Can Call | Cannot Call |
|-------|---------|-------------|
| Router | Services via Depends() | Repositories, DB sessions directly |
| Service | Repositories, other services | External APIs directly (use a client) |
| Repository | Database (AsyncSession) | Services, routers |

## Router Pattern

```python
from fastapi import APIRouter, Depends, Query, status
from src.items.schemas import ItemCreate, ItemUpdate, ItemResponse, ItemListResponse
from src.items.service import ItemService, get_item_service

router = APIRouter(prefix="/items", tags=["items"])

@router.get("", response_model=ItemListResponse)
async def list_items(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    service: ItemService = Depends(get_item_service),
):
    return await service.list(page=page, limit=limit)

@router.get("/item", response_model=ItemResponse)
async def get_item(
    id: UUID = Query(...),
    service: ItemService = Depends(get_item_service),
):
    return await service.get_by_id(id)

@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    request: ItemCreate,
    service: ItemService = Depends(get_item_service),
):
    return await service.create(request)

@router.post("/update", response_model=ItemResponse)
async def update_item(
    id: UUID = Query(...),
    request: ItemUpdate,
    service: ItemService = Depends(get_item_service),
):
    return await service.update(id, request)

@router.post("/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    id: UUID = Query(...),
    service: ItemService = Depends(get_item_service),
):
    await service.delete(id)
```

## URL Design Rules

| Rule | Example |
|------|---------|
| Plural for collections | `GET /items` |
| Singular via query param | `GET /items/item?id=xxx` |
| POST for all mutations | `POST /items`, `POST /items/update`, `POST /items/delete` |
| Query params for IDs | `?id=xxx`, never `/{id}` path params |
| Verb sub-paths for actions | `/items/delete`, `/items/restore` |

## Dependency Injection

Use `Depends()` for everything the router needs:

```python
# Database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# Service with repository
def get_item_service(db: AsyncSession = Depends(get_db)) -> ItemService:
    return ItemService(repository=ItemRepository(db))

# Auth dependency
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    # validate token, return user
    ...
```

## Status Codes

| Action | Status Code |
|--------|-------------|
| List / Get | 200 (default) |
| Create | 201 (`status_code=status.HTTP_201_CREATED`) |
| Update | 200 (default) |
| Delete | 204 (`status_code=status.HTTP_204_NO_CONTENT`) |

## Router Registration

```python
# main.py
from fastapi import FastAPI
from src.items.router import router as items_router
from src.auth.router import router as auth_router

app = FastAPI(title="My API")
app.include_router(items_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
```

## What NOT to Do

- **No business logic in routers** — delegate to services
- **No direct DB access in routers** — use Depends() for services
- **No path parameters** — use `Query(...)` for all IDs
- **No `@app.get()` on the app directly** — use `APIRouter`
- **No sync `def` for I/O routes** — always `async def` for DB/network operations
