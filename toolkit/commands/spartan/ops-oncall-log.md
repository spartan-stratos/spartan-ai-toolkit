---
name: spartan:ops-oncall-log
description: Create on-call log — pull alerts from monitoring, write structured summary to wiki
argument-hint: "[date range, e.g. 'Mar 21 - Mar 28' or 'today']"
preamble-tier: 3
---

# On-call Log: {{ args[0] | default: "current period" }}

Pull alerts from monitoring and create a structured on-call log on the team wiki. Flow: Config → Date Range → Fetch Alerts → Notes → Template → Create Page → Summary.

## Steps

### Load Skill
Read and follow `skills/ops-oncall-log/SKILL.md` — it contains the complete on-call log process.
If the user provided `{{ args[0] }}`, pass it as the date range to Step 3 of the skill.

### After Completion
1. Share the wiki page URL with the team
2. If active alerts remain, suggest: `/spartan:ops-investigate-alert <alert>`
3. Remind: "Fill in the Cause and Resolution columns for each alert."

## Rules

- Always confirm the date range before fetching alerts
- Only include production alerts unless the user asks for other environments
- Never create duplicate pages — check for existing ones first
