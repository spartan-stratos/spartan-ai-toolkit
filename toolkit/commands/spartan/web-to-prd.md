---
name: spartan:web-to-prd
description: Scan a live web app, extract all features, generate PRD with epics/stories/tasks, export to Notion
argument-hint: "[URL of the web app to scan]"
---

# Web-to-PRD: {{ args[0] | default: "https://example.com" }}

You are the **Web-to-PRD pipeline** — scan a live web app, extract every feature, create PM artifacts, and push to Notion.

**Target URL:** {{ args[0] | default: "https://example.com" }}

---

## Step 0: Prerequisite Check

**This step is mandatory. Do NOT skip it.**

**IMPORTANT: `claude mcp add/remove` does NOT make tools available mid-session.** MCP tools only load when Claude Code starts. NEVER try to install or reconfigure MCP servers during a running session — it changes the config but won't load the tools. This causes the session to get stuck in a loop.

### Check 1: Playwright MCP (REQUIRED)

Try to call any Playwright MCP tool (like `browser_snapshot` or `browser_navigate`).

**If the tool works** → check config is good:

```bash
cat ~/.claude.json 2>/dev/null | grep -A5 playwright || \
cat .claude.json 2>/dev/null | grep -A5 playwright || \
echo "NO_CONFIG_FOUND"
```

| Config | Status | Action |
|--------|--------|--------|
| `--user-data-dir` with `.playwright-profile` | Good | Proceed |
| `--user-data-dir` pointing to real Chrome profile | Risky | Warn: extensions cause timeouts |
| No `--user-data-dir` (clean mode) | OK for public sites | Proceed |
| `--cdp-endpoint` | Advanced mode | Proceed |

**If the tool is NOT found** → Playwright MCP is not loaded. Show this and STOP:

```
Playwright MCP is not available. I need it to control a browser.

Run this in your terminal (outside Claude Code):

  claude mcp add playwright -- npx @playwright/mcp@latest --user-data-dir=$HOME/.playwright-profile --browser=chrome

Then restart Claude Code and run:

  /spartan:web-to-prd {{ args[0] | default: "URL" }}
```

**Do NOT try to run `claude mcp add` yourself.** It won't load the tools in this session.

### Check 2: Notion MCP (OPTIONAL)

Try to call `notion-search` with query "test".

- **If found** → will export to Notion at the end.
- **If not found** → note it, PRD will be saved locally. This is fine — continue the crawl.

Notion is a nice-to-have. The PRD always saves locally regardless.

### Show status and proceed

```
Prerequisite Check:
  Playwright MCP: [connected / not found]
  Notion MCP:     [connected / not found] (optional)

[If Playwright connected]: Ready to scan. Proceeding...
[If Playwright missing]:   Install instructions above. STOP.
```

**Only Playwright is required. Notion is optional.**

---

## Step 1: Navigate and Handle Login

**This step ensures we're fully logged in before exploring anything.**

### 1-pre. Clean up stale browser processes (MANDATORY before first navigate)

Playwright MCP leaves orphan Chrome processes from previous runs. These cause "Opening in existing browser session" errors. **Always run this before the first `browser_navigate` call:**

```bash
# Remove stale lock files (safe — doesn't kill any processes)
rm -f "$HOME/.playwright-profile/SingletonLock" \
      "$HOME/.playwright-profile/SingletonCookie" \
      "$HOME/.playwright-profile/SingletonSocket" 2>/dev/null

echo "Browser cleanup done"
```

**WARNING:** Do NOT run `pkill -f "playwright-profile"` — it kills the Playwright MCP server process too, disconnecting the tools mid-session. Only remove lock files.

**If `browser_navigate` still fails with "Opening in existing browser session":**
1. Run the cleanup again
2. Wait 2 seconds
3. Retry once
4. If still fails → tell user to restart Claude Code (MCP server needs fresh start)

Now navigate to the target URL using Playwright. Take a snapshot.

