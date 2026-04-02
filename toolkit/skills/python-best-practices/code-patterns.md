# Code Patterns — Python + FastAPI

## Project Structure

```text
my-api/
├── pyproject.toml
├── alembic/                    # Database migrations
│   ├── alembic.ini
│   └── versions/
├── src/
│   ├── main.py                 # FastAPI app, lifespan, middleware
│   ├── config.py               # pydantic-settings
│   ├── database.py             # Engine, session, Base
│   ├── auth/                   # Auth domain
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── models.py
│   │   ├── service.py
│   │   ├── repository.py
│   │   └── dependencies.py
│   ├── items/                  # Items domain
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── models.py
│   │   ├── service.py
│   │   └── repository.py
│   └── shared/
│       ├── pagination.py       # PaginatedResponse
│       ├── soft_delete.py      # SoftDeleteMixin
│       └── exceptions.py       # Custom exception handlers
└── tests/
    ├── conftest.py
    ├── test_items.py
    └── test_auth.py
```

## Configuration (pydantic-settings)

```python
# src/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://localhost/mydb"
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DEBUG: bool = False

    model_config = {"env_file": ".env"}

settings = Settings()
```

## Database Setup

```python
# src/database.py
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from src.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
async_session = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

## Soft Delete Mixin

```python
# src/shared/soft_delete.py
from datetime import datetime, UTC
from uuid import uuid4
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

class SoftDeleteMixin:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime | None] = mapped_column(default=None, onupdate=lambda: datetime.now(UTC))
    deleted_at: Mapped[datetime | None] = mapped_column(default=None)
```

## SQLAlchemy Model with Mixin

```python
# src/items/models.py
from sqlalchemy import String, Float
from sqlalchemy.orm import Mapped, mapped_column
from src.database import Base
from src.shared.soft_delete import SoftDeleteMixin

class Item(SoftDeleteMixin, Base):
    __tablename__ = "items"

    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(1000), default=None)
    price: Mapped[float] = mapped_column(Float)
```

## Repository Pattern

```python
# src/items/repository.py
from uuid import UUID
from datetime import datetime, UTC
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.items.models import Item

class ItemRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: UUID) -> Item | None:
        result = await self.db.execute(
            select(Item).where(Item.id == str(id), Item.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list(self, page: int, limit: int) -> tuple[list[Item], int]:
        query = select(Item).where(Item.deleted_at.is_(None))

        # Count
        from sqlalchemy import func
        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar() or 0

        # Paginate
        items_result = await self.db.execute(
            query.offset((page - 1) * limit).limit(limit)
        )
        return list(items_result.scalars().all()), total

    async def create(self, item: Item) -> Item:
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def soft_delete(self, id: UUID) -> bool:
        item = await self.get_by_id(id)
        if item is None:
            return False
        item.deleted_at = datetime.now(UTC)
        await self.db.flush()
        return True
```

## Service Layer

```python
# src/items/service.py
from uuid import UUID
from fastapi import HTTPException, status
from src.items.repository import ItemRepository
from src.items.schemas import ItemCreate, ItemResponse, ItemListResponse
from src.items.models import Item
from src.shared.pagination import PaginatedResponse

class ItemService:
    def __init__(self, repository: ItemRepository):
        self.repository = repository

    async def get_by_id(self, id: UUID) -> ItemResponse:
        item = await self.repository.get_by_id(id)
        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item {id} not found",
            )
        return ItemResponse.model_validate(item)

    async def list(self, page: int, limit: int) -> PaginatedResponse[ItemResponse]:
        items, total = await self.repository.list(page, limit)
        return PaginatedResponse(
            items=[ItemResponse.model_validate(i) for i in items],
            total=total,
            page=page,
            limit=limit,
            has_more=(page * limit) < total,
        )

    async def create(self, request: ItemCreate) -> ItemResponse:
        item = Item(
            name=request.name,
            description=request.description,
            price=request.price,
        )
        created = await self.repository.create(item)
        return ItemResponse.model_validate(created)

    async def delete(self, id: UUID) -> None:
        deleted = await self.repository.soft_delete(id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item {id} not found",
            )
```

## Paginated Response

```python
# src/shared/pagination.py
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
    has_more: bool
```

## Lifespan

```python
# src/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database import engine, Base
from src.items.router import router as items_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # DEV ONLY — use Alembic migrations in production: `alembic upgrade head`
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(title="My API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items_router, prefix="/api/v1")
```
