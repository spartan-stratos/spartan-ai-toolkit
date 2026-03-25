
---

## Git Branching

- `main` — production only, protected
- `develop` — integration branch
- `feature/{ticket}-{slug}` — new features
- `fix/{ticket}-{slug}` — bug fixes

GSD manages branch creation per phase automatically.

---

## What NOT to Do
- Don't write code without a spec
- Don't skip tests
- Don't continue a session past 60% context
- Don't manually edit `.planning/` files — let GSD handle them
- Don't commit secrets or hardcoded credentials
- Don't force a command when a simple chat answer is enough
