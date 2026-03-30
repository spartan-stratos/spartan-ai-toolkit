---
name: spartan:figma-to-code
description: Convert a Figma design screen to production code using Figma MCP. Manages token budget (one screen per session), extracts design tokens, and generates typed React components following App Router conventions.
argument-hint: "[figma URL or screen name] [optional: component | page | feature]"
---

# Figma → Code: {{ args[0] }}
Output type: {{ args[1] | default: "feature" }}

You are converting a Figma design into production React/Next.js code using **Figma MCP**.

**Critical constraint:** Figma MCP responses are ~13k tokens each. Budget **one screen per Claude Code session** to avoid context exhaustion. If more screens are needed, use `/spartan:context-save` after each screen.

---

## Phase 0: Check for existing design tokens (silent)

```bash
ls .planning/design/system/tokens.md .planning/design-config.md 2>/dev/null
```

If design tokens already exist, read them FIRST. When extracting from Figma:
- **MERGE** Figma colors with existing tokens — don't create a second conflicting token set
- Use existing token NAMES (e.g., `--color-primary`) even if Figma uses different hex values
- If Figma colors differ from tokens, flag the mismatch and ask the user which to keep
- Any NEW tokens from Figma get added to the existing file, not written to a separate one

If NO tokens exist, proceed normally — extract from Figma and create new tokens.

---

## Phase 1: Extract Design Data (single MCP call)

Call Figma MCP to get the screen data:

```
Use the Figma MCP tool to read the design at: {{ args[0] }}
Extract: layout structure, colors, typography, spacing, component hierarchy
```

**Parse and organize immediately** — don't make a second MCP call unless absolutely necessary.

Extract into a structured brief:

```markdown
## Design Brief: [screen name]

### Layout
- Container: [width, padding, layout direction]
- Grid: [columns, gap, breakpoints if visible]

### Color Tokens
- Primary: [hex]
- Secondary: [hex]
- Background: [hex]
- Text primary: [hex]
- Text secondary: [hex]
- Border: [hex]
- [any other colors]

### Typography
- Heading 1: [font, weight, size, line-height, color]
- Heading 2: [font, weight, size, line-height, color]
- Body: [font, weight, size, line-height, color]
- Caption: [font, weight, size, line-height, color]

### Spacing Scale
- [extract consistent spacing values: 4, 8, 12, 16, 24, 32, 48, etc.]

### Components Identified
1. [ComponentName] — [brief description, interactive? server/client?]
2. [ComponentName] — ...

### Assets Needed
- Icons: [list]
- Images: [list — placeholder or Cloudinary URLs]
```

---

## Phase 2: Map to Code Architecture

Based on output type ({{ args[1] | default: "feature" }}):

**If `component`:**
```
components/[ComponentName]/
  [ComponentName].tsx        ← Server or Client component
  [ComponentName].test.tsx   ← Tests
  index.ts                   ← Re-export
```

**If `page`:**
```
app/[route]/
  page.tsx                   ← Server Component
  loading.tsx                ← Skeleton matching Figma layout
  _components/               ← Page-local components
```

**If `feature` (default):**
```
app/[feature]/
  page.tsx                   ← Server Component, data fetching
  loading.tsx                ← Skeleton from Figma layout
  error.tsx                  ← Error boundary
  _components/
    [Component1].tsx
    [Component2].tsx
  _actions/                  ← Server Actions for mutations
  _types/
    [feature].types.ts       ← Types mirroring Kotlin DTOs
```

**Decision: Server vs Client Component**
- Default = Server Component
- `'use client'` ONLY if: onClick handlers, useState, browser APIs, animations
- Interactive parts should be the smallest possible client component, wrapped in a server component parent

---

## Phase 3: Generate Design Tokens

Create or update `src/lib/design-tokens.ts`:

```typescript
// Auto-generated from Figma — [screen name] — [date]
// Do NOT edit manually. Re-run /spartan:figma-to-code to update.

export const colors = {
  primary: '[hex]',
  secondary: '[hex]',
  background: '[hex]',
  surface: '[hex]',
  textPrimary: '[hex]',
  textSecondary: '[hex]',
  border: '[hex]',
  // ...
} as const

export const typography = {
  h1: 'text-[size] font-[weight] leading-[lh]',    // Tailwind classes
  h2: 'text-[size] font-[weight] leading-[lh]',
  body: 'text-[size] font-[weight] leading-[lh]',
  caption: 'text-[size] font-[weight] leading-[lh]',
} as const

export const spacing = {
  xs: '[value]',   // e.g., '0.25rem'
  sm: '[value]',
  md: '[value]',
  lg: '[value]',
  xl: '[value]',
} as const
```

If `tailwind.config.ts` exists, extend it with these tokens instead of a separate file.

---

## Phase 4: Generate Components (TDD)

For each component identified in Phase 1:

### 4a. Write test FIRST

```typescript
// [ComponentName].test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ComponentName } from './ComponentName'

describe('ComponentName', () => {
  it('renders with required props', () => {
    render(<ComponentName {...mockProps} />)
    expect(screen.getByRole('[role]')).toBeInTheDocument()
  })

  it('matches Figma layout structure', () => {
    // Test key layout assertions from design
  })
})
```

### 4b. Implement component

```typescript
// [ComponentName].tsx
// Figma source: [screen name] > [layer path]

interface ComponentNameProps {
  // typed from Figma + Kotlin DTO
}

export function ComponentName({ ...props }: ComponentNameProps) {
  return (
    // Tailwind classes derived from Figma tokens
    // Use design-tokens.ts for colors/typography
  )
}
```

### 4c. Verify test passes

```bash
npm test -- --run [ComponentName]
```

---

## Phase 5: Loading Skeleton

Generate `loading.tsx` that matches the Figma layout with skeleton placeholders:

```typescript
// loading.tsx — skeleton matching [screen name] layout
export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Mirror exact Figma layout with gray placeholder blocks */}
    </div>
  )
}
```

---

## Phase 6: Handoff Summary

```markdown
## Figma → Code Complete: [screen name]

### Files Created
- [list all files]

### Design Tokens
- Colors: [N] tokens extracted
- Typography: [N] styles mapped
- Spacing: [scale]

### Components
- [ComponentName]: Server/Client — [status]

### Figma Fidelity Notes
- [any deviations from design and why]
- [responsive adaptations made]

### Next Steps
- [ ] Connect to real API data (replace mock props)
- [ ] Add remaining screens: [list if multi-screen feature]
- [ ] Review with designer for pixel accuracy

### Token Budget Used
- Figma MCP calls: [N] (~[N*13]k tokens)
- Remaining context: [estimate]
- Need more screens? → `/spartan:context-save` first
```

If context is above 40% after this screen, proactively suggest:
"Context at ~[X]%. If you need another screen, I recommend `/spartan:context-save` now, then resume in a fresh session."
