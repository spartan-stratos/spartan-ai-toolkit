# Frontend Workflow: React + Next.js

> **Prefer `/spartan:build frontend "feature"`** — it automates this workflow with gates and skill routing. Use this template as a manual reference when not using the Build workflow.

**Rules enforced:** `FRONTEND.md`

---

## The Workflow

```
Epic → Spec → Design → Plan → Build → Review
              ↑                  ↑       ↑        ↑
            Gate 1             Gate 2  Gate 3   Gate 4
```

Design is NOT optional for frontend features — always create a design doc for new screens/components.

---

## Phase Guide

### Spec Phase — what to define

The spec for a frontend feature should include:

**UI Changes:**
- Which screens are new or changed
- User flows (step by step)
- States: loading, empty, error, success
- Mobile vs desktop differences

**API dependencies:**
- Which API endpoints does this feature call?
- Request/response shapes
- Are these endpoints new (needs backend work first) or existing?

**Example spec sections:**

```
-- UI Changes
New screen: /dashboard/analytics
- Shows chart with last 30 days of data
- Filter by date range, category
- Empty state when no data
- Mobile: stacked layout, swipeable charts

-- API Dependencies (existing)
GET /api/v1/analytics/summary?start_date=X&end_date=Y
GET /api/v1/analytics/chart-data?period=daily&category=X
```

---

### Design Phase — always do this for frontend

Use `design-doc.md` to define:

1. **User flows** — every interaction, step by step
2. **Screen inventory** — every screen with all states (loading, empty, error, success)
3. **Component list** — reusable components with props and states
4. **Wireframes** — ASCII or reference screenshots
5. **Responsive behavior** — what changes at mobile / tablet / desktop
6. **Accessibility** — contrast, keyboard, focus order, touch targets

Use the `/figma-to-code` command if you have Figma designs.

---

### Plan Phase — how to structure tasks

Break into these phases:

#### Phase 1: Types & API Layer
| # | Task | Files |
|---|------|-------|
| 1 | Define TypeScript types/interfaces | `types/{feature}.ts` |
| 2 | Create API client functions | `lib/api/{feature}.ts` or server actions |
| 3 | Create data hooks (if client-side) | `hooks/use-{feature}.ts` |

#### Phase 2: Components
| # | Task | Files |
|---|------|-------|
| 4 | Create base UI components | `components/{feature}/{Component}.tsx` |
| 5 | Create composite components | `components/{feature}/{CompositeComponent}.tsx` |
| 6 | Add loading/error/empty states | Update components from tasks 4-5 |

#### Phase 3: Pages & Routes
| # | Task | Files |
|---|------|-------|
| 7 | Create page component | `app/{route}/page.tsx` |
| 8 | Create layout (if needed) | `app/{route}/layout.tsx` |
| 9 | Add server actions (if needed) | `app/{route}/actions.ts` |
| 10 | Wire up navigation | Update nav/sidebar components |

#### Phase 4: Tests
| # | Task | Files |
|---|------|-------|
| 11 | Component unit tests | `__tests__/{Component}.test.tsx` |
| 12 | Hook tests | `__tests__/use-{feature}.test.ts` |
| 13 | E2E tests (if critical path) | `e2e/{feature}.spec.ts` |

**Parallel groups:**
- Tasks 1-3 can run in parallel (types, API, hooks are independent)
- Tasks 4-5 can run in parallel (base and composite components are separate files)
- Tasks 11-13 can run in parallel (tests are independent)

**Sequential:**
- Task 5 may need 4 (composite uses base components)
- Task 6 needs 4-5 (states go into existing components)
- Task 7 needs 4-6 (page composes components)
- Task 9 needs 2 (server actions may wrap API calls)

---

## Quality Gates — Frontend Specific

### Gate 1: Spec Review (Frontend)

Everything from the generic Gate 1, plus:

