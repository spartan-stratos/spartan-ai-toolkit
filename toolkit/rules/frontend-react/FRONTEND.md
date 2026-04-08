# Frontend Rules

> Full guide: use `/ui-ux-pro-max` skill

## Build Check (CRITICAL)

Run `yarn build` (or `npm run build`) before committing any `.tsx`/`.ts` changes.

### What This Catches

- Unused imports (`TS6133`)
- Unused variables and functions (`TS6133`)
- Type errors
- Missing exports
- Wrong function signatures

### Common Mistakes: Leftover imports/variables after refactoring

When you remove JSX that uses a component, state, or handler, also remove:
1. The import statement
2. The state declaration (`useState`)
3. The handler function
4. Any type imports only used by removed code

**Example**: If you remove a modal from JSX, also remove:
- The `showModal` state
- The `handleOpenModal` / `handleCloseModal` handlers
- Any state only used inside that modal
- Component imports only used in that modal

### When to Run

- After ANY edit to `.tsx` or `.ts` files
- Before staging files for commit
- If build fails, fix ALL errors before committing

---

## API Client Case Conversion (CRITICAL)

**Backend uses `snake_case`, frontend uses `camelCase`**. Always convert between them.

### When creating/modifying API client files (`src/api/*.ts`)

**Always**:
```typescript
import { keysToSnake, keysToCamel } from '@/utils/caseConvert'

export const apiClient = {
  // CORRECT: Convert request to snake_case before sending
  async createResource(request: CreateRequestType): Promise<ResponseType> {
    const response = await httpClient.post(`${BASE}/resource/create`, keysToSnake(request))
    return keysToCamel(response.data)  // CORRECT: Convert response from snake_case
  },

  // WRONG: Not converting
  async wrongCreateResource(request: CreateRequestType): Promise<ResponseType> {
    const response = await httpClient.post(`${BASE}/resource/create`, request)
    return response.data
  },
}
```

### Why This Matters

Backend expects `{ "machine_box_id": "..." }` but frontend sends `{ "machineBoxId": "..." }`:
- **Result**: Micronaut JSON deserializer fails with "parameter is null" error
- **Root cause**: Field name mismatch (`machineBoxId` != `machine_box_id`)

### Common Mistakes

1. **Missing `keysToSnake` import** - Request fields don't match backend
2. **Missing `keysToCamel` on responses** - Response fields don't match TypeScript types
3. **Partial conversion** - Some methods converted, others not (inconsistent)

### Reference Example

See your API client files for correct pattern.

---

## E2E Patterns

### Selector Ambiguity Handling

**Use `.first()` when selectors might match multiple elements**.

```typescript
// CORRECT: Use .first() when multiple matches possible
await expect(page.getByRole('table').or(page.getByText('No data found')).first()).toBeVisible();

// CORRECT: Explicit for single elements
await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
```

Playwright's `or()` and `getByText()` can match multiple elements:
- **Without `.first()`**: "Ambiguous element locator" or timeout
- **With `.first()`**: Explicitly chooses first match

Common scenarios:
1. **Empty states**: Table or "No data found" message
2. **Dynamic content**: Multiple elements with similar text
3. **Loading states**: Spinner vs loaded content

### Form State Synchronization

**Always sync form state after successful save operations**.

```typescript
const handleSave = async (values: FormValues) => {
  const updated = await apiClient.updateResource(values)

  // CORRECT: Sync form state with response
  setForm({
    ...updated,
    // Ensure all fields are mapped correctly
  })

  toast.success('Saved successfully')
}

// WRONG: Not syncing state, form shows old values
const wrongHandleSave = async (values: FormValues) => {
  await apiClient.updateResource(values)
  toast.success('Saved successfully')
}
```

After save, API returns updated data (with timestamps, computed fields, defaults):
- **Without sync**: Form shows stale values, user thinks save failed
- **With sync**: Form shows fresh data from API, user sees changes

Common issues:
1. **Settings not persisting**: Form submit succeeds but UI shows old values
2. **Data not refreshing**: Add/edit operations complete but list doesn't update
3. **Navigation doesn't refetch**: Moving between tabs doesn't trigger data reload

### E2E Test File Structure

Follow consistent structure for Playwright test files.

```typescript
import { test, expect } from '@playwright/test';
import { screenshotDir } from '../fixtures/paths';

const SCREENSHOT_DIR = screenshotDir('feature-name');

// --- Page Load & Navigation ---

test('feature-name - page loads with heading and tabs', async ({ page }) => {
  await page.goto('/feature-page');
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  // Page heading should be visible
  await expect(page.getByRole('heading', { name: 'Feature Name' })).toBeVisible();

  // Tabs should be visible
  await expect(page.getByRole('tab')).toBeVisible();

  await page.screenshot({ path: `${SCREENSHOT_DIR}/page-loaded.png`, fullPage: true });
});

// --- CRUD Operations ---

test('feature-name - create item and verify', async ({ page }) => {
  await page.goto('/feature-page');
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  // Click "Create" button
  await page.getByRole('button', { name: 'Create Item' }).click();

  // Fill form
  await page.getByRole('textbox', { name: 'Name' }).fill('Test Item');

  // Submit
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForLoadState('networkidle', { timeout: 5000 });

  // Verify item appears in list
  await expect(page.getByText('Test Item')).toBeVisible({ timeout: 5000 });

  await page.screenshot({ path: `${SCREENSHOT_DIR}/create-item.png`, fullPage: true });
});
```

### Naming Conventions

- **Test names**: `feature-name - what it tests` (lowercase, descriptive)
- **Screenshot paths**: Use `screenshotDir()` helper for consistent paths
- **Timeouts**: 10s for page load, 5s for operations

