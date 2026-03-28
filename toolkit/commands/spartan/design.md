---
name: spartan:design
description: "Alias for /spartan:ux prototype — design workflow with Design Gate"
argument-hint: "[feature name]"
preamble-tier: 1
---

# Design: {{ args[0] | default: "unnamed feature" }}

> **This command has moved to `/spartan:ux prototype`.** Running it now.

Run `/spartan:ux prototype {{ args[0] }}` internally. Pass all arguments through.

The full UX design workflow is now at `/spartan:ux` with sub-commands:
- `/spartan:ux research` — user discovery
- `/spartan:ux define` — problem definition
- `/spartan:ux ideate` — solution exploration
- `/spartan:ux system` — design system setup
- `/spartan:ux prototype` — screen design + Design Gate (this is what `/spartan:design` used to do)
- `/spartan:ux test` — usability testing plan
- `/spartan:ux handoff` — developer handoff
- `/spartan:ux qa` — design QA checklist
- `/spartan:ux audit` — gap analysis