### 1a. Check if login is needed

Look at the snapshot for login signals:
- Login/Sign-in form fields (email, password)
- "Sign in", "Log in", "Create account" text
- OAuth buttons (Google, GitHub, SSO)
- URL contains `/login`, `/signin`, `/auth`
- Redirect to a different domain (auth provider)

### 1b. If login page detected — STOP and handle login

Playwright opens a **visible browser window** (headed mode). The user can see and interact with it.

Tell the user:

> "This app needs login before I can see all the features.
> A Chrome window should be open on your screen.
>
> Please log in directly in that browser window.
> I won't see or store your credentials.
>
> Tell me when you're logged in."

**Wait for user confirmation.** Do NOT proceed until they say "done", "logged in", or similar.

After user confirms:
1. Take a snapshot of the current page
2. Check if still on login page → "Still seeing the login page. Try again?"
3. Check if on dashboard/home/main content → "Logged in. Proceeding."
4. If unclear → ask user: "I see [page title]. Is this the main page after login?"

**Repeat until login is confirmed.** Do NOT start crawling while on a login page.

**Login security rules:**
- Never use `browser_type` to enter passwords — user types directly in browser
- Never ask for credentials in chat
- Never screenshot login pages (could capture pre-filled credentials)
- SSO/OAuth popups work normally — wait for user to complete

### 1c. If NOT a login page — proceed directly

The site is public or already logged in (cookies from previous session).

### 1d. Verify access level

After login (or on public site), check what's visible:

> "I can see [dashboard/home page]. I see these navigation sections:
> 1. [Section name]
> 2. [Section name]
> ...
>
> Does this look like full access? Or are there sections I'm missing?
> (Some apps hide admin/settings pages behind roles)"

**Wait for user to confirm** before starting the full crawl. This prevents generating a PRD from a limited view.

### 1e. Show crawl plan

```
Crawl Plan: [App Name]
URL:        [target URL]
Type:       [SPA / Multi-page / Hybrid]
Auth:       [Logged in / Public]
Estimated pages: ~[N]
Estimated time:  [N] minutes

Sections to explore:
  1. [Section name] — [N sub-items]
  2. [Section name] — [N sub-items]
  ...

Proceed? [Y/n]
```

---

## Step 2: Crawl and Extract

**Only start this step after login is confirmed and crawl plan is approved.**

**Goal: Try EVERY feature you can find.** Missing features = incomplete PRD = useless output.

### Two-pass crawl strategy

**Pass 1: Map all pages (breadth-first)**

Go through every navigation link and build a complete sitemap FIRST. Don't explore features deeply yet.

1. Start at homepage/dashboard
2. Read the full navigation (sidebar, top nav, footer)
3. Visit each nav item → take screenshot → note the page title and type → go back
4. For each page, check for sub-navigation (tabs, nested menus) → note them
5. Build a sitemap of ALL discoverable pages
6. **Go back to home between sections** — don't get lost in deep pages

After Pass 1, show the user the sitemap:
> "I found [N] pages across [N] sections:
> 1. Dashboard — 1 page
> 2. Projects — 3 pages (list, detail, settings)
> 3. Users — 2 pages (list, profile)
> ...
> Anything I'm missing? Any hidden sections?"

**Pass 2: Deep exploration (exhaust every feature, go as deep as possible)**

Now go through each page from the sitemap. **On each page, follow every interaction path until you hit a dead end.**

1. **Navigate to the page** — take a full screenshot
2. **Read the entire page** — snapshot the accessibility tree
3. **Try every interactive element on this page — follow the chain:**
   - Click a button → what opens? A modal? A new page? A dropdown?
     - If modal → what's inside? A form? Screenshot it. What fields? What happens on submit?
     - If new page → is this a sub-page? Add to sitemap. Explore it fully before coming back.
     - If dropdown → what options? Click each option. What changes?
   - Click every tab → screenshot each tab. What content is different? Any sub-features inside each tab?
   - Expand every accordion → what's inside? More buttons? More links? Follow them.
   - Check every form → note ALL fields, types, placeholder text, validation rules.
     - Are there conditional fields? (selecting option A shows different fields than option B)
   - Test filters/search → type something → screenshot results → clear → try different filter combos
   - Check hover states → tooltips? Action menus?
   - Look for pagination → how many pages? What controls?
   - Check empty states → what shows when a list has no items?
