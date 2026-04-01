# Code Patterns — Python API Endpoint Creator

## File Structure per Domain

```
src/{domain}/
├── router.py         # FastAPI APIRouter endpoints
├── schemas.py        # Pydantic Create/Update/Response models
├── models.py         # SQLAlchemy model with SoftDeleteMixin
├── service.py        # Business logic, HTTPException for errors
├── repository.py     # Async CRUD with soft delete
└── dependencies.py   # get_db, get_service Depends() functions
```

## 1. schemas.py

```python
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime

class {Domain}Create(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None

class {Domain}Update(BaseModel):
    name: str | None = None
    description: str | None = None

class {Domain}Response(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
```

## 2. models.py

```python
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from src.database import Base
from src.shared.soft_delete import SoftDeleteMixin

class {Domain}(SoftDeleteMixin, Base):
    __tablename__ = "{domain}s"

    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(1000), default=None)
```

## 3. repository.py

```python
from uuid import UUID
from datetime import datetime, UTC
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.{domain}.models import {Domain}

class {Domain}Repository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: UUID) -> {Domain} | None:
        result = await self.db.execute(
            select({Domain}).where({Domain}.id == str(id), {Domain}.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list(self, page: int, limit: int) -> tuple[list[{Domain}], int]:
        base = select({Domain}).where({Domain}.deleted_at.is_(None))
        count_result = await self.db.execute(select(func.count()).select_from(base.subquery()))
        total = count_result.scalar() or 0
        result = await self.db.execute(base.offset((page - 1) * limit).limit(limit))
        return list(result.scalars().all()), total

    async def create(self, entity: {Domain}) -> {Domain}:
        self.db.add(entity)
        await self.db.flush()
        await self.db.refresh(entity)
        return entity

    async def update(self, entity: {Domain}) -> {Domain}:
        entity.updated_at = datetime.now(UTC)
        await self.db.flush()
        await self.db.refresh(entity)
        return entity

    async def soft_delete(self, id: UUID) -> bool:
        entity = await self.get_by_id(id)
        if entity is None:
            return False
        entity.deleted_at = datetime.now(UTC)
        await self.db.flush()
        return True
```

## 4. service.py

```python
from uuid import UUID
from fastapi import HTTPException, status
from src.{domain}.repository import {Domain}Repository
from src.{domain}.schemas import {Domain}Create, {Domain}Update, {Domain}Response
from src.{domain}.models import {Domain}
from src.shared.pagination import PaginatedResponse

class {Domain}Service:
    def __init__(self, repository: {Domain}Repository):
        self.repository = repository

    async def get_by_id(self, id: UUID) -> {Domain}Response:
        entity = await self.repository.get_by_id(id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{Domain} {id} not found")
        return {Domain}Response.model_validate(entity)

    async def list(self, page: int, limit: int) -> PaginatedResponse[{Domain}Response]:
        items, total = await self.repository.list(page, limit)
        return PaginatedResponse(
            items=[{Domain}Response.model_validate(i) for i in items],
            total=total, page=page, limit=limit,
            has_more=(page * limit) < total,
        )

    async def create(self, request: {Domain}Create) -> {Domain}Response:
        entity = {Domain}(name=request.name, description=request.description)
        created = await self.repository.create(entity)
        return {Domain}Response.model_validate(created)

    async def update(self, id: UUID, request: {Domain}Update) -> {Domain}Response:
        entity = await self.repository.get_by_id(id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{Domain} {id} not found")
        if request.name is not None:
            entity.name = request.name
        if request.description is not None:
            entity.description = request.description
        updated = await self.repository.update(entity)
        return {Domain}Response.model_validate(updated)

    async def delete(self, id: UUID) -> None:
        deleted = await self.repository.soft_delete(id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{Domain} {id} not found")
```

## 5. dependencies.py

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db
from src.{domain}.repository import {Domain}Repository
from src.{domain}.service import {Domain}Service

def get_{domain}_service(db: AsyncSession = Depends(get_db)) -> {Domain}Service:
    return {Domain}Service(repository={Domain}Repository(db))
```

## 6. router.py

```python
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from src.{domain}.schemas import {Domain}Create, {Domain}Update, {Domain}Response
from src.{domain}.dependencies import get_{domain}_service
from src.{domain}.service import {Domain}Service
from src.shared.pagination import PaginatedResponse

router = APIRouter(prefix="/{domain}s", tags=["{domain}s"])

@router.get("", response_model=PaginatedResponse[{Domain}Response])
async def list_{domain}s(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    service: {Domain}Service = Depends(get_{domain}_service),
):
    return await service.list(page=page, limit=limit)

@router.get("/{domain}", response_model={Domain}Response)
async def get_{domain}(
    id: UUID = Query(...),
    service: {Domain}Service = Depends(get_{domain}_service),
):
    return await service.get_by_id(id)

@router.post("", response_model={Domain}Response, status_code=status.HTTP_201_CREATED)
async def create_{domain}(
    request: {Domain}Create,
    service: {Domain}Service = Depends(get_{domain}_service),
):
    return await service.create(request)

@router.post("/update", response_model={Domain}Response)
async def update_{domain}(
    id: UUID = Query(...),
    request: {Domain}Update,
    service: {Domain}Service = Depends(get_{domain}_service),
):
    return await service.update(id, request)

@router.post("/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_{domain}(
    id: UUID = Query(...),
    service: {Domain}Service = Depends(get_{domain}_service),
):
    await service.delete(id)
```
