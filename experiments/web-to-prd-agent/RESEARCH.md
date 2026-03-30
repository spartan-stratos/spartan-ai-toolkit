# Research: Web-to-PRD Agent — Claude Code CLI as Backend

Date: 2026-03-30

## Key Finding: Option D Works

`claude -p` (headless mode) uses the user's existing Max/Pro subscription. No API key needed. The Agent SDK spawns the same CLI binary underneath.

## Claude Code CLI Programmatic Usage

```bash
# Text output
claude -p "what is 2+2" --output-format text

# JSON output (structured with metadata)
claude -p "say hello" --output-format json
# Returns: {"type":"result","result":"Hello!","total_cost_usd":0.41,"session_id":"..."}

# Structured output with schema
claude -p "list features" --json-schema '{"type":"object","properties":{"features":{"type":"array"}}}'

# Multi-turn stateful sessions
claude -p "analyze this" --session-id "my-session" --output-format json
claude -p "now do more" --resume --session-id "my-session" --output-format json
```

### Key Flags
| Flag | What it does |
|------|-------------|
| `--output-format json\|text\|stream-json` | Control output format |
| `--json-schema '{...}'` | Force structured output with schema validation |
| `--max-turns N` | Limit agent iterations |
| `--max-budget-usd N` | Hard dollar ceiling |
| `--allowedTools "Read,Bash"` | Grant tool permissions |
| `--session-id "id"` + `--resume` | Multi-turn stateful conversations |
| `--system-prompt "..."` | Custom system prompt |
| `--mcp-config file.json` | Load MCP servers |
| `--dangerously-skip-permissions` | Bypass permission checks (sandbox only) |
| `--permission-mode auto` | Auto-approve tool calls |
| `--no-session-persistence` | Don't save session to disk |
| `--bare` | Minimal mode, skip hooks/plugins/CLAUDE.md |

## Authentication

Two methods:
- **OAuth (subscription):** `sk-ant-oat01-` — Pro/Max monthly quota. Used by `claude -p`.
- **API Key:** `sk-ant-api03-` — Pay-per-token. Used by Agent SDK officially.

For headless/server: `claude setup-token` creates 1-year OAuth token. Set as `CLAUDE_CODE_OAUTH_TOKEN`.

## Agent SDK (`@anthropic-ai/claude-agent-sdk`)

- TypeScript: `npm install @anthropic-ai/claude-agent-sdk` (v0.2.87)
- Python: `pip install claude-agent-sdk` (v0.1.52)
- **Spawns Claude Code CLI as subprocess** — inherits all CLI config
- MCP servers fully supported
- Subagents supported (1 level deep)
- Session persistence built in

## MCP in Headless Mode

Works with `--mcp-config` or project `.mcp.json`. Need `--allowedTools` since no interactive prompt.

```bash
claude -p "navigate to example.com" \
  --mcp-config mcp.json \
  --allowedTools "mcp__playwright__*" \
  --output-format json
```

## Rate Limits (Subscription Plans)

| Plan | Prompts per 5hr window | Weekly cap |
|------|----------------------|-----------|
| Pro $20/mo | 10-40 | Lower |
| Max 5x $100/mo | 50-200 | Medium |
| Max 20x $200/mo | 200-800 | Higher |

Agentic loops consume 10-100x more tokens than chat (conversation history grows).

## Existing Projects Using CLI Programmatically

- `steipete/claude-code-mcp` — wraps Claude Code as an MCP server
- `Claude Code Action` — official GitHub Actions integration
- `wshobson/agents` — multi-agent orchestration
- `ruvnet/claude-flow` — non-interactive mode orchestration
- `anthropics/claude-agent-sdk-demos` — official demos (Research Agent pattern)

## Playwright MCP Lessons Learned (from building the skill)

1. **Never use real Chrome profile** — extensions cause timeouts, can corrupt profile data
2. **Use separate profile:** `--user-data-dir="$HOME/.playwright-profile"`
3. **Clean stale processes:** `rm -f ~/.playwright-profile/SingletonLock` before each run
4. **Don't pkill playwright processes** — kills the MCP server too
5. **Login handling:** Playwright opens headed browser, user types credentials, cookies saved
6. **Chrome can stay open** — separate profile = no conflict
7. **Two-pass crawl:** breadth-first (map pages) then depth-first (explore features)
8. **Coverage check mandatory** before generating PRD

## PRD Format (6 sections per Epic)

```
Epic N: [Name]
├── 1. TL;DR
├── 2. Goals (business, user, non-goals)
├── 3. User Stories
├── 4. Functional Requirements (with inline screenshots)
├── 5. User Experience (entry point, flow, edge cases, design notes)
└── 6. Narrative (100-word user story)
```

## Notion Export Structure

```
Parent page: "App — PRD"
├── Overview (sections 1-3, 5-8 of main PRD)
├── Epic 1 (full sub-page with embedded screenshots)
├── Epic 2 (full sub-page with embedded screenshots)
└── Optional: Epics database (for filtering/sorting)
```
