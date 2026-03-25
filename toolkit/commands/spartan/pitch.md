---
name: spartan:pitch
description: Create investor-facing materials — deck outline, one-pager, memo, or financial model
argument-hint: "[what you need: deck, one-pager, memo, model]"
---

# Pitch: {{ args[0] | default: "deck outline" }}

Create investor materials.

## Steps

1. Use the `investor-materials` skill
2. Check for existing research in the project's `02-research/` and `03-validation/` folders
3. Use that data as the source of truth
4. Save to the project's `04-build/` folder

If there's no prior research, warn that the materials will be weaker without data.
