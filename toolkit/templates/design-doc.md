# Design Document: [Feature Name]

> **Workflow position:** Design is optional — use it for features with non-trivial UI work. It sits between Spec and Plan. After this is approved, create the **implementation plan** (`implementation-plan.md`).
>
> ```
> Epic → Spec → ► [Design] → Plan → Build → Review
> ```

**Date**: [date]
**Status**: Draft | In Review | Approved
**Spec**: [path to spec, if exists]

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

## 2. Design References

### Visual References

| Reference | What to Take From It |
|-----------|---------------------|
| [screenshot/URL 1] | [e.g., "clean data table layout, good whitespace"] |
| [screenshot/URL 2] | [e.g., "sidebar nav pattern, metric cards"] |

### Design System
- **Theme files**: [path to CSS tokens or design tokens]
- **Color palette**: [reference to existing design system]
- **Fonts**: [font family]

---

## 3. User Flows

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

---

## 4. Screen Inventory

| Screen | Purpose | States | Mobile Different? |
|--------|---------|--------|-------------------|
| [name] | [what it does] | loading, empty, data, error | Yes/No |

---

## 5. Component List

| Component | Used In | Key Props | States |
|-----------|---------|-----------|--------|
| [name] | [screens] | [props] | [default, hover, loading, error, etc.] |

---

## 6. Wireframes

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

## 7. Responsive Behavior

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, hamburger nav |
| Tablet | 640-1024px | 2 columns, collapsed sidebars |
| Desktop | > 1024px | Full layout, sidebars |

---

## 8. Accessibility Checklist

- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] All interactive elements keyboard accessible
- [ ] Focus order follows visual layout
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Touch targets at least 44x44px on mobile

---

## 9. Design Decisions Log

| Decision | Options Considered | Chosen | Why |
|----------|-------------------|--------|-----|
| [decision] | [options] | [chosen] | [reasoning] |
