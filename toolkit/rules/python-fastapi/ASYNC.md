# Async Patterns

## async def vs def

| Route type | Use | Why |
|-----------|-----|-----|
| Database queries, HTTP calls, file I/O | `async def` | Non-blocking, uses event loop |
| CPU-bound (parsing, computation) | `def` | FastAPI runs it in a threadpool automatically |

```python
# CORRECT — async for I/O
@router.get("/items")
async def list_items(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item))
    return result.scalars().all()

# CORRECT — sync for CPU-bound
@router.post("/parse")
def parse_document(file: UploadFile):
    content = file.file.read()
    return heavy_cpu_parsing(content)

# WRONG — blocking call in async route
@router.get("/data")
async def get_data():
    time.sleep(5)  # Blocks the entire event loop!
    return {"data": "value"}
```

## Lifespan Events

Use `@asynccontextmanager` lifespan (not deprecated `on_event`):

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(lifespan=lifespan)
```

## Database Session Pattern

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

## Background Tasks

For work after the response is sent:

```python
from fastapi import BackgroundTasks

@router.post("/notify")
async def send_notification(
    request: NotifyRequest,
    background_tasks: BackgroundTasks,
):
    background_tasks.add_task(send_email, request.email, request.message)
    return {"status": "queued"}

async def send_email(email: str, message: str):
    # This runs after response is sent
    ...
```

## External HTTP Calls

Use `httpx.AsyncClient` (not `requests`):

```python
import httpx

async def fetch_external_data(url: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=10.0)
        response.raise_for_status()
        return response.json()
```

## Concurrent Operations

```python
import asyncio

async def fetch_all(ids: list[UUID]) -> list[dict]:
    tasks = [fetch_one(id) for id in ids]
    return await asyncio.gather(*tasks)
```

## Datetime

```python
from datetime import datetime, UTC

# CORRECT — Python 3.12+
now = datetime.now(UTC)

# WRONG — deprecated
now = datetime.utcnow()
```

## What NOT to Do

- **No `time.sleep()` in async routes** — use `await asyncio.sleep()` or BackgroundTasks
- **No `requests` library** — use `httpx.AsyncClient` for async HTTP
- **No `@app.on_event("startup")`** — use lifespan context manager
- **No `datetime.utcnow()`** — use `datetime.now(UTC)`
- **No sync DB drivers** — use `asyncpg`, `aiosqlite`, or `aiomysql`
