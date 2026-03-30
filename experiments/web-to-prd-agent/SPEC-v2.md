# Spec v2: Hybrid Crawler — Playwright Does Mechanical Work, AI Does Judgment

## Pain
v1 uses AI for everything — navigating, reading pages, clicking buttons, taking screenshots. Each step = 1 `claude -p` call. A 20-page app costs 80-150 turns, eats the Max plan quota fast.

## Key Insight
40-60% of what AI does in v1 is mechanical work that Playwright can do alone (follow links, read DOM, take screenshots, list elements). AI is only needed for judgment calls (what to click, what features mean, writing the PRD).

## Architecture: v1 vs v2

```
v1 (current — AI does everything):
  claude -p "navigate to URL"           ← AI turn
  claude -p "list all nav items"        ← AI turn
  claude -p "navigate to /settings"     ← AI turn
  claude -p "take screenshot"           ← AI turn
  claude -p "click Save button"         ← AI turn
  claude -p "what happened?"            ← AI turn
  ... x80-150 turns per app

v2 (hybrid — Playwright crawls, AI interprets):
  Playwright: follow all <a> links, build sitemap        ← code, $0
  Playwright: for each page, extract ARIA tree + DOM     ← code, $0
  Playwright: take screenshots of every page             ← code, $0
  Playwright: list all interactive elements per page     ← code, $0
  AI: "here are 20 pages with elements, which buttons    ← 1 turn
       should I click to discover hidden features?"
  Playwright: click those buttons, diff DOM, screenshot  ← code, $0
  AI: "here's the DOM diff after each click,             ← 1 turn
       what features did we find?"
  AI: "here's all data + screenshots, write the PRD"     ← 1 turn
  ... ~3-5 turns per app
```

## What Changes

### New: Direct Playwright (npm package, not MCP)

Use `playwright` npm package directly instead of Playwright MCP through Claude.

```
npm install playwright
```

Code controls the browser. No MCP, no Claude for navigation.

### New Module: `src/browser.ts`

Wraps Playwright browser for direct use:

```typescript
class Browser {
  async launch(): Promise<void>        // start chromium
  async goto(url: string): Promise<void>
  async screenshot(path: string): Promise<void>
  async getAriaTree(): Promise<AriaNode[]>
  async getAllLinks(): Promise<string[]>
  async getAllInteractiveElements(): Promise<Element[]>
  async click(selector: string): Promise<DOMDiff>
  async close(): Promise<void>
}
```

### New Module: `src/dom-differ.ts`

Compare DOM/ARIA tree before and after an action:

```typescript
interface DOMDiff {
  newElements: Element[]      // appeared after click
  removedElements: Element[]  // disappeared after click
  changedElements: Element[]  // text/attributes changed
  urlChanged: boolean
  modalOpened: boolean        // role="dialog" appeared
  dropdownOpened: boolean     // role="listbox" or role="menu" appeared
}
```

### Modified: `src/crawler.ts`

Two phases, split by who does the work:

**Phase 1: Mechanical crawl (Playwright, no AI)**
1. Navigate to start URL
2. Find all `<a>` links → add to queue
3. BFS through queue:
   - Navigate to page
   - Extract ARIA tree (`page.accessibility.snapshot()` or `locator.ariaSnapshot()`)
   - Take screenshot
   - List all interactive elements (buttons, inputs, tabs, dropdowns)
   - Find sub-links → add to queue
4. Build structured page data

**Phase 2: Smart exploration (AI-guided, Playwright executes)**
1. Send all page data to Claude in ONE call:
   "Here are N pages with their elements. Which buttons/tabs should I click to discover hidden features? Return a list of actions."
2. Playwright executes each action:
   - Click element
   - Diff DOM before/after
   - Screenshot if meaningful change
3. Send results back to Claude in ONE call:
   "Here are the DOM diffs from each click. What features did we find?"

**Phase 3: PRD generation (AI, 1 call)**
- Send all data + screenshots to Claude
- Get back structured PRD

### Modified: `src/claude-cli.ts`

Still used, but only for 3-5 calls total instead of 80+.

### Removed dependency on Playwright MCP

No more `--mcp-config` or `mcp__playwright__*`. The code talks to Playwright directly.

## Token Cost Comparison

| App size | v1 (AI everything) | v2 (hybrid) |
|----------|-------------------|-------------|
| 5 pages | ~20-30 turns | ~3-4 turns |
| 20 pages | ~80-150 turns | ~4-5 turns |
| 50 pages | ~200-400 turns | ~5-7 turns |

v2 scales much better because adding pages only costs Playwright time (free), not AI turns.

## What AI Still Does (can't avoid)

1. **Deciding what to click** — "This page has 15 buttons. Which ones will reveal features vs which are just submit/close/cancel?" Needs judgment.
2. **Interpreting DOM diffs** — "8 new elements appeared after click. Is this a modal with a form, or just a tooltip?" Sometimes obvious from ARIA roles, sometimes not.
3. **Understanding features** — "What does this settings page actually configure? What's the business value?"
4. **Writing the PRD** — grouping into epics, user stories, priorities, narratives.

## What Playwright Does Alone (saves AI turns)

1. Following `<a>` links (sitemap building)
2. Taking screenshots
3. Extracting ARIA trees and DOM structure
4. Listing elements by role (button, input, tab, link, etc.)
5. Executing clicks and capturing DOM diffs
6. Detecting modals (`role="dialog"`), dropdowns (`role="listbox"`), forms (`<form>`)
7. Detecting URL changes after clicks

## Known Limitations (from research)

- **40-60% of features discoverable** by Playwright alone (links + visible elements)
- **Remaining 40-60%** needs AI guidance to discover (click buttons, explore workflows)
- Custom components without ARIA roles → need AI to interpret screenshots
- Canvas-based UIs → blind spot for both Playwright and ARIA
- Multi-step workflows → AI must plan the sequence of actions
- Anti-bot protections → not a problem for first-party apps

## File Structure (changes from v1)

```
src/
  index.ts           # CLI entry (unchanged)
  agent.ts           # orchestrator (simplified — fewer AI calls)
  browser.ts         # NEW: direct Playwright wrapper
  dom-differ.ts      # NEW: DOM diff before/after actions
  crawler.ts         # REWRITTEN: phase 1 mechanical, phase 2 AI-guided
  screenshotter.ts   # unchanged
  prd-generator.ts   # unchanged
  notion-exporter.ts # unchanged
  claude-cli.ts      # unchanged (used less)
  mcp-setup.ts       # REMOVED (no more MCP)
  types.ts           # updated with new types
```

## Dependencies

```json
{
  "dependencies": {
    "playwright": "^1.49.0"
  }
}
```

No more reliance on Playwright MCP or `claude mcp` commands. Simpler setup.

## Non-Goals (v2)

- No parallel page crawling (one page at a time, keeps it simple)
- No login automation (still manual — user logs in via browser window)
- No resume support (save for v3)
- No Notion improvements (save for v3)
