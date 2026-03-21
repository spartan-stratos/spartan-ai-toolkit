#!/usr/bin/env bash
# Spartan AI Toolkit — Setup Script v3.0
# Usage:
#   ./scripts/setup.sh --global   install to ~/.claude (all projects)
#   ./scripts/setup.sh --local    install to ./.claude (this project only)

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

MODE="global"
[[ "$1" == "--local" ]] && MODE="local"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     Spartan AI Toolkit Setup v3.0        ║${NC}"
echo -e "${BOLD}║   Superpowers + GSD v5 + 26 Commands     ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Mode: ${YELLOW}${MODE}${NC}"
echo ""

# ─────────────────────────────────────────────────────────────
# Step 1: Prerequisites
# ─────────────────────────────────────────────────────────────
echo -e "${BLUE}[1/8]${NC} ${BOLD}Checking prerequisites...${NC}"

ERRORS=0

check_cmd() {
  local cmd=$1
  local hint=${2:-""}
  if command -v "$cmd" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $cmd $(${cmd} --version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+' | head -1)"
  else
    echo -e "  ${RED}✗${NC} $cmd not found${hint:+ — $hint}"
    ERRORS=$((ERRORS+1))
  fi
}

check_cmd node   "install from nodejs.org (need >= 18)"
check_cmd npm    ""
check_cmd git    ""
check_cmd claude "npm install -g @anthropic-ai/claude-code"

# Node version check
if command -v node &>/dev/null; then
  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -lt 18 ]; then
    echo -e "  ${RED}✗${NC} Node.js ${NODE_VER} is too old (need >= 18)"
    ERRORS=$((ERRORS+1))
  fi
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo -e "  ${RED}Fix the above errors and run setup again.${NC}"
  exit 1
fi
echo ""

# ─────────────────────────────────────────────────────────────
# Step 2: Superpowers
# ─────────────────────────────────────────────────────────────
echo -e "${BLUE}[2/8]${NC} ${BOLD}Install Superpowers in Claude Code${NC}"
echo ""
echo -e "  Open Claude Code and run these two commands:"
echo ""
echo -e "  ${CYAN}/plugin marketplace add obra/superpowers-marketplace${NC}"
echo -e "  ${CYAN}/plugin install superpowers@superpowers-marketplace${NC}"
echo ""
echo -e "  Then ${BOLD}restart Claude Code${NC} before continuing."
echo ""
echo -e "  ${YELLOW}Press ENTER when done (or Ctrl+C to skip for now)...${NC}"
read -r
echo -e "  ${GREEN}✓${NC} Superpowers noted"
echo ""

# ─────────────────────────────────────────────────────────────
# Step 3: GSD
# ─────────────────────────────────────────────────────────────
echo -e "${BLUE}[3/8]${NC} ${BOLD}Installing GSD (Get Shit Done)...${NC}"

GSD_FLAGS="--global"
[[ "$MODE" == "local" ]] && GSD_FLAGS="--local"

if npx get-shit-done-cc@latest $GSD_FLAGS 2>&1 | tail -5; then
  echo -e "  ${GREEN}✓${NC} GSD installed (${MODE})"
else
  echo -e "  ${YELLOW}⚠${NC} GSD install may have had warnings — check above"
fi
echo ""

# ─────────────────────────────────────────────────────────────
# Step 4: CLAUDE.md
# ─────────────────────────────────────────────────────────────
echo -e "${BLUE}[4/8]${NC} ${BOLD}Installing CLAUDE.md...${NC}"

SOURCE_CLAUDE="$TOOLKIT_ROOT/CLAUDE.md"

if [[ "$MODE" == "global" ]]; then
  TARGET_CLAUDE="$HOME/.claude/CLAUDE.md"
  mkdir -p "$HOME/.claude"
  if [[ -f "$TARGET_CLAUDE" ]]; then
    if diff -q "$SOURCE_CLAUDE" "$TARGET_CLAUDE" > /dev/null 2>&1; then
      echo -e "  ${GREEN}✓${NC} ~/.claude/CLAUDE.md (unchanged)"
    else
      cp "$TARGET_CLAUDE" "${TARGET_CLAUDE}.$(date +%Y%m%d-%H%M%S).bak"
      cp "$SOURCE_CLAUDE" "$TARGET_CLAUDE"
      echo -e "  ${GREEN}✓${NC} ~/.claude/CLAUDE.md (backed up → updated)"
    fi
  else
    cp "$SOURCE_CLAUDE" "$TARGET_CLAUDE"
    echo -e "  ${GREEN}✓${NC} ~/.claude/CLAUDE.md (new)"
  fi
