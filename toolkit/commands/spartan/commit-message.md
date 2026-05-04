---
name: spartan:commit-message
description: Create a commit message and PR description by analyzing git diffs, then chain into /spartan:ship-pr (defaults to --rounds 2). Use when the user has staged changes and asks to commit, requests a commit message, or wants to push and open a PR with Copilot review in one step.
allowed-tools: Bash(git status:*), Bash(git diff --staged), Bash(git diff:*), Bash(git log:*), Bash(git commit:*), Bash(git add:*), Bash(git push:*), Skill
---

## Run these commands first:

```bash
git status
git diff --staged
git log --oneline -5
git branch --show-current
```

## Your task:

Analyze the staged git changes and create a commit message with PR description.

### Step 1: Extract ticket from branch name
The branch name follows pattern: `lbf-XXXX-description` or `feature/lbf-XXXX-description`
Extract the ticket number (e.g., LBF-1647) to use as prefix. Convert to uppercase (LBF-XXXX).

### Step 2: Determine if this is the first commit on the branch
- Run `git log dev..HEAD --oneline` to see existing commits on this branch vs the base branch (dev)
- If no commits exist (empty output): Use FULL PR template in commit body
- If commits exist: Use SHORT format (just the change summary)

### Commit types with emojis:

- ✨ `feat:` - New feature
- 🐛 `fix:` - Bug fix
- 🔨 `refactor:` - Refactoring code
- 📝 `docs:` - Documentation
- 🎨 `style:` - Styling/formatting
- ✅ `test:` - Tests
- ⚡ `perf:` - Performance
- 🔒 `security:` - Security fix
- 📗 `deps:` - Dependency update

## Commit message format:

### First commit on branch (FULL format):
```
[TICKET-ID] <emoji> <type>: <concise_description>

## Summary

### Why
<Clearly define the issue or problem that your changes address.>

### What
<High-level overview of what has been modified, added, or removed.>

### Solution
<Architectural or design decisions made while implementing.>

## Impact Area
<Impacted features - helps QA and Release Manager.>

## Types of Changes
- [ ] ❌ Breaking change
- [ ] 🚀 New feature
- [ ] 🕷 Bug fix
- [ ] 👏 Performance optimization
- [ ] 🛠 Refactor
- [ ] 📗 Library update
- [ ] 📝 Documentation
- [ ] ✅ Test
- [ ] 🔒 Security awareness

## Test Plan
<Steps to test this PR.>

## Checklist:
- [ ] I have performed a self-review of my own code
- [ ] I have tested that the feature or bug fix works as expected
- [ ] I have included helpful comments, particularly in hard-to-understand areas
- [ ] I have added tests that prove my changes are functioning
- [ ] New and existing unit tests pass locally with my changes

## Related Issues
<Reference tickets and conversations.>
```

### Subsequent commits (SHORT format):
```
[TICKET-ID] <emoji> <type>: <concise_description>

<Brief summary of changes in 2-3 lines>
```

**Do NOT add `Co-Authored-By` lines or any AI/bot attribution (Claude, Anthropic, "Generated with", etc.) in either format. Commit metadata is for the human author only.**

## Workflow:

1. Run `git add .` to stage all changes
2. Show summary of staged changes (files modified, lines added/removed)
3. Propose the commit message based on whether it's first or subsequent commit
4. **WAIT for user confirmation** - DO NOT auto-commit
5. If user confirms, run `git commit` with the message using HEREDOC format:
   ```bash
   git commit -m "$(cat <<'EOF'
   <commit message here>
   EOF
   )"
   ```
6. Then run `git push -u origin <branch-name>`
7. **Chain into `/spartan:ship-pr` automatically** to create the PR (if missing), request Copilot review, address feedback, and resolve threads. Invoke the skill via the `Skill` tool with name `spartan:ship-pr` and args `--rounds 2` (the default for this chain — most PRs need one round of fixes plus a clean second-pass to confirm Copilot is satisfied; one round alone often misses regressions in the fix itself). The user opted in to the chain by invoking `/spartan:commit-message` — they don't need to confirm again.
   - If the user passed an explicit rounds count to `/spartan:commit-message` (e.g. `--rounds 1` or `--rounds 3`), forward that value to `/spartan:ship-pr` instead of the default 2.
   - If `/spartan:ship-pr` is not installed in this project, skip step 7 and report the pushed branch URL directly so the user can create the PR via the GitHub UI.

**CRITICAL: Always wait for explicit user approval before committing and pushing.** Step 7 (the ship-pr chain) runs only AFTER the commit and push in steps 5–6 succeed.
