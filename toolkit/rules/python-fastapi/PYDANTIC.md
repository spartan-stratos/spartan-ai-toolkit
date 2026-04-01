# Pydantic v2 Rules

## Separate Schemas from Models

Pydantic schemas (validation/serialization) and SQLAlchemy models (database) are different files, different responsibilities.

```text
src/items/
├── schemas.py    # Pydantic — request/response shapes
├── models.py     # SQLAlchemy — database tables
├── router.py     # FastAPI — HTTP endpoints
└── service.py    # Business logic
```

## Schema Patterns

### Create / Update / Response separation

```python
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from uuid import UUID
from datetime import datetime

# Input — what the client sends
class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    price: float = Field(..., gt=0)

# Partial update — all fields optional
class ItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, gt=0)

# Output — what the API returns
class ItemResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    price: float
    created_at: datetime
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
```

### Paginated Response

```python
from typing import Generic, TypeVar

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
    has_more: bool
```

## Field Validation

Always use `Field()` for constraints:

```python
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str = Field(..., min_length=1, max_length=100)
    age: int | None = Field(default=None, ge=0, le=150)
```

## Type Syntax

Use Python 3.10+ union syntax:

```python
# CORRECT — Python 3.10+
name: str | None = None
tags: list[str] = []

# WRONG — old syntax
name: Optional[str] = None
tags: List[str] = []
```

## ORM Integration

`ConfigDict(from_attributes=True)` lets Pydantic read SQLAlchemy model attributes:

```python
class UserResponse(BaseModel):
    id: UUID
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Usage in service:
user_model = await repository.get_by_id(id)
return UserResponse.model_validate(user_model)
```

## What NOT to Do

- **No mutable defaults** — `tags: list[str] = []` is fine in Pydantic (it copies), but don't do `tags: list[str] = Field(default=[])` with a mutable object
- **No `Optional[str]`** — use `str | None` (Python 3.10+)
- **No `orm_mode = True`** — use `model_config = ConfigDict(from_attributes=True)` (Pydantic v2)
- **No schemas in router files** — keep them in `schemas.py`
- **No SQLAlchemy models as response types** — always return Pydantic schemas
