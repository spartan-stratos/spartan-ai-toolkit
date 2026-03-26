---
name: browser-qa
description: Real browser QA patterns using Playwright. How to test web apps like a real user — page loads, forms, navigation, responsive layout, console errors, and network failures.
allowed_tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Browser QA Skill

Test web apps with a real browser. Find bugs users would find.

## When to Use

- After building a frontend feature
- Before creating a PR for UI changes
- When user reports "something looks broken"
- Smoke testing after deploy

## What This Skill Does

1. Launches Playwright with real Chromium
2. Hits every discoverable page in the app
3. Checks for console errors, network failures, broken assets
4. Tests interactive elements (forms, buttons, links)
5. Verifies mobile responsiveness
6. Produces a structured QA report

## QA Check Categories

### 1. Page Health
Every page gets these checks:
- HTTP status is 2xx
- No JavaScript console errors
- No failed network requests (4xx/5xx)
- No missing images or assets
- Page loads in under 3 seconds

### 2. Layout & Responsive
- Desktop (1280px): no horizontal scroll, no overlapping elements
- Mobile (375px): no horizontal scroll, text is readable, buttons are tappable
- No content clipped or hidden unintentionally

### 3. Interactive Elements
- Buttons: click → something happens (no dead buttons)
- Links: click → navigates to valid page (no 404s)
- Forms: submit empty → validation shows. Submit valid → success feedback.
- Dropdowns/modals: open → content visible. Close → content hidden.

### 4. Navigation Flow
- Every link in nav goes somewhere valid
- Back button works as expected
- Breadcrumbs (if present) are accurate
- Auth redirects work (protected page → login → redirect back)

### 5. Data Display
- Lists show data (not empty state when data exists)
- Pagination works (if present)
- Search/filter updates results
- Loading states show during data fetch
- Error states show when API fails

## Playwright Patterns

### Basic Page Test
```typescript
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

// Collect errors
const errors: string[] = []
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('requestfailed', req => {
  errors.push(`NETWORK: ${req.url()} — ${req.failure()?.errorText}`)
})

await page.goto('http://localhost:3000')
await page.waitForLoadState('networkidle')

// Check for errors
if (errors.length > 0) {
  console.log('BUGS FOUND:', errors)
}

await browser.close()
```

### Mobile Viewport Test
```typescript
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  userAgent: 'Mozilla/5.0 (iPhone 14)',
})
const page = await context.newPage()
await page.goto('http://localhost:3000')

// Check for horizontal scroll (layout bug)
const hasHScroll = await page.evaluate(() =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth
)
if (hasHScroll) {
  console.log('BUG: Horizontal scroll on mobile')
}
```

### Form Test
```typescript
// Test empty submit (should show validation)
await page.click('button[type="submit"]')
const validationVisible = await page.locator('.error, [role="alert"]').count()

// Test valid submit
await page.fill('input[name="email"]', 'test@example.com')
await page.fill('input[name="password"]', 'password123')
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard')
```

### Screenshot on Failure
```typescript
try {
  await page.goto(url)
  // ... checks ...
} catch (e) {
  await page.screenshot({ path: `qa-failure-${Date.now()}.png`, fullPage: true })
  throw e
}
```

## QA Report Template

```markdown
## QA Report
Date: YYYY-MM-DD
Target: http://localhost:3000

### Summary
| Metric | Count |
|--------|-------|
| Pages tested | N |
| Bugs found | N |
| Warnings | N |
| Passed | N |

### Bugs
BUG-1: [title]
- Page: [URL]
- Steps: [reproduce]
- Expected: [what should happen]
- Actual: [what happened]
- Severity: blocker / major / minor
- Auto-fixable: yes / no

### Warnings
WARN-1: [title]
- Page: [URL]
- Issue: [description]

### Passed
- /page-a — all checks clear
- /page-b — all checks clear
```

## Rules

- **Real browser only.** Playwright + Chromium. No HTTP-only testing.
- **Headless by default.** Don't open visible windows unless asked.
- **Test both viewports.** Desktop (1280px) and mobile (375px).
- **Console errors = bugs.** Always report them.
- **One-shot mode.** Launch browser, test, close. No daemon.
- **Screenshot failures.** Take a screenshot when something breaks.
- **Don't fix without asking.** Report first, then offer fixes.
