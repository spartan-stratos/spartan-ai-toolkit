---
name: spartan:ops-investigate-alert
description: Investigate a monitoring alert end-to-end — metrics, logs, traces, code changes, root cause hypothesis
argument-hint: "<alert name or monitoring URL>"
preamble-tier: 3
---

# Investigate Alert: {{ args[0] | default: "unknown alert" }}

Structured investigation from alert to root cause. Flow: Parse Input → Fetch Monitor → Metrics → Logs → Traces → Infra → Code → Summary.

## Steps

### Load Skill
Read and follow `skills/ops-investigate-alert/SKILL.md` — it contains the complete investigation process.
Pass `{{ args[0] }}` as the alert input to Step 2 of the skill.

### After Investigation
1. If a code issue was identified, ask: "Want me to look at the code fix?"
2. Suggest `/spartan:ops-oncall-log` if relevant for on-call context

## Rules

- Follow every step in the skill — do not skip
- Present data before hypotheses — show metrics/logs/traces, then analyze
- Be explicit about confidence level in the root cause hypothesis
