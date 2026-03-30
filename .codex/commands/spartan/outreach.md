---
name: spartan:outreach
description: Draft personalized investor outreach emails — cold, warm intro, and follow-up
argument-hint: "[investor name or context]"
---

# Outreach: {{ args[0] | default: "investor email" }}

Draft investor communication.

## Steps

1. Use the `investor-outreach` skill
2. If investor name is given, search for their thesis, portfolio, recent activity
3. Personalize the email based on real data
4. If no investor info is available, create a template and flag what needs personalizing
