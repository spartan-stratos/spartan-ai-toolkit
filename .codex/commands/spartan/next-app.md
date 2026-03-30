---
name: spartan:next-app
description: Scaffold a complete new Next.js application from scratch — App Router, TypeScript, Tailwind, testing setup, API client layer, auth scaffolding, and CI config.
argument-hint: "[app name] [brief description]"
---

# New Next.js App: {{ args[0] }}
Description: {{ args[1] }}

Scaffolding a **production-ready** Next.js application. This is more complete than
`/spartan:next-feature` — use this for a brand-new frontend project.

---

## Step 1: Clarify before building

Ask:
1. **Auth**: None / NextAuth.js / custom JWT / Clerk / Auth0?
2. **State management**: Server-only (preferred) / Zustand / React Query for client state?
3. **Connects to which BE service(s)?** (Kotlin service names/URLs)
4. **Deploy target**: Railway / Vercel / AWS / Docker+K8s?
5. **Database** (if any — for full-stack Next.js with Prisma): Yes / No, using separate BE

**Auto mode on?** → Use defaults: No auth, Server-only state, Railway deploy, no DB (separate BE). Proceed immediately.
**Auto mode off?** → Wait for answers.

---

## Step 2: Bootstrap with create-next-app

```bash
npx create-next-app@latest {{ args[0] }} \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-eslint   # we configure this ourselves

cd {{ args[0] }}
```

---

## Step 3: Install core dependencies

```bash
# Testing
npm install -D vitest @vitejs/plugin-react jsdom
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom

# API + validation
npm install zod

# Auth (if NextAuth chosen)
npm install next-auth@beta    # v5 for App Router

# Dev tooling
npm install -D eslint-config-next @typescript-eslint/eslint-plugin prettier
```

---

## Step 4: Configure project structure

```
src/
├── app/                        # App Router
│   ├── (auth)/                 # Route group — auth pages
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/            # Route group — protected pages
│   │   ├── layout.tsx          # ← auth check here
│   │   └── [feature]/
│   ├── api/                    # API routes (only when server actions aren't enough)
│   ├── globals.css
│   └── layout.tsx              # Root layout
├── components/
│   ├── ui/                     # Shared primitives (Button, Input, Card...)
│   └── [feature]/              # Feature-specific components
├── lib/
│   ├── api/                    # BE API client functions
│   │   ├── client.ts           # Base fetch wrapper
│   │   └── [service].api.ts    # Per-service functions
│   ├── auth/                   # Auth utilities
│   └── utils.ts                # cn(), formatDate(), etc.
├── hooks/                      # Custom React hooks (client-side)
├── types/                      # Shared TypeScript types
│   └── api.types.ts            # Mirror Kotlin DTOs here
└── middleware.ts               # Auth + route protection
```

---

## Step 5: Create base API client

```typescript
// src/lib/api/client.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

type ApiError = {
  message: string
  code: string
  status: number
}

export class ApiClient {
  private static async request<T>(
    path: string,
    options?: RequestInit & { tags?: string[] }
  ): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      next: options?.tags ? { tags: options.tags } : undefined,
    })

    if (!res.ok) {
      const error: ApiError = await res.json().catch(() => ({
        message: 'Unknown error',
        code: 'UNKNOWN',
        status: res.status,
      }))
      throw new Error(error.message)
    }

    return res.json()
  }

  static get<T>(path: string, tags?: string[]) {
    return this.request<T>(path, { tags })
  }

  static post<T>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  static put<T>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  static delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }
}
```

---

## Step 6: Configure Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Step 7: Environment variables

Create `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=   # generate: openssl rand -base64 32
```

Create `.env.example` (commit this):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
# NEXTAUTH_URL=https://your-domain.com
# NEXTAUTH_SECRET=your-secret-here
```

---

## Step 8: Deploy configuration

**Railway** (`railway.toml`):
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
```

Create `src/app/api/health/route.ts`:
```typescript
export function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
}
```

**Docker** (`Dockerfile`):
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Add to `next.config.ts`: `output: 'standalone'`

---

## Step 9: First test — smoke test

```typescript
// src/app/page.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Home from './page'

describe('Home page', () => {
  it('renders without crashing', () => {
    render(<Home />)
    expect(document.body).toBeDefined()
  })
})
```

Run: `npm test` — must be green before moving on.

---

## Step 10: GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:run
      - run: npm run build
```

After scaffolding complete:
"✅ App scaffolded. Run `npm run dev` to start. First test is green.
Use `/spartan:next-feature [name]` to build individual features."