4. **The rule: follow every path until there's nothing left to click.**
   - Button → Modal → Form → Submit → Result → Back
   - Tab → Content → Sub-tab → Detail → Back
   - List → Click item → Detail page → Actions → Back to list
5. **Take screenshots of each state** — modal open, filter applied, tab selected, form filled, etc.
6. **Go back to the page's starting state** after exploring each branch
7. **Move to next page only when you've exhausted every interaction on this page**

**Rules for both passes:**
- **Don't click destructive actions** — skip Delete, Remove, Reset, etc.
- **Add 1-2 second delay** between navigations
- **If session expires** (redirected to login) → STOP, tell user to re-login, wait, then continue
- **Check hidden navigation** — hamburger menus, footer links, user avatar dropdowns, help/docs sections
- **Go back to home/nav between sections** — don't lose your place

### Progress updates

After every 10 pages or every major section:

> "Progress: Scanned [N] pages. Found [N] feature areas so far.
> Latest section: [section name]
> Continue? [Y/n]"

### Screenshots (MANDATORY)

**Take a screenshot of EVERY page and important UI state.** Screenshots make the PRD 10x easier to understand.

```bash
# Create screenshots directory
mkdir -p .planning/web-to-prd/screenshots
```

**When to screenshot:**
- Every main page (after it fully loads)
- Modals/dialogs when opened
- Dropdowns/menus when expanded
- Different tab states
- Filter results (before and after filtering)
- Forms (showing fields and layout)
- Empty states
- Error states (if visible)

**How to take screenshots:** Use Playwright MCP's `browser_screenshot` tool. Save each screenshot with a clear name:

```
.planning/web-to-prd/screenshots/
  01-homepage.png
  02-dashboard.png
  03-settings-general.png
  04-settings-billing.png
  05-user-list.png
  06-user-detail.png
  07-create-modal.png
  08-filter-expanded.png
  ...
```

**Naming:** `{NN}-{page-or-feature-name}.png` — numbered in crawl order for easy reference.

**Never screenshot login pages** — could capture pre-filled credentials.

### What to capture per page

For each page, record:
- **Screenshot** (saved to `.planning/web-to-prd/screenshots/`)
- URL and page title
- Page type (dashboard, list, detail, form, settings, etc.)
- Features visible on the page
- Form fields and their types
- Action buttons and what they do
- Data displayed (tables, charts, cards)
- Navigation elements (tabs, breadcrumbs, sidebar items)

### Build the feature map

As you crawl, build a structured feature map:

```yaml
app:
  name: "[detected app name]"
  url: "[target URL]"
  sections:
    - name: "[Section from nav]"
      pages:
        - url: "/path"
          title: "Page Title"
          type: "list"
          features:
            - name: "Feature name"
              type: "data-display | form | action | filter | notification"
              description: "What it does"
              ui_elements: ["table", "search bar", "export button"]
```

---

## Step 2.5: Coverage Check (MANDATORY before generating PRD)

**You CANNOT proceed to Step 3 until this checklist passes. This prevents shallow PRDs.**

Before generating anything, count what you found and show the user:

```
Coverage Report:
  Pages visited:        [N] (must be > number of nav items)
  Screenshots taken:    [N] (must be >= pages visited)
  Buttons clicked:      [N]
  Modals/dialogs found: [N]
  Forms found:          [N] (with field counts)
  Tabs explored:        [N]
  Filters tested:       [N]
  Dropdowns opened:     [N]
  Sub-pages discovered: [N] (pages found by clicking, not from nav)

  Sections from nav:    [list all nav items]
  Sections explored:    [list which ones you actually visited]
  Sections NOT explored: [list any you skipped — explain why]
```

