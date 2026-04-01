#!/bin/bash
# ai-image.sh — Generate images using Gemini Image API
#
# Usage:
#   ./ai-image.sh "prompt" output-path.png
#   ./ai-image.sh "prompt" output-path.png --style "calm, minimal"
#   ./ai-image.sh "prompt" output-path.png --reference ./ref.png
#   ./ai-image.sh "prompt" output-path.png --reference ./ref1.png --reference ./ref2.png
#   ./ai-image.sh "prompt" output-path.png --remove-bg
#
# Arguments:
#   $1 — image prompt (what to generate)
#   $2 — output file path (must end in .png)
#   remaining args forwarded to ai-image.py (--style, --context, --model, --reference, --remove-bg)
#
# Config:
#   API key: Set GEMINI_API_KEY or GOOGLE_API_KEY env var
#   Or create .spartan/ai.env with: GEMINI_API_KEY=your-key-here
#   Model: Set GEMINI_IMAGE_MODEL env var (default: gemini-2.0-flash-preview-image-generation)
#
# Brand context:
#   Reads .planning/design-config.md for brand colors/style and injects into every call.
#
# Setup (one-time):
#   pip install google-genai Pillow
#   pip install rembg          # only for --remove-bg

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─────────────────────────────────────────────────────────────
# Load API key from env files (priority order)
# ─────────────────────────────────────────────────────────────

for env_file in ".spartan/ai.env" ".env" "$HOME/.spartan/ai.env"; do
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck source=/dev/null
    source "$env_file"
    set +a
    break
  fi
done

# ─────────────────────────────────────────────────────────────
# Parse arguments
# ─────────────────────────────────────────────────────────────

PROMPT="${1:-}"
OUTPUT="${2:-}"
shift 2 2>/dev/null || true

if [ -z "$PROMPT" ] || [ -z "$OUTPUT" ]; then
  echo "Usage: $0 \"<prompt>\" <output-path.png> [--style \"...\"] [--reference <image>]"
  echo ""
  echo "Examples:"
  echo "  $0 \"Hero illustration for dashboard\" ./assets/hero.png"
  echo "  $0 \"Analytics icon\" ./assets/icon.png --style \"flat, minimal\""
  echo "  $0 \"Similar style\" ./assets/v2.png --reference ./assets/v1.png"
  echo "  $0 \"Icon on transparent bg\" ./assets/icon.png --remove-bg"
  echo ""
  echo "Config: set GEMINI_API_KEY env var or create .spartan/ai.env"
  exit 1
fi

# ─────────────────────────────────────────────────────────────
# Build brand context from design-config.md
# ─────────────────────────────────────────────────────────────

BRAND_CONTEXT=""
for config_path in ".planning/design-config.md" ".claude/design-config.md"; do
  if [ -f "$config_path" ]; then
    # Extract key design info: app name, colors, personality, anti-references
    APP_NAME=$(grep -m1 "App name" "$config_path" | sed 's/.*: *//' || true)
    THEME=$(grep -m1 "Theme" "$config_path" | sed 's/.*: *//' || true)
    PRIMARY=$(grep -m1 "Primary.*--color-primary" "$config_path" | grep -oE '#[0-9A-Fa-f]{6}' | head -1 || true)
    ACCENT=$(grep -m1 "Accent" "$config_path" | grep -oE '#[0-9A-Fa-f]{6}' | head -1 || true)
    BG=$(grep -m1 "Background.*--color-bg" "$config_path" | grep -oE '#[0-9A-Fa-f]{6}' | head -1 || true)
    TEXT=$(grep -m1 "Text.*--color-text " "$config_path" | grep -oE '#[0-9A-Fa-f]{6}' | head -1 || true)
    FONT=$(grep -m1 "Font.*:" "$config_path" | sed 's/.*: *//' | head -1 || true)

    # Read personality section
    PERSONALITY=$(sed -n '/## Design Personality/,/^## /p' "$config_path" | head -5 | tail -3 || true)

    # Read anti-references
    ANTI=$(sed -n '/## Anti-References/,/^## /p' "$config_path" | grep "^-" | head -4 || true)

    BRAND_CONTEXT="${APP_NAME:+$APP_NAME. }${THEME:+Theme: $THEME. }${PRIMARY:+Primary: $PRIMARY. }${ACCENT:+Accent: $ACCENT. }${BG:+Background: $BG. }${TEXT:+Text: $TEXT. }${FONT:+Font: $FONT. }${PERSONALITY:+Style: $PERSONALITY. }${ANTI:+AVOID: $ANTI}"
    break
  fi
done

if [ -z "$BRAND_CONTEXT" ]; then
  BRAND_CONTEXT="No brand context available. Use clean, professional style."
fi

# ─────────────────────────────────────────────────────────────
# Call Python image generator
# ─────────────────────────────────────────────────────────────

python3 "$SCRIPT_DIR/ai-image.py" "$PROMPT" \
  -o "$OUTPUT" \
  --context "$BRAND_CONTEXT" \
  "$@"
