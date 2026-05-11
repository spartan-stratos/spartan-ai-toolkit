# Codex helpers — Spartan-style review commands
# Source from ~/.zshrc:  [[ -f ~/.codex/spartan.zsh ]] && source ~/.codex/spartan.zsh
#
# Install (project-local copy lives at toolkit/codex/spartan.zsh):
#   cp toolkit/codex/spartan.zsh ~/.codex/spartan.zsh
#   echo '[[ -f ~/.codex/spartan.zsh ]] && source ~/.codex/spartan.zsh' >> ~/.zshrc
#   source ~/.zshrc
# Or run `/spartan:codex setup` from inside Claude Code.

# --- Defaults --------------------------------------------------------------
: "${CDX_BASE:=master}"      # default base branch for diffs
: "${CDX_MODEL:=}"           # optional: pin a model, e.g. CDX_MODEL=gpt-5.1
: "${CDX_YOLO:=0}"           # set to 1 to bypass approvals/sandbox for review helpers

_cdx_model_args() {
  [[ -n "$CDX_MODEL" ]] && echo "-m $CDX_MODEL"
}

_cdx_review_args() {
  if [[ "$CDX_YOLO" != "0" ]]; then
    echo "--dangerously-bypass-approvals-and-sandbox"
  else
    echo "--ask-for-approval never --sandbox read-only"
  fi
}

_cdx_codex() {
  codex $(_cdx_review_args) $(_cdx_model_args) "$@"
}

_cdx_exec_review_diff() {
  local base="$1"; shift
  local instructions="$*"
  _cdx_codex review --base "$base" \
    "Review every change in the current branch against base '$base', like a full PR review. Start by inspecting 'git diff $base...HEAD --stat' and then the full diff with file context. Do not review unrelated working-tree noise. ${instructions:-Report only actionable findings with severity and file:line.}"
}

_cdx_resolve_base() {
  # Prefer the user-provided base; otherwise pick the first branch that exists.
  local b="$1"
  if [[ -n "$b" ]]; then echo "$b"; return; fi
  local origin_head
  origin_head=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
  if [[ -n "$origin_head" ]] && git rev-parse --verify "origin/$origin_head" >/dev/null 2>&1; then
    echo "origin/$origin_head"; return
  fi
  for cand in master main dev develop; do
    if git rev-parse --verify "$cand" >/dev/null 2>&1; then echo "$cand"; return; fi
    if git rev-parse --verify "origin/$cand" >/dev/null 2>&1; then echo "origin/$cand"; return; fi
  done
  echo "$CDX_BASE"
}

# --- cdx-review : one-pass review of the current branch -------------------
# Usage: cdx-review [base-branch] [extra prompt...]
cdx-review() {
  local base; base=$(_cdx_resolve_base "$1"); shift 2>/dev/null
  local extra="$*"
  echo "==> Reviewing vs $base"
  if [[ -n "$extra" ]]; then
    _cdx_exec_review_diff "$base" "$extra Each finding must be actionable with file:line and the specific fix."
  else
    _cdx_codex review --base "$base"
  fi
}

# --- cdx-pr : review a GitHub PR without touching the current checkout -----
# Usage: cdx-pr <pr-number-or-url> [rounds=2]
cdx-pr() {
  local pr="$1"
  local rounds="${2:-2}"
  if [[ -z "$pr" ]]; then
    echo "Usage: cdx-pr <pr-number-or-url> [rounds=2]" >&2
    return 1
  fi
  if ! command -v gh >/dev/null; then
    echo "gh CLI not found. Install gh or check out the PR branch manually." >&2
    return 1
  fi
  if ! [[ "$rounds" =~ ^[0-9]+$ ]] || (( rounds < 1 )); then
    echo "Usage: cdx-pr <pr-number-or-url> [rounds>=1]" >&2
    return 1
  fi

  local meta number base ref tmp exit_code
  meta=$(gh pr view "$pr" --json number,baseRefName --template '{{.number}} {{.baseRefName}}') || return
  number="${meta%% *}"
  base="${meta#* }"
  ref="refs/remotes/origin/pr-$number"

  echo "==> Fetching PR #$number vs $base"
  git fetch origin "refs/heads/${base}:refs/remotes/origin/${base}" "pull/${number}/head:${ref}" --quiet || return

  tmp=$(mktemp -d "${TMPDIR:-/tmp}/cdx-pr-${number}.XXXXXX") || return
  if ! git worktree add --detach "$tmp" "$ref" >/dev/null; then
    rmdir "$tmp" 2>/dev/null || true
    return 1
  fi

  (
    cd "$tmp" || exit 1
    cdx-ship "$rounds" "origin/$base"
  )
  exit_code=$?
  git worktree remove "$tmp" --force >/dev/null 2>&1 || true
  return "$exit_code"
}