**Fail conditions (must fix before proceeding):**
- [ ] Any nav section not explored → go back and explore it
- [ ] Fewer screenshots than pages → go back and screenshot missing pages
- [ ] Zero modals found on a page with action buttons → you didn't click the buttons, go back
- [ ] Zero forms found on an app with user input → you missed them, go back
- [ ] Any section explored with only 1 interaction → you only looked, didn't try features

**Ask the user:**
> "Here's my coverage report. I visited [N] pages, took [N] screenshots, tried [N] interactions.
> Missing anything? Any sections I should go back to?"

**Only proceed to Step 3 after user confirms coverage is enough.**

---

## Step 3: Organize and Prioritize

After crawling is done AND coverage check passes, organize the raw features:

### 3a. Group into Epics

Group features by:
1. Navigation sections (natural grouping)
2. User goals (what the user is trying to do)
3. Data domain (features that touch the same data)

### 3b. Write User Stories

For each feature, write a story:
> As a [user type], I can [action] so that [benefit]

Add acceptance criteria (2-4 per story).

### 3c. Assign Priorities

| Priority | Rule |
|----------|------|
| P0 | Core flow — app is broken without it |
| P1 | Important — app is usable but limited without it |
| P2 | Nice to have — enhancement, polish |
| P3 | Future — advanced, not needed now |

### 3d. Map Dependencies

Figure out build order:
- Auth always comes first
- CRUD: Create → Read/List → Update → Delete
- Data display depends on data input
- Settings depend on the feature they configure

### 3e. Show summary and confirm

> "Here's what I found:
>
> **App:** [name]
> **Pages scanned:** [N]
> **Epics:** [N]
> **Stories:** [N]
> **Tasks:** [N]
>
> **Build order:**
> Phase 1: [Epic A, Epic B] — no dependencies
> Phase 2: [Epic C] — depends on Phase 1
> Phase 3: [Epic D, Epic E] — depends on Phase 2
>
> Anything look wrong or missing before I generate the PRD?"

---

## Step 4: Generate PRD

Generate a full PRD document with this structure:

