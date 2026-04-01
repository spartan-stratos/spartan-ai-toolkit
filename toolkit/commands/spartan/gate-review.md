---
name: spartan:gate-review
description: Dual-agent review — builder presents work, reviewer evaluates, both must accept
argument-hint: "[phase number or 'current']"
---

# Gate Review: Phase {{ args[0] | default: "current" }}

You are running the **Gate Review workflow** — a dual-agent quality check between phases.

```
Epic → Spec → [Design] → Plan → Build → Review
                                   ↑
                              Gate 3.5
                         (builder + reviewer)
```

This is Gate 3.5 from the quality gates. Two agents look at the work: the **builder** (you, the main agent) and a **reviewer** (spawned subagent). Both must accept before moving on.

---

## When to Use This

- After finishing a phase in `/spartan:phase execute N`
- After Stage 3 of `/spartan:build` (all tasks done, before shipping)
- Any time you want a second opinion on a batch of code changes

---

## Step 1: Collect What Was Built

Gather the scope of the review:

```bash
# What changed?
git diff main --stat
git log main..HEAD --oneline

# What files were touched?
git diff main --name-only
```

If no changes found, tell the user:
> "No changes to review. Did you commit your work?"

Read every changed file. Understand what was built and why.

---

## Step 2: Builder Self-Assessment

Before spawning the reviewer, do your own check first. Run through the Gate 3.5 checklist:

**Code Design:**
- [ ] Single responsibility — each class/module does one thing
- [ ] No god classes or methods doing too much
- [ ] Proper separation between layers
- [ ] Naming is clear and consistent
- [ ] Method signatures are clean (not too many params)

**Best Practices:**
- [ ] No unnecessary complexity
- [ ] No dead code or unused imports
- [ ] Error messages are helpful
- [ ] Logging is right — enough to debug, not noisy
- [ ] No magic numbers or strings

**Clean Code:**
- [ ] Functions are short and focused
- [ ] No deeply nested conditionals (max 2-3 levels)
- [ ] No copy-paste duplication
- [ ] Code reads top to bottom

Note any issues you find. Fix what you can before calling the reviewer.

---

## Step 3: Spawn the Reviewer(s)

### Agent Teams boost (if enabled)

```bash
echo "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-not_set}"
```

**If Agent Teams is enabled AND the diff has 10+ changed files or touches 3+ modules:**

Offer to use a review team for parallel review:
> "This is a big change ([N] files across [N] modules). Want a parallel review team?
>
> I'd go with **A** — multiple reviewers catch different things.
>
> - **A) Review team** — quality reviewer + test reviewer + security reviewer, all in parallel
> - **B) Single reviewer** — one phase-reviewer agent (cheaper, faster for small changes)"

If user picks A → create a review team (NOT sub-agents):

```
TeamCreate(team_name: "gate-review-{phase}", description: "Gate 3.5 review")

TaskCreate(subject: "Quality review", description: "Code design, SOLID, clean code, stack conventions")
TaskCreate(subject: "Test review", description: "Test coverage, edge cases, test quality")
TaskCreate(subject: "Security review", description: "Auth, input validation, data handling")

Agent(
  team_name: "gate-review-{phase}",
  name: "quality-reviewer",
  subagent_type: "phase-reviewer",
  prompt: "Review for code design, SOLID, clean code, stack conventions.
    Changed files: {list}. Spec: {path}. Plan: {path}.
    Builder self-assessment: {findings from Step 2}.
    Verdict: ACCEPT or NEEDS CHANGES. Check TaskList, claim your task."
)

Agent(
  team_name: "gate-review-{phase}",
  name: "test-reviewer",
  subagent_type: "general-purpose",
  prompt: "Review test coverage, edge cases, test quality.
    Changed files: {list}. Check independence, assertions, no duplication.
    Verdict: ACCEPT or NEEDS CHANGES. Check TaskList, claim your task."
)

Agent(
  team_name: "gate-review-{phase}",
  name: "security-reviewer",
  subagent_type: "general-purpose",
  prompt: "Review auth, input validation, data handling, injection risks.
    Changed files: {list}. Check OWASP top 10.
    Verdict: ACCEPT or NEEDS CHANGES. Check TaskList, claim your task."
)
```

After all teammates report back, synthesize findings, `TeamDelete()`, continue to Step 4 (Discussion).

If user picks B (or Agent Teams not enabled) → use single reviewer below.

### Single reviewer (default)

Spawn the `phase-reviewer` agent as a subagent. Give it:

1. **The list of changed files** (from git diff)
2. **The spec** (from `.planning/specs/` if it exists)
3. **The plan** (from `.planning/plans/` if it exists)
4. **Your self-assessment** from Step 2

The reviewer will read all changed files and evaluate them against the Gate 3.5 checklist plus project rules.

**Prompt for the reviewer agent:**
> "Review these changes for Gate 3.5. Changed files: [list]. Spec: [path or 'none']. Plan: [path or 'none']. Builder's self-assessment: [your findings]. Check code design, SOLID, clean code, and project rules. Give your verdict: ACCEPT or NEEDS CHANGES."

---

## Step 4: Discussion

The reviewer will come back with findings. Two outcomes:

### If reviewer says ACCEPT:
Both agents agree. Gate 3.5 passed. Move on.

### If reviewer says NEEDS CHANGES:
Look at each issue the reviewer found.

For each issue:
- **Agree?** → Fix it right now. Commit the fix.
- **Disagree?** → Explain why. The reviewer gets to respond. One round of back-and-forth max.

After fixes, re-run the reviewer on the changed files. Keep going until both accept.

**Max 3 rounds.** If you can't agree after 3 rounds, tell the user:
> "Builder and reviewer can't agree on [issue]. Here are both sides: [summary]. Your call — fix it or ship it?"

---

## Step 5: Record the Outcome

After both accept, show the result:

```markdown
## Gate 3.5 Review — Phase {{ args[0] | default: "current" }}

**Verdict:** PASSED
**Builder:** ACCEPT
**Reviewer:** ACCEPT
**Rounds:** [N]

### Issues Found & Fixed
- [issue]: [how it was fixed]

### Issues Discussed & Accepted As-Is
- [issue]: [why it's fine]

### No Issues
- [what was clean]
```

Then tell the user:

> "Gate 3.5 passed — both builder and reviewer accept."
>
> **Next steps:**
> - More phases? → `/spartan:phase execute [N+1]`
> - All done? → `/spartan:phase verify [N]`
> - Ready to ship? → `/spartan:pr-ready`

---

## Stack-Specific Review Routing

Gate 3.5 is stack-agnostic (clean code, SOLID, design quality). But the reviewer also runs the right stack-specific checks:

| Files changed | Also check |
|---|---|
| `.kt` files | Kotlin rules — no `!!`, Either error handling, layered architecture |
| `.tsx` / `.ts` files | React rules — App Router patterns, TypeScript strictness |
| `.sql` files | Database rules — TEXT not VARCHAR, soft deletes, standard columns |

The reviewer agent knows how to pick the right rules based on file types.

---

## Rules

- **Both must accept.** One-sided review doesn't count. That's just `/spartan:review`.
- **Fix issues before declaring pass.** Don't just acknowledge — actually fix them.
- **Max 3 rounds of discussion.** After that, escalate to the user.
- **Be honest in self-assessment.** Don't hide issues to avoid the reviewer catching them.
- **Auto mode on?** → Still run the full review. But skip the "your call" prompt if issues are clear-cut — just fix them.
