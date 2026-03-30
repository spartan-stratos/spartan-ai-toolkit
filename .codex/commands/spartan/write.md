---
name: spartan:write
description: Write a blog post or article — sounds human, not AI
argument-hint: "[topic]"
---

# Write: {{ args[0] | default: "your topic" }}

Write long-form content.

## Steps

1. Use the `article-writing` skill
2. Check if there's existing research in the project folders to use as source
3. Ask: Who's the audience? What's the goal?
4. No AI slop. Sound like a human.
