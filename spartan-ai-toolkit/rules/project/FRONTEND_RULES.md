# Frontend Rules

## Build Check (CRITICAL)

Run `cd tools/insight-admin && yarn build` before committing any `.tsx`/`.ts` changes.

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

- After ANY edit to `.tsx` or `.ts` files under `tools/insight-admin/`
- Before staging files for commit
- If build fails, fix ALL errors before committing

---

## API Client Case Conversion (CRITICAL)

**Backend uses `snake_case`, frontend uses `camelCase`**. Always convert between them.

### When creating/modifying API client files (`tools/insight-admin/src/api/*.ts`)

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

See `tools/insight-admin/src/api/connectorClient.ts:77` for correct pattern.

---

## Backend Startup for E2E Testing

**Always use correct environment for local development**.

```bash
# CORRECT: Uses application-local.yml (port 5436)
MICRONAUT_ENVIRONMENTS=local ./gradlew :app:api-application:run -Dmicronaut.environments=local

# WRONG: Uses application.yml (port 5432)
./gradlew :app:api-application:run
```

### Why This Matters

Docker exposes PostgreSQL on port 5436 (mapped from container's 5432):
- **Without `MICRONAUT_ENVIRONMENTS=local`**: Backend connects to `localhost:5432` -> fails
- **With `MICRONAUT_ENVIRONMENTS=local`**: Backend uses `application-local.yml` -> connects to port 5436

### Common Errors

```
Connection to localhost:5432 refused
Backend startup failed: Bean definition could not be loaded
```

**Fix**: Always set `MICRONAUT_ENVIRONMENTS=local` when running backend for E2E tests.

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

- [ ] Backend started with `MICRONAUT_ENVIRONMENTS=local`
- [ ] Database running on port 5436 (`docker-compose ps`)
- [ ] All POST requests in API clients use `keysToSnake()`
- [ ] All response returns use `keysToCamel()`
- [ ] Form submissions sync state after successful save
- [ ] Selectors use `.first()` where ambiguity possible

---

## Related Files

- API client example: `tools/insight-admin/src/api/connectorClient.ts`
- Case conversion utilities: `tools/insight-admin/src/utils/caseConvert.ts`
- Backend configuration: `app/api-application/src/main/resources/application-local.yml`

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
