---
name: spartan:codex
description: Run Codex CLI as a second-opinion reviewer. Subcommands mirror Spartan workflow — review, pr, ship (multi-round), security, uncommitted, commit, setup, yolo. Use when you want a different model to review Claude's output before requesting human review.
argument-hint: "[review|pr|ship|security|uncommitted|commit|setup|yolo] [args...]"
allowed-tools: Bash, Read, Write, Edit
---

# /spartan:codex — Second-opinion review via Codex CLI

Args: $ARGUMENTS

Codex (OpenAI's coding-agent CLI) is a separate AI you can use to review what Claude has produced. Different model, different prompt, different blind spots — so it catches things Claude waves through. This command wraps Codex with Spartan-style ergonomics.

## Pre-flight

1. **Match the user's language** — see CLAUDE.md core principle #1.
2. Verify Codex is installed:
   ```bash
   command -v codex >/dev/null || { echo "Codex CLI not found. Install: brew install codex"; exit 1; }
   ```
3. If args is empty, show the menu (Step 9) and stop.

## Step 1 — Parse the subcommand

Pull the first word from `$ARGUMENTS`. Valid: `review`, `pr`, `ship`, `security`, `uncommitted`, `commit`, `setup`, `yolo`. Unknown → show menu, stop.

The remaining args are passed through to Codex.

## Step 2 — Resolve default base branch

```bash
git fetch origin --quiet
BASE_NAME="${BASE_ARG:-$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')}"
if [ -n "$BASE_NAME" ]; then
  if git rev-parse --verify "origin/$BASE_NAME" >/dev/null 2>&1; then
    BASE="origin/$BASE_NAME"
  elif git rev-parse --verify "$BASE_NAME" >/dev/null 2>&1; then
    BASE="$BASE_NAME"
  fi
fi
[ -z "$BASE" ] && for cand in master main dev develop; do
  if git rev-parse --verify "origin/$cand" >/dev/null 2>&1; then BASE="origin/$cand"; break; fi
  if git rev-parse --verify "$cand" >/dev/null 2>&1; then BASE="$cand"; break; fi
done
[ -z "$BASE" ] && BASE=master
```

## Step 3 — `review` (one-pass)

Single review of the current branch against the resolved base.

Use native `codex review --base "$BASE"` for both default and custom prompts.

```bash
codex --ask-for-approval never --sandbox read-only review --base "$BASE"
```

If the user passed extra prose after the base branch (`/spartan:codex review master focus on auth`):

```bash
codex --ask-for-approval never --sandbox read-only review --base "$BASE" \
  "Review every change in the current branch against base '$BASE', like a full PR review. Start by inspecting 'git diff $BASE...HEAD --stat' and then the full diff with file context. Do not review unrelated working-tree noise. $EXTRA Return compact findings only. Format each line: path:line: severity: problem. fix. Use severity bug|risk|nit|question. If no actionable findings, say exactly NO_ACTIONABLE_FINDINGS."
```

## Step 4 — `pr <number-or-url>` (review a PR in a temporary worktree)

Fetch a GitHub PR into a temporary worktree and run escalating review without
moving the current checkout.

```bash
PR="$1"
ROUNDS="${2:-2}"
[ -z "$PR" ] && { echo "Usage: /spartan:codex pr <pr-number-or-url> [rounds]"; exit 1; }
command -v gh >/dev/null || { echo "gh CLI not found. Install gh or check out the PR branch manually."; exit 1; }

META=$(gh pr view "$PR" --json number,baseRefName --template '{{.number}} {{.baseRefName}}')
NUMBER="${META%% *}"
BASE="${META#* }"
REF="refs/remotes/origin/pr-$NUMBER"

git fetch origin "refs/heads/${BASE}:refs/remotes/origin/${BASE}" "pull/${NUMBER}/head:${REF}" --quiet
TMP=$(mktemp -d "${TMPDIR:-/tmp}/codex-pr-${NUMBER}.XXXXXX")
git worktree add --detach "$TMP" "$REF"
(
  cd "$TMP" || exit 1
  for i in $(seq 1 "$ROUNDS"); do
    case "$i" in
      1) STANCE="Pass 1: surface review. Obvious bugs, missing tests, broken contracts." ;;
      2) STANCE="Pass 2: harder. Question every assumption pass 1 made. Race conditions, N+1, error swallowing, edge cases." ;;
      *) STANCE="Pass $i: brutal. Assume every previous pass missed real issues. Reject AI-generic code, premature abstraction, untested branches." ;;
    esac
    codex --ask-for-approval never --sandbox read-only review --base "origin/$BASE" \
      "Review every change in the current branch against base 'origin/$BASE', like a full PR review for PR #$NUMBER. Start by inspecting 'git diff origin/$BASE...HEAD --stat' and then the full diff with file context. Do not review unrelated working-tree noise. $STANCE Return compact findings only. Format each line: path:line: severity: problem. fix. Use severity bug|risk|nit|question. If no actionable findings, say exactly NO_ACTIONABLE_FINDINGS."
  done
)
STATUS=$?
git worktree remove "$TMP" --force >/dev/null 2>&1 || true
exit "$STATUS"
```

## Step 5 — `ship` (multi-round escalating)

Mirrors `/spartan:ship-pr-codex --rounds N` review intensity, but only prints Codex findings. It does not create the PR or apply fixes. Default rounds: 2. Cap at 3 (diminishing returns).

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
  codex --ask-for-approval never --sandbox read-only review --base "$BASE" \
    "Review every change in the current branch against base '$BASE', like a full PR review. Start by inspecting 'git diff $BASE...HEAD --stat' and then the full diff with file context. Do not review unrelated working-tree noise. $STANCE Return compact findings only. Format each line: path:line: severity: problem. fix. Use severity bug|risk|nit|question. If no actionable findings, say exactly NO_ACTIONABLE_FINDINGS."
done
```

Between rounds, summarize the new findings to the user in 2-3 bullets so they can decide whether to fix-and-rerun or move on.

## Step 6 — `security`

```bash
codex --ask-for-approval never --sandbox read-only review --base "$BASE" \
  "Review every change in the current branch against base '$BASE', like a full PR review. Start by inspecting 'git diff $BASE...HEAD --stat' and then the full diff with file context. Do not review unrelated working-tree noise. Security audit only. Check: input validation, authn/authz, SQL/command injection, SSRF, secrets in code, unsafe deserialization, missing rate limits, IDOR, weak crypto, log injection, OWASP top 10. Ignore style and non-security bugs. Return compact findings only. Format each line: path:line: severity: problem. fix. Use severity critical|high|medium. If no actionable findings, say exactly NO_SECURITY_FINDINGS."
```

## Step 7 — `uncommitted`

```bash
codex --ask-for-approval never --sandbox read-only review --uncommitted "Review staged, unstaged, and untracked changes. Catch issues before commit."
```

## Step 8 — `commit <sha>`

```bash
SHA="$1"
[ -z "$SHA" ] && { echo "Usage: /spartan:codex commit <sha>"; exit 1; }
codex --ask-for-approval never --sandbox read-only review --commit "$SHA"
```

## Step 9 — `setup`

Install the shell helpers so the user can also call `cdx-review`, `cdx-ship`, etc. directly from any terminal (without going through Claude).

1. Locate the helper file. Search in this order, use the first that exists:
   - `<repo-root>/toolkit/codex/spartan.zsh` (toolkit repo)
   - `<repo-root>/scripts/codex/spartan.zsh` (project-local copy)
   - `<repo-root>/.claude/codex/spartan.zsh` (local Claude install)
   - `~/.claude/codex/spartan.zsh` (global Claude install)
   - `~/.codex/spartan.zsh` (Codex install)
   - `~/.spartan/toolkit/codex/spartan.zsh` (global Spartan install)
   - `<repo-root>/toolkit/codex/spartan.zsh` (toolkit dev mode)

   If none found, tell the user and stop.

2. Copy it to `~/.codex/spartan.zsh` (creating `~/.codex/` if it doesn't exist).
3. Add this line to `~/.zshrc` (idempotent — check first with `grep -q`):
   ```bash
   [[ -f ~/.codex/spartan.zsh ]] && source ~/.codex/spartan.zsh
   ```
4. Print the next step: `source ~/.zshrc` or open a new shell, then run `cdx-help`.

## Step 10 — `yolo`

Pass-through to `codex` with `--dangerously-bypass-approvals-and-sandbox` (Codex's equivalent of Claude's `--dangerously-skip-permissions`). Use only inside an already-isolated sandbox (devcontainer, VM, throwaway repo).

```bash
codex --dangerously-bypass-approvals-and-sandbox "$REMAINING_ARGS"
```

Warn the user once before running. If they're not in a sandbox, refuse and tell them to use plain `codex review` instead.

## Menu (when no/invalid subcommand)

```
/spartan:codex — Codex CLI second-opinion review

  review [base] [prompt]      One-pass review of current branch vs base
  pr <number-or-url> [rounds] Review a PR in a temporary worktree
  ship   [rounds] [base]      Multi-round escalating review (default 2, max 3)
  security [base]             Security-only audit (OWASP, injection, secrets)
  uncommitted [prompt]        Review staged + unstaged + untracked
  commit <sha> [prompt]       Review a single commit
  setup                       Install shell helpers (cdx-review, cdx-ship, …)
  yolo [prompt]               Codex with no approvals & no sandbox

Examples:
  /spartan:codex review
  /spartan:codex pr 504
  /spartan:codex ship 3
  /spartan:codex security
  /spartan:codex review master "focus on the new payout flow"
```

## Notes

- The helper commands run Codex with `--ask-for-approval never --sandbox read-only` by default, so reviews do not prompt but still cannot edit files. Set `CDX_YOLO=1` before sourcing/running the helper if you intentionally want no approvals and no sandbox.
- The `review` subcommand is read-only by design — it prints findings to your terminal, it does not modify the repo.
- For PR-like review, always compare against the base branch so Codex goes over all branch changes, not only local uncommitted edits.
- For pairing with Claude: build with `/spartan:build`, gut-check with `/spartan:codex uncommitted`, then use `/spartan:commit-message-with-codex` for the push → PR → `/spartan:ship-pr-codex --rounds 2` chain. `/spartan:ship-pr-codex` posts accepted Codex findings as inline GitHub review comments from the authenticated `gh` user, replies with the fix commit, and resolves its own threads after pushing fixes.
- See `toolkit/codex/README.md` for the underlying shell helpers.
