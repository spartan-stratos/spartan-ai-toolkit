# Self-Review: Spartan AI Toolkit v1.4.0

**Date:** 2026-03-26
**Context:** After adding spec/plan/epic commands, dual-agent review, and design workflow — inspired by service-appsfy's `.agent/workflow/` system.

---

## What's right

### The three-layer model is correct

Workflows > skills > memory is the right way to think about it. A skill alone is just a better prompt. A workflow connects steps, enforces gates, and gets you from problem to shipped code. Memory is what makes multi-session work not suck. The framing is solid.

### The messaging change is right

The old README listed 55 commands like a feature catalog. Nobody cares about command count. The new version tells a story: here's the pipeline, here's how knowledge flows through it, here's why it works across sessions. That's a much stronger pitch.

### Saved artifacts are a real improvement

`.planning/specs/`, `.planning/plans/`, `.planning/designs/` — these are files that other commands can read and build on. Before this, specs and plans were inline (lost when the session ends). Now they survive and connect.

---

## What's weak — honest gaps

### 1. The workflows aren't really workflows yet

Right now, `/spartan:spec`, `/spartan:plan`, `/spartan:design` — they're individual commands. The user has to know to run them in order. There's no single command that runs the whole pipeline end-to-end and moves you through gates automatically.

`/spartan:build` is the closest thing to a real workflow. It does understand → plan → implement → ship in one session. But the new spec/plan/design commands sit *outside* of build. They're steps the user chains manually.

In service-appsfy, the workflow is also manual (`/spec` then `/plan` then `/implement`). So we're matching that. But if we really want to say "workflow-first," the dream would be something like `/spartan:build` that automatically runs spec → design → plan → execute with gates, all in one flow. Right now it's more like "structured steps that the user runs in order."

That's still way better than no structure. But calling it a "workflow" when the user is doing the orchestration is a stretch.

**To fix:** Make `/spartan:build` the true orchestrator. It already checks for saved specs/plans. Next step: have it offer to create them if missing, run the design step for UI work, and flow through gate-review before shipping — all within one session.

### 2. The dual-agent review is cool but unproven

Gate 3.5 and the Design Gate spawn a subagent to review. In theory, two agents catch more than one. In practice:

- Both agents run on the same model with similar biases
- The "discussion" is one agent generating both sides of the conversation
- It burns extra tokens

We don't know if it actually catches more bugs than a single-agent review with a good checklist. The appsfy project uses it, but has it proven its value there?

**To fix:** Track results. Next time we use `/spartan:gate-review` on a real feature, compare what the reviewer caught vs what a single `/spartan:review` would have caught. If the extra agent doesn't find unique issues, simplify it to a single-agent review with a stricter checklist.

### 3. Agent memory is the weakest layer

The README says `.memory/` carries knowledge across sessions. But:

- The new commands save to `.planning/` (specs, plans, designs). That works great.
- The `.memory/` directory (decisions, patterns, knowledge) is only used by the GSD phase commands.
- Most users running `/spartan:spec` → `/spartan:build` won't touch `.memory/` at all.

So the "agent memory" story is half-built. The `.planning/` artifacts are solid. The `.memory/` system needs more commands that read from and write to it.

**To fix:**
- When a spec is saved, index it in `.memory/index.md`
- When a plan reveals a pattern, capture it to `.memory/patterns/`
- When gate-review finds a recurring issue, save it to `.memory/knowledge/`
- Make `/spartan:build` check `.memory/` at the start for relevant decisions

### 4. Removing quickplan might hurt adoption

Quickplan was the "I don't want ceremony" path. We replaced it with spec → plan → build, which is better but takes three commands instead of one. For a solo dev fixing a small thing, that's more friction.

`/spartan:build` still does inline spec + plan for small work. So the fast path exists — it's just not obvious from the README anymore.

**To fix:** Call out the fast path more clearly in docs: "For quick work, just run `/spartan:build` directly — it handles everything inline. Use separate `/spartan:spec` and `/spartan:plan` when you want saved artifacts."

### 5. Design workflow is frontend-react only

The design command, design-workflow skill, and design-critic agent are all in the `frontend-react` pack. Users without that pack won't have access. That makes sense for now (design = frontend), but it means the "full workflow" in the README only works if you've installed the frontend pack.

**To fix:** Not urgent. The workflow diagram should note that the design step needs the frontend-react pack. Or consider moving design-workflow to core since design thinking applies to any stack (API design, data model design, etc.).

---

## Priority list

If filling gaps, do them in this order:

1. **Make `/spartan:build` the true end-to-end orchestrator** — it should flow through spec → design → plan → execute → review → ship, offering each step when relevant, all in one session.
2. **Connect `.memory/` to the new commands** — index specs, capture patterns, read decisions at session start.
3. **Prove the dual-agent review adds value** — use it on a real feature, track unique findings vs single-agent review.
4. **Document the fast path** — make it clear that `/spartan:build` alone is enough for small work.
5. **Consider moving design-workflow to core** — or at least document the pack dependency.

---

## Bottom line

The direction is right. Workflow-first is the correct positioning. The execution has gaps — the workflows are still manual chains, the memory layer is underbaked, and the dual-agent review is unproven. But the framing is stronger than the reality, and that's normal. You build the vision first, then fill in the gaps.

The saved artifacts (`.planning/specs/`, `.planning/plans/`, `.planning/designs/`) are the most concrete improvement. They make the workflow real and connectable. Focus on making `/spartan:build` the orchestrator that ties them all together automatically.
