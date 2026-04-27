---
name: spartan:ship-pr
description: Push branch, request Copilot review, wait for it, and address comments interactively
argument-hint: "[pr-number-or-url] [--yolo] [--no-request]"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Monitor
---

# /ship-pr — Auto Copilot Review Loop

Args: $ARGUMENTS

You are running the `/ship-pr` workflow for the user's current branch.

## Modes

- **Default (act-then-report):** for each Copilot comment, print a one-line summary so the user can follow along, then apply clearly-valid fixes immediately (factual bugs, undefined variables, broken claims, obvious logic flaws, missing null handling). Only stop and prompt — `apply | edit <instructions> | reject <reason> | skip | quit` — when a comment is genuinely ambiguous, requires architectural judgment, would change behavior the user might want differently, or is wrong / noise. See Step 5 for the full decision rule.
- **`--yolo` in args:** apply every comment without ever prompting, including the ambiguous ones; still summarize at the end.
- **`--no-request` in args:** skip Step 2's API attempt entirely. The user has already requested Copilot via the GitHub UI (or will). Go straight to the wait step.

If the user passes a PR number or URL as an argument, target that PR. Otherwise target the PR for the current branch (or create one).

---

## Step 1 — Locate / create the PR

1. `git rev-parse --abbrev-ref HEAD` → current branch.
2. `git status --short` → if dirty with unrelated changes, ask the user to stash or commit before continuing. Stop until they confirm.
3. Resolve PR:
   - If args contain a PR number/URL, parse it.
   - Else: `gh pr view --json number,url,headRefName` (let stderr stay separate; check exit code so JSON parsing stays reliable).
   - If no PR: ask "No PR for this branch. Push and create one?"
     - On yes: `git push -u origin <branch>`, then resolve the default branch and create the PR. Fall back to `master` / `main` when `origin/HEAD` isn't set locally so `gh pr create` doesn't fail with an empty `--base`:
       ```bash
       git fetch origin --quiet
       DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
       if [ -z "$DEFAULT_BRANCH" ]; then
         if git show-ref --quiet refs/remotes/origin/master; then
           DEFAULT_BRANCH=master
         else
           DEFAULT_BRANCH=main
         fi
       fi
       gh pr create --fill --base "$DEFAULT_BRANCH" --draft=false
       ```
       (Mirrors the pattern in `.claude/commands/spartan/pr-ready.md:30-33`.)
4. Capture `OWNER`, `REPO`, `PR`. Query owner and repo as separate fields so later `gh api "repos/$OWNER/$REPO/..."` calls receive distinct values (`nameWithOwner` returns the combined `owner/repo` string and won't work in those URL paths):
   ```bash
   OWNER=$(gh repo view --json owner -q .owner.login)
   REPO=$(gh repo view --json name -q .name)
   ```

---

## Step 2 — Request Copilot review

First, surface which account is making the request (so the user can sanity-check before any UI fallback):

```bash
gh auth status 2>&1 | grep -E "Logged in to github\.com|account"
```

Capture the request timestamp before doing anything else:

```bash
REQUESTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```

### Branch on flags

**If args contain `--no-request`:** skip the API attempt entirely. Tell the user:

> "Skipping API request. Please request Copilot via the GitHub UI on <PR_URL> if you haven't already. Press Enter when the request is in flight."

Wait for the user, then jump to Step 3.

**Otherwise (default):** the request always goes through the user's gh credentials — there is no separate "org credential" path on GitHub's side. The "Copilot from the organization" vs user fallback that the workflow advertises is a property of the *target repo*, not of how we authenticate:

- If the org/repo has **GitHub Copilot Code Review enabled** at the org or repo level, the request to add `copilot-pull-request-reviewer` succeeds and the org-managed bot reviews the PR. This is the "Copilot from the organization" path.
- If the org hasn't enabled it (or the user isn't a member of one with it enabled), both attempts below return 422 / 403 / "not a collaborator", and we drop to the manual UI fallback. This is the "credential from the user" path — the user is on their own to request via the browser, on a personal-Copilot account if they have one.

Try two paths in order before falling back to manual:

