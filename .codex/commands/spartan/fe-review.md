---
name: spartan:fe-review
description: Thorough PR review for frontend code — loads rules from config, defaults to React/Next.js conventions
argument-hint: "[optional: PR title or focus area]"
---

# Frontend PR Review: {{ args[0] | default: "current branch" }}

Performing a thorough review of frontend changes.

## Step 0: Load rules

```bash
# Check for project config
cat .spartan/config.yaml 2>/dev/null

# Get changed frontend files
git diff main...HEAD --name-only | grep -E '\.(tsx?|jsx?|vue|svelte|css)$'
```

**If `.spartan/config.yaml` exists:**
- Read `rules.frontend` + `rules.shared` — check against these rules
- Read `review-stages` — only run enabled stages
- If `conditional-rules` is set, match rules to changed files

**If no config:** Use the default React/Next.js checklist below + scan for `rules/frontend-react/` or `~/.claude/rules/frontend-react/`.

Read all matched rule files before reviewing code.

---

Run `git diff main...HEAD` and analyze all modified frontend files.

## Stage 1: App Router Conventions

- [ ] New pages use **Server Components by default**
  - Only `'use client'` when strictly needed (event handlers, browser APIs, stateful UI)
  - No `'use client'` just to use async/await (Server Components handle async natively)
- [ ] Data fetching is in Server Components, not `useEffect`
- [ ] Mutations use **Server Actions** (`'use server'`), not client-side fetch to API routes
- [ ] `revalidatePath` or `revalidateTag` called after mutations (not manual router.refresh())
- [ ] Route groups `(group)/` used to avoid URL pollution when grouping by auth/layout
- [ ] Dynamic segments typed correctly: `{ params: { id: string } }`
- [ ] `loading.tsx` and `error.tsx` present for routes with async data

```bash
# Check for anti-patterns
git diff main...HEAD -- "*.tsx" "*.ts" | grep "'use client'" | wc -l  # count client components
git diff main...HEAD -- "*.tsx" | grep "useEffect.*fetch\|axios\|fetch(" # data fetching in effects
```

---

## Stage 2: TypeScript Strictness

- [ ] No `any` types — use `unknown` + type guard if uncertain
- [ ] API response types defined and mirror Kotlin DTOs
- [ ] Zod validation used for runtime API response checking
- [ ] No `!` non-null assertions without comment explaining why it's safe
- [ ] Props interfaces defined (not inline objects for complex shapes)
- [ ] Return types explicit on exported functions

```bash
# Check for type escape hatches
git diff main...HEAD -- "*.tsx" "*.ts" | grep ": any\|as any\|@ts-ignore\|@ts-expect"
```

---

## Stage 3: Performance

- [ ] Images use `next/image` (not `<img>`)
- [ ] Links use `next/link` (not `<a href>`)
- [ ] Heavy components lazy-loaded with `dynamic()` if not needed on initial paint
- [ ] No unnecessary `'use client'` that pushes rendering to browser
- [ ] `fetch` calls in Server Components use `next: { revalidate }` or `next: { tags }` appropriately
- [ ] No fetching the same data multiple times (Request Memoization across same render)

---

## Stage 4: Component Quality

- [ ] Components are small and single-purpose (< ~100 lines ideally)
- [ ] No business logic in UI components — logic lives in Server Actions or custom hooks
- [ ] Custom hooks extracted for reusable client-side logic (`useFeature.ts`)
- [ ] Props destructured in function signature
- [ ] No prop drilling deeper than 2 levels (consider composition or Context)
- [ ] `key` prop on list items uses stable ID, not array index

---

## Stage 5: Test Coverage

- [ ] New components have test files (co-located: `Component.test.tsx`)
- [ ] Tests use `@testing-library/react` — no shallow rendering
- [ ] Tests verify **behavior**, not implementation details
- [ ] Server Actions tested with mocked dependencies
- [ ] No `querySelector` in tests — use accessible queries (`getByRole`, `getByLabelText`)

```bash
# Find components without tests
git diff main...HEAD --name-only | grep "\.tsx$" | while read f; do
  testfile="${f%.tsx}.test.tsx"
  [[ ! -f "$testfile" ]] && echo "⚠️  Missing test: $testfile"
done
```

---

## Stage 6: Accessibility

- [ ] Interactive elements are semantic HTML (`<button>`, not `<div onClick>`)
- [ ] Form inputs have associated `<label>` (htmlFor + id, or `aria-label`)
- [ ] Images have meaningful `alt` text (empty `alt=""` for decorative)
- [ ] Color is not the only way to convey information
- [ ] Focus management handled on modal/dialog open/close

---

## Stage 7: Full-Stack Contract (FE ↔ Kotlin BE)

- [ ] TypeScript types in `_types/` match Kotlin DTOs exactly
- [ ] API base URL from env var (`process.env.NEXT_PUBLIC_API_URL`), never hardcoded
- [ ] Error handling for failed API calls — user-visible error state exists
- [ ] Loading states present for async operations
- [ ] No sensitive data logged to console

---

## Stage 8: Design Token Compliance

**Only runs if `.planning/design/system/tokens.md` or `.planning/design-config.md` exists.**

Read the design tokens file first. Then check every changed frontend file:

- [ ] Colors use token names or CSS variables, not hardcoded hex or Tailwind defaults
  - Search for: raw hex values (#xxx), `bg-blue-*`, `bg-purple-*`, `text-gray-*`
  - Each match: is this value in the token list? If not → flag as **critical**
- [ ] Font family matches design config, not generic fallbacks
  - Search for: `font-sans`, `Inter`, `Roboto`, `Arial`, `system-ui`
  - If project font is different → flag as **critical**
- [ ] Spacing uses the token scale, not arbitrary values
  - Random values like `p-[13px]` or `mt-[7px]` → flag as **warning**
- [ ] Border radius matches token definitions
- [ ] New components reference the design system, not reinventing styles

```bash
# Quick scan for hardcoded colors (should be tokens)
git diff main...HEAD -- "*.tsx" "*.ts" "*.css" | grep -E '#[0-9a-fA-F]{3,8}|bg-(blue|red|green|purple|pink|indigo|violet)-[0-9]' | head -20

# Quick scan for generic fonts
git diff main...HEAD -- "*.tsx" "*.ts" "*.css" | grep -E "font-sans|Inter|Roboto|Arial|system-ui" | head -10
```

---

## Output Format

```markdown
## Frontend PR Review: [title]

### Approved / Needs Changes / Blocked

### Critical Issues (must fix before merge)
- [issue with file:line reference and suggested fix]

### Suggestions (improve code quality)
- [suggestion]

### Performance Notes
- [any perf observations]

### Accessibility Notes
- [any a11y issues]

### Praise
- [what was done well — be specific]

### Verdict
[recommendation + any conditions]
```
