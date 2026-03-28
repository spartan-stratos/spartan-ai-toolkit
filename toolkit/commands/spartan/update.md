---
name: spartan:update
description: Check for updates and upgrade Spartan AI Toolkit to the latest version. Pulls from GitHub and re-runs the setup script automatically.
---

# Spartan Update

Check for new versions and upgrade the toolkit.

---

## Step 1: Read current version and repo path

```bash
LOCAL_VER=$(cat ~/.claude/.spartan-version 2>/dev/null || echo "unknown")
REPO_PATH=$(cat ~/.claude/.spartan-repo 2>/dev/null || echo "")
echo "Current version: $LOCAL_VER"
echo "Repo path: $REPO_PATH"
```

If `REPO_PATH` is empty or the directory doesn't exist, ask the user where they cloned `spartan-ai-toolkit`:
"I don't know where the Spartan repo is. Where did you clone it? (e.g., `~/spartan-ai-toolkit`)"

---

## Step 2: Check for updates

```bash
cd "$REPO_PATH" && git fetch origin main --quiet 2>/dev/null
REMOTE_VER=$(git show origin/main:toolkit/VERSION 2>/dev/null || echo "unknown")
echo "Local:  $LOCAL_VER"
echo "Remote: $REMOTE_VER"
```

If versions match: "You're on the latest version (v$LOCAL_VER). No update needed."

If versions differ or either is "unknown": proceed to Step 3.

---

## Step 3: Read current pack selection

```bash
SAVED_PACKS=$(cat ~/.claude/.spartan-packs 2>/dev/null | tr '\n' ',' | sed 's/,$//')
echo "Installed packs: $SAVED_PACKS"
```

Show the user their current packs and ask:
"You have these packs: $SAVED_PACKS. Want to keep the same packs, or change them?"

- Keep same → use `--packs=$SAVED_PACKS` flag
- Change → run without `--packs` flag (interactive menu)

---

## Step 4: Pull and reinstall

```bash
cd "$REPO_PATH" && git pull origin main
```

Then run the setup script with saved packs:

```bash
cd "$REPO_PATH/toolkit" && ./scripts/setup.sh --global --packs=$SAVED_PACKS
```

Or if user wants to change packs:

```bash
cd "$REPO_PATH/toolkit" && ./scripts/setup.sh --global
```

---

## Step 4.5: Generate config if missing

After the install finishes, check if `.spartan/config.yaml` exists:

```bash
ls .spartan/config.yaml 2>/dev/null || ls ~/.spartan/config.yaml 2>/dev/null
```

**If no config exists**, generate one from the installed packs:

1. Read the saved packs file:
```bash
cat ~/.claude/.spartan-packs 2>/dev/null || cat .claude/.spartan-packs 2>/dev/null
```

2. Pick the matching profile:
   - Has `backend-micronaut` → copy `toolkit/profiles/kotlin-micronaut.yaml`
   - Has `frontend-react` → copy `toolkit/profiles/react-nextjs.yaml`
   - Has `backend-nodejs` → copy `toolkit/profiles/typescript-node.yaml`
   - Has `backend-python` → copy `toolkit/profiles/python-fastapi.yaml`
   - None of the above → copy `toolkit/profiles/custom.yaml`

3. Copy the profile:
```bash
mkdir -p .spartan 2>/dev/null || mkdir -p ~/.spartan
cp "$REPO_PATH/toolkit/profiles/{profile}.yaml" .spartan/config.yaml 2>/dev/null || \
cp "$REPO_PATH/toolkit/profiles/{profile}.yaml" ~/.spartan/config.yaml
```

Tell the user: "Generated `.spartan/config.yaml` from {profile} profile. Edit it to customize rules and review stages."

**If config already exists**, skip this step.

---

## Step 5: Confirm

After setup completes, tell the user:
"Updated to Spartan v$REMOTE_VER. Restart Claude Code to pick up all changes."

**Never suggest `/gsd:*` commands to the user.** Always translate to `/spartan:*`.