**Attempt 1 — `gh pr edit` (preferred):** uses gh's GraphQL `requestReviews` mutation under the hood, which handles the Copilot bot more reliably than the raw REST endpoint.

```bash
gh pr edit "$PR" --add-reviewer copilot-pull-request-reviewer 2>&1
```

**Attempt 2 — REST API (fallback if Attempt 1 fails):**

```bash
gh api "repos/$OWNER/$REPO/pulls/$PR/requested_reviewers" \
  -X POST -f 'reviewers[]=copilot-pull-request-reviewer' 2>&1
```

#### On success (either attempt)
Tell the user: "Copilot review requested at $REQUESTED_AT (via <gh-cli|REST>). Waiting (typically 1–5 min)…" then go to Step 3.

#### On failure of BOTH attempts

The same backend endpoint powers the UI's "Request Copilot review" button — if both gh paths above are rejected (422, 403, "not a collaborator", "user not found"), clicking the button in the browser will hit the same authorization check and almost always fail too. The common root causes are: (a) Copilot Code Review not enabled at the org/repo level, (b) the user's gh token is missing the `repo` scope (run `gh auth refresh -s repo`), (c) the user lacks write/triage permission on the repo.

Print the verbatim error from both attempts so the user can see what GitHub said, then offer the browser fallback as a last resort:

1. Open the PR in their browser:
   ```bash
   gh pr view "$PR" --web
   ```
2. Tell the user:

   > "Both `gh pr edit` and the REST API rejected the Copilot reviewer request. The browser button uses the same endpoint and will likely also fail — but I've opened the PR so you can confirm. If it works, hit Enter; if not, you'll need to either (a) ask the org/repo admin to enable Copilot Code Review, or (b) re-run `gh auth refresh -s repo`. Press Enter when the request is in flight, or type 'skip' to abort."

3. After Enter, **refresh** `REQUESTED_AT` to the current UTC time (so the wait loop catches only the just-triggered review).

4. Then go to Step 3.

Either path lands at Step 3 with a fresh `REQUESTED_AT` and a request in flight.

---

## Step 3 — Wait for the review to land

Run an until-loop **in the background** (via `Bash` with `run_in_background: true`) so you get a single completion notification when it lands — don't poll in the foreground. The loop exits when a non-pending review from the Copilot bot exists, submitted at or after `REQUESTED_AT`. Bake the 10-minute timeout into the script so the background task itself enforces it:

```bash
ELAPSED=0
ERR_LOG=$(mktemp)
while true; do
  # Stream items (no array wrapper) so --paginate doesn't emit one array per page.
  # The output is the .id of any matching review (one per line); empty = no match.
  RESULT=$(gh api "repos/$OWNER/$REPO/pulls/$PR/reviews" --paginate \
    --jq ".[] | select(.user.type==\"Bot\") | select(.user.login | ascii_downcase | contains(\"copilot\")) | select(.state!=\"PENDING\") | select(.submitted_at >= \"$REQUESTED_AT\") | .id" \
    2>"$ERR_LOG")
  EXIT=$?
  if [ "$EXIT" -ne 0 ]; then
    echo "GH_API_ERROR (exit $EXIT):"
    cat "$ERR_LOG"
    rm -f "$ERR_LOG"
    exit 2
  fi
  if [ -n "$RESULT" ]; then
    rm -f "$ERR_LOG"
    echo "REVIEW_LANDED"
    exit 0
  fi
  if [ "$ELAPSED" -ge 600 ]; then
    rm -f "$ERR_LOG"
    echo "TIMEOUT_10MIN"
    exit 1
  fi
  sleep 60
  ELAPSED=$((ELAPSED + 60))
done
```

- When the background task returns `TIMEOUT_10MIN`, ask the user whether to keep waiting, abort, or fall back to fetching whatever's already there.
- When it returns `GH_API_ERROR`, surface the captured stderr to the user and stop — this means auth/scope/network is broken (e.g. expired token, missing `repo` scope, transient 5xx). Don't retry blindly; ask the user to fix the cause (often `gh auth refresh -s repo`) and re-run.
- While the background task runs, do NOT poll the API yourself — wait for the completion notification.

