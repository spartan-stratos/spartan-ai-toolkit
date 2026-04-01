# Error Handling Rules

## Standard Error Response

All errors follow this shape:

```python
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    detail: str
    code: str | None = None
```

## Service Layer — Raise HTTPException

Services raise `HTTPException` for expected errors:

```python
from fastapi import HTTPException, status

class ItemService:
    async def get_by_id(self, id: UUID) -> Item:
        item = await self.repository.get_by_id(id)
        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item {id} not found",
            )
        return item

    async def create(self, request: ItemCreate) -> Item:
        existing = await self.repository.get_by_name(request.name)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Item with name '{request.name}' already exists",
            )
        return await self.repository.create(request)
```

## Custom Exception Handler

For consistent error formatting across the app:

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

app = FastAPI()

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
        },
    )
```

## Common Error Patterns

| Scenario | Status Code | Pattern |
|----------|-------------|---------|
| Not found | 404 | `raise HTTPException(status_code=404, detail="...")` |
| Already exists | 409 | Check before create, raise if found |
| Invalid input | 422 | Pydantic handles this automatically |
| Unauthorized | 401 | Auth dependency raises |
| Forbidden | 403 | Permission check in service |
| Internal error | 500 | Unhandled exception → FastAPI returns 500 |

## Error Handling by Layer

| Layer | Handles | How |
|-------|---------|-----|
| Router | Nothing — let exceptions propagate | Don't catch, let FastAPI handle |
| Service | Business rule violations | Raise HTTPException |
| Repository | Database errors | Let SQLAlchemy exceptions propagate |
| Exception handler | Formatting | Convert to consistent JSON response |

## What NOT to Do

- **No bare `except: pass`** — always handle or propagate
- **No returning error dicts** — raise HTTPException instead
- **No try/except around every DB call** — let errors propagate to the exception handler
- **No 200 status with error body** — use proper HTTP status codes
- **No generic "Internal Server Error" messages** — log the real error, return a safe message
