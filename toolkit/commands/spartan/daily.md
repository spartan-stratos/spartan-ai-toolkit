---
name: spartan:daily
description: Generate a daily standup summary based on recent git history and GSD status
---

Generate a daily engineering standup summary for the current project.

## Steps

1. **Check recent git history** (last 24-48h):
   ```bash
   git log --since="2 days ago" --oneline --author="$(git config user.name)"
   ```

2. **Check GSD status** (if GSD project exists):
   Read `.planning/` directory for current milestone and phase status.

3. **Check for any failing tests or CI notes** (if available):
   Look for recent test output files or CI logs.

## Output Format

```markdown
## Daily Standup — [DATE]

### Yesterday / Done
- [completed items from git log / GSD progress]

### Today / In Progress
- [current phase or active task]
- [next planned task]

### Blockers
- [any blockers found, or "None"]

### Progress on Current Milestone
- Phase X of Y complete
- Est. completion: [if determinable from roadmap]
```

Keep it concise — each section max 3-4 bullet points.
This is for a 15-minute standup, not a status report.
