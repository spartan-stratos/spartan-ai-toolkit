---
name: spartan:ship-pr-codex
description: Push branch, create or locate the PR, run Codex review rounds, post inline GitHub review comments from the authenticated gh account, apply clear fixes, reply/resolve fixed threads, commit, and push back to the PR.
argument-hint: "[pr-number-or-url] [--rounds N] [--yolo] [--no-comment] [--no-inline-comments]"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# /spartan:ship-pr-codex - Auto Codex Review Loop

Args: $ARGUMENTS

You are running the `/spartan:ship-pr-codex` workflow for the user's current branch.

This command is the Codex equivalent of `/ship-pr`: it makes sure the branch is on GitHub with a PR, asks Codex to review the whole PR diff, posts accepted findings as inline GitHub review comments from the authenticated `gh` account, applies clearly-valid fixes, replies to each fixed comment with the fix commit, resolves the thread, commits and pushes those fixes to the same PR branch, and optionally loops for additional review rounds.

## Modes

- **Default:** apply clearly-valid Codex findings immediately. Prompt only when a finding is ambiguous, changes product behavior, requires architectural judgment, or looks wrong.
- **`--yolo` in args:** apply every actionable Codex finding without prompting. Still skip findings that cannot be mapped to a file or have no concrete fix.
- **`--rounds N` in args:** run up to N Codex review rounds. Default `2`, max `3`. Stop early if a round produces no applied fixes.
- **`--no-comment` in args:** skip the final `gh pr comment` summary. Commits are still pushed to the PR branch.
- **`--no-inline-comments` in args:** do not create per-finding inline GitHub review comments. The workflow still prints/applies Codex findings and can post the final summary unless `--no-comment` is also present.

If the user passes a PR number or URL, target that PR. Otherwise target the PR for the current branch, creating one if needed.

Inline review comments are authored by the currently authenticated GitHub CLI user, not by Copilot or a bot. Verify the actor before posting:

```bash
GH_LOGIN=$(gh api user -q .login)
echo "GitHub review comments will be posted as @$GH_LOGIN."
```

---

## Step 1 - Pre-flight

Verify required CLIs:

```bash
command -v gh >/dev/null || { echo "GitHub CLI not found. Install gh or run without PR automation."; exit 1; }
command -v codex >/dev/null || { echo "Codex CLI not found. Install: brew install codex"; exit 1; }
command -v jq >/dev/null || { echo "jq not found. Install jq so PR metadata can be parsed safely."; exit 1; }
gh auth status -h github.com >/dev/null || { echo "GitHub CLI is not authenticated. Run: gh auth login"; exit 1; }
GH_LOGIN=$(gh api user -q .login)
echo "GitHub review comments will be posted as @$GH_LOGIN."
```

Inspect the branch and worktree:

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git status --short
```

If the tree is dirty before review starts, stop and ask the user to commit, stash, or confirm the dirty files are part of this PR. Do not mix unrelated local edits into the Codex feedback commit.

Resolve the default base branch:

```bash
git fetch origin --quiet
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
if [ -z "$DEFAULT_BRANCH" ]; then
  if git show-ref --quiet refs/remotes/origin/master; then
    DEFAULT_BRANCH=master
  elif git show-ref --quiet refs/remotes/origin/main; then
    DEFAULT_BRANCH=main
  elif git show-ref --quiet refs/remotes/origin/dev; then
    DEFAULT_BRANCH=dev
  else
    DEFAULT_BRANCH=master
  fi
