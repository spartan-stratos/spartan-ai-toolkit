---
name: spartan:sessions
description: View and manage active Claude Code sessions. Shows which branches and tasks are running across terminal windows.
argument-hint: "[list | clean | ground]"
---

# Sessions: {{ args[0] | default: "list" }}

You are managing **session awareness** — tracking what's happening across multiple Claude Code windows.

---

## How Session Tracking Works

Every time a `/spartan:*` command runs, it touches a session file:

```bash
mkdir -p ~/.spartan/sessions
echo "branch=$(git branch --show-current 2>/dev/null || echo 'unknown') task={{ args[0] | default: 'general' }} dir=$(basename $(pwd)) time=$(date +%s)" > ~/.spartan/sessions/$$
```

Sessions older than 2 hours are stale. Active session = file modified in the last 2 hours.

---

{% if args[0] == "list" or args[0] == nil %}
## List Active Sessions

```bash
mkdir -p ~/.spartan/sessions

echo "=== Active Claude Sessions ==="
echo ""

ACTIVE=0
STALE=0
NOW=$(date +%s)
CUTOFF=$((NOW - 7200))  # 2 hours

for f in ~/.spartan/sessions/*; do
  [ -f "$f" ] || continue
  MOD=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)
  PID=$(basename "$f")
  CONTENT=$(cat "$f" 2>/dev/null)

  if [ "$MOD" -gt "$CUTOFF" ]; then
    ACTIVE=$((ACTIVE + 1))
    echo "  [$PID] $CONTENT"
  else
    STALE=$((STALE + 1))
  fi
done

echo ""
echo "Active: $ACTIVE | Stale: $STALE"
```

Show the results in a clean table:

| PID | Branch | Task | Directory |
|-----|--------|------|-----------|
| (from session files) | | | |

Then suggest:
- If stale > 0: "Run `/spartan:sessions clean` to remove stale sessions."
- If active >= 3: "You have 3+ sessions running. Each command will auto-ground you with branch/task context."

{% elif args[0] == "clean" %}
## Clean Stale Sessions

Remove session files older than 2 hours:

```bash
NOW=$(date +%s)
CUTOFF=$((NOW - 7200))
CLEANED=0

for f in ~/.spartan/sessions/*; do
  [ -f "$f" ] || continue
  MOD=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)
  if [ "$MOD" -lt "$CUTOFF" ]; then
    rm "$f"
    CLEANED=$((CLEANED + 1))
  fi
done

echo "Cleaned $CLEANED stale sessions."
```

Then show remaining active sessions (run the list logic above).

{% elif args[0] == "ground" %}
## Ground Current Session

Show the grounding context for this session:

```bash
echo "=== Session Grounding ==="
echo "Directory: $(basename $(pwd))"
echo "Branch: $(git branch --show-current 2>/dev/null || echo 'not a git repo')"
echo "Last commit: $(git log --oneline -1 2>/dev/null || echo 'none')"

# Check for active GSD project
if [ -f .planning/PROJECT.md ]; then
  echo "GSD Project: active"
  head -5 .planning/PROJECT.md 2>/dev/null
fi

# Check for active workstream
if [ -d .planning/workstreams ]; then
  echo "Workstreams: $(ls .planning/workstreams/ 2>/dev/null | wc -l | tr -d ' ')"
fi
```

Show a clean summary:
```
You are in: [directory]
Branch: [branch]
Last commit: [message]
GSD: [active/none]
```

This is what gets injected into skill preambles when 3+ sessions are active.

{% else %}
## Unknown argument: {{ args[0] }}

Available options:
- `/spartan:sessions` — List all active sessions (default)
- `/spartan:sessions clean` — Remove stale sessions (older than 2 hours)
- `/spartan:sessions ground` — Show grounding context for this session
{% endif %}

---

## Rules

1. **Session files live in `~/.spartan/sessions/`** — one file per process ID
2. **Stale = not modified in 2 hours** — clean these automatically or with `/spartan:sessions clean`
3. **At 3+ active sessions**, every `/spartan:*` command starts with a grounding line
4. **Grounding is automatic** — handled by the smart router preamble, not by individual commands
5. **Never block on session tracking** — if `~/.spartan/sessions/` doesn't exist, create it silently