**UI Changes:**
- [ ] All affected screens listed
- [ ] All states defined (loading, empty, error, success)
- [ ] Mobile vs desktop differences called out
- [ ] User flows are step-by-step (not vague)
- [ ] Design doc created (`design-doc.md`)

**API Dependencies:**
- [ ] All needed endpoints listed
- [ ] New vs existing endpoints clearly marked
- [ ] Response shapes documented
- [ ] If new endpoints needed: is backend spec written?

---

### Gate 2: Plan Review (Frontend)

Everything from the generic Gate 2, plus:

**App Router (FRONTEND.md):**
- [ ] Pages use App Router conventions (`page.tsx`, `layout.tsx`, `loading.tsx`)
- [ ] Server components vs client components clearly decided
- [ ] Server actions used for mutations (not API routes where possible)
- [ ] Data fetching strategy decided (server component fetch, SWR, React Query, etc.)

**Component Design:**
- [ ] Reusable components identified and planned
- [ ] Component props are typed with TypeScript interfaces
- [ ] States handled: default, loading, error, empty, disabled
- [ ] Accessibility considered (keyboard, screen reader, focus)

**File Structure:**
- [ ] Types in `types/` directory
- [ ] API functions in `lib/api/` or server actions in route dirs
- [ ] Components in `components/{feature}/`
- [ ] Pages in `app/{route}/`

---

### Gate 3: Implementation Review (Frontend)

Everything from the generic Gate 3, plus:

**TypeScript (FRONTEND.md):**
- [ ] No `any` types — use proper interfaces
- [ ] No `as` type assertions unless truly needed
- [ ] Props interfaces defined and exported
- [ ] API responses properly typed

**React Patterns:**
- [ ] No unnecessary `useEffect` — prefer server components or derived state
- [ ] No prop drilling — use composition or context
- [ ] Keys on list items are stable (not array index)
- [ ] Event handlers don't create new functions on every render (when it matters for perf)

**API Integration (FRONTEND.md):**
- [ ] snake_case → camelCase conversion at API boundary
- [ ] camelCase → snake_case conversion for requests
- [ ] Error states handled (not just happy path)
- [ ] Loading states shown during async operations

**Accessibility:**
- [ ] Semantic HTML elements (not `div` for everything)
- [ ] ARIA labels on interactive elements without visible text
- [ ] Focus management for modals/dialogs
- [ ] Color is not the only way to show state

**Build:**
- [ ] `npm run build` passes (no TypeScript errors)
- [ ] No console warnings in dev mode
- [ ] No unused imports

---

### Gate 4: Final Review (Frontend)

Everything from the generic Gate 4, plus:

- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] No `any` types in changed files
- [ ] All pages work at mobile (375px), tablet (768px), desktop (1440px)
- [ ] Lighthouse accessibility score >= 90
- [ ] No layout shift on page load (CLS)
- [ ] Images use `next/image` with proper sizing
- [ ] No hardcoded colors — use design tokens or Tailwind classes

---

## Quick Reference

| What | Where | Notes |
|------|-------|-------|
| Pages | `app/{route}/page.tsx` | Server components by default |
| Layouts | `app/{route}/layout.tsx` | Shared UI between routes |
| Components | `components/{feature}/` | One component per file |
| Types | `types/{feature}.ts` | Shared TypeScript interfaces |
| API client | `lib/api/{feature}.ts` | Fetch wrappers, case conversion |
| Server actions | `app/{route}/actions.ts` | Mutations, form handling |
| Hooks | `hooks/use-{feature}.ts` | Client-side data/state |
| Tests | `__tests__/` or colocated | Vitest + Testing Library |
| E2E tests | `e2e/` | Playwright |

## Related Skills & Commands

- `/spartan:next-app` — scaffold a new Next.js app
- `/spartan:next-feature` — scaffold a feature in existing app
- `/spartan:fe-review` — PR review with React/Next.js conventions
- `/spartan:figma-to-code` — convert Figma design to code
- `/spartan:e2e` — set up Playwright E2E testing
- `/ui-ux-pro-max` skill — design system intelligence