else
  TARGET_CLAUDE="$(pwd)/CLAUDE.md"
  if [[ -f "$TARGET_CLAUDE" ]]; then
    if diff -q "$SOURCE_CLAUDE" "$TARGET_CLAUDE" > /dev/null 2>&1; then
      echo -e "  ${GREEN}✓${NC} ./CLAUDE.md (unchanged)"
    else
      echo -e "  ${YELLOW}⚠  CLAUDE.md already exists and differs from toolkit version${NC}"
      echo -e "  ${BOLD}[b]${NC} Backup existing + overwrite"
      echo -e "  ${BOLD}[s]${NC} Skip — keep existing"
      echo -n "  Your choice [b/s]: "
      read -r CLAUDE_CHOICE
      case "$CLAUDE_CHOICE" in
        s|S|skip)
          echo -e "  ${YELLOW}⏭${NC} CLAUDE.md (skipped — existing kept)"
          ;;
        *)
          cp "$TARGET_CLAUDE" "${TARGET_CLAUDE}.$(date +%Y%m%d-%H%M%S).bak"
          cp "$SOURCE_CLAUDE" "$TARGET_CLAUDE"
          echo -e "  ${GREEN}✓${NC} ./CLAUDE.md (backed up → updated)"
          ;;
      esac
    fi
  else
    cp "$SOURCE_CLAUDE" "$TARGET_CLAUDE"
    echo -e "  ${GREEN}✓${NC} ./CLAUDE.md (new)"
  fi
fi
echo ""

# ─────────────────────────────────────────────────────────────
# Step 5: Spartan commands
# ─────────────────────────────────────────────────────────────
echo -e "${BLUE}[5/8]${NC} ${BOLD}Installing Spartan commands...${NC}"

COMMANDS_SRC="$TOOLKIT_ROOT/.claude/commands/spartan"

if [[ "$MODE" == "global" ]]; then
  COMMANDS_DEST="$HOME/.claude/commands/spartan"
else
  COMMANDS_DEST="$(pwd)/.claude/commands/spartan"
fi

mkdir -p "$COMMANDS_DEST"
COUNT=0

# Copy smart router (entry point: /spartan)
ROUTER_SRC="$TOOLKIT_ROOT/.claude/commands/spartan.md"
if [[ "$MODE" == "global" ]]; then
  ROUTER_DEST="$HOME/.claude/commands/spartan.md"
else
  ROUTER_DEST="$(pwd)/.claude/commands/spartan.md"
fi

if [[ -f "$ROUTER_SRC" ]]; then
  cp "$ROUTER_SRC" "$ROUTER_DEST"
  echo -e "  ${GREEN}✓${NC} /spartan (smart router)"
  COUNT=$((COUNT+1))
fi

