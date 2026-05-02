# Spartan AI Toolkit — Engineering Manager Workflow

## Why Spartan?

Spartan commands are **pre-built, high-quality prompts** for workflows where free-form chat leads to missed steps. They don't replace Claude — they make Claude more reliable for structured work.

Without Spartan: "Create a PR" → Claude pushes code. Forgets to rebase, skips tests, no PR description.
With `/spartan:pr-ready`: 6-step checklist — rebase, tests, lint, architecture check, security scan, PR description generated. Devs usually forget 3 of these.

**When commands add value:** Structured workflows with multiple steps, checklists, or scaffolding that must follow specific conventions.
**When commands don't add value:** Questions, explanations, small code changes, brainstorming — just talk to Claude.

---

## Command or Chat? (Decision Rule)

```
What do you need?
│
├─ Question / explanation / brainstorm → Just ask Claude
├─ Small code change (< 30 min, ≤ 3 files) → Just ask Claude (Superpowers handles TDD/review)
├─ Structured workflow with checklist → Use a /spartan: command
└─ Don't know which command → Type /spartan (smart router asks what you need)
```

**Superpowers is always active.** When you say "review this" or "debug this" in normal chat, Claude auto-triggers the right skill. You don't need a command for that.

**Commands are for when the workflow matters more than the answer** — deploying, creating PRs, scaffolding new services, planning multi-day work.

---

## Task Size → Tool Routing

| Size | Use |
|---|---|
| < 30 min, ≤ 3 files | Just ask Claude (no command needed) |
| < 1 day | `/spartan:spec` → `/spartan:build` |
| 1–3 days | `/spartan:spec` → `/spartan:plan` → `/spartan:build` |
| Multi-feature work | `/spartan:epic` → then spec/plan/build each feature |
