# Spartan Codex Helpers

Spartan-style shell wrappers around the [Codex CLI](https://github.com/openai/codex). Use Codex (a second AI) to review what Claude has produced — a cheap second opinion before requesting human review.

## Why

Claude Code has rich slash commands (`/spartan:ship-pr-codex --rounds N`) but the Codex CLI itself does not — it's a flat tool. These shell helpers give the same ergonomics from Codex: multi-round escalating review, security-only audits, pre-commit gut-checks.

For PR-style review, the helpers compare the current branch against the base branch and make Codex inspect the whole `base...HEAD` diff.

## Install

Three options, pick one:

```bash
# 1. From inside Claude Code (easiest)
/spartan:codex setup

# 2. Manual
cp toolkit/codex/spartan.zsh ~/.codex/spartan.zsh
echo '[[ -f ~/.codex/spartan.zsh ]] && source ~/.codex/spartan.zsh' >> ~/.zshrc
source ~/.zshrc

# 3. Don't install — call directly per-shell
source toolkit/codex/spartan.zsh
```

Codex itself: `brew install codex` (one-time).

## Commands

| Command | Mirrors | What it does |
|---|---|---|
| `cdx-review [base] [prompt]` | `/spartan:review` | One-pass review of current branch vs base |
| `cdx-pr <pr-number-or-url> [rounds]` | PR second opinion | Fetch a PR into a temporary worktree and run escalating review |
| `cdx-ship [rounds] [base]` | `/spartan:ship-pr-codex --rounds N` | Multi-round escalating review (default 2) |
| `cdx-security [base]` | `/spartan:security-review` | Security audit only (OWASP, injection, secrets, authz) |
| `cdx-uncommitted [prompt]` | pre-commit gut-check | Review staged + unstaged + untracked changes |
| `cdx-commit <sha> [prompt]` | spot review | Review a single commit |
| `cdx-yolo [prompt]` | `--dangerously-skip-permissions` | Codex with no approvals & no sandbox |
| `cdx-help` | — | List these helpers |

## Configuration

Override defaults per-shell or in `~/.zshrc`:

```bash
export CDX_BASE=main           # override the auto-detected default (master → main → dev → develop)
export CDX_MODEL=gpt-5.1        # pin a Codex model
export CDX_YOLO=1               # bypass approvals/sandbox; default is read-only review
```

By default these helpers run Codex with `--ask-for-approval never --sandbox read-only`, so review runs do not stop for confirmations but still cannot edit files. Set `CDX_YOLO=1` only when you intentionally want Codex's no-approval, no-sandbox mode for review helpers.

## Examples

```bash
cdx-review                       # review HEAD vs master
cdx-pr 504                       # review PR #504 in a temporary worktree
cdx-pr https://github.com/c0x12c/ai-toolkit/pull/504 2
cdx-ship 3                       # 3 escalating review rounds
cdx-security                     # OWASP-focused audit
cdx-review master "focus on the new payout flow and rate limiting"
cdx-uncommitted "I'm about to commit — anything broken?"
cdx-commit 2d1751e6              # spot-check a specific commit
```

## How escalation works in `cdx-ship`

The escalation lives in the prompt — not in Codex itself. The helpers call native `codex review --base <branch> "<prompt>"` and pass stricter instructions each round:

| Round | Stance |
|---|---|
| 1 | Surface review. Obvious bugs, missing tests, broken contracts. |
| 2 | Question pass-1's assumptions. Race conditions, N+1, error swallowing, edge cases. |
| 3+ | Brutal. Assume every previous pass missed real issues. Reject AI-generic code, premature abstraction, untested branches. |

Edit the `case` block in `spartan.zsh` if you want different stances.

## Pairing with Claude Code

Typical flow on this repo:

1. Build the feature with Claude (`/spartan:build`)
2. Pre-commit gut-check with Codex: `cdx-uncommitted`
3. Push, open PR
4. Multi-round Codex pass: `cdx-ship 2`
5. Or use `/spartan:ship-pr-codex --rounds 2` to create/locate the PR, run Codex review, post accepted findings as inline GitHub review comments from your authenticated `gh` account, apply clear fixes, push the fix commit, reply with the fixing commit, resolve those threads, and post a PR summary.

Codex catches different things than Claude — different model, different prompt — so it's a useful second pair of eyes, not a replacement.
