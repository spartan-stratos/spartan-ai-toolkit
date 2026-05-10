---
name: spartan:codex
description: Run Codex CLI as a second-opinion reviewer. Subcommands mirror Spartan workflow — review, ship (multi-round), security, uncommitted, commit, setup, yolo. Use when you want a different model to review Claude's output before requesting human review.
argument-hint: "[review|ship|security|uncommitted|commit|setup|yolo] [args...]"
allowed-tools: Bash, Read, Write, Edit
---

# /spartan:codex — Second-opinion review via Codex CLI

Args: $ARGUMENTS

Codex (OpenAI's coding-agent CLI) is a separate AI you can use to review what Claude has produced. Different model, different prompt, different blind spots — so it catches things Claude waves through. This command wraps `codex review` with Spartan-style ergonomics.

## Pre-flight

1. **Match the user's language** — see CLAUDE.md core principle #1.
2. Verify Codex is installed:
   ```bash
   command -v codex >/dev/null || { echo "Codex CLI not found. Install: brew install codex"; exit 1; }
   ```
3. If args is empty, show the menu (Step 7) and stop.

## Step 1 — Parse the subcommand

Pull the first word from `$ARGUMENTS`. Valid: `review`, `ship`, `security`, `uncommitted`, `commit`, `setup`, `yolo`. Unknown → show menu, stop.

The remaining args are passed through to Codex.

## Step 2 — `review` (one-pass)

Single review of the current branch against a base.

```bash
BASE="${BASE_ARG:-$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')}"
[ -z "$BASE" ] && BASE=master
codex review --base "$BASE" "Review the diff for correctness, design, security, and missing tests. Be specific about file:line."
```

If the user passed extra prose after the base branch (`/spartan:codex review master focus on auth`), append it to the prompt instead of using the default.

## Step 3 — `ship` (multi-round escalating)

Mirrors `/spartan:ship-pr --rounds N` but using Codex instead of Copilot. Default rounds: 2. Cap at 3 (diminishing returns).

```bash
ROUNDS="${ROUNDS_ARG:-2}"
[ "$ROUNDS" -gt 3 ] && ROUNDS=3

for i in $(seq 1 "$ROUNDS"); do
  echo "================ Round $i / $ROUNDS ================"
  case "$i" in
    1) STANCE="Pass 1: surface review. Obvious bugs, missing tests, broken contracts." ;;
    2) STANCE="Pass 2: harder. Question every assumption pass 1 made. Race conditions, N+1, error swallowing, edge cases." ;;
    *) STANCE="Pass $i: brutal. Assume every previous pass missed real issues. Reject AI-generic code, premature abstraction, untested branches." ;;
  esac
  codex review --base "$BASE" "$STANCE Each finding must be actionable with file:line and the specific fix."
done
```

Between rounds, summarize the new findings to the user in 2-3 bullets so they can decide whether to fix-and-rerun or move on.

## Step 4 — `security`

```bash
codex review --base "$BASE" "Security audit only. Check: input validation, authn/authz, SQL/command injection, SSRF, secrets in code, unsafe deserialization, missing rate limits, IDOR, weak crypto, log injection, OWASP top 10. Ignore style and non-security bugs. Rate severity (critical/high/medium) and give the exact fix."
```

## Step 5 — `uncommitted`

Review what's in the worktree but not yet committed — staged, unstaged, and untracked.

```bash
codex review --uncommitted "Review staged, unstaged, and untracked changes. Catch issues before commit."
```

## Step 6 — `commit <sha>`

```bash
SHA="$1"
[ -z "$SHA" ] && { echo "Usage: /spartan:codex commit <sha>"; exit 1; }
codex review --commit "$SHA"
```

## Step 7 — `setup`

One-shot install of the shell helpers so the user can also call `cdx-review`, `cdx-ship`, etc. directly from any terminal (without going through Claude).

1. Locate the toolkit copy of `spartan.zsh`. It lives at `<spartan-install-root>/toolkit/codex/spartan.zsh` (typically `~/.spartan/toolkit/codex/spartan.zsh` for global installs, or `./toolkit/codex/spartan.zsh` for repo-local installs).
2. Copy it to `~/.codex/spartan.zsh` (creating `~/.codex/` if it doesn't exist).
3. Add this line to `~/.zshrc` (idempotent — check first with `grep -q`):
   ```bash
   [[ -f ~/.codex/spartan.zsh ]] && source ~/.codex/spartan.zsh
   ```
4. Print the next step to the user: `source ~/.zshrc` or open a new shell, then run `cdx-help`.

## Step 8 — `yolo`

Pass-through to `codex` with `--dangerously-bypass-approvals-and-sandbox` (Codex's equivalent of Claude's `--dangerously-skip-permissions`). Use only inside an already-isolated sandbox (devcontainer, VM, throwaway repo).

```bash
codex --dangerously-bypass-approvals-and-sandbox "$REMAINING_ARGS"
```

Warn the user once before running. If they're not in a sandbox, refuse and tell them to use plain `codex review` instead.

## Menu (when no/invalid subcommand)

```
/spartan:codex — Codex CLI second-opinion review

  review [base] [prompt]      One-pass review of current branch vs base
  ship   [rounds] [base]      Multi-round escalating review (default 2, max 3)
  security [base]             Security-only audit (OWASP, injection, secrets)
  uncommitted [prompt]        Review staged + unstaged + untracked
  commit <sha> [prompt]       Review a single commit
  setup                       Install shell helpers (cdx-review, cdx-ship, …)
  yolo [prompt]               Codex with no approvals & no sandbox

Examples:
  /spartan:codex review
  /spartan:codex ship 3
  /spartan:codex security
  /spartan:codex review master "focus on the new auth flow"
```

## Notes

- Codex runs in its own sandbox by default, so it cannot edit your files unless you opt in.
- The `review` subcommand is read-only by design — it prints findings to your terminal, it does not modify the repo.
- For pairing with Claude: build with Claude (`/spartan:build`), gut-check with `/spartan:codex uncommitted`, push, then `/spartan:codex ship 2` before asking a human.
- See `toolkit/codex/README.md` for the underlying shell helpers.
