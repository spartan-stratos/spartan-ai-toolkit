# Claude Code Telegram Bridge

Remote control Claude Code from Telegram when you're away from your desk.

```
Phone (Telegram) <-> Bridge (local) <-> Claude Code sessions (local)
```

Supports **multiple projects** — switch between Claude Code sessions from your phone.

## Setup

### 1. Create Telegram Bot

Open Telegram, find **@BotFather**, send `/newbot`, name it, copy the **token**.

### 2. Get Your Chat ID

Open Telegram, find **@userinfobot**, send `/start`, copy your **Id** (number).

### 3. Configure

```bash
cp .env.example .env
cp projects.json.example projects.json
```

Edit `.env`:
```
TELEGRAM_TOKEN=123456:ABC-DEF...
MY_CHAT_ID=987654321
```

Edit `projects.json`:
```json
[
  {
    "name": "forge",
    "path": "/Users/you/dev/forge-service",
    "model": "claude-opus-4-6",
    "autoStart": true
  },
  {
    "name": "admin",
    "path": "/Users/you/dev/insight-admin",
    "model": "claude-sonnet-4-6",
    "autoStart": false
  }
]
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Short name for the session (used in commands) |
| `path` | yes | Absolute path to project directory |
| `model` | no | Claude model (default: `claude-opus-4-6`) |
| `autoStart` | no | Start session on bridge launch (default: `true`) |

**Legacy mode:** If no `projects.json` exists, falls back to `CLAUDE_PROJECT_PATH` from `.env` (single session).

### 4. Install & Run

```bash
npm install
node bridge.js
```

Or run in background:
```bash
npm install -g pm2
pm2 start bridge.js --name claude-bridge
pm2 logs claude-bridge
```

## Commands

### Session Management

| Command | Action |
|---------|--------|
| `/sessions` | List all sessions with status |
| `/switch <name>` | Switch active session by name |
| `/1` `/2` `/3` | Quick switch by number |
| `/start <name>` | Start a stopped session |
| `/stop <name>` | Stop a specific session |
| `/add <name> <path>` | Add a new project (starts immediately) |
| `/remove <name>` | Remove a project (stops session first) |

### Active Session

| Command | Action |
|---------|--------|
| Type text | Send to active session |
| `y` / `n` / `skip` | Quick replies (keyboard buttons) |
| `/status` | Show last output lines |
| `/kill` | Stop active session |
| `/restart` | Restart active session |
| `/ping` | Check bridge and session status |

### Keyboard Layout

The Telegram keyboard updates dynamically:

```
[  y  ] [  n  ] [ skip ]
[ > 1:forge ] [ 2:admin ] [ x 3:toolkit ]
[ /status ] [ /sessions ] [ /ping ]
```

- `>` = active session
- `x` = stopped session
- Tap a session button to switch to it

### Dynamic Project Management

Add or remove projects without editing `projects.json` or restarting the bridge:

```
/add forge /Users/you/dev/forge-service
/add admin /Users/you/dev/insight-admin claude-sonnet-4-6
/remove admin
```

- `/add` validates the path exists, saves to `projects.json`, and starts the session
- `/remove` stops the session, removes it, and updates `projects.json`
- Optional third argument to `/add` sets the model (default: `claude-opus-4-6`)
- Cannot remove the last remaining session

## How It Works

- Bridge spawns Claude Code as child processes (one per project)
- Only the **active** session receives your text messages
- All sessions forward prompts to Telegram (tagged with session name if not active)
- Output is buffered and sent when Claude waits for input or after 1.5s pause
- Quick reply keyboard always visible for fast responses

## Security

- **Hard reject** all messages not from your `MY_CHAT_ID`
- No Anthropic API key exposed (Claude Code handles auth)
- Bot token + chat ID kept in `.env` (gitignored)

## Auto-restart

If Claude Code crashes, bridge auto-restarts it (max 10 times per session). Disable in `.env`:
```
AUTO_RESTART=false
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Bot not responding | Check `TELEGRAM_TOKEN` in `.env` |
| "Unauthorized" | `MY_CHAT_ID` incorrect — get it from @userinfobot |
| Claude won't start | Check project `path` exists, `claude` CLI in PATH |
| Session shows "stopped" | Use `/start <name>` to start it |
| Too many notifications | Use `/status` instead of waiting for stream |
| Legacy single-project mode | Remove `projects.json`, set `CLAUDE_PROJECT_PATH` in `.env` |
