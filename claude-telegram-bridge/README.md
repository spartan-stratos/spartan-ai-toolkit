# Claude Code Telegram Bridge

Remote control Claude Code from Telegram when you're away from your desk.

```
Phone (Telegram) <-> Bridge (local) <-> Claude Agent SDK <-> Claude API
```

Supports **multiple projects** — switch between Claude Code sessions from your phone.

## How It Works

- Uses `@anthropic-ai/claude-agent-sdk` — no child processes, no CLI spawning
- Each message you send triggers a `query()` call to Claude
- Responses stream to Telegram in real-time via `editMessageText`
- Sessions persist across bridge restarts (resume via session ID)
- Cost tracking per project and total
- Secrets are automatically redacted before reaching Telegram

## Setup

### 1. Create Telegram Bot

Open Telegram, find **@BotFather**, send `/newbot`, name it, copy the **token**.

### 2. Get Your Chat ID

Open Telegram, find **@userinfobot**, send `/start`, copy your **Id** (number).

### 3. Authenticate Claude

Either set `ANTHROPIC_API_KEY` in `.env`, or run:
```bash
claude login
```

### 4. Configure

```bash
cp .env.example .env
```

Edit `.env`:
```
TELEGRAM_TOKEN=123456:ABC-DEF...
MY_CHAT_ID=987654321
```

### 5. Install & Run

```bash
cd claude-telegram-bridge
npm install
node bridge.js
```

Or run in background:
```bash
npm install -g pm2
pm2 start bridge.js --name claude-bridge
pm2 logs claude-bridge
```

### 6. Add Projects

**Option A: Scan (recommended)** — no need to remember paths:
```
/scan
```
The bridge lists all folders in your workspace. Send the number to add:
```
Found 28 project(s):

1. prj-CF
2. prj-sophie
3. prj-spartan-new-platform
...

Send a number (e.g. 3) to add that project. Expires in 2min.
```
Reply `3` and the project is added instantly.

You can also scan a specific directory:
```
/scan ~/dev
```

**Option B: Manual** — if you know the exact path:
```
/add forge /Users/you/dev/forge-service
/add admin /Users/you/dev/insight-admin claude-sonnet-4-6
```

### Pre-configured projects (optional)

If you prefer to pre-configure projects, create a `projects.json`:

```json
[
  {
    "name": "forge",
    "path": "/Users/you/dev/forge-service",
    "model": "claude-opus-4-6"
  }
]
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Short name for the session (used in commands) |
| `path` | yes | Absolute path to project directory |
| `model` | no | Claude model (default: `claude-opus-4-6`) |

Projects added via `/add` or `/scan` are automatically saved to `projects.json`.

## Commands

### Session Management

| Command | Action |
|---------|--------|
| `/sessions` | List all sessions with status and cost |
| `/scan [path]` | Scan for projects, pick by number to add |
| `/switch <name>` | Switch active session by name |
| `/1` `/2` `/3` | Quick switch by number |
| `/start <name>` | Show session info |
| `/restart [name]` | Reset session (next message starts fresh) |
| `/add <name> <path>` | Add a project manually by path |
| `/remove <name>` | Remove a project |

### Active Session

| Command | Action |
|---------|--------|
| Type text | Send query to active session |
| `y` / `n` | Quick replies (keyboard buttons) |
| `/cancel` | Abort current query |
| `/stop <name>` | Abort a specific session's query |
| `/status` | Show last output lines |
| `/cost` | Show cost breakdown per project |
| `/ping` | Check bridge status |

### Keyboard Layout

The Telegram keyboard updates dynamically:

```
[  y  ] [  n  ] [ /cancel ]
[ > 1:forge ] [ ~ 2:admin ] [ 3:toolkit ]
[ /status ] [ /sessions ] [ /ping ]
```

- `>` = active session
- `~` = busy (query in progress)
- Tap a session button to switch to it

## Features

### Streaming Responses

Claude's responses stream in real-time — the "Working..." message updates every 300ms as Claude generates output. The final message includes a cost footer.

### Session Persistence

Session IDs are saved to `sessions.json` (gitignored). When you restart the bridge, sessions resume where they left off. Sessions expire after 24 hours.

### Cost Tracking

Every query reports cost. Use `/cost` for a per-project breakdown, or `/sessions` to see cost next to each project.

### Secret Redaction

API keys, tokens, passwords, connection strings, and private keys are automatically redacted before being sent to Telegram.

### Project Scanning

Use `/scan` to discover projects in your workspace without typing paths. Configure the scan directory in `.env`:
```
SCAN_ROOTS=~/WORKSPACES,~/dev,~/projects
```
Default: `~/WORKSPACES`.

## Security

- **Hard reject** all messages not from your `MY_CHAT_ID`
- Secrets automatically redacted from all output
- Bot token + chat ID kept in `.env` (gitignored)
- Session data kept in `sessions.json` (gitignored)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Bot not responding | Check `TELEGRAM_TOKEN` in `.env` |
| "Unauthorized" | `MY_CHAT_ID` incorrect — get it from @userinfobot |
| Auth error from SDK | Run `claude login` or set `ANTHROPIC_API_KEY` in `.env` |
| Query hangs | Use `/cancel` to abort, then try again |
| Session stale | Use `/restart` to start a fresh session |
| `/scan` shows wrong folder | Set `SCAN_ROOTS` in `.env` |