# Copy all subcommands
for f in "$COMMANDS_SRC"/*.md; do
  [[ -f "$f" ]] || continue
  fname="$(basename "$f")"
  cp "$f" "$COMMANDS_DEST/$fname"
  echo -e "  ${GREEN}✓${NC} /spartan:${fname%.md}"
  COUNT=$((COUNT+1))
done

echo ""
echo -e "  Installed ${BOLD}${COUNT} commands${NC}"
echo ""

# ─────────────────────────────────────────────────────────────
# Step 6: Company Rules
# ─────────────────────────────────────────────────────────────
echo -e "${BLUE}[6/8]${NC} ${BOLD}Installing company rules...${NC}"

RULES_SRC="$TOOLKIT_ROOT/rules/project"

if [[ "$MODE" == "global" ]]; then
  RULES_DEST="$HOME/.claude/rules/project"
else
  RULES_DEST="$(pwd)/rules/project"
fi

mkdir -p "$RULES_DEST"
RCOUNT=0
RSKIP=0
RULES_CONFLICT=false

# Check for existing rules first
for f in "$RULES_SRC"/*.md; do
  [[ -f "$f" ]] || continue
  fname="$(basename "$f")"
  if [[ -f "$RULES_DEST/$fname" ]]; then
    # Compare files — skip prompt if identical
    if ! diff -q "$f" "$RULES_DEST/$fname" > /dev/null 2>&1; then
      RULES_CONFLICT=true
      break
    fi
  fi
done

RULES_ACTION="overwrite"
if [[ "$RULES_CONFLICT" == true ]]; then
  echo ""
  echo -e "  ${YELLOW}⚠  Existing rules detected at: ${RULES_DEST}${NC}"
  echo -e "  Some rules differ from the company version."
  echo ""
  echo -e "  ${BOLD}[b]${NC} Backup existing + overwrite with company version"
  echo -e "  ${BOLD}[s]${NC} Skip — keep existing, only install missing rules"
  echo ""
  echo -n "  Your choice [b/s]: "
  read -r RULES_CHOICE
  case "$RULES_CHOICE" in
    s|S|skip) RULES_ACTION="skip" ;;
    *) RULES_ACTION="backup" ;;
  esac
fi

BACKUP_DIR="$RULES_DEST/.backup-$(date +%Y%m%d-%H%M%S)"

for f in "$RULES_SRC"/*.md; do
  [[ -f "$f" ]] || continue
  fname="$(basename "$f")"
  dest_file="$RULES_DEST/$fname"

  if [[ -f "$dest_file" ]]; then
    # File exists — check if identical
    if diff -q "$f" "$dest_file" > /dev/null 2>&1; then
      echo -e "  ${GREEN}✓${NC} ${fname} (unchanged)"
      RCOUNT=$((RCOUNT+1))
      continue
    fi

    # File differs
    if [[ "$RULES_ACTION" == "skip" ]]; then
      echo -e "  ${YELLOW}⏭${NC} ${fname} (skipped — existing kept)"
      RSKIP=$((RSKIP+1))
      continue
    fi

    # Backup + overwrite
    mkdir -p "$BACKUP_DIR"
    cp "$dest_file" "$BACKUP_DIR/$fname"
    cp "$f" "$dest_file"
    echo -e "  ${GREEN}✓${NC} ${fname} (backed up → overwritten)"
    RCOUNT=$((RCOUNT+1))
  else
    # New file — always install
    cp "$f" "$dest_file"
    echo -e "  ${GREEN}✓${NC} ${fname} (new)"
    RCOUNT=$((RCOUNT+1))
  fi
done

echo ""
if [[ "$RSKIP" -gt 0 ]]; then
  echo -e "  Installed ${BOLD}${RCOUNT}${NC} rules, skipped ${BOLD}${RSKIP}${NC}"
else
  echo -e "  Installed ${BOLD}${RCOUNT} rule files${NC}"
fi
if [[ -d "$BACKUP_DIR" ]]; then
  echo -e "  Backups at: ${CYAN}${BACKUP_DIR}${NC}"
fi
echo ""

# ─────────────────────────────────────────────────────────────
# Step 7: Company Skills
# ─────────────────────────────────────────────────────────────
echo -e "${BLUE}[7/8]${NC} ${BOLD}Installing company skills...${NC}"

SKILLS_SRC="$TOOLKIT_ROOT/skills"

if [[ "$MODE" == "global" ]]; then
  SKILLS_DEST="$HOME/.claude/skills"
else
  SKILLS_DEST="$(pwd)/.claude/skills"
fi

SCOUNT=0
SSKIP=0
SKILLS_CONFLICT=false

# Check for existing skills first
if [[ -d "$SKILLS_SRC" ]]; then
  for skill_dir in "$SKILLS_SRC"/*/; do
    [[ -d "$skill_dir" ]] || continue
    skill_name="$(basename "$skill_dir")"
    if [[ -d "$SKILLS_DEST/$skill_name" ]]; then
      # Check if skill.md or SKILL.md differs
      for sf in "$skill_dir"skill.md "$skill_dir"SKILL.md; do
        [[ -f "$sf" ]] || continue
        sf_dest="$SKILLS_DEST/$skill_name/$(basename "$sf")"
        if [[ -f "$sf_dest" ]] && ! diff -q "$sf" "$sf_dest" > /dev/null 2>&1; then
          SKILLS_CONFLICT=true
          break 2
        fi
      done
    fi
  done
fi

SKILLS_ACTION="overwrite"
if [[ "$SKILLS_CONFLICT" == true ]]; then
  echo ""
  echo -e "  ${YELLOW}⚠  Existing skills detected at: ${SKILLS_DEST}${NC}"
  echo -e "  Some skills differ from the company version."
  echo ""
  echo -e "  ${BOLD}[b]${NC} Backup existing + overwrite with company version"
  echo -e "  ${BOLD}[s]${NC} Skip — keep existing, only install missing skills"
  echo ""
  echo -n "  Your choice [b/s]: "
  read -r SKILLS_CHOICE
  case "$SKILLS_CHOICE" in
    s|S|skip) SKILLS_ACTION="skip" ;;
    *) SKILLS_ACTION="backup" ;;
  esac
fi

SKILL_BACKUP_DIR="$SKILLS_DEST/.backup-$(date +%Y%m%d-%H%M%S)"