fi
```

---

## Step 2 - Locate or Create the PR

1. If args contain a PR number or URL, parse it into `PR`.
2. Otherwise run:
   ```bash
   gh pr view --json number,url,headRefName,baseRefName 2>/tmp/ship-pr-codex-pr-view.err
   ```
3. If no PR exists for the current branch:
   ```bash
   git push -u origin "$BRANCH"
   gh pr create --fill --base "$DEFAULT_BRANCH" --draft=false
   gh pr view --json number,url,headRefName,baseRefName,headRefOid
   ```
4. Capture repo metadata:
   ```bash
   OWNER=$(gh repo view --json owner -q .owner.login)
   REPO=$(gh repo view --json name -q .name)
   PR_JSON=$(gh pr view "${PR:-}" --json number,url,headRefName,baseRefName,headRefOid)
   PR=$(echo "$PR_JSON" | jq -r .number)
   PR_URL=$(echo "$PR_JSON" | jq -r .url)
   HEAD_BRANCH=$(echo "$PR_JSON" | jq -r .headRefName)
   HEAD_SHA=$(echo "$PR_JSON" | jq -r .headRefOid)
   BASE=$(echo "$PR_JSON" | jq -r '.baseRefName // empty')
   [ -z "$BASE" ] && BASE="$DEFAULT_BRANCH"
   ```

5. Ensure GitHub's PR head matches the local commit you are about to review and comment on:
   ```bash
   LOCAL_HEAD=$(git rev-parse HEAD)
   if [ "$LOCAL_HEAD" != "$HEAD_SHA" ]; then
     if [ "$BRANCH" != "$HEAD_BRANCH" ]; then
       echo "Local HEAD is not pushed to PR #$PR, and current branch '$BRANCH' is not the PR head '$HEAD_BRANCH'. Check out the PR branch before commenting."
       exit 1
     fi
     git push origin "$BRANCH"
     PR_JSON=$(gh pr view "$PR" --json number,url,headRefName,baseRefName,headRefOid)
     HEAD_SHA=$(echo "$PR_JSON" | jq -r .headRefOid)
     [ "$(git rev-parse HEAD)" = "$HEAD_SHA" ] || { echo "PR head still differs from local HEAD after push."; exit 1; }
   fi
   ```

Tell the user: `"Running Codex review for PR #$PR against $BASE."`

---

## Step 3 - Parse Rounds

```bash
ROUNDS=2
if [[ "$ARGUMENTS" =~ --rounds[[:space:]]+([0-9]+) ]]; then
  ROUNDS="${BASH_REMATCH[1]}"
fi
if [ "$ROUNDS" -lt 1 ]; then
  echo "Error: --rounds must be >= 1"
  exit 1
fi
if [ "$ROUNDS" -gt 3 ]; then
  echo "Capping --rounds at 3."
  ROUNDS=3
fi
```

Initialize:

```bash
ROUND=1
TOTAL_APPLIED=0
TOTAL_SKIPPED=0
TOTAL_REJECTED=0
declare -a ROUND_LOG
declare -a COMMITS
declare -a REVIEW_FILES
declare -a REVIEW_COMMENT_IDS
declare -a REVIEW_COMMENT_SUMMARIES
declare -a REVIEW_COMMENT_STATUSES
INLINE_COMMENTS=1
[[ "$ARGUMENTS" == *"--no-inline-comments"* ]] && INLINE_COMMENTS=0
```

---

## Step 4 - Run Codex Review

For each round, run Codex against the full PR diff in read-only mode. Capture output to a temp file so you can apply fixes and later summarize the review on the PR.

```bash
APPLIED_THIS_ROUND=0
SKIPPED_THIS_ROUND=0
REJECTED_THIS_ROUND=0
SHA=""
REVIEW_FILE=$(mktemp "/tmp/ship-pr-codex-round-${ROUND}.XXXXXX.md")
REVIEW_FILES+=("$REVIEW_FILE")

case "$ROUND" in
  1) STANCE="Pass 1: surface review. Find obvious bugs, broken contracts, missing tests, null handling gaps, and regressions." ;;
  2) STANCE="Pass 2: harder. Question pass 1 assumptions. Look for race conditions, N+1 queries, error swallowing, edge cases, authorization gaps, and test holes." ;;
  *) STANCE="Pass $ROUND: strict final pass. Assume previous passes missed real issues. Reject vague findings and focus on defects that would matter in production." ;;
esac

