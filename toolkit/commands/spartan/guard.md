---
name: spartan:guard
description: Maximum safety — activate both careful mode (destructive operation warnings) and freeze mode (directory lock) simultaneously. Use when working with production configs, database migrations, or any high-risk changes.
argument-hint: "[directory to lock edits to]"
---

# Guard Mode — Maximum Safety

Activating **both** safety guardrails:

## 1. 🛡️ Careful Mode → ON
All destructive operations require explicit confirmation.
(See `/spartan:careful` for full watchlist)

## 2. 🧊 Freeze Mode → ON — locked to: {{ args[0] }}
File edits restricted to `{{ args[0] }}/` and its corresponding test directory.
(See `/spartan:freeze` for full rules)

---

## When to Use Guard Mode

- **Database migrations** — freeze to `db/migration/`, careful prevents DROP without confirm
- **Production config** — freeze to `infrastructure/` or `k8s/`, careful prevents destructive terraform/railway ops
- **Sensitive refactoring** — freeze to the one module being refactored, careful prevents accidental data loss
- **Hotfix on main** — freeze to the specific fix files, careful prevents force-push

---

## Deactivate

| Command | Effect |
|---|---|
| `/spartan:unfreeze` | Remove directory lock only, careful stays ON |
| `/spartan:careful off` | Remove destructive warnings only, freeze stays ON |
| `/spartan:guard off` | Remove BOTH — back to normal mode |

---

Claude should acknowledge:
"🛡️🧊 Guard mode ON — careful (destructive warnings) + freeze (locked to `{{ args[0] }}/`).
Đây là chế độ an toàn cao nhất. Nói '/spartan:guard off' để tắt cả hai."
