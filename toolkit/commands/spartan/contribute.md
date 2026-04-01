---
name: spartan:contribute
description: Toggle contributor mode — Claude rates its own skill experience (0-10) after each command and files improvement reports to ~/.spartan/contributor-logs/. Opt-in only.
argument-hint: "[on | off | reports]"
---

# Contributor Mode: {{ args[0] | default: "on" }}

You are managing **contributor mode** — a self-improvement loop for Spartan.

When active, after every `/spartan:*` command finishes, Claude writes a short field report rating how well the skill worked.

---

{% if args[0] == "on" or args[0] == nil %}
## Activate Contributor Mode

```bash
mkdir -p ~/.spartan/contributor-logs
echo "enabled" > ~/.spartan/contributor-mode
```

Say: "Contributor mode ON. I'll file a quick report after each command — you won't notice unless something scored low."

### What Happens Now

After every `/spartan:*` command completes, **silently** evaluate and write a report:

```bash
mkdir -p ~/.spartan/contributor-logs
```

Write a file to `~/.spartan/contributor-logs/YYYY-MM-DD-HH-MM-command-name.md`:

```markdown
## Field Report: /spartan:[command]
Date: [ISO timestamp]
Score: [0-10]
Branch: [current branch]
Directory: [project directory]

### What worked
- [1-2 bullets on what the skill did well]

### What didn't work
- [1-2 bullets on friction, confusion, or missing features]
- [skip this section if score >= 8]

### Suggestion
[One concrete improvement — a specific change to the command/skill, not vague feedback]
```

### Scoring Guide

| Score | Meaning |
|-------|---------|
| 9-10 | Nailed it. No friction. Would use again without changes. |
| 7-8 | Good. Minor friction but got the job done. |
| 5-6 | OK. Needed manual intervention or workarounds. |
| 3-4 | Poor. Missed the point or gave bad guidance. |
| 0-2 | Broken. Actively wasted time or caused errors. |

### Rules for Reporting

1. **Be honest.** Don't inflate scores. A 6 is a 6.
2. **Be specific.** "The migration template assumed Flyway but we use Liquibase" is useful. "Could be better" is not.
3. **One suggestion per report.** The best improvement, not a wish list.
4. **Don't slow down the user.** Write the report silently after the command finishes. Never ask the user to rate anything.
5. **Score relative to the skill's promise.** If `/spartan:qa` says it'll find bugs but only checked if the page loads, that's a 4.

{% elif args[0] == "off" %}
## Deactivate Contributor Mode

```bash
rm -f ~/.spartan/contributor-mode
```

Say: "Contributor mode OFF. No more field reports. Your existing reports are still in `~/.spartan/contributor-logs/`."

{% elif args[0] == "reports" %}
## View Reports

```bash
echo "=== Contributor Reports ==="
echo ""

if [ ! -d ~/.spartan/contributor-logs ] || [ -z "$(ls ~/.spartan/contributor-logs/ 2>/dev/null)" ]; then
  echo "No reports yet. Enable contributor mode with /spartan:contribute"
  exit 0
fi

# Summary stats
TOTAL=$(ls ~/.spartan/contributor-logs/*.md 2>/dev/null | wc -l | tr -d ' ')
echo "Total reports: $TOTAL"
echo ""

# Show last 10 reports with scores
echo "Recent reports:"
for f in $(ls -t ~/.spartan/contributor-logs/*.md 2>/dev/null | head -10); do
  FNAME=$(basename "$f" .md)
  SCORE=$(grep "^Score:" "$f" 2>/dev/null | head -1 | awk '{print $2}')
  echo "  [$SCORE/10] $FNAME"
done
```

Show the results in a clean table. Then:

- If any score < 5: "Some skills scored low. Want me to read those reports and suggest fixes?"
- If average > 7: "Skills are working well overall."
- Always: "Reports are in `~/.spartan/contributor-logs/`. You can share them as GitHub issues to help improve Spartan."

### Aggregate Analysis

If the user asks for deeper analysis, group reports by command and show:

| Command | Reports | Avg Score | Lowest | Top Issue |
|---------|---------|-----------|--------|-----------|
| /spartan:build | N | X.X | X | [most common complaint] |
| /spartan:debug | N | X.X | X | [most common complaint] |

{% else %}
## Unknown argument: {{ args[0] }}

Available options:
- `/spartan:contribute` — Turn on contributor mode (default)
- `/spartan:contribute off` — Turn it off
- `/spartan:contribute reports` — View and analyze filed reports
{% endif %}

---

## How to Check if Active

Any skill can check:
```bash
[ -f ~/.spartan/contributor-mode ] && echo "CONTRIBUTOR_MODE=on"
```

If the file exists and contains "enabled", file a report after the skill finishes.