# --- cdx-ship : multi-round escalating review (mirrors /spartan:ship-pr-codex) ----
# Usage: cdx-ship [rounds=2] [base-branch]
cdx-ship() {
  local rounds=${1:-2}
  local base; base=$(_cdx_resolve_base "$2")
  if ! [[ "$rounds" =~ ^[0-9]+$ ]] || (( rounds < 1 )); then
    echo "Usage: cdx-ship [rounds>=1] [base-branch]" >&2; return 1
  fi
  echo "==> ship-pr-codex: $rounds round(s) vs $base"
  for i in $(seq 1 "$rounds"); do
    echo
    echo "================ Round $i / $rounds ================"
    local stance
    case "$i" in
      1) stance="Pass 1: surface review. Catch obvious bugs, missing tests, broken contracts." ;;
      2) stance="Pass 2: harder. Question every assumption pass 1 made. Find what was waved through. Look for race conditions, N+1, error swallowing, missing edge cases." ;;
      *) stance="Pass $i: brutal. Assume every previous pass missed real issues. Find them. Reject anything that smells like AI-generic code, premature abstraction, or untested branches." ;;
    esac
    echo "==> $stance"
    _cdx_exec_review_diff "$base" "$stance Each finding must be actionable with file:line and the specific fix."
  done
}

# --- cdx-security : security-focused review --------------------------------
# Usage: cdx-security [base-branch]
cdx-security() {
  local base; base=$(_cdx_resolve_base "$1")
  echo "==> Security review vs $base"
  _cdx_exec_review_diff "$base" \
    "Security audit only. Check: input validation, authn/authz, SQL/command injection, SSRF, secrets in code, unsafe deserialization, missing rate limits, IDOR, weak crypto, log injection, OWASP top 10. Ignore style and non-security bugs. Rate severity critical/high/medium and give the exact fix."
}

# --- cdx-uncommitted : review what's in the worktree, not yet committed ----
cdx-uncommitted() {
  local extra="$*"
  echo "==> Reviewing uncommitted changes"
  _cdx_codex review --uncommitted \
    "${extra:-Review staged, unstaged, and untracked changes. Catch issues before commit.}"
}

# --- cdx-commit : review a single commit -----------------------------------
# Usage: cdx-commit <sha>
cdx-commit() {
  local sha="$1"
  if [[ -z "$sha" ]]; then echo "Usage: cdx-commit <sha>" >&2; return 1; fi
  shift
  _cdx_codex review --commit "$sha" "$@"
}

# --- cdx-yolo : Codex with no approvals & no sandbox -----------------------
# Equivalent of Claude's --dangerously-skip-permissions. Use with care.
cdx-yolo() {
  codex --dangerously-bypass-approvals-and-sandbox $(_cdx_model_args) "$@"
}

# --- cdx-help : list these helpers -----------------------------------------
cdx-help() {
  cat <<'EOF'
Codex helpers (override defaults: CDX_BASE=master CDX_MODEL=gpt-5.1 CDX_YOLO=1)

  cdx-review [base] [prompt...]    One-pass review of current branch vs base
  cdx-pr <pr-number-or-url> [rounds] Review a PR in a temporary worktree
  cdx-ship   [rounds] [base]       Multi-round escalating review (default 2)
  cdx-security [base]              Security-only audit
  cdx-uncommitted [prompt...]      Review staged + unstaged + untracked
  cdx-commit <sha> [prompt...]     Review a single commit
  cdx-yolo   [prompt...]           Codex with no approvals & no sandbox
  cdx-help                         This message
EOF
}
