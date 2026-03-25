import { config } from "dotenv";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { TelegramProvider } from "./provider.js";
import { BridgeEngine } from "../core/engine.js";

config();

// ── Config from env ─────────────────────────────────────
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = Number(process.env.MY_CHAT_ID);
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-6";
const STATUS_LINES = Number(process.env.STATUS_LINES) || 50;
const PERMISSION_TIMEOUT_MS = Number(process.env.PERMISSION_TIMEOUT) || 300000;
const DEFAULT_PERM_INTERACTIVE = process.env.PERMISSION_MODE === "interactive";
const SCAN_ROOTS = (process.env.SCAN_ROOTS || `${homedir()}/WORKSPACES`)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!TOKEN || !CHAT_ID) {
  console.error("Missing required env vars: TELEGRAM_TOKEN, MY_CHAT_ID");
  process.exit(1);
}

// ── Create provider + engine ────────────────────────────
const provider = new TelegramProvider(TOKEN, CHAT_ID);
const engine = new BridgeEngine(provider, {
  model: MODEL,
  statusLines: STATUS_LINES,
  permissionTimeoutMs: PERMISSION_TIMEOUT_MS,
  scanRoots: SCAN_ROOTS,
  permInteractive: DEFAULT_PERM_INTERACTIVE,
  dataDir: new URL(".", import.meta.url).pathname,
});

// Give provider a reference to engine (for keyboard state)
provider.engine = engine;

// ── Wire up: provider calls engine for commands ─────────

provider.onMessage((text) => {
  handleCommand(text);
});

provider.onAction((actionId) => {
  const result = engine.handlePermissionAction(actionId);
  if (result.handled) {
    return { statusText: result.statusText };
  }
  return { expired: true };
});

// ── Command router ──────────────────────────────────────

