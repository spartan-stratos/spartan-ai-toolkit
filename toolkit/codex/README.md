# Spartan Codex Helpers

Spartan-style shell wrappers around the [Codex CLI](https://github.com/openai/codex) `review` command. Use Codex (a second AI) to review what Claude (the first AI) has produced — a cheap second opinion before you ask a human reviewer.

## Why

Claude Code has slash commands (`/spartan:ship-pr --rounds N`) but the Codex CLI does not — it's a flat tool. These shell helpers give you the same ergonomics from Codex: multi-round escalating review, security-only audits, pre-commit gut-checks.

## Install

```bash
# 1. Copy the helpers into your home dir (the path Codex itself uses)
cp toolkit/codex/spartan.zsh ~/.codex/spartan.zsh

# 2. Source from ~/.zshrc
echo '[[ -f ~/.codex/spartan.zsh ]] && source ~/.codex/spartan.zsh' >> ~/.zshrc

# 3. Reload
source ~/.zshrc
```

Or — if you'd rather Claude do it for you — run `/spartan:codex setup` from inside Claude Code.

## Commands

| Command | Mirrors | What it does |
|---|---|---|
| `cdx-review [base] [prompt]` | `/spartan:review` | One-pass review of current branch vs base |
| `cdx-ship [rounds] [base]` | `/spartan:ship-pr --rounds N` | Multi-round escalating review (default 2) |
| `cdx-security [base]` | `/spartan:security-review` | Security audit only (OWASP, injection, secrets, authz) |
| `cdx-uncommitted [prompt]` | pre-commit gut-check | Review staged + unstaged + untracked changes |
| `cdx-commit <sha> [prompt]` | spot review | Review a single commit |
| `cdx-yolo [prompt]` | `--dangerously-skip-permissions` | Codex with no approvals & no sandbox |
| `cdx-help` | — | List these helpers |

## Configuration

Override defaults per-shell or in `~/.zshrc`:

```bash
export CDX_BASE=main          # default base branch (auto-detects master/main/develop)
export CDX_MODEL=gpt-5.1       # pin a Codex model
```

## Examples

```bash
cdx-review                       # review HEAD vs master
cdx-ship 3                       # 3 escalating review rounds
cdx-ship 2 main                  # 2 rounds vs main
cdx-security                     # security-only audit
cdx-review master "focus on the new auth flow and rate limiting"
cdx-uncommitted "I'm about to commit — anything broken?"
cdx-commit abc1234 "did this commit break the API contract?"
```

## How escalation works in `cdx-ship`

The escalation is in the prompt — not in Codex itself. Each round is told to look harder than the last:

| Round | Stance |
|---|---|
| 1 | Surface review. Obvious bugs, missing tests, broken contracts. |
| 2 | Question pass-1's assumptions. Race conditions, N+1, error swallowing, edge cases. |
| 3+ | Brutal. Assume every previous pass missed real issues. Reject AI-generic code, premature abstraction, untested branches. |

Tweak the `case` block in `spartan.zsh` if you want different stances.

## Pairing with Claude Code

Typical flow:

1. Build the feature with Claude (`/spartan:build`)
2. Pre-commit gut-check with Codex: `cdx-uncommitted`
3. Push, open PR
4. Multi-round Codex pass: `cdx-ship 2`
5. Address findings, then `/spartan:ship-pr` for Copilot review

Codex catches different things than Claude — different model, different prompt — so it's a useful second pair of eyes, not a replacement.
