# Git Commit Rules

## CRITICAL: Always Ask Before Committing

**NEVER commit changes without explicit user permission.** This rule has no exceptions.

### Before Any Commit

1. **Check current branch** — If on `main` or `dev`, create a feature branch first
2. **Ask the user first** — "Should I commit these changes?"
3. **Wait for confirmation** — Do not proceed until the user says yes
4. **Use `/spartan:commit-message`** — Generate commit message following the PR template format

### Branch Creation (REQUIRED)

Before committing, check the current branch:
- If on `main` or `dev` → **Create a feature branch first**
- Branch naming: `<username>/<feature-slug>` or `fix/<issue-slug>`

```bash
# Check current branch
git branch --show-current

# If on main/dev, create and switch to feature branch
git checkout -b <username>/<feature-description>
```

### Commit Message Format (REQUIRED)

**Fill in ALL sections from the PR template.** Every commit message MUST include:

```
<emoji> <type>(<scope>): <short description>

## Why
<Clearly define the issue or problem that your changes address.
Describe what is currently not working as expected or what feature is missing.>

## What
<Provide a high-level overview of what has been modified, added, or removed.
This could include new features, bug fixes, refactoring efforts, or performance optimizations.>

## Solution
<Describe the architectural or design decisions you made while implementing the changes.
Explain the thought process behind your approach.>

## Impact Area
<List the impacted features: e.g., Admin Dashboard, Bounties, Contributor Portal, etc.>
```

**Do NOT add `Co-Authored-By` lines or any AI/bot attribution (Claude, Anthropic, "Generated with", etc.) to commit messages.** Commit metadata is for the human author only.

### Type Prefixes with Emoji

| Type | Emoji | Description |
|------|-------|-------------|
| `feat` | 🚀 | New feature |
| `fix` | 🐛 | Bug fix |
| `refactor` | 🛠 | Code refactoring |
| `perf` | 👏 | Performance optimization |
| `docs` | 📝 | Documentation |
| `test` | ✅ | Tests |
| `chore` | 📦 | Maintenance |
| `security` | 🔒 | Security changes |

### What NOT to Do

- ❌ Commit on `main` or `dev` directly — always create a feature branch
- ❌ Run `git commit` without asking user first
- ❌ Push changes without user confirmation
- ❌ Create PRs without user approval
- ❌ Skip any section of the commit message template
- ❌ Leave Why/What/Solution/Impact Area empty or vague

### Example Workflow

```
User: "Make this change..."
Claude: *makes the change*
Claude: *checks current branch*
Claude: "You're on dev. I'll create a feature branch first."
Claude: *creates branch: username/feature-description*
Claude: "I've made the changes. Would you like me to commit them?"
User: "Yes"
Claude: *generates full commit message with all sections filled*
Claude: "Here's the proposed commit message: ... Does this look good?"
User: "Yes, commit it"
Claude: *commits with the approved message*
```
