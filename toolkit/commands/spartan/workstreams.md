---
name: spartan:workstreams
description: Manage parallel workstreams for concurrent milestone work. List, create, switch between, and track progress across independent work tracks. This is the Spartan wrapper for GSD workstream commands.
argument-hint: "[list | create <name> | switch <name> | status <name> | progress | complete <name> | resume <name>]"
---

# Workstreams: {{ args[0] | default: "list" }}

You are managing parallel workstreams using GSD under the hood.
The user does NOT need to know about `/gsd:*` commands — everything runs through `/spartan:*`.

**What are workstreams?** Independent work tracks that run in parallel within a project. Each workstream has its own milestone, phases, and progress — useful when multiple features or initiatives need to move forward simultaneously.

---

## Route by argument

{% if args[0] == "list" or args[0] == nil %}
## List Workstreams

Show all active workstreams and their current state.

**Run:** `/gsd:workstreams list`

Display each workstream with:
- Name and description
- Current milestone/phase
- Progress status

Then suggest next actions using `/spartan:` commands:
- Want to create a new workstream? → "Run `/spartan:workstreams create <name>`"
- Want to switch to a different workstream? → "Run `/spartan:workstreams switch <name>`"
- Want overall progress? → "Run `/spartan:workstreams progress`"

**Never suggest `/gsd:*` commands to the user.** Always translate to `/spartan:*`.

{% elif args[0] == "create" %}
## Create Workstream: {{ args[1] | default: "<name>" }}

Create a new parallel workstream for independent work.

**Run:** `/gsd:workstreams create {{ args[1] | default: "<name>" }}`

After creation, tell the user:
"Workstream '{{ args[1] | default: "<name>" }}' created. You are now working in this workstream. Next step: `/spartan:project new` or `/spartan:spec` to start work."

{% elif args[0] == "switch" %}
## Switch Workstream: {{ args[1] | default: "<name>" }}

Switch active context to a different workstream.

**Run:** `/gsd:workstreams switch {{ args[1] | default: "<name>" }}`

After switching, tell the user:
"Switched to workstream '{{ args[1] | default: "<name>" }}'. Run `/spartan:project status` to see where you left off."

{% elif args[0] == "status" %}
## Workstream Status: {{ args[1] | default: "<name>" }}

Show detailed status for a specific workstream.

**Run:** `/gsd:workstreams status {{ args[1] | default: "<name>" }}`

Display:
- Current milestone and phase
- Completed vs remaining work
- Any blockers or dependencies

{% elif args[0] == "progress" %}
## All Workstreams Progress

Show progress overview across all active workstreams.

**Run:** `/gsd:workstreams progress`

Display a summary table showing each workstream's completion percentage and current phase.

{% elif args[0] == "complete" %}
## Complete Workstream: {{ args[1] | default: "<name>" }}

Mark a workstream as complete and archive it.

**Run:** `/gsd:workstreams complete {{ args[1] | default: "<name>" }}`

After completion, tell the user:
"Workstream '{{ args[1] | default: "<name>" }}' completed and archived. Run `/spartan:workstreams list` to see remaining workstreams."

{% elif args[0] == "resume" %}
## Resume Workstream: {{ args[1] | default: "<name>" }}

Resume a paused or previously active workstream.

**Run:** `/gsd:workstreams resume {{ args[1] | default: "<name>" }}`

After resuming, tell the user:
"Workstream '{{ args[1] | default: "<name>" }}' resumed. Run `/spartan:project status` to pick up where you left off."

{% else %}
## Unknown argument: {{ args[0] }}

Available options:
- `/spartan:workstreams` — List all workstreams (default)
- `/spartan:workstreams create <name>` — Create a new parallel workstream
- `/spartan:workstreams switch <name>` — Switch to a different workstream
- `/spartan:workstreams status <name>` — Check status of a workstream
- `/spartan:workstreams progress` — Overview of all workstream progress
- `/spartan:workstreams complete <name>` — Archive a completed workstream
- `/spartan:workstreams resume <name>` — Resume a paused workstream
{% endif %}
