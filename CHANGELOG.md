# Changelog

All notable changes to this project are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `/spartan:team` command — manage Claude Code Agent Teams (create, status, wave, review, research, build, clean)
- `team-coordinator` agent for multi-agent parallel work coordination
- Agent Teams integration in 6 workflows: build, phase execute, gate-review, map-codebase, startup, onboard, research
- Conditional detection: workflows check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` and offer parallel execution when enabled
- `make bump v=X.Y.Z` target to sync all 5 version files at once
- Session tracking, browser QA command, and contributor mode
- `--pack-dir` flag for loading community packs from external directories
- `--auto` flag for stack-based pack auto-selection
- `--format=agents-md` export for Cursor, Windsurf, Codex, Copilot
- AGENTS.md assembly from pack manifests
- Pack validation and external pack loading in resolver
- Tech stack auto-detection (Kotlin, Next.js, Python, Django, FastAPI)
- Community pack authoring guide

### Fixed
- Root marketplace.json version sync
- Stale `rules/project/` paths updated to pack-based layout
- AGENTS.md output formatting cleanup
- Stale counts in docs (48 commands not 44, 13 templates not 6)
- Publish workflow now installs npm dependencies before publish
- Core principles renumbered — language rule is #1
- Commands now respond in the user's language

## [1.2.0] - 2026-03-25

### Added
- Manual trigger for publish workflow

### Changed
- Context optimization — trimmed rules, claude-md sections, skills, removed emoji
- Rule improvements and skill refinements
- README rewritten — removed duplicates, tightened pack descriptions, workflows first

### Fixed
- Publish workflow now triggers after release completes

## [1.1.0] - 2026-03-25

### Added
- Workflow layer — build, fix, research, startup, onboard (5 guided workflows)
- Workflow pipelines, templates, and stack-specific dev guides
- Root-level marketplace.json for Claude Code plugin install

### Removed
- Credits section from toolkit README

## [1.0.1] - 2026-03-25

### Fixed
- npm blocks re-publish of unpublished 1.0.0 — bumped to 1.0.1

## [1.0.0] - 2026-03-25

### Added
- Pack system with YAML manifests and dependency resolver (BFS, cycle detection)
- npx CLI installer with interactive menu and multi-agent support
- 11 packs: core, backend-micronaut, frontend-react, database, shared-backend, project-mgmt, product, ops, research, backend-nodejs, backend-python
- 51 slash commands across all packs
- 11 coding rules (NAMING_CONVENTIONS, ARCHITECTURE, SCHEMA, ORM_AND_REPO, TRANSACTIONS, KOTLIN, CONTROLLERS, SERVICES_AND_BEANS, API_DESIGN, RETROFIT_PLACEMENT, FRONTEND)
- 19 skills for backend, frontend, research, and product workflows
- 4 agents (micronaut-backend-expert, solution-architect-cto, idea-killer, research-planner)
- 13 frameworks and 13 templates for startup/product workflows
- Telegram bridge with provider/engine architecture for remote session control
- Claude Code plugin manifest for marketplace distribution
- Setup script with global/local install modes
- CI/CD pipeline with structure validation, content checks, and auto-release

[Unreleased]: https://github.com/spartan-stratos/spartan-ai-toolkit/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/spartan-stratos/spartan-ai-toolkit/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/spartan-stratos/spartan-ai-toolkit/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/spartan-stratos/spartan-ai-toolkit/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/spartan-stratos/spartan-ai-toolkit/releases/tag/v1.0.0