set -o pipefail
codex --ask-for-approval never --sandbox read-only review --base "origin/$BASE" \
  "Review every change in the current branch against base 'origin/$BASE', like a full PR review for PR #$PR. Start by inspecting 'git diff origin/$BASE...HEAD --stat' and then inspect the full diff with file context. Do not edit files. Do not review unrelated working-tree noise. $STANCE Return compact actionable findings only. One finding per line: path:line: severity: problem. fix. Use severity bug|risk|nit|question. Add one optional comment: line after a finding only when the GitHub inline body needs different wording. Do not mention Copilot. If there are no actionable findings, say exactly: NO_ACTIONABLE_FINDINGS." \
  | tee "$REVIEW_FILE"
CODEX_STATUS=${PIPESTATUS[0]}
if [ "$CODEX_STATUS" -ne 0 ]; then
  echo "Codex review failed; see $REVIEW_FILE"
  exit "$CODEX_STATUS"
fi
```

If Codex exits non-zero, stop and surface the captured output. Do not invent findings.

---

## Step 5 - Apply Findings

Read the Codex output. Treat it like a code review:

1. If the output contains `NO_ACTIONABLE_FINDINGS` and no concrete findings, record zero applied fixes and jump to Step 7.
2. For each finding, inspect the referenced file and line with local context.
3. Apply fixes immediately when the finding is clearly valid:
   - factual bug
   - undefined symbol or type mismatch
   - broken null/error handling
   - stale/incorrect test expectation
   - missing guard around a code path the diff introduced
   - low-risk documentation or command correction
4. In default mode, prompt only for findings that are ambiguous, product-sensitive, architectural, or probably wrong. Valid responses: `apply`, `edit <instructions>`, `reject <reason>`, `skip`, `quit`.
5. In `--yolo` mode, apply every actionable finding without prompting. If the finding is not concrete enough to implement safely, skip it and record why.

Track per finding:

- `status`: `applied`, `edited`, `skipped`, or `rejected`
- `fix_summary`: one concise sentence explaining the change or the reason it was skipped/rejected
- `FINDING_PATH`: affected repo-relative file path, if any
- `line`: affected line number in the PR diff, if any
- `comment_id`: GitHub pull request review comment ID, if an inline comment was posted

Update `APPLIED_THIS_ROUND`, `SKIPPED_THIS_ROUND`, and `REJECTED_THIS_ROUND` as you work through findings. Count `edited` as applied.

Do not address the same finding twice in a later round unless Codex raises a new, distinct issue after the fix commit.

## Step 5A - Post Inline Review Comments

For each finding that you judge valid enough to apply, post one inline GitHub review comment before editing the file, unless `--no-inline-comments` was passed.

Use the authenticated `gh` user. The comment body should read like a first-party Codex review note and must not say "Copilot" or "AI". Keep it focused on the defect and the requested fix, for example:

```text
Codex review: `window.scrollTo({ behavior: 'instant' })` relies on a non-standard ScrollBehavior value. In browsers that only support `auto` or `smooth`, this can fall back unexpectedly when global smooth scrolling is enabled. Please temporarily set `document.documentElement.style.scrollBehavior = 'auto'`, call `window.scrollTo({ top: 0, behavior: 'auto' })`, and restore the previous value on the next frame.
```

Create the inline comment against the current PR head SHA:

```bash
COMMENT_BODY="Codex review: <finding and exact requested fix>"
COMMENT_PATH="$FINDING_PATH"
COMMENT_LINE="$LINE"

