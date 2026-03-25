---
name: spartan:e2e
description: Set up Playwright end-to-end testing for a Next.js app. Scaffold config, page objects, and critical path tests. Use when the app has enough features to warrant E2E coverage.
argument-hint: "[optional: feature or critical path to test first]"
---

# E2E Testing Setup: {{ args[0] | default: "full setup" }}

You are setting up **Playwright** for end-to-end testing in a Next.js project.
E2E tests complement unit tests (Vitest) — they test real user flows across the full stack.

---

## Step 1: Install Playwright

```bash
npm install -D @playwright/test
npx playwright install chromium  # Only chromium for speed; add more later if needed
```

---

## Step 2: Configure

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Add when ready:
    // { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],

  // Start Next.js dev server for local runs
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
```

---

## Step 3: Directory Structure

```
e2e/
├── fixtures/              ← Shared test fixtures and setup
│   ├── base.fixture.ts    ← Extended test with common helpers
│   └── test-data.ts       ← Test data factories
├── pages/                 ← Page Object Models
│   ├── BasePage.ts
│   └── [Feature]Page.ts
├── [feature].spec.ts      ← Test files
└── global-setup.ts        ← One-time setup (auth, seed data)
```

---

## Step 4: Base Page Object

```typescript
// e2e/pages/BasePage.ts
import { type Page, type Locator, expect } from '@playwright/test'

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  // Common helpers
  async waitForPageReady() {
    await this.page.waitForLoadState('networkidle')
  }

  async expectToastMessage(text: string) {
    await expect(this.page.getByRole('alert')).toContainText(text)
  }

  async expectUrl(pattern: string | RegExp) {
    await expect(this.page).toHaveURL(pattern)
  }
}
```

```typescript
// e2e/pages/HomePage.ts — example
import { type Page, type Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class HomePage extends BasePage {
  readonly heading: Locator
  readonly ctaButton: Locator

  constructor(page: Page) {
    super(page)
    this.heading = page.getByRole('heading', { level: 1 })
    this.ctaButton = page.getByRole('link', { name: /get started/i })
  }

  async goto() {
    await this.page.goto('/')
    await this.waitForPageReady()
  }

  async clickCta() {
    await this.ctaButton.click()
  }
}
```

---

## Step 5: Test Fixture

```typescript
// e2e/fixtures/base.fixture.ts
import { test as base } from '@playwright/test'
import { HomePage } from '../pages/HomePage'

type Fixtures = {
  homePage: HomePage
  // Add more page objects as features grow
}

export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page)
    await use(homePage)
  },
})

export { expect } from '@playwright/test'
```

---

## Step 6: First E2E Test

{% if args[0] and args[0] != "full setup" %}
Write tests for: **{{ args[0] }}**
{% else %}
Write a smoke test for the critical happy path:
{% endif %}

```typescript
// e2e/smoke.spec.ts
import { test, expect } from './fixtures/base.fixture'

test.describe('Smoke Tests', () => {
  test('home page loads and renders correctly', async ({ homePage }) => {
    await homePage.goto()
    await expect(homePage.heading).toBeVisible()
  })

  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.status).toBe('ok')
  })
})
```

---

## Step 7: Package.json Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:report": "playwright show-report"
  }
}
```

---

## Step 8: CI Integration

Add to `.github/workflows/ci.yml`:

```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: test  # Run after unit tests pass
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install chromium --with-deps
      - run: npm run test:e2e
        env:
          CI: true
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

---

## Step 9: .gitignore additions

```
# Playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
```

---

## Step 10: Verify

```bash
# Run E2E tests
npm run test:e2e

# Debug with UI mode
npm run test:e2e:ui
```

After setup, say:
"✅ Playwright E2E configured. Smoke test passing.
Use Page Object pattern in `e2e/pages/` for each new feature.
Run `npm run test:e2e:ui` for interactive debugging."

---

## E2E Test Writing Conventions

When writing new E2E tests, follow these rules:

1. **Use Page Objects** — never raw selectors in test files
2. **Prefer accessible locators**: `getByRole`, `getByLabel`, `getByText` over CSS selectors
3. **One assertion per test** (prefer) or closely related assertions
4. **Test user flows**, not implementation — "user can complete checkout" not "checkout button has class X"
5. **Isolate test data** — each test creates its own data, never depends on other tests
6. **Name tests as user stories**: `test('user can add item to cart and checkout')`
