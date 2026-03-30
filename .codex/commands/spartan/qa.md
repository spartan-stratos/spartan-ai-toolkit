---
name: spartan:qa
description: Run real browser QA on your app using Playwright. Opens Chromium, clicks through flows, finds bugs, and reports issues. Use after building a feature to test it like a real user.
argument-hint: "[URL or localhost port] [optional: feature to test]"
---

# Browser QA: {{ args[1] | default: "full app" }}

You are running **real browser QA** — not unit tests, not mocks. A real Chromium browser hitting a real running app.

**Target:** {{ args[0] | default: "http://localhost:3000" }}

---

## Step 0: Pre-flight Check

```bash
# Is the app running?
TARGET="{{ args[0] | default: 'http://localhost:3000' }}"
curl -s -o /dev/null -w "%{http_code}" "$TARGET" || echo "APP_NOT_RUNNING"

# Is Playwright installed?
npx playwright --version 2>/dev/null || echo "PLAYWRIGHT_MISSING"
```

**If app not running:**
> "Your app isn't running at $TARGET. Start it first (`npm run dev` or `./gradlew run`), then re-run `/spartan:qa`."

**If Playwright missing:**
> "Playwright isn't installed. Run `npm install -D @playwright/test && npx playwright install chromium` first."

---

## Step 1: Discover What to Test

{% if args[1] %}
Focus QA on: **{{ args[1] }}**

Find the routes and components related to this feature:
```bash
# Find related pages
find . -path "*/app/**/page.tsx" -o -path "*/pages/**/*.tsx" 2>/dev/null | head -20

# Find related API routes
find . -path "*/app/api/**/route.ts" -o -path "*/pages/api/**/*.ts" 2>/dev/null | head -20
```

Build a test plan for this specific feature.
{% else %}
No specific feature given — run a **full smoke test**.

Discover all routes:
```bash
# Next.js App Router pages
find . -path "*/app/**/page.tsx" -not -path "*/node_modules/*" 2>/dev/null | sort

# Next.js Pages Router
find . -path "*/pages/**/*.tsx" -not -path "*/node_modules/*" -not -name "_*" 2>/dev/null | sort

# API routes
find . -path "*/app/api/**/route.ts" -o -path "*/pages/api/**/*.ts" 2>/dev/null | sort
```

Build a test plan that hits every discoverable page.
{% endif %}

### Test Plan Format

Before testing, show the plan:

```
QA Plan: [feature or "full smoke"]
Target:  [URL]

Flows to test:
  1. [Page/flow name] — [what to check]
  2. [Page/flow name] — [what to check]
  3. ...

Checks per page:
  - Page loads without console errors
  - No broken images or missing assets
  - Interactive elements respond (buttons, links, forms)
  - Mobile viewport doesn't break layout
  - API calls return 2xx
```

---

## Step 2: Run QA Tests

Use Playwright to test each flow. Write and run tests inline:

```typescript
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
})
const page = await context.newPage()

// Collect console errors
const consoleErrors: string[] = []
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})

// Collect failed network requests
const networkErrors: string[] = []
page.on('requestfailed', req => {
  networkErrors.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`)
})

// Test each flow...
await page.goto('TARGET_URL')
// [test logic here]

await browser.close()
```

### What to Check on Every Page

1. **Console errors** — collect all `console.error` messages
2. **Network failures** — any 4xx/5xx responses or failed requests
3. **Missing assets** — broken images, failed CSS/JS loads
4. **Layout issues** — check at 1280px and 375px (mobile) viewports
5. **Interactive elements** — click buttons, fill forms, check they respond
6. **Navigation** — links go where they should, no dead ends

### What to Check for Specific Features

- **Forms:** Submit with valid data → success. Submit empty → validation shows.
- **Auth flows:** Login → redirect to dashboard. Protected page → redirect to login.
- **CRUD:** Create → appears in list. Edit → shows updated. Delete → gone from list.
- **Search/filter:** Type → results update. Clear → back to full list.

---

## Step 3: Report Findings

After testing, produce a QA report:

```markdown
## QA Report: [feature or "full smoke"]
Date: [today]
Target: [URL]

### Summary
- Pages tested: [N]
- Bugs found: [N]
- Warnings: [N]
- All clear: [N pages with no issues]

### Bugs (fix these)

#### BUG-1: [title]
- **Page:** [URL]
- **Steps:** [how to reproduce]
- **Expected:** [what should happen]
- **Actual:** [what happened]
- **Severity:** [blocker / major / minor]
- **Fix suggestion:** [if obvious]

### Warnings (review these)

#### WARN-1: [title]
- **Page:** [URL]
- **Issue:** [what's not ideal]
- **Suggestion:** [how to improve]

### Passed
- [page] — all checks passed
- [page] — all checks passed
```

---

## Step 4: Auto-Fix (when possible)

For simple issues, offer to fix them right away:

**Auto-fixable:**
- Missing alt text on images
- Console errors from missing env vars
- Broken internal links (wrong href)
- Missing viewport meta tag
- Unclosed HTML tags

**NOT auto-fixable (just report):**
- Layout bugs (need design decision)
- Logic errors (need understanding of intent)
- Performance issues (need profiling)
- API errors (need backend investigation)

For each auto-fixable bug:
> "BUG-1 is auto-fixable. Want me to fix it? [Y/n]"

Fix one at a time. Re-run that specific check after each fix to verify.

---

## Step 5: Next Steps

After the report, suggest:

- Bugs found → "Want me to fix these? I'll go one by one."
- All clear → "QA passed. Ready for `/spartan:pr-ready`."
- Need deeper testing → "For E2E test coverage, run `/spartan:e2e` to scaffold permanent Playwright tests."

---

## Rules

1. **Always check if the app is running first.** Don't waste time if there's nothing to test.
2. **Real browser only.** No curl-based testing. No mock browsers. Playwright with real Chromium.
3. **Headless by default.** Don't pop up browser windows unless user asks for `--headed`.
4. **Report ALL issues found.** Don't stop at the first bug.
5. **Mobile viewport is not optional.** Always check at 375px width.
6. **Console errors are bugs.** Even if the page "looks fine," console errors need fixing.
7. **Auto-fix only with permission.** Show the fix, ask before applying.
8. **This is a one-shot run.** No persistent daemon. Spin up browser, test, close, done.