---

## Step 4 — Fetch Copilot's feedback

Inline review comments (file/line specific). Two important constraints in the jq filter:

1. **Filter by `created_at >= $REQUESTED_AT`** — the comments endpoint returns *every* inline comment ever made on the PR, including ones Copilot already filed in earlier review rounds. Without this filter, round 2+ re-processes resolved round-1 comments. The timestamp captured in Step 2 is the cut-off for "this round's feedback".
2. **No `[...]` wrapper** — `gh api --paginate` runs the filter once per page, so an array wrapper would emit one array per page (breaking any downstream group/sort). Streaming items emits one object per line across pages; pipe to `jq -s` to consolidate into a single array:

```bash
gh api "repos/$OWNER/$REPO/pulls/$PR/comments" --paginate \
  --jq ".[] | select(.user.type==\"Bot\") | select(.user.login | ascii_downcase | contains(\"copilot\")) | select(.created_at >= \"$REQUESTED_AT\") | {id, path, line, original_line, position, body, commit_id}" \
  | jq -s '.'
```

Note: `line` is null when the comment is on a part of the diff that's been outdated by subsequent commits. Use `original_line` as a fallback (Step 5 handles this).

Top-level review summary (overall comments / approval state) — same pagination pattern:
```bash
gh api "repos/$OWNER/$REPO/pulls/$PR/reviews" --paginate \
  --jq '.[] | select(.user.type=="Bot") | select(.user.login | ascii_downcase | contains("copilot")) | select(.submitted_at >= "'$REQUESTED_AT'") | {id, state, body}' \
  | jq -s '.'
```

Group inline comments by file path; sort by line. Print: "Copilot left N inline comments. Summary: <…first 200 chars…>"

---

## Step 5 — Address comments

Track a list of `{id, path, line, status, fix_summary}` where:
- `status` ∈ `applied | skipped | rejected | edited`
- `fix_summary` is a one-to-three sentence description of WHAT changed and (briefly) WHY it matches the comment — used verbatim in the Step 7 reply, so write it to be reader-friendly. Reference specific symbols, file paths, or line numbers when it helps.

For each inline comment, in order:

1. Read the file ±10 lines around `line` for context. If `line` is null (comment on outdated diff hunk), fall back to `original_line`. If both are null, skip the file-context preview and surface the comment to the user as-is.
2. Decide: actionable, valid-but-low-value, or wrong / noise.
3. **`--yolo` mode:** apply your fix immediately using the `Edit` tool. Record `applied` with the `fix_summary`.
4. **Default mode (act-then-report, not ask-per-comment):**
   - Print `[N/total] path:line — <one-line comment summary>` so the user follows along.
   - **If the fix is clearly valid** (factual bug, undefined variable, broken claim, obvious logic flaw, missing null handling, etc.): apply the `Edit` immediately, print the diff, record `applied` with `fix_summary`. Do NOT prompt — this is the common case.
   - **Only stop and prompt** when the comment is genuinely ambiguous, requires architectural judgment, would change behavior the user might want differently, or is wrong/noise. Then offer: `apply | edit <instructions> | reject <reason> | skip | quit`.
   - On `quit` → stop the loop, jump to step 6 with what's done.

Do not address the same comment ID twice.

For the top-level summary review body, summarize it for the user but don't auto-act on it — those are usually high-level thoughts, not file edits.

---

## Step 6 — Commit and push

```bash
git status --short
```

- If files changed:
  - `git add <specific paths>` (NEVER `git add .` or `-A`)
  - `git commit -m "address Copilot review feedback"` (one bundled commit unless the user asked for per-comment commits)
  - `git push`
- If nothing changed (everything skipped/rejected), tell the user and skip the push.

Capture the new commit SHA (`git rev-parse HEAD`) for the next step.

---

## Step 7 — Reply on threads (auto, no prompt)

Post replies automatically — do NOT ask for permission. The user has been opted in by invoking `/ship-pr`.

### Reply format

Each reply must be a self-contained explanation of the change, not just a SHA pointer. Pattern:

