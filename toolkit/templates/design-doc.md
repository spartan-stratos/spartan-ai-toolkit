# Design Document: [Feature Name]

> **Workflow position:** Design is optional — use it for features with non-trivial UI work. It sits between Spec and Plan. After this passes the Design Gate, create the **implementation plan** (`implementation-plan.md`).
>
> ```
> Epic → Spec → ► [Design] → Plan → Build → Review
>                    ↑
>               Design Gate
> ```

**Date**: [date]
**Status**: Draft | In Review | Approved
**Spec**: [path to spec, if exists]
**Design Config**: [path to design-config.md, if exists]

---

## 0. Design References & Direction

### Visual References

| Reference | What to Take From It |
|-----------|---------------------|
| [screenshot/URL 1] | [e.g., "clean data table layout, good whitespace"] |
| [screenshot/URL 2] | [e.g., "sidebar nav pattern, metric cards"] |

### Design System
- **Theme files**: [path to CSS tokens]
- **Color palette**: [reference to design-config.md or existing design system]
- **Font**: [font family from design-config]

### Design Personality
[Copy from design-config.md — or describe in 2-3 sentences]

### Anti-References (What to Avoid)
[Copy from design-config.md Anti-References section]

---

## 1. Design Brief

### What are we designing?
[One or two sentences. What screen, page, feature, or flow?]

### Who's the user?
[Target user persona]

### Goal
[What should the user be able to do after this is built?]

### Platform
[Desktop / Mobile / Both]

---

## 2. User Flows

### Flow 1: [Flow Name]

**Trigger**: [What starts this flow?]

| Step | User Action | System Response | Screen |
|------|-------------|-----------------|--------|
| 1 | [action] | [response] | [screen name] |
| 2 | [action] | [response] | [screen name] |

### Edge Case Flows

| Scenario | What Happens | Screen/State |
|----------|--------------|--------------|
| No data | [behavior] | Empty state |
| Error | [behavior] | Error state |
| Loading | [behavior] | Skeleton state |
| Timeout | [behavior] | Retry state |

---

## 3. Screen Inventory

| Screen | Purpose | States | Mobile Different? |
|--------|---------|--------|-------------------|
| [name] | [what it does] | loading, empty, data, error | Yes/No |

---

## 4. Component List

| Component | Used In | Key Props | States |
|-----------|---------|-----------|--------|
| [name] | [screens] | [props] | [default, hover, loading, error, etc.] |

---

## 5. Section Zones

Plan how sections alternate backgrounds for visual rhythm:

| Section | Background | Mood |
|---------|-----------|------|
| [section name] | [color/token from design-config] | [e.g., "dramatic entry", "subtle shift"] |

---

## 6. Motion Plan

What moves, how, and when:

| Element | Animation | Trigger | Duration |
|---------|-----------|---------|----------|
| Section content | Fade up | Scroll into view | 0.6s ease |
| Cards | Stagger fade | Scroll into view | 0.6s + 0.15s stagger |
| Cards hover | Lift + shadow | Mouse hover | 0.2s ease |

---

## 7. Wireframes

### [Screen Name]

```
+------------------------------------------+
|  Header / Nav                            |
+------------------------------------------+
|                                           |
|  [Main Content Area]                      |
|                                           |
|  +-------------+  +-------------+        |
|  | Card 1      |  | Card 2      |        |
|  +-------------+  +-------------+        |
|                                           |
+------------------------------------------+
```

---

## 8. Visual Design

### Typography Scale

| Role | Size | Weight | Letter-spacing |
|------|------|--------|----------------|
| H1 | [size] | [weight] | [spacing] |
| H2 | [size] | [weight] | [spacing] |
| H3 | [size] | [weight] | [spacing] |
| Body | [size] | [weight] | normal |
| Caption | [size] | [weight] | normal |

---

## 9. Component Specs

### [Component Name]

**Purpose**: [What this component does]

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| [name] | [type] | [yes/no] | [default] | [what it does] |

**States**:
| State | Visual | Motion |
|-------|--------|--------|
| Default | [description] | None |
| Hover | [description] | [animation] |
| Active | [description] | [animation] |
| Loading | [description] | Skeleton shimmer |
| Error | [description] | [animation] |

---

## 10. Responsive Behavior

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, hamburger nav, smaller type |
| Tablet | 640-1024px | 2 columns, collapsed sidebars |
| Desktop | > 1024px | Full layout, sidebars, 4+ columns |

---

## 11. Accessibility Checklist

- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] All interactive elements keyboard accessible
- [ ] Focus order follows visual layout
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Touch targets at least 44x44px on mobile
- [ ] No information conveyed by color alone

---

## 12. Design Decisions Log

| Decision | Options Considered | Chosen | Why |
|----------|-------------------|--------|-----|
| [decision] | [options] | [chosen] | [reasoning] |

---

## Tips

- **Read design-config first** — every color and font must come from it
- **Cover all states** — loading, empty, error are just as important as the happy path
- **Be specific with copy** — use real feature names, not "Lorem ipsum"
- **Think mobile first** — if it works at 375px, it'll work everywhere
- **Component specs matter** — a dev should be able to build from just this doc
