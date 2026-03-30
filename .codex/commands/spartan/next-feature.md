---
name: spartan:next-feature
description: Scaffold a new Next.js feature following App Router conventions — pages, components, server actions, types, and tests.
argument-hint: "[feature name] [brief description]"
---

# Next.js Feature: {{ args[0] }}
Description: {{ args[1] }}

You are scaffolding a new Next.js feature following **App Router** conventions for the Spartan frontend.

---

## Step 1: Clarify before building

Ask the user:
1. Is this a **page** (new route), a **component** (reusable UI), or a **feature** (page + components + logic)?
2. Does it need **data fetching** from the Kotlin BE? If yes, which API endpoints?
3. Is any part **interactive** (needs `'use client'`)? What interactions?
4. Any **auth/access control** requirements?

**Auto mode on?** → Infer answers from the feature name and codebase context. Assume "feature" type, check existing API patterns, proceed immediately.
**Auto mode off?** → Wait for answers, then proceed.

---

## Step 1.5: Check for design tokens (silent)

```bash
ls .planning/design/system/tokens.md .planning/design-config.md 2>/dev/null
```

If design tokens exist, read them. All scaffolded components MUST use project tokens:
- Use project colors in default styles, not Tailwind defaults
- Use project font in any typography
- Import from the project's design token file if it exists (e.g., `@/lib/design-tokens`)

If NO tokens exist, scaffold with clean, unstyled components. Use `bg-neutral-*` placeholder styles that are obviously temporary. Don't use `bg-blue-500` or other Tailwind color defaults.

---

## Step 2: Map the directory structure

Based on answers, propose this structure under `app/` or `components/`:

```
# For a new PAGE feature:
app/[feature-name]/
  page.tsx              ← Server Component (data fetching here)
  page.test.tsx         ← Tests
  layout.tsx            ← Only if needs own layout
  loading.tsx           ← Loading UI (Suspense boundary)
  error.tsx             ← Error boundary
  _components/          ← Feature-local components
    FeatureCard.tsx
    FeatureCard.test.tsx
  _actions/             ← Server Actions for mutations
    createFeature.ts
    updateFeature.ts
  _types/               ← TypeScript types
    feature.types.ts

# For a reusable COMPONENT:
components/[ComponentName]/
  [ComponentName].tsx
  [ComponentName].test.tsx
  [ComponentName].stories.tsx   ← If using Storybook
  index.ts                      ← Re-export
```

---

## Step 3: Create types first

In `_types/feature.types.ts`:

```typescript
// Mirror the Kotlin DTO structure from BE
export interface FeatureDto {
  id: string
  // ... fields from BE response
  createdAt: string // ISO string from BE
}

// For API responses — always typed
export interface ApiResponse<T> {
  data: T
  message?: string
}

// For form/mutation input
export interface CreateFeatureInput {
  // ...
}
```

---

## Step 4: Create API client

```typescript
// lib/api/feature.api.ts

import { FeatureDto, CreateFeatureInput } from '@/app/[feature]/_types/feature.types'

export async function getFeature(id: string): Promise<FeatureDto> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/features/${id}`, {
    next: { revalidate: 60 }, // ISR: revalidate every 60s
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch feature: ${res.status}`)
  }
  
  return res.json()
}

export async function createFeature(input: CreateFeatureInput): Promise<FeatureDto> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Failed to create feature')
  }
  
  return res.json()
}
```

---

## Step 5: Create Server Component page

```typescript
// app/[feature-name]/page.tsx
import { getFeature } from '@/lib/api/feature.api'
import { FeatureCard } from './_components/FeatureCard'

// Metadata for SEO
export const metadata = {
  title: '[Feature Name] | Spartan',
}

interface PageProps {
  params: { id: string }
  searchParams: { [key: string]: string | undefined }
}

export default async function FeaturePage({ params }: PageProps) {
  // Data fetching directly in Server Component
  const feature = await getFeature(params.id)
  
  return (
    <main>
      <FeatureCard feature={feature} />
    </main>
  )
}
```

---

## Step 6: Write tests FIRST (TDD)

```typescript
// page.test.tsx — Server Component test
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FeaturePage from './page'

// Mock the API call
vi.mock('@/lib/api/feature.api', () => ({
  getFeature: vi.fn()
}))

describe('FeaturePage', () => {
  it('renders feature data when loaded', async () => {
    // given
    const mockFeature = { id: '1', name: 'Test Feature' }
    vi.mocked(getFeature).mockResolvedValue(mockFeature)
    
    // when
    const page = await FeaturePage({ params: { id: '1' }, searchParams: {} })
    render(page)
    
    // then
    expect(screen.getByText('Test Feature')).toBeInTheDocument()
  })
})
```

---

## Step 7: Environment variables check

Ensure these are set in `.env.local` (and in Railway env vars):
```
NEXT_PUBLIC_API_URL=http://localhost:8080   # local
# Railway: set to production BE service URL
```

After scaffolding, run:
```bash
npm run dev
npm test -- --watch [feature-name]
```

Say: "Feature scaffolded. First failing test written. Say **'go'** to implement."