function handleCommand(text) {
  // Handle pending scan selection (user picks a number from /scan results)
  if (engine.pendingScan && Date.now() < engine.pendingScan.expiresAt) {
    const scanResult = engine.handleScanPick(text);
    if (scanResult.handled) {
      engine.send(scanResult.message);
      return;
    }
    // handleScanPick returns handled:false for non-number input,
    // which clears pendingScan. Fall through to normal command handling.
  }

  // Handle numbered quick-switch from keyboard: "1:name" or "> 1:name" or "~ 1:name"
  const keyboardMatch = text.match(/^[>~]?\s*(\d+):(\S+)$/);
  if (keyboardMatch) {
    const name = engine.resolveSessionName(keyboardMatch[1]);
    if (name) {
      engine.switchSession(name);
      return;
    }
  }

  // Handle /1, /2, /3 quick switch
  const numMatch = text.match(/^\/(\d+)$/);
  if (numMatch) {
    const name = engine.resolveSessionName(numMatch[1]);
    if (name) {
      engine.switchSession(name);
    } else {
      engine.send(`No session #${numMatch[1]}. Use /sessions to list.`);
    }
    return;
  }

  // Handle /switch <name|number>
  const switchMatch = text.match(/^\/switch\s+(.+)$/i);
  if (switchMatch) {
    const name = engine.resolveSessionName(switchMatch[1].trim());
    if (name) {
      engine.switchSession(name);
    } else {
      engine.send(`Session "${switchMatch[1]}" not found. Use /sessions to list.`);
    }
    return;
  }

  // Handle /start <name|number> — show session info
  const startMatch = text.match(/^\/start\s+(.+)$/i);
  if (startMatch) {
    const name = engine.resolveSessionName(startMatch[1].trim());
    if (name) {
      const info = engine.getSessionStatus(name);
      engine.send(
        `[${info.name}] Status: ${info.status}\nPath: ${info.path}\nModel: ${info.model}\nCost: $${info.totalCost.toFixed(4)}\nSession ID: ${info.sessionId || "(none)"}`
      );
    } else {
      engine.send(`Session "${startMatch[1]}" not found. Use /sessions to list.`);
    }
    return;
  }

  // Handle /stop <name|number> — abort if busy
  const stopMatch = text.match(/^\/stop\s+(.+)$/i);
  if (stopMatch) {
    const name = engine.resolveSessionName(stopMatch[1].trim());
    if (name) {
      const result = engine.cancelQuery(name);
      engine.send(result.message);
    } else {
      engine.send(`Session "${stopMatch[1]}" not found. Use /sessions to list.`);
    }
    return;
  }

  // Handle /add <name> <path> [model]
  const addMatch = text.match(/^\/add\s+(\S+)\s+(\S+)(?:\s+(\S+))?$/i);
  if (addMatch) {
    const [, name, path, model] = addMatch;
    const result = engine.addProject(name, path, model);
    engine.send(result.ok ? result.message : result.error);
    return;
  }

  // Handle /remove <name|number>
  const removeMatch = text.match(/^\/remove\s+(.+)$/i);
  if (removeMatch) {
    const name = engine.resolveSessionName(removeMatch[1].trim());
    if (!name) {
      engine.send(`Session "${removeMatch[1]}" not found. Use /sessions to list.`);
      return;
    }
    const result = engine.removeProject(name);
    engine.send(result.ok ? result.message : result.error);
    return;
  }

  // Handle /scan <path>
  const scanMatch = text.match(/^\/scan\s+(.+)$/i);
  if (scanMatch) {
    const scanPath = scanMatch[1].trim().replace(/^~/, homedir());
    if (!existsSync(scanPath)) {
      engine.send(`Path does not exist: ${scanPath}`);
      return;
    }
    const result = engine.startScan([scanPath]);
    if (result) {
      engine.send(result.message);
    } else {
      engine.send(`No new projects found in: ${scanPath}`);
    }
    return;
  }

  // Handle /permissions [on|off]
  const permMatch = text.match(/^\/permissions(?:\s+(on|off))?$/i);
  if (permMatch) {
    if (!engine.activeSessionName) {
      engine.send("No active session.");
      return;
    }
    const forceTo = permMatch[1]
      ? permMatch[1].toLowerCase() === "on"
      : undefined;
    const result = engine.togglePermissions(engine.activeSessionName, forceTo);
    engine.send(result.ok ? result.message : result.error);
    return;
  }

  // Handle /restart [name]
  const restartMatch = text.match(/^\/restart(?:\s+(.+))?$/i);
  if (restartMatch) {
    const target = restartMatch[1]
      ? engine.resolveSessionName(restartMatch[1].trim())
      : engine.activeSessionName;
    if (!target || !engine.sessions.has(target)) {
      engine.send("No valid session to restart.");
      return;
    }
    const result = engine.resetSession(target);
    engine.send(result.ok ? result.message : result.error);
    return;
  }

  // ── Simple commands (no args) ───────────────────────────
  switch (text) {
    case "/start":
      engine.send(engine.getHelpText());
      break;

    case "/sessions": {
      const list = engine.getSessionsList();
      if (list.length === 0) {
        engine.send("No sessions yet. Use /add <name> <path> to add a project.");
        break;
      }
      const lines = list.map((s) => {
        const arrow = s.isActive ? " << active" : "";
        const cost = ` ($${s.totalCost.toFixed(4)})`;
        return `${s.index}. ${s.name} [${s.status}]${cost}${arrow}\n   ${s.path}`;
      });
      engine.send(`Sessions:\n\n${lines.join("\n\n")}`);
      break;
    }

    case "/status": {
      const result = engine.getStatusLines();
      engine.send(result.ok ? result.message : result.error);
      break;
    }

    case "/cancel":
    case "/kill": {
      if (!engine.activeSessionName) {
        engine.send("No active session.");
        break;
      }
      const result = engine.cancelQuery(engine.activeSessionName);
      engine.send(result.message);
      break;
    }

    case "/cost": {
      const result = engine.getCostBreakdown();
      engine.send(result.message);
      break;
    }

    case "/scan": {
      const result = engine.startScan(SCAN_ROOTS);
      if (result) {
        engine.send(result.message);
      } else {
        engine.send(`No new projects found in:\n${SCAN_ROOTS.join("\n")}`);
      }
      break;
    }

    case "/ping": {
      const result = engine.getPingInfo();
      engine.send(result.message);
      break;
    }

    default:
      if (text.startsWith("/")) {
        engine.send(`Unknown command: ${text}\nUse /start for help.`);
      } else if (!engine.activeSessionName || !engine.sessions.has(engine.activeSessionName)) {
        engine.send("No sessions yet. Use /add <name> <path> to add a project.");
      } else {
        engine.runQuery(engine.activeSessionName, text);
      }
  }
}

// ── Graceful shutdown ───────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n[bridge] ${signal} received, shutting down...`);
  engine.shutdown();
  provider.stop();
  setTimeout(() => process.exit(0), 2000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ── Start ───────────────────────────────────────────────
engine.init();
await provider.start();

console.log(`[bridge] Chat ID: ${CHAT_ID}`);

if (engine.projects.length > 0) {
  const permMode = DEFAULT_PERM_INTERACTIVE ? "interactive" : "bypass";
  engine.send(
    `Bridge started (SDK mode). ${engine.projects.length} project(s) ready.\nActive: ${engine.activeSessionName}\nPermissions: ${permMode}\nSend a message to start.`
  );
} else {
  engine.send(
    "Bridge started (SDK mode). No projects configured.\nUse /add <name> <path> to add a project."
  );
}
