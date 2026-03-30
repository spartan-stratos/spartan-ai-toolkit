---
name: spartan:web-to-prd
description: Scan a live web app, extract all features, generate PRD with epics/stories/tasks, export to Notion
argument-hint: "[URL of the web app to scan]"
preamble-tier: 3
---

# Web-to-PRD: {{ args[0] | default: "https://example.com" }}

You are the **Web-to-PRD pipeline** — scan a live web app, extract every feature, create PM artifacts, and push to Notion.

**Target URL:** {{ args[0] | default: "https://example.com" }}

---

## Step 0: Prerequisite Check

**This step is mandatory. Do NOT skip it. Do NOT proceed until all checks pass.**

**You (Claude) handle the setup. Don't ask the user to run install commands — do it yourself.**

### Check 1: Playwright MCP

Two checks: (A) is it installed? (B) is it using the Chrome profile?

**Step A: Check if Playwright MCP is installed**

Try to use any Playwright MCP tool (like `browser_snapshot` or `browser_navigate`).

If tool not found → go to **Auto-Install** below.
If tool found → go to **Step B**.

**Step B: Check if it's configured properly**

Read the MCP config:

```bash
cat ~/.claude.json 2>/dev/null | grep -A5 playwright || \
cat .claude.json 2>/dev/null | grep -A5 playwright || \
echo "NO_CONFIG_FOUND"
```

| What you see in config | Status | Action |
|------------------------|--------|--------|
| `--user-data-dir` with `.playwright-profile` | Good (default) | Proceed |
| `--user-data-dir` pointing to real Chrome profile | Risky — extensions cause timeouts | Ask: "Your Playwright uses the real Chrome profile. Extensions can slow it down. Switch to a clean profile?" If yes → **Auto-Install** |
| No `--user-data-dir` (clean mode) | OK for public sites | If site needs login → ask: "Want me to set up a persistent profile so logins are saved?" |
| `--cdp-endpoint` | Advanced mode | OK — proceed |

**Auto-Install (handles both fresh install and reconfigure):**

```bash
# Remove old config
claude mcp remove playwright 2>/dev/null || true

# Add with persistent separate profile (no extensions, fast, Chrome stays open)
claude mcp add playwright -- npx @playwright/mcp@latest --user-data-dir="$HOME/.playwright-profile" --browser=chrome
```

After install, tell the user:

> "Playwright MCP is ready. It uses a separate lightweight profile (no extensions, fast).
>
> For public sites: ready to go.
> For login-protected sites: first run will open a browser — log in there. Your login is saved for next time."

**No need to close Chrome.** Separate profile = no conflict with your running Chrome.

**If the install command fails**, fall back to clean session:
```bash
claude mcp remove playwright 2>/dev/null || true
claude mcp add playwright -- npx @playwright/mcp@latest
```
Tell user: "Installed Playwright without persistent profile. Login-protected sites won't save logins between runs."

**Why NOT use the real Chrome profile:**
- Loads ALL extensions (AdBlock, LastPass, etc.) → timeouts, hangs
- Requires closing Chrome first (profile lock)
- Stale `SingletonLock` files cause infinite hangs after Chrome crash
- A lightweight separate profile is faster and more reliable

### Check 2: Notion MCP

Try to call `notion-search` with query "test".

**If tool not found:**

```
Notion MCP is not connected.

To connect:
  1. Go to Claude Code settings (or Claude Desktop > Settings)
  2. Find "Integrations" or "MCP Servers"
  3. Enable "Notion" and authorize your workspace

Alternative: Install via CLI:
  claude mcp add notion -- npx @anthropic-ai/mcp-notion

Then restart Claude Code and re-run:

  /spartan:web-to-prd {{ args[0] | default: "URL" }}
```

**STOP here. Do not continue.**

**If auth error (needs re-authentication):**

```
Notion MCP needs re-authentication.

Open Claude Code settings and re-authorize Notion access to your workspace.
```

**STOP here.**

### Check 3: Confirm both are working

Show status:

```
Prerequisite Check:
  Playwright MCP: [connected / not found]
  Notion MCP:     [connected / not found / needs auth]

[If both connected]: Ready to scan. Proceeding...
[If any missing]:    Fix the issues above and re-run.
```

