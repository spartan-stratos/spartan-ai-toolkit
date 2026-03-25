#!/usr/bin/env bash
# Spartan AI Toolkit — Pack Definitions
# Sourced by setup.sh. Bash 3.2 compatible (no associative arrays).
# shellcheck disable=SC2034  # Variables are used dynamically via pack_var()

# ─── Pack order (controls display order) ─────────────────────────
PACK_ORDER="core backend frontend project-mgmt product ops"

# ─── Pack descriptions ────────────────────────────────────────────
PACK_DESC_core="Core workflow (always installed)"
PACK_DESC_backend="Kotlin + Micronaut backend"
PACK_DESC_frontend="React + Next.js frontend"
PACK_DESC_project_mgmt="Large multi-day projects (GSD)"
PACK_DESC_product="Product thinking before building"
PACK_DESC_ops="Deploy & infrastructure"

# ─── Commands per pack (space-separated, no .md extension) ───────
PACK_COMMANDS_core="quickplan daily context-save update debug pr-ready init-project careful freeze unfreeze guard"
PACK_COMMANDS_backend="kotlin-service migration review testcontainer"
PACK_COMMANDS_frontend="next-app next-feature fe-review figma-to-code e2e"
PACK_COMMANDS_project_mgmt="project phase workstreams gsd-upgrade forensics brownfield map-codebase"
PACK_COMMANDS_product="think validate teardown interview lean-canvas brainstorm"
PACK_COMMANDS_ops="deploy env-setup"

# ─── Rules per pack (space-separated filenames) ──────────────────
PACK_RULES_core=""
PACK_RULES_backend="CORE_RULES.md ARCHITECTURE_RULES.md API_RULES.md DATABASE_RULES.md CONTROLLER_TEST_STANDARDS.md NAMING_CONVENTIONS.md RETROFIT_CLIENT_PLACEMENT.md TRANSACTION_RULES.md"
PACK_RULES_frontend="FRONTEND_RULES.md NAMING_CONVENTIONS.md"
PACK_RULES_project_mgmt=""
PACK_RULES_product=""
PACK_RULES_ops=""

# ─── Skills per pack (space-separated dir names) ─────────────────
PACK_SKILLS_core=""
PACK_SKILLS_backend="api-endpoint-creator backend-api-design database-patterns database-table-creator kotlin-best-practices testing-strategies security-checklist"
PACK_SKILLS_frontend="ui-ux-pro-max"
PACK_SKILLS_project_mgmt=""
PACK_SKILLS_product=""
PACK_SKILLS_ops=""

# ─── Agents per pack (space-separated filenames) ─────────────────
PACK_AGENTS_core=""
PACK_AGENTS_backend="micronaut-backend-expert.md solution-architect-cto.md"
PACK_AGENTS_frontend=""
PACK_AGENTS_project_mgmt=""
PACK_AGENTS_product=""
PACK_AGENTS_ops=""

# ─── CLAUDE.md sections per pack (files in claude-md/) ───────────
# 00-header.md and 01-core.md and 90-footer.md are always included
PACK_CLAUDE_SECTIONS_core=""
PACK_CLAUDE_SECTIONS_backend="10-backend.md"
PACK_CLAUDE_SECTIONS_frontend="20-frontend.md"
PACK_CLAUDE_SECTIONS_project_mgmt="30-project-mgmt.md"
PACK_CLAUDE_SECTIONS_product="40-product.md"
PACK_CLAUDE_SECTIONS_ops="50-ops.md"

# ─── Helper: get pack variable by name ────────────────────────────
# Usage: pack_var "COMMANDS" "backend" → echoes value of PACK_COMMANDS_backend
pack_var() {
  local prefix="$1"
  local pack="$2"
  # Convert hyphens to underscores for variable name
  local safe_pack="${pack//-/_}"
  local var_name="PACK_${prefix}_${safe_pack}"
  eval echo "\${$var_name:-}"
}
