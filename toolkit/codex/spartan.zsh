# Codex helpers — Spartan-style review commands
# Source from ~/.zshrc:  [[ -f ~/.codex/spartan.zsh ]] && source ~/.codex/spartan.zsh

# --- Defaults --------------------------------------------------------------
: "${CDX_BASE:=master}"      # default base branch for diffs
: "${CDX_MODEL:=}"           # optional: pin a model, e.g. CDX_MODEL=gpt-5.1

_cdx_model_args() {
  [[ -n "$CDX_MODEL" ]] && echo "-m $CDX_MODEL"
}

_cdx_resolve_base() {
  # Prefer the user-provided base; otherwise pick the first branch that exists.
  local b="$1"
  if [[ -n "$b" ]]; then echo "$b"; return; fi
  for cand in master main develop; do
    if git rev-parse --verify "$cand" >/dev/null 2>&1; then echo "$cand"; return; fi
  done
  echo "$CDX_BASE"
}

# --- cdx-review : one-pass review of the current branch -------------------
# Usage: cdx-review [base-branch] [extra prompt...]
cdx-review() {
  local base; base=$(_cdx_resolve_base "$1"); shift 2>/dev/null
  local extra="$*"
  echo "==> Reviewing vs $base"
  codex review $(_cdx_model_args) --base "$base" \
    "${extra:-Review the diff for correctness, design, security, and missing tests. Be specific about file:line.}"
}

# --- cdx-ship : multi-round escalating review (mirrors /spartan:ship-pr) --
# Usage: cdx-ship [rounds=2] [base-branch]
cdx-ship() {
  local rounds=${1:-2}
  local base; base=$(_cdx_resolve_base "$2")
  if ! [[ "$rounds" =~ ^[0-9]+$ ]] || (( rounds < 1 )); then
    echo "Usage: cdx-ship [rounds>=1] [base-branch]" >&2; return 1
  fi
  echo "==> ship-pr: $rounds round(s) vs $base"
  for i in $(seq 1 "$rounds"); do
    echo
    echo "================ Round $i / $rounds ================"
    local stance
    case "$i" in
      1) stance="Pass 1: surface review. Catch obvious bugs, missing tests, broken contracts." ;;
      2) stance="Pass 2: harder. Question every assumption pass 1 made. Find what was waved through. Look for race conditions, N+1, error swallowing, missing edge cases." ;;
      *) stance="Pass $i: brutal. Assume every previous pass missed real issues. Find them. Reject anything that smells like AI-generic code, premature abstraction, or untested branches." ;;
    esac
    codex review $(_cdx_model_args) --base "$base" \
      "$stance Each finding must be actionable with file:line and the specific fix."
  done
}

# --- cdx-security : security-focused review --------------------------------
# Usage: cdx-security [base-branch]
cdx-security() {
  local base; base=$(_cdx_resolve_base "$1")
  echo "==> Security review vs $base"
  codex review $(_cdx_model_args) --base "$base" \
    "Security audit only. Check: input validation, authn/authz, SQL/command injection, SSRF, secrets in code, unsafe deserialization, missing rate limits, IDOR, weak crypto, log injection, OWASP top 10. Ignore style and non-security bugs. Rate severity (critical/high/medium) and give the exact fix."
}

# --- cdx-uncommitted : review what's in the worktree, not yet committed ----
cdx-uncommitted() {
  local extra="$*"
  echo "==> Reviewing uncommitted changes"
  codex review $(_cdx_model_args) --uncommitted \
    "${extra:-Review staged, unstaged, and untracked changes. Catch issues before commit.}"
}

# --- cdx-commit : review a single commit -----------------------------------
# Usage: cdx-commit <sha>
cdx-commit() {
  local sha="$1"
  if [[ -z "$sha" ]]; then echo "Usage: cdx-commit <sha>" >&2; return 1; fi
  shift
  codex review $(_cdx_model_args) --commit "$sha" "$@"
}

# --- cdx-yolo : Codex with no approvals & no sandbox -----------------------
# Equivalent of Claude's --dangerously-skip-permissions. Use with care.
cdx-yolo() {
  codex --dangerously-bypass-approvals-and-sandbox $(_cdx_model_args) "$@"
}

# --- cdx-help : list these helpers -----------------------------------------
cdx-help() {
  cat <<'EOF'
Codex helpers (override defaults: CDX_BASE=main CDX_MODEL=gpt-5.1)

  cdx-review [base] [prompt...]    One-pass review of current branch vs base
  cdx-ship   [rounds] [base]       Multi-round escalating review (default 2)
  cdx-security [base]              Security-only audit
  cdx-uncommitted [prompt...]      Review staged + unstaged + untracked
  cdx-commit <sha> [prompt...]     Review a single commit
  cdx-yolo   [prompt...]           Codex with no approvals & no sandbox
  cdx-help                         This message
EOF
}