**Only proceed to Step 1 if BOTH are connected.**

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

Navigate through each section systematically:

1. **Visit each page** from the navigation
2. **Take a snapshot** (accessibility tree) of each page
3. **Click into sub-pages** — tabs, accordions, detail views
4. **Note interactive elements** — forms, buttons, modals, filters
5. **Don't click destructive actions** — skip Delete, Remove, etc.
6. **Add 1-2 second delay** between navigations
7. **If session expires mid-crawl** (redirected to login) → STOP, tell user to re-login in the browser, wait, then continue

### Progress updates

After every 10 pages or every major section:

> "Progress: Scanned [N] pages. Found [N] feature areas so far.
> Latest section: [section name]
> Continue? [Y/n]"

### What to capture per page

For each page, record:
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

## Step 3: Organize and Prioritize

After crawling is done, organize the raw features:

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

## 4. Functional Requirements

[Grouped by Epic, with priority. This is the main section.]

### Epic 1: [Name] — Priority: P0 — Phase: 1
**Dependencies:** none
**Pages:** [URLs in this area]

| # | Requirement | Priority | Story |
|---|-------------|----------|-------|
| 1.1 | [Specific feature/capability] | P0 | As a user, I can... |
| 1.2 | [Specific feature/capability] | P0 | As a user, I can... |
| 1.3 | [Specific feature/capability] | P1 | As a user, I can... |

**Acceptance Criteria:**
- [ ] [Testable criterion for 1.1]
- [ ] [Testable criterion for 1.2]

### Epic 2: [Name] — Priority: P1 — Phase: 2
**Dependencies:** Epic 1
...

[Repeat for all epics]

## 5. User Experience

### Entry Points
- [How users get into the app]
- [Main navigation structure]

### Key Flows
1. [Flow name]: [step-by-step from entry to completion]
2. [Flow name]: [step-by-step]

### Edge Cases
- [What happens when X fails]
- [Empty states observed]

### Design Notes
- [UI patterns used: sidebar, tabs, cards, etc.]
- [Responsive behavior observed]

## 6. Narrative

[200 words: a story from the user's point of view.
Walk through a typical session using the app.
Makes the PRD feel real, not abstract.]

## 7. Build Roadmap

[This is the actionable section. Shows exactly what to build first.]

### Phase 1: Foundation (no dependencies)
| Epic | Priority | Stories | Est. complexity |
|------|----------|---------|-----------------|
| [Epic A] | P0 | [N] | [Simple/Medium/Complex] |
| [Epic B] | P0 | [N] | [Simple/Medium/Complex] |

### Phase 2: Core Features (depends on Phase 1)
| Epic | Priority | Stories | Est. complexity |
|------|----------|---------|-----------------|
| [Epic C] | P0 | [N] | [Medium/Complex] |

### Phase 3: Enhancement (depends on Phase 2)
...

### Dependency Graph
[Text diagram showing which epics depend on which]

## 8. Open Questions
- [Things that couldn't be determined from the UI]
- [Decisions that need product input]
- [Areas where the app behavior was unclear]
```

**Save locally first:**
```
.planning/web-to-prd/
  prd-[app-name].md
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

1. **Create parent page** — "[App Name] — Product Backlog" with PRD content
2. **Create Epics database** with columns:
   - Name (title)
   - Priority (select: P0, P1, P2, P3)
   - Status (select: Not Started, In Progress, Done)
   - Phase (number)
   - Description (rich text)
3. **Create Stories database** with columns:
   - Name (title)
   - Epic (relation to Epics)
   - Priority (select: P0, P1, P2, P3)
   - Status (select: Backlog, Ready, In Progress, Review, Done)
   - User Story (rich text)
   - Acceptance Criteria (rich text)
4. **Create Tasks database** with columns:
   - Name (title)
   - Story (relation to Stories)
   - Status (select: To Do, In Progress, Done)
   - Type (select: Frontend, Backend, Design, DevOps, QA)
5. **Populate all databases** with the extracted data
6. **Create views:**
   - Kanban by Status (for Stories)
   - Table grouped by Epic (for Stories)

### If C: Local only

Save to `.planning/web-to-prd/` and done.

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
