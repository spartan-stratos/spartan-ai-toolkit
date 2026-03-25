# Spartan Bridges

Bridges connect Claude Code to messaging platforms. You send messages from your phone (or desktop), Claude works on your codebase, and you get results back.

## How it works

```
You (Telegram/Slack/etc)  <-->  Provider  <-->  Engine  <-->  Claude Code SDK
```

- **Provider** handles platform-specific messaging (sending, editing, buttons)
- **Engine** handles all Claude logic (sessions, streaming, permissions, projects)

The engine doesn't know or care which messaging platform it's talking to. Providers are swappable.

## Available providers

| Provider | Status | Package |
|----------|--------|---------|
| Telegram | Ready | `bridges/telegram/` |

## Quick start: Telegram

```bash
cd bridges/telegram
cp .env.example .env
# Fill in TELEGRAM_TOKEN and MY_CHAT_ID

npm install
npm start
```

Then open Telegram and send `/start` to your bot.

## Commands

These work in all providers:

- `/sessions` — list all sessions
- `/switch <name>` — switch active session
- `/1` `/2` `/3` — quick switch by number
- `/start <name>` — show session info
- `/stop <name>` — abort a running query
- `/restart [name]` — reset session (start fresh)
- `/scan [path]` — scan for projects to add
- `/add <name> <path>` — add a project manually
- `/remove <name>` — remove a project
- `/status` — last output lines
- `/cancel` — abort current query
- `/permissions [on|off]` — toggle approve/deny from phone
- `/cost` — show cost breakdown
- `/ping` — check bridge status

Type any text to send it as a prompt to the active session.

## Adding a new provider

1. Create a new folder: `bridges/your-platform/`
2. Make a class that extends `BridgeProvider` from `bridges/core/provider.js`
3. Implement these methods:

```js
import { BridgeProvider } from '../core/provider.js';

class YourProvider extends BridgeProvider {
  async send(text) { ... }             // Send a message, return { messageId }
  async sendWithActions(text, actions) { ... }  // Send with buttons, return { messageId }
  async editMessage(messageId, text) { ... }    // Edit an existing message
  onMessage(handler) { ... }           // Register incoming message callback
  onAction(handler) { ... }            // Register button press callback
  async start() { ... }               // Start listening
  async stop() { ... }                // Clean up
  get maxMessageLength() { return 4000; }  // Platform's message size limit
}
```

4. Create an `index.js` that wires up the provider + engine:

```js
import { YourProvider } from './provider.js';
import { BridgeEngine } from '../core/engine.js';

const provider = new YourProvider(/* platform config */);
const engine = new BridgeEngine(provider, { /* options */ });

// Wire up command handling
provider.onMessage((text) => { /* route commands to engine */ });
provider.onAction((actionId) => engine.handlePermissionAction(actionId));

engine.init();
await provider.start();
```

5. Add a `package.json` with your platform's dependencies

## File structure

```
bridges/
  core/
    provider.js    — base class (interface contract)
    engine.js      — shared Claude logic
    package.json   — @anthropic-ai/claude-agent-sdk dependency
  telegram/
    provider.js    — Telegram implementation
    index.js       — entry point + command routing
    package.json   — node-telegram-bot-api + dotenv
    .env.example   — config template
```