```markdown
# PRD: [App Name]

## 1. TL;DR

[1-2 sentences: what this app does, who it's for, what problem it solves, what makes it different.]

## 2. Goals

### Business Goals
- [What this app is trying to achieve as a business]
- [Revenue model, growth metrics observed]

### User Goals
- [What users can do with this app]
- [What pain it solves]

### Non-Goals
- [Things this app intentionally doesn't do]
- [Adjacent features it could have but chose not to]

## 3. User Stories

[Grouped by persona/role detected in the app:]

- As a [user type], I want to [action], so that [benefit]
- As a [admin/manager], I want to [action], so that [benefit]

## 4. Epics (ordered by implementation priority)

**Epics are ordered 1, 2, 3... by build order. Epic 1 = build first. Each Epic is a mini-PRD — a developer reads it and knows exactly what to build.**

**IMPORTANT: Try every feature you can find.** Click every menu item, tab, button (except destructive ones). Open modals, expand accordions, test filters, check settings. Features you don't try = features missing from the PRD.

---

### Epic 1: [Name] — Build First

**Phase:** 1 | **Dependencies:** none | **Complexity:** Simple/Medium/Complex

**Each Epic follows the FULL PRD format below. No shortcuts.**

#### 1. TL;DR
[1-2 sentences: what problem this epic solves, who it's for, what we're building, and why it matters.]

#### 2. Goals

**Business Goals**
- [What this epic achieves for the business — metrics, conversion, retention]

**User Goals**
- [What pain this solves for the user — specific, measurable]

**Non-Goals**
- [What's NOT in this epic — keeps scope clear]

#### 3. User Stories
- As a [user type], I want to [action], so that [benefit]
- As a [other user type], I want to [action], so that [benefit]

#### 4. Functional Requirements

**Screenshots:** (MUST be embedded inline — show what each feature looks like)

**4.1 [Feature name]** (Priority: High)
- [What it does — specific, not vague]
- [UI elements: buttons, forms, tables, cards, layout]
- [Data displayed: what columns, what values, what format]

![Feature name](screenshots/NN-detail.png)

**4.2 [Feature name]** (Priority: High)
- [What it does]
- [UI details]

![Feature name](screenshots/NN-detail.png)

**4.3 [Feature name]** (Priority: Medium)
- [What it does]

[Continue for ALL features in this epic. EVERY feature that has a screenshot MUST embed it with `![name](path)` syntax.]

#### 5. User Experience

**Entry Point**
- [How the user gets to this feature — which page, which button]

**Flow**
1. User [does X] → sees [Y]
2. User [clicks Z] → system [shows W]
3. User [completes action] → [result]

**Edge Cases**
- Empty state: [what shows when no data]
- Error state: [what shows when something fails]
- Loading state: [what shows while loading]
- First-time user: [any onboarding or tooltip]

**Design Notes**
- [Layout patterns: cards, tables, sidebar, tabs]
- [Visual details: colors, icons, spacing]
- [Responsive behavior if observed]

#### 6. Narrative
[100 words: a short story from the user's perspective using THIS epic's features. Name the user, describe context, show the value.]

---

### Epic 2: [Name] — Build After Epic 1

**Phase:** 1 | **Dependencies:** Epic 1 | **Complexity:** Medium

[SAME full PRD format — sections 1-6. Every epic gets ALL 6 sections.]

---

[Continue for ALL epics, ordered by build priority. NO epic can skip any section.]

---

## 5. User Flows (end-to-end)

[These connect stories across epics. Show the full user journey.]

### Flow 1: [Name — e.g., "New user signs up and creates first project"]
1. User lands on [page] → sees [what]
2. Clicks [button] → goes to [page]
3. Fills in [form fields] → submits
4. System [creates/processes] → shows [result]
5. User can now [next action]

### Flow 2: [Name]
1. ...

### Edge Cases (cross-epic)
- [What happens when X fails mid-flow]
- [Empty states across flows]

### Design Patterns Observed
- [Navigation pattern: sidebar/tabs/breadcrumbs]
- [Form patterns: inline edit/modal/full page]
- [Data display: cards/tables/lists]
- [Responsive behavior]

## 6. Narrative

[200 words: walk through a typical user session from their point of view.
Makes the PRD feel real. Name the user, describe their context, show the friction points.]

## 7. Build Roadmap

[Shows the order to build. Each phase lists epics that can be built in parallel.]

### Phase 1: Foundation (no dependencies)
| Epic | Priority | Stories | Complexity | Why first |
|------|----------|---------|------------|-----------|
| [Epic A] | P0 | [N] | [Simple/Medium/Complex] | [Reason] |
| [Epic B] | P0 | [N] | [Simple/Medium/Complex] | [Reason] |

### Phase 2: Core (depends on Phase 1)
| Epic | Priority | Stories | Complexity | Why this phase |
|------|----------|---------|------------|----------------|
| [Epic C] | P0 | [N] | [Medium/Complex] | [Reason — what from Phase 1 it needs] |

### Phase 3: Enhancement (depends on Phase 2)
...

### Dependency Graph
```
[Text diagram showing which epics depend on which]

Epic A (Phase 1) ──→ Epic C (Phase 2) ──→ Epic F (Phase 3)
Epic B (Phase 1) ──→ Epic D (Phase 2)
                     Epic E (Phase 2) ──→ Epic G (Phase 3)
```

## 8. Open Questions
- [Things that couldn't be determined from the UI]
- [Decisions that need product input]
- [Areas where the app behavior was unclear]
- [Features that might be behind a paywall or role — couldn't access]
```

