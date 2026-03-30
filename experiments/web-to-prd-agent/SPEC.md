# Spec: Web-to-PRD Agent (Option D)

## Pain
The current `/spartan:web-to-prd` skill relies on Claude following prompt instructions — Claude takes shortcuts, skips features, generates shallow PRDs. Code needs to control the crawl flow, not prompts.

## Solution
A Node.js CLI agent that uses `claude -p` (Claude Code CLI) as its AI backend. Code controls the flow, Claude provides the intelligence. Uses the user's existing Claude subscription (no API key needed).

## How It Works

```
User runs: npx @c0x12c/spartan-web-to-prd "https://app.com"

Agent (Node.js code):
├── Step 0: Check prerequisites
│   ├── Verify `claude` CLI is installed and authenticated
│   ├── Check/install Playwright MCP (--user-data-dir=~/.playwright-profile)
│   ├── Check Notion MCP (optional, for export)
│   └── Clean stale browser processes + lock files
│
├── Step 1: Login handling
│   ├── Spawn: claude -p "navigate to URL, take snapshot" --session-id prd-{id}
│   ├── Parse response: is this a login page?
│   ├── If yes → tell user to log in in browser window, wait for confirmation
│   ├── Verify login by checking snapshot content
│   └── Repeat until logged in or user skips
│
├── Step 2: Pass 1 — Map all pages (breadth-first)
│   ├── Spawn: claude -p "read all nav items, list every link" --resume --session-id prd-{id}
│   ├── Code parses response → builds page queue (Set of URLs)
│   ├── For each URL in queue:
│   │   ├── Spawn: claude -p "navigate to {URL}, take screenshot, list all interactive elements"
│   │   ├── Code saves screenshot to screenshots/
│   │   ├── Code tracks: visited pages, nav items found
│   │   └── Code adds any new URLs discovered to queue
│   ├── Show sitemap to user → ask if anything missing
│   └── Code enforces: every nav item must be visited before proceeding
│
├── Step 3: Pass 2 — Deep exploration (depth-first)
│   ├── For each page in sitemap:
│   │   ├── Spawn: claude -p "on page {URL}, list ALL interactive elements (buttons, tabs, modals, forms, filters)"
│   │   ├── Code gets list of interactions
│   │   ├── For each interaction:
│   │   │   ├── Spawn: claude -p "click {element}, screenshot, describe what happened"
│   │   │   ├── Code saves screenshot
│   │   │   ├── Code checks: did this open a modal? → explore modal
│   │   │   ├── Code checks: did this change the page? → explore new state
│   │   │   └── Code checks: dead end? → go back, try next element
│   │   ├── Code tracks: interactions attempted, interactions completed
│   │   └── Code enforces: all elements tried before moving to next page
│   └── Code calculates coverage: pages, screenshots, interactions, modals, forms
│
├── Step 4: Coverage check (code-enforced)
│   ├── Code checks:
│   │   ├── All nav items visited? (pages visited >= nav items)
│   │   ├── Screenshots >= pages?
│   │   ├── Every page has > 1 interaction? (didn't just look, actually tried)
│   │   ├── Any nav section skipped? → go back
│   │   └── Zero modals on page with buttons? → didn't click, go back
│   ├── Show coverage report to user
│   └── User confirms before proceeding
│
├── Step 5: Generate PRD
│   ├── Spawn: claude -p "generate PRD for {app} using this data: {feature map}" --json-schema {prd-schema}
│   ├── Code validates output:
│   │   ├── Has all 8 top-level sections?
│   │   ├── Each Epic has all 6 sub-sections (TL;DR, Goals, User Stories, Functional Reqs, UX, Narrative)?
│   │   ├── Screenshots referenced exist?
│   │   └── Epics ordered by build priority?
│   ├── If validation fails → re-prompt with specific missing sections
│   ├── Save to .planning/web-to-prd/prd-{app-name}.md
│   └── Save feature map to .planning/web-to-prd/features.json
│
└── Step 6: Export to Notion (optional)
    ├── Ask user: export to Notion? Where?
    ├── Spawn: claude -p "create Notion page with this PRD content" (with Notion MCP)
    ├── For each Epic:
    │   ├── Create sub-page in Notion
    │   ├── Upload screenshots to the page
    │   └── Full PRD format content (all 6 sections)
    └── Show Notion URL to user
```

## Technical Details

### Claude CLI Usage
```bash
# Single turn
claude -p "navigate to URL" --output-format json --session-id prd-123

# Resume same session (preserves browser state)
claude -p "now click the menu" --resume --session-id prd-123 --output-format json

# Structured output
claude -p "list all features" --json-schema '{"type":"object","properties":{"features":{"type":"array"}}}'

# With MCP
claude -p "take screenshot" --mcp-config mcp.json --allowedTools "mcp__playwright__*"

# Budget cap
claude -p "crawl this site" --max-turns 50 --max-budget-usd 5
```

### MCP Config (mcp.json)
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--user-data-dir", "$HOME/.playwright-profile", "--browser", "chrome"]
    }
  }
}
```

### Key Design Decisions

1. **Code controls the loop, Claude provides intelligence.** The page queue, visited set, interaction tracking, coverage calculation — all in code. Claude just navigates, clicks, reads, and writes.

2. **One session per crawl.** Use `--session-id` + `--resume` to keep the browser session alive across turns. Each `claude -p` call is a turn in the same conversation.

3. **Structured output for data extraction.** Use `--json-schema` to force Claude to return features, interactions, page info in a predictable format.

4. **Screenshots managed by code.** Code saves screenshots to disk, names them, tracks which Epic they belong to, uploads to Notion.

5. **Validation is code, not prompt.** Code checks PRD has all sections, all screenshots exist, all nav items were visited. If anything fails, code re-prompts Claude with specific instructions.

## Cost
- Uses existing Claude subscription (Max plan)
- No API key needed
- Rate limits from subscription apply (5hr rolling window)
- Estimated: 50-100 turns per full crawl (20-page app)

## User Experience
```bash
# Install
npx @c0x12c/spartan-web-to-prd "https://app.com"

# Or install globally
npm install -g @c0x12c/spartan-web-to-prd
spartan-web-to-prd "https://app.com"

# Options
spartan-web-to-prd "https://app.com" --no-notion    # skip Notion export
spartan-web-to-prd "https://app.com" --max-pages 50  # limit crawl
spartan-web-to-prd "https://app.com" --resume         # resume interrupted crawl
```

## File Structure
```
experiments/web-to-prd-agent/
├── SPEC.md              # This file
├── RESEARCH.md          # Research findings
├── package.json
├── src/
│   ├── index.ts         # CLI entry point
│   ├── agent.ts         # Main orchestrator
│   ├── crawler.ts       # Page queue, visited set, interaction tracking
│   ├── screenshotter.ts # Screenshot management
│   ├── prd-generator.ts # PRD generation + validation
│   ├── notion-exporter.ts # Notion export
│   ├── claude-cli.ts    # Wrapper around `claude -p`
│   ├── mcp-setup.ts     # Playwright/Notion MCP setup
│   └── types.ts         # TypeScript types
├── templates/
│   └── prd-schema.json  # JSON schema for structured PRD output
└── tests/
```

## Non-Goals (v1)
- No parallel crawling (one page at a time)
- No video recording of crawl
- No diff between crawls (run twice, see what changed)
- No PDF export
- No Figma export
