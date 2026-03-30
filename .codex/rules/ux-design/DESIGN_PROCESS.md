# Design Process Rules

## The 7-Phase Workflow

World-class design follows this order. Don't skip to pixels before understanding the problem.

| Phase | What | Output |
|-------|------|--------|
| 1. Research | User interviews, competitor audit, data analysis | `design/research/insights.md` |
| 2. Define | Problem statement, personas, journey map, scope | `design/definition/brief.md` |
| 3. Ideate | Brainstorm solutions, user flows, information architecture | `design/ideation/flows.md` |
| 4. Design System | Tokens (color, type, spacing), component inventory | `design/system/tokens.md` |
| 5. Prototype | Screen design, all states, responsive, motion, accessibility | `design/screens/{feature}.md` |
| 6. Test | Usability testing plan, findings, severity ratings | `design/test-results.md` |
| 7. Handoff + QA | Dev specs, implementation checklist, design QA | Updated screen files |

## Time Allocation Rule

| Phase | Average team | World-class team |
|-------|-------------|-----------------|
| Research + Define | 10% | 40% |
| Ideate | 10% | 10% |
| Design + Prototype | 50% | 25% |
| Test | 10% | 15% |
| Handoff | 15% | 5% (design system handles it) |
| Iterate | 5% | ongoing |

**Rule:** Spend at least 30% of design time BEFORE opening any design tool. Understand the problem first.

---

## Design Token Rules

### Tokens Are the Source of Truth

Once design tokens exist in `.planning/design/system/tokens.md` or `.planning/design-config.md`, they are BINDING.

**FORBIDDEN:**
- Using Tailwind color defaults (`bg-blue-500`, `bg-purple-600`) when project tokens exist
- Using generic fonts (`Inter`, `Roboto`, `Arial`, `system-ui`) when project font is defined
- Using arbitrary spacing (`p-[13px]`, `mt-[7px]`) when spacing scale exists
- Inventing new colors or fonts not in the token list

**REQUIRED:**
- Read tokens BEFORE generating any UI code
- Use token names or CSS variables, not raw hex values
- Follow the spacing grid (4px or 8px base)
- Use project border radius, not generic `rounded-lg`

### Token Format

Tokens file must include these sections:

```markdown
## Colors
| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Primary | --color-primary | #hex | Buttons, links, active states |
| ... | ... | ... | ... |

## Typography
- Font family: [name]
- Scale: h1 (32px/700) → h6 (14px/600) → body (16px/400) → caption (12px/400)

## Spacing
- Base: [4px or 8px]
- Scale: xs (4) / sm (8) / md (16) / lg (24) / xl (32) / 2xl (48)

## Radius
- Card: [value]
- Button: [value]
- Badge: [value]

## Shadows
- sm: [value]
- md: [value]
- lg: [value]
```

---

## Design All States

Every screen and component MUST design these states:

| State | What to show |
|-------|-------------|
| Default | Normal, populated view |
| Loading | Skeleton screen or spinner |
| Empty | Helpful message + action prompt |
| Error | Friendly message + recovery action |
| Success | Confirmation feedback |
| Edge case | Long text, missing data, single item, 100+ items |

**FORBIDDEN:** Designing only the happy path. If you don't design the empty state, the developer will show a blank screen.

---

## Responsive Breakpoints

Every screen must work at these widths:

| Breakpoint | Width | Device |
|-----------|-------|--------|
| Mobile | 375px | iPhone SE / small Android |
| Tablet | 768px | iPad / medium screens |
| Desktop | 1440px | Standard laptop/desktop |

**FORBIDDEN:** Designing only for desktop. Mobile-first or at least mobile-aware.

---

## Accessibility Checklist

Every design must pass:

- [ ] Color contrast: 4.5:1 minimum for normal text, 3:1 for large text
- [ ] Touch targets: 44x44px minimum on mobile
- [ ] Keyboard navigation: tab order matches visual order
- [ ] Focus states: visible focus ring on all interactive elements
- [ ] Screen reader: all images have alt text, icon buttons have aria-label
- [ ] Color not sole indicator: don't use color alone to show status
- [ ] Motion: respect `prefers-reduced-motion`

---

## Anti-AI-Generic Rules

Designs MUST avoid these generic AI patterns:

**Colors:**
- No purple/violet gradients on white backgrounds
- No neon accent colors on dark backgrounds
- No gray-on-gray low-contrast layouts
- Use the PROJECT'S accent color, not a random one

**Layout:**
- Break the grid sometimes — asymmetry over centered-everything
- No blob/wave backgrounds unless that's the brand
- Cards should have visual variety, not all identical rectangles

**Typography:**
- Clear hierarchy: big headlines, medium subheads, small body
- Font weight contrast matters — don't use 400 for everything
- Real copy, not "Lorem ipsum" or "Unlock your potential"

**Components:**
- Button hierarchy: one primary, rest secondary/ghost
- Not every feature needs an icon
- Empty states should feel designed, not like a bug

---

## Folder Structure

All design artifacts live in `.planning/design/`:

```
.planning/design/
├── research/
│   ├── interviews.md        ← User interview notes + synthesis
│   ├── competitors.md       ← Competitor audit
│   └── insights.md          ← Key findings, "How Might We" questions
├── definition/
│   ├── personas.md          ← 2-3 behavior-based personas
│   ├── journey-map.md       ← Current user journey with pain points
│   └── brief.md             ← Problem statement, success metrics, scope
├── ideation/
│   ├── ideas.md             ← Brainstorm output, ranked ideas
│   └── flows.md             ← User flows, information architecture
├── system/
│   ├── tokens.md            ← Color, typography, spacing tokens
│   └── components.md        ← Component inventory with specs
└── screens/
    └── {feature-name}.md    ← Per-feature screen designs
```
