.PHONY: setup validate validate-structure validate-content lint bridge-dev bridge-start help

# ── Setup ──────────────────────────────────────────────

setup: ## Run the toolkit installer (global mode)
	@chmod +x toolkit/scripts/setup.sh
	@./toolkit/scripts/setup.sh --global

setup-local: ## Run the toolkit installer (local mode)
	@chmod +x toolkit/scripts/setup.sh
	@./toolkit/scripts/setup.sh --local

# ── Validation ─────────────────────────────────────────

validate: validate-structure validate-content ## Run all validation checks

validate-structure: ## Check all toolkit files are in place
	@echo "Checking toolkit structure..."
	@ERRORS=0; \
	for f in toolkit/claude-md/00-header.md \
	         toolkit/scripts/setup.sh \
	         toolkit/commands/spartan.md; do \
	  if [ ! -f "$$f" ]; then \
	    echo "  MISSING: $$f"; \
	    ERRORS=$$((ERRORS+1)); \
	  fi; \
	done; \
	CMD_COUNT=$$(ls toolkit/commands/spartan/*.md 2>/dev/null | wc -l | tr -d ' '); \
	RULE_COUNT=$$(find toolkit/rules -name '*.md' 2>/dev/null | wc -l | tr -d ' '); \
	SKILL_COUNT=$$(ls -d toolkit/skills/*/ 2>/dev/null | wc -l | tr -d ' '); \
	AGENT_COUNT=$$(ls toolkit/agents/*.md 2>/dev/null | wc -l | tr -d ' '); \
	echo "  Commands: $$CMD_COUNT"; \
	echo "  Rules:    $$RULE_COUNT"; \
	echo "  Skills:   $$SKILL_COUNT"; \
	echo "  Agents:   $$AGENT_COUNT"; \
	if [ $$ERRORS -gt 0 ]; then \
	  echo ""; \
	  echo "$$ERRORS file(s) missing!"; \
	  exit 1; \
	fi; \
	echo "  All good."

validate-content: ## Check content format, naming, pack sync
	@node toolkit/scripts/validate-content.js

# ── Linting ────────────────────────────────────────────

lint: lint-shell lint-markdown ## Run all linters

lint-shell: ## Check setup.sh with shellcheck
	@if command -v shellcheck >/dev/null 2>&1; then \
	  echo "Running shellcheck on setup.sh..."; \
	  shellcheck toolkit/scripts/setup.sh && echo "  shellcheck: OK"; \
	else \
	  echo "shellcheck not found — install with: brew install shellcheck"; \
	fi

lint-markdown: ## Check markdown files for issues
	@if command -v markdownlint-cli2 >/dev/null 2>&1; then \
	  echo "Running markdown lint..."; \
	  markdownlint-cli2 "README.md" "CONTRIBUTING.md" "toolkit/README.md" "docs/ROADMAP.md"; \
	elif command -v markdownlint >/dev/null 2>&1; then \
	  echo "Running markdown lint..."; \
	  markdownlint "README.md" "CONTRIBUTING.md" "toolkit/README.md" "docs/ROADMAP.md"; \
	else \
	  echo "markdownlint not found — install with: npm install -g markdownlint-cli2"; \
	fi

# ── Bridges ───────────────────────────────────────────

bridge-dev: ## Start telegram bridge in dev mode (watch)
	@cd bridges/telegram && npm run dev

bridge-start: ## Start telegram bridge
	@cd bridges/telegram && npm start

bridge-install: ## Install bridge dependencies (core + telegram)
	@cd bridges/core && npm install
	@cd bridges/telegram && npm install

# ── Help ───────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
