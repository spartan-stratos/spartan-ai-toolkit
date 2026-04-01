#!/bin/bash
# ai-design.sh — Call Gemini CLI with project design context for design brainstorming
#
# Usage:
#   ./ai-design.sh "layout" "Design a dashboard for user settings"
#   ./ai-design.sh "flow" "Map the user flow for onboarding"
#   ./ai-design.sh "components" "List components for settings page"
#   ./ai-design.sh "prototype" "Create HTML for the settings dashboard"
#   ./ai-design.sh "motion" "Design animations for the dashboard"
#   ./ai-design.sh "raw" "Any freeform design question"
#
# Arguments:
#   $1 — mode: layout | flow | components | prototype | motion | raw
#   $2 — the specific request/feature description
#
# Config:
#   Reads brand context from .planning/design-config.md (project root)
#   Requires: gemini CLI installed (npm install -g @anthropic-ai/claude-code or Google AI CLI)
#
# Setup:
#   1. Install Gemini CLI: https://github.com/google-gemini/gemini-cli
#   2. Authenticate: gemini auth login

set -euo pipefail

MODE="${1:-raw}"
REQUEST="${2:-}"

if [ -z "$REQUEST" ]; then
  echo "Usage: $0 <mode> <request>"
  echo "Modes: layout, flow, components, prototype, motion, raw"
  exit 1
fi

# Check gemini CLI exists
if ! command -v gemini &>/dev/null; then
  echo "ERROR: gemini CLI not found."
  echo "Install: https://github.com/google-gemini/gemini-cli"
  echo "Then: gemini auth login"
  exit 1
fi

# ─────────────────────────────────────────────────────────────
# Load project design context from design-config.md
# ─────────────────────────────────────────────────────────────

DESIGN_CONFIG=""
for config_path in ".planning/design-config.md" ".claude/design-config.md"; do
  if [ -f "$config_path" ]; then
    DESIGN_CONFIG="$config_path"
    break
  fi
done

if [ -z "$DESIGN_CONFIG" ]; then
  echo "WARNING: No design-config.md found. Using minimal context." >&2
  PROJECT_CONTEXT="No project design config found. Use sensible defaults. Ask the user about brand colors, fonts, and personality if needed."
else
  # Extract key sections from design-config.md
  PROJECT_CONTEXT=$(cat "$DESIGN_CONFIG")
fi

# ─────────────────────────────────────────────────────────────
# Mode-specific system prompts
# ─────────────────────────────────────────────────────────────

case "$MODE" in
  layout)
    SYSTEM_PREFIX="You are a senior UI/UX designer. Design the layout structure for the following feature. Give: 1) Page layout (header, sidebar, content zones), 2) Component breakdown (widgets, cards, sections), 3) Information hierarchy, 4) Key interactions. Use the design system from the project context below. Be specific, not generic."
    ;;
  flow)
    SYSTEM_PREFIX="You are a senior UX designer. Design detailed user flows for the following feature. For each flow give: trigger, numbered steps (user action -> system response), end state, and edge cases (empty, error, loading, timeout). Also list ALL states each component needs. Be thorough."
    ;;
  components)
    SYSTEM_PREFIX="You are a senior UI designer. Design detailed component specs for the following feature. For each component: props (name, type, required, default), visual states (default, hover, focus, disabled, loading, error), interactions (click, hover, keyboard), accessibility (ARIA role, label, keyboard nav), responsive behavior. Use the project design system."
    ;;
  prototype)
    SYSTEM_PREFIX="You are a senior frontend developer creating an HTML prototype. Use Tailwind CSS (CDN). Use the EXACT colors from the design system below — do NOT change them. Show all states (default, loading, empty, error). Use realistic data, not lorem ipsum. Make it responsive. Output ONLY valid HTML code, nothing else."
    ;;
  motion)
    SYSTEM_PREFIX="You are a senior UI designer specializing in motion design. Design the animation plan for the following feature. For each section/component, specify: 1) What animates, 2) How it animates (transform, opacity, etc), 3) When it triggers (scroll, hover, always), 4) Duration and easing, 5) Stagger timing for lists. Must respect prefers-reduced-motion."
    ;;
  raw)
    SYSTEM_PREFIX="You are a senior UI/UX designer. Answer the following design question using the project context below. Be specific and actionable."
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo "Modes: layout, flow, components, prototype, motion, raw"
    exit 1
    ;;
esac

# ─────────────────────────────────────────────────────────────
# Build and send prompt
# ─────────────────────────────────────────────────────────────

FULL_PROMPT="${SYSTEM_PREFIX}

--- PROJECT DESIGN SYSTEM ---
${PROJECT_CONTEXT}

---

Request: ${REQUEST}"

echo "$FULL_PROMPT" | gemini -p "" -o text
