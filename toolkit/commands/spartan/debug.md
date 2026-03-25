---
name: spartan:debug
description: "Alias for /spartan:fix — use that instead"
argument-hint: "[describe the symptom / error]"
---

# Debug → Fix

**This command has moved to `/spartan:fix`.**

`/spartan:debug` still works, but `/spartan:fix` is the new name.
It covers the full cycle: reproduce → investigate → fix → ship to PR.

Run `/spartan:fix {{ args[0] | default: "" }}` now.
