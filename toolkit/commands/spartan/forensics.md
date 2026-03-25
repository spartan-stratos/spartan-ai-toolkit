---
name: spartan:forensics
description: Post-mortem investigation for failed or stuck workflows. Analyzes git history, planning artifacts, and project state to diagnose what went wrong. Use when a phase failed, work got stuck, or you need to understand why something broke.
argument-hint: "\"problem description\""
---

# Forensics Investigation

You are running a post-mortem investigation using GSD forensics under the hood.
The user does NOT need to know about `/gsd:*` commands — everything runs through `/spartan:*`.

---

## What this does

Forensics analyzes your project's history to figure out **what went wrong** and **why**:
- Git commit history and branch state
- Planning artifacts (`.planning/` files)
- Phase execution logs and deviations
- State inconsistencies

This is a **diagnostic tool** — it reads and analyzes, it does not modify anything.

---

## Run the investigation

**Run:** `/gsd:forensics {{ args | join: " " }}`

{% if args[0] %}
Investigating: **{{ args | join: " " }}**
{% else %}
No problem description provided. Claude will analyze the current project state and ask what went wrong.
{% endif %}

---

## After the investigation

Present findings using `/spartan:` commands for next steps:
- Need to re-plan a phase? → "Run `/spartan:phase plan N`"
- Need to re-execute? → "Run `/spartan:phase execute N`"
- Need to debug a specific issue? → "Run `/spartan:debug \"symptom\"`"
- Project state is corrupted? → Consider `/spartan:project status` to assess

**Never suggest `/gsd:*` commands to the user.** Always translate to `/spartan:*`.
