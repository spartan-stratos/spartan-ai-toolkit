---
name: spartan:freeze
description: Lock file edits to a single directory. Claude will refuse to create, modify, or delete files outside the specified directory until /spartan:unfreeze is called. Use when debugging a specific module or making surgical changes.
argument-hint: "[directory path]"
---

# Freeze — Lock Edits to: {{ args[0] }}

You are now in **freeze mode**. File operations are restricted to:

```
ALLOWED: {{ args[0] }}/**
BLOCKED: everything else
```

---

## Rules (strictly enforced)

### ALLOWED inside {{ args[0] }}:
- Create new files
- Edit existing files
- Delete files
- Run tests that modify files in this directory

### BLOCKED outside {{ args[0] }}:
- ❌ Create files
- ❌ Edit files (including str_replace, sed, write operations)
- ❌ Delete files
- ❌ Move or rename files

### ALWAYS ALLOWED (regardless of freeze):
- ✅ **Read** any file anywhere (view, cat, grep, find)
- ✅ **Run** commands that don't modify files (tests, builds, git log, git status)
- ✅ **Git operations** on the frozen directory's changes (commit, diff)
- ✅ **Edit test files** in the corresponding test directory (e.g., if frozen to `src/main/kotlin/com/spartan/auth/`, also allow `src/test/kotlin/com/spartan/auth/`)

### Test Directory Auto-Mapping
When the frozen directory is a source directory, the corresponding test directory is also unlocked:

| Frozen directory | Also allowed |
|---|---|
| `src/main/kotlin/.../module/` | `src/test/kotlin/.../module/` |
| `src/app/feature/` | `src/app/feature/**/*.test.*` |
| `app/[route]/` | `app/[route]/**/*.test.*` + `e2e/[route].*` |
| `lib/module/` | `lib/module/**/*.test.*` |

---

## Enforcement

When Claude attempts to modify a file outside the frozen directory:

```
🧊 FREEZE: Cannot edit [file path]

Frozen to: {{ args[0] }}
This file is outside the allowed directory.

Options:
  - /spartan:unfreeze     → Remove restriction
  - /spartan:freeze [dir] → Change to a different directory
  - Read the file instead (reading is always allowed)
```

---

## Why Freeze?

Freeze prevents Claude from "helpfully" fixing things outside your focus area:
- Debugging `auth/` module → Claude won't refactor `payments/` while it's at it
- Working on a migration → Claude won't touch application code
- Fixing a specific test → Claude won't rewrite the implementation to make the test pass

---

## Behavior

- **Sticky:** Stays active until `/spartan:unfreeze` or session ends
- **Stacks with careful mode:** If both active, destructive ops inside the frozen dir still need confirmation
- **Auto mode respects freeze:** Even in auto mode, freeze is enforced

Claude should acknowledge:
"🧊 Freeze ON — edits locked to `{{ args[0] }}/`. Tôi chỉ sửa file trong directory này (+ test tương ứng). Nói '/spartan:unfreeze' để mở khóa."