if [[ -d "$SKILLS_SRC" ]]; then
  for skill_dir in "$SKILLS_SRC"/*/; do
    [[ -d "$skill_dir" ]] || continue
    skill_name="$(basename "$skill_dir")"
    dest_dir="$SKILLS_DEST/$skill_name"

    if [[ -d "$dest_dir" ]]; then
      # Skill exists — check if identical (compare skill.md)
      IS_IDENTICAL=true
      for sf in "$skill_dir"skill.md "$skill_dir"SKILL.md; do
        [[ -f "$sf" ]] || continue
        sf_dest="$dest_dir/$(basename "$sf")"
        if [[ -f "$sf_dest" ]] && ! diff -q "$sf" "$sf_dest" > /dev/null 2>&1; then
          IS_IDENTICAL=false
          break
        fi
      done

      if [[ "$IS_IDENTICAL" == true ]]; then
        echo -e "  ${GREEN}✓${NC} /$skill_name (unchanged)"
        SCOUNT=$((SCOUNT+1))
        continue
      fi

      # Differs
      if [[ "$SKILLS_ACTION" == "skip" ]]; then
        echo -e "  ${YELLOW}⏭${NC} /$skill_name (skipped — existing kept)"
        SSKIP=$((SSKIP+1))
        continue
      fi

      # Backup + overwrite
      mkdir -p "$SKILL_BACKUP_DIR/$skill_name"
      cp -r "$dest_dir"/* "$SKILL_BACKUP_DIR/$skill_name/" 2>/dev/null
      rm -rf "$dest_dir"
      mkdir -p "$dest_dir"
      cp -r "$skill_dir"* "$dest_dir/" 2>/dev/null
      rm -rf "$dest_dir"/__pycache__ "$dest_dir"/scripts/__pycache__ 2>/dev/null
      echo -e "  ${GREEN}✓${NC} /$skill_name (backed up → overwritten)"
      SCOUNT=$((SCOUNT+1))
    else
      # New skill — always install
      mkdir -p "$dest_dir"
      cp -r "$skill_dir"* "$dest_dir/" 2>/dev/null
      rm -rf "$dest_dir"/__pycache__ "$dest_dir"/scripts/__pycache__ 2>/dev/null
      echo -e "  ${GREEN}✓${NC} /$skill_name (new)"
      SCOUNT=$((SCOUNT+1))
    fi
  done
fi

echo ""
if [[ "$SSKIP" -gt 0 ]]; then
  echo -e "  Installed ${BOLD}${SCOUNT}${NC} skills, skipped ${BOLD}${SSKIP}${NC}"
else
  echo -e "  Installed ${BOLD}${SCOUNT} skills${NC}"
fi
if [[ -d "$SKILL_BACKUP_DIR" ]]; then
  echo -e "  Backups at: ${CYAN}${SKILL_BACKUP_DIR}${NC}"
fi
echo ""

# ─────────────────────────────────────────────────────────────
# Step 8: Agents
# ─────────────────────────────────────────────────────────────
AGENTS_SRC="$TOOLKIT_ROOT/agents"

if [[ -d "$AGENTS_SRC" ]]; then
  echo -e "${BLUE}[8/8]${NC} ${BOLD}Installing agents...${NC}"

  if [[ "$MODE" == "global" ]]; then
    AGENTS_DEST="$HOME/.claude/agents"
  else
    AGENTS_DEST="$(pwd)/.claude/agents"
  fi

  mkdir -p "$AGENTS_DEST"
  ACOUNT=0

  for f in "$AGENTS_SRC"/*.md; do
    [[ -f "$f" ]] || continue
    fname="$(basename "$f")"
    cp "$f" "$AGENTS_DEST/$fname"
    echo -e "  ${GREEN}✓${NC} ${fname%.md}"
    ACOUNT=$((ACOUNT+1))
  done

  echo ""
  echo -e "  Installed ${BOLD}${ACOUNT} agents${NC}"
  echo ""
fi

# ─────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║          Setup Complete ✓                ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo ""
echo -e "  1. ${YELLOW}Restart Claude Code${NC} (required for Superpowers to activate)"
echo ""
echo -e "  2. Open any project folder and run Claude Code:"
echo -e "     ${CYAN}cd my-project && claude${NC}"
echo ""
echo -e "  3. Verify it works — type this in Claude Code:"
echo -e "     ${CYAN}/spartan${NC}"
echo -e "     → Smart router asks what you need = everything working"
echo ""
echo -e "  4. Company rules + skills are synced across all projects."
echo -e "     Rules: ${CYAN}CORE_RULES, ARCHITECTURE_RULES, API_RULES, DATABASE_RULES, FRONTEND_RULES${NC}"
echo -e "     Skills: ${CYAN}/api-endpoint-creator, /database-table-creator, /kotlin-best-practices, ...${NC}"
echo ""
echo -e "  📖 Full guide: ${YELLOW}docs/GUIDE.md${NC}"
echo -e "  📋 Cheatsheet: ${YELLOW}docs/CHEATSHEET.md${NC}"
echo ""
