# Handoff: Web-to-PRD Agent Build

## What to build
A Node.js CLI agent at `experiments/web-to-prd-agent/` that uses `claude -p` (Claude Code CLI headless mode) to scan web apps and generate detailed PRDs with screenshots, exported to Notion.

## Key files to read first
1. `experiments/web-to-prd-agent/SPEC.md` — full spec with architecture, file structure, CLI usage
2. `experiments/web-to-prd-agent/RESEARCH.md` — research on Claude CLI flags, MCP, rate limits, auth
3. `toolkit/commands/spartan/web-to-prd.md` — existing skill (PRD format template, crawl strategy)
4. `toolkit/skills/web-to-prd/SKILL.md` — skill reference (login handling, coverage check, Notion export)

## Architecture summary
```
Node.js CLI (code controls flow)
  └── spawns: claude -p "prompt" --output-format json --session-id prd-{id}
       └── uses: user's Max plan auth (no API key)
       └── has: Playwright MCP (browser), Notion MCP (export)
       └── returns: JSON with result + cost + session_id
```

## What's already done
- [x] Research on Claude Agent SDK vs CLI approach
- [x] Research on Claude Code CLI programmatic usage
- [x] Full spec with file structure and architecture
- [x] Existing skill/command files (PRD format, crawl strategy, login handling)
- [x] `.gitignore` updated for `.playwright-profile/`

## What to build next
1. `package.json` — npm package setup
2. `src/claude-cli.ts` — wrapper around `claude -p` (spawn, parse JSON, session management)
3. `src/mcp-setup.ts` — check/install Playwright MCP, clean stale processes
4. `src/crawler.ts` — page queue, visited set, two-pass crawl, interaction tracking
5. `src/screenshotter.ts` — screenshot management (save, name, track per epic)
6. `src/prd-generator.ts` — generate PRD with --json-schema, validate all sections
7. `src/notion-exporter.ts` — create Notion pages per epic, upload screenshots
8. `src/agent.ts` — main orchestrator connecting all pieces
9. `src/index.ts` — CLI entry point (parse args, run agent)
10. `templates/prd-schema.json` — JSON schema for structured PRD output

## Command to start
```
/spartan:build "web-to-prd agent at experiments/web-to-prd-agent"
```

## Context at 41%, recommend fresh session for build.
