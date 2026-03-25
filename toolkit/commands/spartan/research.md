---
name: spartan:research
description: Run a deep research session with web search, source checking, and structured report
argument-hint: "[topic to research]"
---

# Research: {{ args[0] | default: "your topic" }}

Run a deep research session.

## Steps

1. Use the `deep-research` skill
2. Use web search to find real data
3. Cross-check sources
4. Write a structured report
5. Save output to the project's `02-research/` folder

If no project folder exists yet, ask which project this is for.
