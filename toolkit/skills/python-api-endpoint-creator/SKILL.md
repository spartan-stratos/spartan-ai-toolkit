---
name: python-api-endpoint-creator
description: "Creates FastAPI endpoints with layered architecture (Router → Service → Repository). Use when creating new API endpoints, CRUD operations, or scaffolding a new domain module in a FastAPI project."
allowed_tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Python API Endpoint Creator

Creates complete FastAPI endpoints following strict layered architecture patterns.

## When to Use

- Creating a new REST API endpoint from scratch
- Adding CRUD operations for a new domain entity
- Setting up the full stack: Router → Service → Repository → Tests
- Scaffolding a new domain module

## Process

1. **Pydantic Schemas** — Create/Update/Response in `schemas.py`
2. **SQLAlchemy Model** — with SoftDeleteMixin in `models.py`
3. **Repository** — async CRUD with soft delete in `repository.py`
4. **Service** — business logic, HTTPException for errors in `service.py`
5. **Dependencies** — `get_db`, `get_service` in `dependencies.py`
6. **Router** — thin endpoints, Depends() for everything in `router.py`
7. **Tests** — httpx AsyncClient tests in `tests/`

> See code-patterns.md for complete templates for each file.

## Architecture

```
Router (APIRouter)  →  Service  →  Repository  →  Database
      ↓                  ↓            ↓
  Depends()        Business logic  SQLAlchemy
  Pydantic schemas HTTPException   AsyncSession
  Status codes     Validation      Soft delete
```

## Hard Rules

- **POST for all mutations** — GET for reads, POST for create/update/delete
- **Query params for IDs** — `?id=xxx`, never path params `/{id}`
- **Routers are thin** — just delegation, no business logic
- **Services raise HTTPException** — for expected errors (404, 409, 422)
- **Repositories handle soft delete** — filter `deleted_at.is_(None)` in all queries
- **`async def` for all endpoints** — unless CPU-bound

## Gotchas

- **Forgetting `response_model` makes your API leak internal fields.** Always set `response_model=YourSchema` on endpoints. Without it, FastAPI serializes the raw return value, which may include `hashed_password`, `deleted_at`, or other internal fields from your SQLAlchemy model.

- **`Depends()` creates a new instance per request — not a singleton.** If your service holds state, it will be lost between requests. Services should be stateless. If you need shared state, use app state or a cache.

- **`await db.commit()` in the dependency, not in the repository.** The `get_db` dependency handles commit/rollback. If you also commit inside the repository, you get double-commit bugs or premature commits before all operations complete.

- **422 errors from Pydantic are opaque by default.** Override the `RequestValidationError` handler to return field-level errors. The default just says "validation error" with no useful detail for the frontend.

- **Missing `status_code=201` on create endpoints.** FastAPI defaults to 200. Explicitly set `status_code=status.HTTP_201_CREATED` on POST create routes and `status_code=status.HTTP_204_NO_CONTENT` on delete routes.
