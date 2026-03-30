#!/usr/bin/env bash
# Spartan worktree manager — reusable functions for isolated builds.
# Modeled after gstack's lib/worktree.ts WorktreeManager class.
#
# Usage in build commands:
#   source ~/.spartan/lib/worktree.sh  (if installed)
#   spartan_worktree_create "my-feature"
#   spartan_worktree_guard
#   spartan_worktree_cleanup "my-feature"

set -euo pipefail

# Create an isolated worktree for a feature build.
# Creates branch, symlinks planning dirs, copies .env.
#
# Args:
#   $1 — slug (e.g., "user-auth-flow")
#   $2 — branch prefix (default: "feature")
#
# Prints:
#   WORKSPACE=<path>
#   BRANCH=<name>
spartan_worktree_create() {
  local slug="$1"
  local prefix="${2:-feature}"
  local branch="$prefix/$slug"
  local main_repo
  main_repo="$(git rev-parse --show-toplevel)"
  local workspace="$main_repo/.worktrees/$slug"

  if [ -d "$workspace" ]; then
    echo "RESUMING: $workspace"
  else
    git worktree add "$workspace" -b "$branch" 2>/dev/null || \
      git worktree add "$workspace" "$branch"
  fi

  # Symlink planning directories so worktree shares them with main repo
  for dir in .planning .memory .handoff .spartan; do
    [ -d "$main_repo/$dir" ] && [ ! -e "$workspace/$dir" ] && \
      ln -s "$main_repo/$dir" "$workspace/$dir"
  done

  # Copy .env (not symlinked — worktree may need different values)
  [ -f "$main_repo/.env" ] && [ ! -f "$workspace/.env" ] && \
    cp "$main_repo/.env" "$workspace/.env"

  # Ensure .worktrees/ is gitignored
  grep -qxF '.worktrees/' "$main_repo/.gitignore" 2>/dev/null || \
    echo '.worktrees/' >> "$main_repo/.gitignore"

  echo "WORKSPACE=$workspace"
  echo "BRANCH=$branch"
}

# Guard: verify we're inside a worktree, not the main repo.
# Returns 0 if OK, 1 if in main repo (should stop).
spartan_worktree_guard() {
  local main_repo
  main_repo="$(git worktree list | head -1 | awk '{print $1}')"
  local current
  current="$(git rev-parse --show-toplevel)"

  if [ "$main_repo" = "$current" ]; then
    echo "ERROR: Working in main repo, not a worktree. Run spartan_worktree_create first."
    return 1
  else
    echo "OK: Worktree at $current"
    return 0
  fi
}

# Remove a worktree after PR is merged.
#
# Args:
#   $1 — slug used during create
spartan_worktree_cleanup() {
  local slug="$1"
  local main_repo
  main_repo="$(git worktree list | head -1 | awk '{print $1}')"

  git -C "$main_repo" worktree remove ".worktrees/$slug" --force 2>/dev/null || true
  git -C "$main_repo" worktree prune 2>/dev/null || true
  echo "Cleaned up worktree: $slug"
}

# List all active worktrees.
spartan_worktree_list() {
  git worktree list 2>/dev/null
}

# Prune stale worktrees from previous runs.
spartan_worktree_prune() {
  local main_repo
  main_repo="$(git rev-parse --show-toplevel)"
  git worktree prune 2>/dev/null || true

  local worktree_base="$main_repo/.worktrees"
  if [ -d "$worktree_base" ]; then
    # Remove empty directories left behind
    find "$worktree_base" -maxdepth 1 -type d -empty -delete 2>/dev/null || true
  fi
  echo "Pruned stale worktrees"
}
