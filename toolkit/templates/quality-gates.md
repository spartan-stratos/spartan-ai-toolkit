# Quality Gates

Each phase of the feature development workflow has a quality gate. The gate must pass before moving to the next phase.

---

## The Workflow

```
Epic → Spec → [Design] → Plan → Build → Review
              ↑                   ↑       ↑        ↑
            Gate 1              Gate 2  Gate 3   Gate 4
```

Design is optional — use it for features with UI work. See `design-doc.md`.

---

## Gate 1: Spec Review

Run after writing a spec (`feature-spec.md`). Ask: "Is the WHAT clear enough to plan?"

**Completeness:**
- [ ] Problem is clearly stated (not vague)
- [ ] Goal is specific and measurable
- [ ] At least one user story exists
- [ ] Requirements split into must-have, nice-to-have, out of scope
- [ ] Out of scope section exists (prevents scope creep)

**Data Model** (if applicable):
- [ ] New tables have standard columns (id, timestamps)
- [ ] Column types are correct
- [ ] Soft delete strategy is defined (if needed)

**API Design** (if applicable):
- [ ] Endpoints follow the project's naming convention
- [ ] Request/response examples included
- [ ] JSON field naming matches project convention

**UI Changes** (if applicable):
- [ ] Affected screens/components listed
- [ ] Design doc created for non-trivial UI work

**Quality:**
- [ ] Edge cases listed (at least 3)
- [ ] Testing criteria defined for happy path
- [ ] Testing criteria defined for edge cases
- [ ] Dependencies listed

---

## Gate 2: Plan Review

Run after writing a plan (`implementation-plan.md`). Ask: "Is the HOW clear enough to build?"

**Architecture:**
- [ ] Follows the project's existing architecture patterns
- [ ] Each layer only calls the layer below it
- [ ] Components are in the right directories

**Task Breakdown:**
- [ ] All files to change are listed
- [ ] All new files are listed with their locations
- [ ] Each task is small (one file or one function)
- [ ] Dependencies between tasks are clear
- [ ] Parallel vs sequential tasks are marked

**Testing:**
- [ ] Data layer tests planned
- [ ] Business logic tests planned
- [ ] API/integration tests planned
- [ ] UI tests planned (if applicable)
- [ ] Edge cases from spec are covered in test plan

---

## Gate 3: Implementation Review (Per Task)

Run after each task is done during the build phase.

**Code Quality:**
- [ ] No unsafe operations or workarounds
- [ ] Error handling follows project patterns
- [ ] No temporary hacks or TODOs left behind
- [ ] Config values come from config, not hardcoded
- [ ] No dead code or unused imports

**Architecture:**
- [ ] Each component stays in its lane (no layer violations)
- [ ] Handlers/controllers are thin (just delegate)
- [ ] Business logic is in the service/manager layer
- [ ] Data access is in the repository/data layer

**Tests:**
- [ ] Tests written for this task
- [ ] Tests pass
- [ ] Tests cover both happy path and error cases

---

## Gate 3.5: Phase Review

Run after all tasks in a phase are done. This is the "zoom out" check.

**Code Design:**
- [ ] Single responsibility (each class/module does one thing)
- [ ] No god classes or methods doing too much
- [ ] Proper separation of concerns between layers
- [ ] Naming is clear and consistent
- [ ] Method/function signatures are clean (not too many parameters)

**Best Practices:**
- [ ] No unnecessary complexity or over-engineering
- [ ] No dead code or unused imports
- [ ] Error messages are helpful (what went wrong + what to do)
- [ ] Logging is right — enough to debug, not noisy
- [ ] No magic numbers or strings (use config or constants)

**Clean Code:**
- [ ] Functions are short and focused
- [ ] No deeply nested conditionals (max 2-3 levels)
- [ ] No copy-paste duplication
- [ ] Code reads top to bottom

---

## Gate 4: Final Review

Run when all tasks are done. This is the "ship it?" check.

**Completeness:**
- [ ] All tasks from the plan are done
- [ ] All planned files exist
- [ ] No TODOs left in code
- [ ] No placeholder implementations

**Quality:**
- [ ] All tests pass
- [ ] Linter passes
- [ ] Build passes
- [ ] No regressions in existing tests

**Documentation:**
- [ ] API endpoints are documented or self-evident
- [ ] Implementation notes captured
- [ ] README updated if new components added

---

## What to Do When a Gate Fails

1. **Find the failing items** — which checkboxes are unchecked?
2. **Fix them** — don't move on until ALL items pass
3. **Re-run the gate** — make sure the fix works
4. **If stuck** — ask for guidance, don't use workarounds

---

## Gate Summary

| Gate | When | Ask Yourself |
|------|------|--------------|
| Gate 1 | After spec | Is the WHAT clear enough to plan? |
| Gate 2 | After plan | Is the HOW clear enough to build? |
| Gate 3 | After each task | Does this code follow the rules? |
| Gate 3.5 | After each phase | Is the code clean and well-designed? |
| Gate 4 | After all tasks | Is this ready to ship? |