---

## Checklist: Before Running E2E Tests

- [ ] Backend running and connected to database
- [ ] All POST requests in API clients use `keysToSnake()`
- [ ] All response returns use `keysToCamel()`
- [ ] Form submissions sync state after successful save
- [ ] Selectors use `.first()` where ambiguity possible

---

## Related Files

- API client files: `src/api/*.ts`
- Case conversion utility: `src/utils/caseConvert.ts`

---

## API Response Null Safety (merged from FRONTEND_CODING_STANDARDS.md)

### ALWAYS Use Optional Chaining + Nullish Coalescing for API Responses

API responses may return `undefined` or have missing properties. NEVER access response properties without null safety.

```typescript
// ✅ CORRECT — safe with fallback
const response = await teamApi.list(projectId)
setTeams(response?.teams ?? [])

// ❌ WRONG — will crash if response is undefined
const response = await teamApi.list(projectId)
setTeams(response.teams)
```

### Catch Blocks MUST Reset State to Safe Defaults

```typescript
// ✅ CORRECT
const fetchTeams = useCallback(async () => {
  try {
    const response = await teamApi.list(projectId)
    setTeams(response?.teams ?? [])
  } catch {
    setTeams([])  // Reset to safe default
  }
}, [projectId])

// ❌ WRONG — state left stale on error
const fetchTeams = useCallback(async () => {
  try {
    const response = await teamApi.list(projectId)
    setTeams(response.teams)
  } catch (e) {
    console.error(e)  // State not reset!
  }
}, [projectId])
```

### Loading States
- Always show loading indicators during async operations
- Disable form submit buttons while requests are in-flight
- Use skeleton UIs for initial data loads

---

## API Error Messages (CRITICAL)

### NEVER Show Raw Axios Error Messages to Users

Axios errors have a generic `.message` like `"Request failed with status code 400"`. The backend returns a structured `ErrorResponse` with a human-readable message in `response.data.error.message`. **Always extract the backend message.**

```typescript
// ✅ CORRECT — extract the backend error message
try {
  await apiClient.post('/api/v1/some-endpoint', data)
} catch (err: unknown) {
  const axiosErr = err as { response?: { data?: { error?: { message?: string } } } }
  const message = axiosErr?.response?.data?.error?.message || 'Fallback message.'
  throw new Error(message)
}

// ❌ WRONG — shows "Request failed with status code 400"
try {
  await apiClient.post('/api/v1/some-endpoint', data)
} catch (err) {
  throw err  // AxiosError.message is generic, not user-friendly
}

// ❌ WRONG — err.message is the Axios-generated string, not the backend's
catch (err) {
  const message = err instanceof Error ? err.message : 'Something went wrong.'
  setError(message)  // Shows "Request failed with status code 422"
}
```

### Backend Error Response Shape

All backend errors follow this structure:
```json
{
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable description",
    "status": 400,
    "details": [{ "field": "email", "message": "is required" }]
  }
}
```

### Rules

1. **Every `apiClient` call that shows errors to users** MUST extract `response.data.error.message`
2. **Always provide a fallback message** — don't show `undefined` if the shape is unexpected
3. **For field-level validation errors**, check `response.data.error.details` and show per-field messages when available
4. **Functions using raw `fetch`** (like `authFetch`) already handle this with `err?.error?.message` — keep that pattern

---

## Optimistic Updates Pattern

### Avoid UI Flash/Reload After Mutations

**Any mutation (create, update, delete) should use optimistic updates instead of full query invalidation.**

#### Why This Is Critical
- Prevents jarring UI flash/white screen during refetch
- Provides instant feedback to users
- Better perceived performance

#### Bad Pattern (UI Flash)
```typescript
// BAD - Triggers full refetch, causing flash
const mutation = useMutation({
  mutationFn: (data) => api.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['feed'] })  // Flash!
  },
})
```

#### Good Pattern (Optimistic Update)
```typescript
// GOOD - Updates cache directly, no flash
const mutation = useMutation({
  mutationFn: (data) => api.create(data),
  onSuccess: (newItem) => {
    // Update cache directly by prepending new item
    queryClient.setQueryData(['feed'], (oldData: any) => {
      if (!oldData?.pages) return oldData
      return {
        ...oldData,
        pages: oldData.pages.map((page: any, index: number) => {
          if (index === 0) {
            return { ...page, items: [newItem, ...(page.items || [])] }
          }
          return page
        }),
      }
    })

    // Invalidate related queries silently (no immediate refetch)
    queryClient.invalidateQueries({ queryKey: ['related'], refetchType: 'none' })
  },
})
```

### Use placeholderData for Query Stability

```typescript
// GOOD - Keep previous data while refetching
const { data } = useInfiniteQuery({
  queryKey: ['feed'],
  queryFn: fetchFeed,
  placeholderData: (previousData) => previousData,  // No flash on refetch
})
```

### Optimistic Delete with Rollback

```typescript
const deleteMutation = useMutation({
  mutationFn: (id: string) => api.delete(id),
  onMutate: async (id) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['items'] })

    // Save current state for rollback
    const previousData = queryClient.getQueryData(['items'])

    // Optimistically remove item
    queryClient.setQueryData(['items'], (old: any) => ({
      ...old,
      items: old.items.filter((item: any) => item.id !== id),
    }))

    return { previousData }
  },
  onError: (_err, _id, context) => {
    // Rollback on error
    if (context?.previousData) {
      queryClient.setQueryData(['items'], context.previousData)
    }
  },
})
```