**Screenshots in the markdown PRD are MANDATORY.** Every feature that has a screenshot must embed it inline using `![Feature name](screenshots/NN-name.png)`. The path should be relative to the PRD file location. This makes the PRD self-contained — anyone opening the markdown sees the screenshots right next to the features they describe.

**Save locally first:**
```
.planning/web-to-prd/
  prd-[app-name].md          ← screenshots embedded as ![name](screenshots/NN.png)
  screenshots/                ← actual screenshot files
```

---

## Step 5: Export to Notion

Ask the user:

> "Where should I create the backlog in Notion?
>
> A) New page in workspace root
> B) Under an existing page (I'll search for it)
> C) Skip Notion — just keep the local PRD file"

### If A or B: Create Notion structure

**Structure: Parent page + one sub-page per Epic (each Epic is a full page, not a database row)**

1. **Create parent page** — "[App Name] — PRD"
   - Sections 1-3 (TL;DR, Goals, User Stories) as page content
   - Sections 5-8 (User Flows, Narrative, Build Roadmap, Open Questions) as page content
   - Table of contents linking to each Epic sub-page

2. **Create one Notion page PER Epic** — as children of the parent page
   Each Epic page MUST contain:
   - **Title:** "Epic [N]: [Name] — P[priority] — Phase [N]"
   - **Properties at top:** Priority, Phase, Complexity, Dependencies
   - **Full content from Section 4** — the entire mini-PRD for this Epic:
     - What this does (2-3 sentences)
     - Pages/Screens involved
     - **Screenshots embedded directly in the page** (not just local file references)
     - Every feature with: user story, UI description, step-by-step flow, acceptance criteria, edge cases
   - This is a FULL page, not a one-line database entry

3. **Upload screenshots to each Epic page**
   - For each screenshot referenced in the Epic, embed it in the Notion page
   - Place screenshots next to the feature they document
   - Use Notion's image embedding — the screenshot should be VISIBLE in the page, not a link to a local file
   - If Notion MCP doesn't support image upload → add the screenshot file path and tell user to upload manually

4. **Optionally create an Epics overview database** (for filtering/sorting):
   - Name, Priority, Status, Phase, Complexity, Dependencies columns
   - Each row links to its full Epic page
   - Views: Table by Phase, Kanban by Status

**IMPORTANT: Each Epic in Notion must be as detailed as in the local PRD file. Don't summarize. Copy the full content.**

### If C: Local only

Save to `.planning/web-to-prd/` with screenshots in `screenshots/` subdirectory.

---

## Step 6: Done

Show final summary:

```
Web-to-PRD Complete

App:     [name]
URL:     [url]
Scanned: [N] pages

Generated:
  - [N] Epics
  - [N] Stories
  - [N] Tasks
  - [N] Phases (build order)

Saved to:
  - Local: .planning/web-to-prd/prd-[app-name].md
  - Notion: [page URL if exported]

Next steps:
  - Review the PRD and adjust priorities
  - Use /spartan:spec to detail individual features
  - Use /spartan:plan to plan implementation for each epic
```

---

## Rules

1. **Prerequisites are non-negotiable.** Always check Playwright and Notion MCP first. Don't try to work around missing tools.
2. **Don't guess features you can't see.** Only document what's visible in the UI.
3. **Don't click destructive buttons.** No Delete, Remove, Reset, or similar actions during crawl.
4. **Show progress.** Update the user every 10 pages or every section.
5. **Local save always happens.** Even if Notion export works, save the PRD locally too.
6. **Ask before login.** Never assume credentials. Let the user handle auth manually.
7. **One app per run.** Don't follow links to external domains.
8. **Delay between pages.** 1-2 seconds between navigations. Don't hammer the server.
9. **Mark assumptions.** If you're guessing what a feature does, say so.
10. **The PRD is a starting point.** Tell the user to review and adjust — it's not final.