> `Fixed in <SHA> — <what was changed in 1 sentence>. <optional second sentence: subtle implementation detail, secondary refactor, or why this matches the comment>.`

- Lead with `Fixed in <SHA>` (or `Won't fix —` for rejects).
- Reference specific symbols, types, file paths, or line numbers when relevant (use backticks).
- Stay concise — usually 1–3 sentences. Match the tone of past replies on this repo (e.g. PR #402's threads).
- Use the `fix_summary` you tracked in Step 5; if it's too short or vague, expand it before posting.

### Posting

For each `applied` comment, and for each `edited` comment (the user-customized variant of `applied` — the change still landed in `$SHA`, the only difference is the user redirected the diff):
```bash
gh api "repos/$OWNER/$REPO/pulls/$PR/comments/$id/replies" \
  -X POST -f body="Fixed in $SHA — <fix_summary>"
```

For each `rejected` comment, lead with the user's reason:
```bash
gh api "repos/$OWNER/$REPO/pulls/$PR/comments/$id/replies" \
  -X POST -f body="Won't fix — <reason from user>"
```

Skip `skipped` ones — leave the thread open.

### Resolve threads after replying

Posting a reply does **not** close the thread — the next Copilot round will see it as open and may re-flag the same code. After all replies are posted, resolve every thread that got an `applied` / `edited` / `rejected` reply via the GraphQL `resolveReviewThread` mutation. The mutation takes a thread node ID (not the inline-comment numeric ID), so build a `comment_id → thread_id` map first.

```bash
# 1. Fetch all unresolved review threads, mapping the root comment's databaseId → thread node ID.
THREAD_MAP=$(gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 1) { nodes { databaseId } }
          }
        }
      }
    }
  }
' -f owner="$OWNER" -f repo="$REPO" -F number="$PR" \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[]
        | select(.isResolved | not)
        | "\(.comments.nodes[0].databaseId) \(.id)"')

# 2. For every $id we replied to (applied | edited | rejected), look up its thread and resolve it.
for id in "${REPLIED_IDS[@]}"; do
  THREAD_ID=$(echo "$THREAD_MAP" | awk -v id="$id" '$1 == id { print $2 }')
  if [ -n "$THREAD_ID" ]; then
    gh api graphql -f query='
      mutation($threadId: ID!) {
        resolveReviewThread(input: {threadId: $threadId}) {
          thread { id isResolved }
        }
      }
    ' -f threadId="$THREAD_ID" --jq '.data.resolveReviewThread.thread.isResolved' >/dev/null
  fi
done
```

Skip resolving for `skipped` comments — they stay open by design (the user wanted to revisit). The combination of "filter by `created_at` in Step 4" + "resolve here" is what keeps round N+1 from re-processing comments addressed in round N: round N's threads end up resolved, and round N+1's `created_at` cut-off only matches genuinely new feedback.

### Examples (good vs bad)

| Bad (too thin)                    | Good (detailed)                                                                                                                                                                                                |
|-----------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `Addressed in abc1234`            | `Fixed in abc1234 — error handler now extracts only status/code/message from the axios error before logging. The raw error (and its config carrying the Authorization header) is no longer passed to console.warn.` |
| `Done`                            | `Fixed in abc1234 — \`fieldNames\` is now sorted alphabetically before mapping. The diff table will render in stable order regardless of JSON field iteration order in the audit row.`                          |

---

## Step 8 — Wrap up

Print:
- ✅ Applied: N
- ⏭ Skipped: N (the user may want to revisit)
- ❌ Rejected as noise: N — with the one-line reason per comment
- Commit pushed: `<sha>`
- PR: `<url>`

Then exit.

---

## Guardrails

- Never `git push --force` or `--force-with-lease` unless the user explicitly types it.
- Never merge the PR — that's the user's call.
- Never skip git hooks (`--no-verify`).
- Refuse to run if the working tree has unrelated dirty changes; ask the user first.
- Don't hardcode `main` or `dev` as the PR base — detect the default branch from `origin/HEAD` (see Step 1).
- If `gh` isn't authenticated, run `gh auth status` and tell the user to `gh auth login` themselves (don't try to do it for them — interactive auth).