if [ "$INLINE_COMMENTS" -eq 1 ] && [ -n "$COMMENT_PATH" ] && [[ "$COMMENT_LINE" =~ ^[0-9]+$ ]]; then
  COMMENT_JSON=$(jq -n \
    --arg body "$COMMENT_BODY" \
    --arg commit_id "$HEAD_SHA" \
    --arg path "$COMMENT_PATH" \
    --argjson line "$COMMENT_LINE" \
    '{body: $body, commit_id: $commit_id, path: $path, line: $line, side: "RIGHT"}')

  COMMENT_POST_ERR=$(mktemp "/tmp/ship-pr-codex-comment-error.XXXXXX")
  if COMMENT_RESPONSE=$(gh api \
      -X POST \
      "repos/$OWNER/$REPO/pulls/$PR/comments" \
      --input - <<<"$COMMENT_JSON" 2>"$COMMENT_POST_ERR"); then
    COMMENT_ID=$(echo "$COMMENT_RESPONSE" | jq -r .id)
    if [ -n "$COMMENT_ID" ] && [ "$COMMENT_ID" != "null" ]; then
      REVIEW_COMMENT_IDS+=("$COMMENT_ID")
      REVIEW_COMMENT_SUMMARIES+=("$FIX_SUMMARY")
      REVIEW_COMMENT_STATUSES+=("pending-fix")
    else
      echo "GitHub returned no review comment id for $COMMENT_PATH:$COMMENT_LINE; keeping finding for final summary."
    fi
  else
    echo "Could not post inline comment for $COMMENT_PATH:$COMMENT_LINE; keeping finding for final summary."
    sed 's/^/  /' "$COMMENT_POST_ERR"
  fi
else
  echo "Skipping inline comment for finding without a valid PR file path and line."
fi
```

If GitHub rejects the inline comment because the line is not part of the PR diff, do not force it onto the wrong line. Record the finding as applied without `comment_id` and include it in the final summary.

Keep arrays in lockstep only for comments with a real GitHub `COMMENT_ID`.

---

## Step 6 - Commit and Push Fixes

Check what changed:

```bash
git status --short
```

If files changed:

1. Stage only the files you edited for Codex review fixes. Do not use `git add .`.
2. Commit:
   ```bash
   git commit -m "fix(review): address Codex review feedback"
   ```
3. Push:
   ```bash
   git push
   ```
4. Capture the SHA:
   ```bash
   SHA=$(git rev-parse --short HEAD)
   HEAD_SHA=$(git rev-parse HEAD)
   COMMITS+=("$SHA")
   ```

If nothing changed, do not create an empty commit.

## Step 6A - Reply to Fixed Comments and Resolve Threads

After pushing a fix commit, reply to every inline comment fixed by that commit. Match the tone of this example, replacing the details with the actual fix:

```text
Fixed in a84dcbf — same fix as the matching thread on store-screenshots.tsx. Both pages now use the documentElement scrollBehavior override pattern for guaranteed snap-to-top regardless of browser support for the newer `instant` ScrollBehavior value.
```

Reply through the pull request review comment API:

```bash
for i in "${!REVIEW_COMMENT_IDS[@]}"; do
  COMMENT_ID="${REVIEW_COMMENT_IDS[$i]}"
  FIX_SUMMARY="${REVIEW_COMMENT_SUMMARIES[$i]}"
  [ "${REVIEW_COMMENT_STATUSES[$i]}" = "pending-fix" ] || continue
  [ -n "$COMMENT_ID" ] && [ "$COMMENT_ID" != "null" ] || continue

  REPLY_BODY="Fixed in $SHA — $FIX_SUMMARY"
  gh api \
    -X POST \
    "repos/$OWNER/$REPO/pulls/$PR/comments/$COMMENT_ID/replies" \
    -f body="$REPLY_BODY" >/dev/null
  REVIEW_COMMENT_STATUSES[$i]="replied-pending-resolve"
done
```

Then resolve the GitHub review thread. Resolve only threads created by this workflow and authored by `@$GH_LOGIN`; do not resolve comments from other reviewers unless the user explicitly asks.

Find the thread containing the review comment:

```bash
THREAD_QUERY='
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          comments(first: 50) {
            nodes {
              databaseId
              author { login }
            }
          }
        }
      }
    }
  }
}'

