
---

## React + Next.js Frontend

**Stack:** React / Next.js / TypeScript (App Router) — Vitest + Testing Library, Tailwind CSS

Rules in `rules/frontend-react/`:
- `FRONTEND.md` — Build check before commit, API case conversion, null safety, optimistic updates

### Feature Development Workflow (Frontend)

When building a frontend feature, follow this pipeline:

```
Epic → Spec → Design → Plan → Build → Review
              ↑                  ↑       ↑        ↑
            Gate 1             Gate 2  Gate 3   Gate 4
```

**Build phases:** Types & API → Components → Pages/Routes → Tests

Design is NOT optional for frontend — always create a design doc for new screens.

See `templates/workflow-frontend-react.md` for the full workflow with:
- Stack-specific quality gates (TypeScript, React patterns, accessibility, responsive)
- File location guide (App Router conventions)
- Parallel vs sequential task planning

For small tasks (< 1 day), `/spartan:quickplan` covers spec + plan in one shot.

### Frontend Skills

- `/ui-ux-pro-max` — Design system with 67 styles, 96 palettes, 13 stacks

### Frontend Commands

| Command | Purpose |
|---|---|
| `/spartan:next-app [name]` | Scaffold Next.js app (App Router, Vitest, Docker, CI) |
| `/spartan:next-feature [name]` | Add feature to existing Next.js app |
| `/spartan:fe-review` | PR review with Next.js App Router conventions |
| `/spartan:figma-to-code [url]` | Convert Figma screen to production code via MCP |
| `/spartan:e2e [feature]` | Scaffold Playwright E2E testing |
| `/spartan:qa [url] [feature]` | Real browser QA — opens Chromium, tests flows, finds bugs |
