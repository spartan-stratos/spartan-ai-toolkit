---
name: spartan:project
description: Manage large multi-session projects (> 3 days). Handles full lifecycle — create, check status, start new milestones, complete milestones. This is the Spartan wrapper for GSD project commands.
argument-hint: "[new | status | milestone-new | milestone-complete | milestone-summary | manager]"
---

# Project Management: {{ args[0] | default: "status" }}

You are managing a large project using the GSD lifecycle under the hood.
The user does NOT need to know about `/gsd:*` commands — everything runs through `/spartan:*`.

---

## Route by argument

{% if args[0] == "new" %}
## New Project

Starting a full project lifecycle. This is for work spanning multiple days/weeks.

**Run:** `/gsd:new-project`

Claude will interview the user about:
- What is the project?
- Tech stack and constraints?
- Milestones and goals?

Then generate:
- `PROJECT.md` — full project brief
- `ROADMAP.md` — all milestones + phases
- `.planning/config.json` — GSD settings

After creation, tell the user:
"Project created. Next step: `/spartan:phase discuss 1` to start Phase 1."

{% elif args[0] == "status" or args[0] == nil %}
## Project Status

**Run:** `/gsd:status`

Show current state:
- Which project is active
- Current milestone and phase
- What was completed, what's next

Then suggest the next action using `/spartan:` commands:
- Need to discuss next phase? → "Run `/spartan:phase discuss N`"
- Need to plan? → "Run `/spartan:phase plan N`"
- Need to execute? → "Run `/spartan:phase execute N`"
- Need to verify? → "Run `/spartan:phase verify N`"
- Milestone done? → "Run `/spartan:project milestone-complete`"

**Never suggest `/gsd:*` commands to the user.** Always translate to `/spartan:*`.

{% elif args[0] == "milestone-new" %}
## New Milestone

Starting the next milestone on an existing project.

**Run:** `/gsd:new-milestone`

After creation, tell the user:
"Milestone created. Next step: `/spartan:phase discuss 1` to start Phase 1 of this milestone."

{% elif args[0] == "milestone-complete" %}
## Complete Milestone

Archiving current milestone and tagging the release.

**Run:** `/gsd:complete-milestone`

After completion, tell the user:
"Milestone archived and tagged. Next step: `/spartan:project milestone-new` if there's more work, or you're done!"

{% elif args[0] == "milestone-summary" %}
## Milestone Summary

Generate a comprehensive summary document from completed milestone artifacts. Useful for team onboarding, stakeholder updates, or reviewing what was accomplished.

**Run:** `/gsd:milestone-summary`

After generation, tell the user:
"Milestone summary generated. Share it with your team for onboarding or review."

{% elif args[0] == "manager" %}
## Project Manager (Interactive Command Center)

Launch an interactive command center for managing multiple phases from one terminal. Power user tool for overseeing complex projects.

**Run:** `/gsd:manager`

This provides a dashboard view of all phases, their status, and quick actions — all through `/spartan:*` commands.

**Never suggest `/gsd:*` commands to the user.** Always translate to `/spartan:*`.

{% else %}
## Unknown argument: {{ args[0] }}

Available options:
- `/spartan:project new` — Start a new multi-day project
- `/spartan:project status` — Check where you are
- `/spartan:project milestone-new` — Start next milestone
- `/spartan:project milestone-complete` — Archive current milestone
- `/spartan:project milestone-summary` — Generate onboarding doc from milestone
- `/spartan:project manager` — Interactive command center for power users
{% endif %}