for i in "${!REVIEW_COMMENT_IDS[@]}"; do
  COMMENT_ID="${REVIEW_COMMENT_IDS[$i]}"
  [ "${REVIEW_COMMENT_STATUSES[$i]}" = "replied-pending-resolve" ] || continue
  [ -n "$COMMENT_ID" ] && [ "$COMMENT_ID" != "null" ] || continue

  THREAD_ID=$(gh api graphql \
    -f query="$THREAD_QUERY" \
    -f owner="$OWNER" \
    -f repo="$REPO" \
    -F pr="$PR" \
    | jq -r --argjson id "$COMMENT_ID" --arg login "$GH_LOGIN" '
        .data.repository.pullRequest.reviewThreads.nodes[]
        | select(.isResolved == false)
        | select(any(.comments.nodes[]; .databaseId == $id and .author.login == $login))
        | .id
      ' | head -n 1)

  if [ -n "$THREAD_ID" ]; then
    gh api graphql \
      -f query='mutation($threadId: ID!) { resolveReviewThread(input: { threadId: $threadId }) { thread { id isResolved } } }' \
      -f threadId="$THREAD_ID" >/dev/null
    REVIEW_COMMENT_STATUSES[$i]="replied-resolved"
  fi
done
```

Resolve it:

```bash
# Resolution happens inside the loop above so every workflow-created thread
# gets handled, not only the most recent comment.
```

If the PR has more than 100 review threads, page the GraphQL query before declaring the thread missing.

---

## Step 7 - Round Decision

Append a round log entry:

```bash
ROUND_LOG+=("Round $ROUND: $APPLIED_THIS_ROUND applied, $SKIPPED_THIS_ROUND skipped, $REJECTED_THIS_ROUND rejected${SHA:+ -> $SHA}")
TOTAL_APPLIED=$((TOTAL_APPLIED + APPLIED_THIS_ROUND))
TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED_THIS_ROUND))
TOTAL_REJECTED=$((TOTAL_REJECTED + REJECTED_THIS_ROUND))
```

Stop if:

1. `ROUND >= ROUNDS`
2. `APPLIED_THIS_ROUND == 0`
3. The user typed `quit`

Otherwise increment `ROUND` and go back to Step 4. The next Codex pass reviews the PR diff including the just-pushed review fix commit.

---

## Step 8 - PR Comment Summary

Unless args contain `--no-comment`, post one summary comment to the PR:

```bash
SUMMARY_FILE=$(mktemp "/tmp/ship-pr-codex-summary.XXXXXX.md")
{
  echo "## Codex review"
  echo
  echo "Ran $ROUND of $ROUNDS configured round(s) against \`$BASE\`."
  echo
  printf '%s\n' "${ROUND_LOG[@]}" | sed 's/^/- /'
  echo
  echo "Totals: $TOTAL_APPLIED applied, $TOTAL_SKIPPED skipped, $TOTAL_REJECTED rejected."
  if [ "${#COMMITS[@]}" -gt 0 ]; then
    echo
    echo "Review fix commit(s): ${COMMITS[*]}"
  fi
  if [ "${#REVIEW_COMMENT_IDS[@]}" -gt 0 ]; then
    echo
    echo "Inline comments posted as @$GH_LOGIN: ${#REVIEW_COMMENT_IDS[@]}"
  fi
} > "$SUMMARY_FILE"

gh pr comment "$PR" --body-file "$SUMMARY_FILE"
```

Keep the comment concise. Do not paste full Codex transcripts unless the user explicitly asks; the commits and local temp files are enough for traceability.

---

## Step 9 - Wrap Up

Print:

```text
Ran <rounds-used> of <rounds-configured> Codex review round(s).
<round log>
Commits: <shas or none>
PR: <url>
```

## Guardrails

- Never `git push --force` or `--force-with-lease` unless the user explicitly asks.
- Never merge the PR.
- Never skip git hooks.
- Never include unrelated dirty files in the review-fix commit.
- Keep Codex review scoped to `git diff origin/$BASE...HEAD`; do not ask it to review the whole repository outside the PR diff.
- Keep the Codex review pass read-only. Apply fixes yourself after reviewing Codex's findings.
