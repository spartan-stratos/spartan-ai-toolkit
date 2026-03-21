import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import TelegramBot from "node-telegram-bot-api";

config();

// ── Config ──────────────────────────────────────────────────
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = Number(process.env.MY_CHAT_ID);
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-6";
const AUTO_RESTART = process.env.AUTO_RESTART !== "false";
const STATUS_LINES = Number(process.env.STATUS_LINES) || 50;

if (!TOKEN || !CHAT_ID) {
  console.error("Missing required env vars: TELEGRAM_TOKEN, MY_CHAT_ID");
  process.exit(1);
}

// ── Load projects ───────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadProjects() {
  // Try projects.json first
  const jsonPath = resolve(__dirname, "projects.json");
  if (existsSync(jsonPath)) {
    const raw = readFileSync(jsonPath, "utf-8");
    const projects = JSON.parse(raw);
    if (Array.isArray(projects)) {
      return projects.map((p, i) => ({
        name: p.name || `project-${i + 1}`,
        path: p.path,
        model: p.model || MODEL,
        autoStart: p.autoStart !== false,
      }));
    }
  }

  // Fallback: legacy single CLAUDE_PROJECT_PATH from .env
  const legacyPath = process.env.CLAUDE_PROJECT_PATH;
  if (legacyPath) {
    const name = legacyPath.split("/").pop() || "project";
    return [{ name, path: legacyPath, model: MODEL, autoStart: true }];
  }

  // No config at all — start empty, user can /add from Telegram
  return [];
}

const PROJECTS = loadProjects();
const PROJECTS_JSON_PATH = resolve(__dirname, "projects.json");

function saveProjects() {
  const data = PROJECTS.map((p) => ({
    name: p.name,
    path: p.path,
    model: p.model,
    autoStart: p.autoStart,
  }));
  writeFileSync(PROJECTS_JSON_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ── Prompt detection patterns ───────────────────────────────
const PROMPT_PATTERNS = [
  /do you want/i,
  /shall i/i,
  /would you like/i,
  /\(y\/n\)/i,
  /\[y\/n\]/i,
  /y\/n\)?$/im,
  /press enter/i,
  /accept edits/i,
  /continue\?/i,
  /proceed\?/i,
  /confirm/i,
  /overwrite/i,
  /replace\?/i,
  /\? \(Y\)/i,
  /\? ›/,
  /❯/,
  /waiting for input/i,
  /enter .*:/i,
  /type .* to /i,
  /choose.*:/i,
  /select.*:/i,
];

const isPrompt = (text) => PROMPT_PATTERNS.some((p) => p.test(text));

// ── ANSI strip ──────────────────────────────────────────────
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]|\x1b\].*?\x07|\x1b\[.*?[a-zA-Z]/g;
const stripAnsi = (str) =>
  str
    .replace(ANSI_RE, "")
    .replace(/[\x00-\x09\x0b\x0c\x0e-\x1f]/g, "")
    .replace(/\r/g, "");

// ── Telegram setup ──────────────────────────────────────────
const bot = new TelegramBot(TOKEN, { polling: true });

const guard = (chatId) => {
  if (chatId !== CHAT_ID) {
    bot.sendMessage(chatId, "Unauthorized.");
    return false;
  }
  return true;
};

const splitMessage = (text, maxLen = 4000) => {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt < maxLen * 0.3) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  return chunks;
};

function buildKeyboard() {
  const rows = [[{ text: "y" }, { text: "n" }, { text: "skip" }]];

  if (PROJECTS.length > 0) {
    const sessionRow = PROJECTS.map((p, i) => {
      const s = sessions.get(p.name);
      const isActive = p.name === activeSessionName;
      const icon = !s?.alive ? "x" : isActive ? ">" : "";
      const label = icon ? `${icon} ${i + 1}:${p.name}` : `${i + 1}:${p.name}`;
      return { text: label };
    });
    rows.push(sessionRow);
  }

  rows.push([{ text: "/status" }, { text: "/sessions" }, { text: "/ping" }]);

  return {
    reply_markup: {
      keyboard: rows,
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
}

const sendTg = async (text, extra = {}) => {
  if (!text?.trim()) return;
  const chunks = splitMessage(text.trim());
  for (const chunk of chunks) {
    try {
      await bot.sendMessage(CHAT_ID, chunk, { ...buildKeyboard(), ...extra });
    } catch (err) {
      console.error("[TG send error]", err.message);
    }
  }
};

// ── Session management ──────────────────────────────────────
const sessions = new Map(); // name -> session state
let activeSessionName = PROJECTS[0]?.name || null;

const MAX_HISTORY = 500;
const FLUSH_DELAY_MS = 1500;
const RESTART_DELAY_MS = 3000;
const MAX_RESTARTS = 10;

function createSession(project) {
  return {
    name: project.name,
    path: project.path,
    model: project.model,
    process: null,
    outputBuffer: "",
    outputHistory: [],
    flushTimer: null,
    alive: false,
    restartCount: 0,
  };
}

function getSession(name) {
  return sessions.get(name);
}

function getActiveSession() {
  return sessions.get(activeSessionName);
}

function pushHistory(session, line) {
  session.outputHistory.push(line);
  if (session.outputHistory.length > MAX_HISTORY) session.outputHistory.shift();
}

function flushBuffer(session, force = false) {
  clearTimeout(session.flushTimer);
  session.flushTimer = null;

  const text = session.outputBuffer.trim();
  if (!text) return;

  const shouldSend = force || isPrompt(text) || text.length > 300;

  if (shouldSend) {
    session.outputBuffer = "";
    // Tag output with session name if not active
    const prefix = session.name !== activeSessionName ? `[${session.name}] ` : "";
    sendTg(`${prefix}${text}`);
  } else {
    session.flushTimer = setTimeout(() => flushBuffer(session, true), FLUSH_DELAY_MS * 2);
  }
}

function scheduleFlush(session) {
  if (session.flushTimer) clearTimeout(session.flushTimer);
  session.flushTimer = setTimeout(() => flushBuffer(session, false), FLUSH_DELAY_MS);
}

function startSession(name) {
  const session = sessions.get(name);
  if (!session) {
    sendTg(`Session "${name}" not found.`);
    return;
  }

  if (session.process && session.alive) {
    sendTg(`[${name}] Already running.`);
    return;
  }

  console.log(`[bridge] Starting "${name}" in ${session.path}`);
  sendTg(`Starting "${name}"...\n${session.path}\nModel: ${session.model}`);

  const args = [
    "--dangerously-skip-permissions",
    "--model", session.model,
    "--print",
    "--output-format", "stream-json",
    "--input-format", "stream-json",
    "--verbose",
  ];
  const proc = spawn("claude", args, {
    cwd: session.path,
    env: Object.fromEntries(
      Object.entries({ ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" }).filter(
        ([k]) => k !== "CLAUDECODE"
      )
    ),
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });

  session.process = proc;
  session.alive = true;
  session.outputBuffer = "";

  console.log(`[bridge] "${name}" spawned (PID: ${proc.pid || "pending"})`);

  let lineBuf = "";
  proc.stdout.on("data", (data) => {
    lineBuf += data.toString();
    const lines = lineBuf.split("\n");
    lineBuf = lines.pop(); // keep incomplete last line in buffer
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        // Only extract assistant text content — skip tool_use, system, result
        if (msg.type === "assistant" && msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === "text" && block.text) {
              pushHistory(session, block.text);
              session.outputBuffer += block.text;
              scheduleFlush(session);
            }
          }
        }
        // All other JSON message types (system, tool_use, result) are silently skipped
      } catch {
        // Ignore non-JSON lines
      }
    }
  });

  proc.stderr.on("data", (data) => {
    const text = stripAnsi(data.toString()).trim();
    if (!text) return;
    pushHistory(session, `[stderr] ${text}`);
    sendTg(`[${name}] ${text}`);
  });

  proc.on("close", (code) => {
    session.alive = false;
    session.process = null;
    flushBuffer(session, true);
    const msg = `[${name}] Exited (code: ${code})`;
    console.log(`[bridge] ${msg}`);
    sendTg(msg);

    if (AUTO_RESTART && code !== 0 && session.restartCount < MAX_RESTARTS) {
      session.restartCount++;
      sendTg(`[${name}] Auto-restarting... (${session.restartCount}/${MAX_RESTARTS})`);
      setTimeout(() => startSession(name), RESTART_DELAY_MS);
    } else if (session.restartCount >= MAX_RESTARTS) {
      sendTg(`[${name}] Max restarts reached. Use /start ${name}`);
    }
  });

  proc.on("error", (err) => {
    session.alive = false;
    session.process = null;
    console.error(`[bridge] spawn error (${name}):`, err.message);
    sendTg(`[${name}] Failed to start: ${err.message}`);
  });
}

function stopSession(name) {
  const session = sessions.get(name);
  if (!session) {
    sendTg(`Session "${name}" not found.`);
    return;
  }

  if (session.process && session.alive) {
    session.process.kill("SIGTERM");
    setTimeout(() => {
      if (session.alive && session.process) {
        session.process.kill("SIGKILL");
      }
    }, 5000);
    sendTg(`[${name}] Stopping...`);
  } else {
    sendTg(`[${name}] Not running.`);
  }
}

function writeToSession(name, text) {
  const session = sessions.get(name);
  if (!session || !session.alive || !session.process) {
    sendTg(`[${name}] Not running. Use /start ${name}`);
    return false;
  }
  try {
    const msg = JSON.stringify({ type: "user", message: { role: "user", content: text } });
    session.process.stdin.write(msg + "\n");
    return true;
  } catch (err) {
    sendTg(`[${name}] Write error: ${err.message}`);
    return false;
  }
}

function switchSession(name) {
  if (!sessions.has(name)) {
    sendTg(`Session "${name}" not found.`);
    return;
  }
  activeSessionName = name;
  const session = sessions.get(name);
  const status = session.alive ? "running" : "stopped";
  sendTg(`Switched to "${name}" (${status})\n${session.path}`);
}

// Resolve name from index (1-based) or name string
function resolveSessionName(input) {
  const idx = parseInt(input, 10);
  if (!isNaN(idx) && idx >= 1 && idx <= PROJECTS.length) {
    return PROJECTS[idx - 1].name;
  }
  // Try exact name match
  if (sessions.has(input)) return input;
  // Try partial match
  for (const [name] of sessions) {
    if (name.startsWith(input)) return name;
  }
  return null;
}

// ── Telegram message handler ────────────────────────────────
bot.on("message", (msg) => {
  if (!guard(msg.chat.id)) return;

  const text = msg.text?.trim();
  if (!text) return;

  console.log(`[TG ->] ${text}`);

  // Handle numbered quick-switch from keyboard: "1:name" or "> 1:name" or "x 1:name"
  const keyboardMatch = text.match(/^[>x]?\s*(\d+):(\S+)$/);
  if (keyboardMatch) {
    const name = resolveSessionName(keyboardMatch[1]);
    if (name) {
      switchSession(name);
      return;
    }
  }

  // Handle /1, /2, /3 quick switch
  const numMatch = text.match(/^\/(\d+)$/);
  if (numMatch) {
    const name = resolveSessionName(numMatch[1]);
    if (name) {
      switchSession(name);
    } else {
      sendTg(`No session #${numMatch[1]}. Use /sessions to list.`);
    }
    return;
  }

  // Handle /switch <name|number>
  const switchMatch = text.match(/^\/switch\s+(.+)$/i);
  if (switchMatch) {
    const name = resolveSessionName(switchMatch[1].trim());
    if (name) {
      switchSession(name);
    } else {
      sendTg(`Session "${switchMatch[1]}" not found. Use /sessions to list.`);
    }
    return;
  }

  // Handle /start <name|number> (start a specific session)
  const startMatch = text.match(/^\/start\s+(.+)$/i);
  if (startMatch) {
    const name = resolveSessionName(startMatch[1].trim());
    if (name) {
      const session = sessions.get(name);
      session.restartCount = 0;
      startSession(name);
    } else {
      sendTg(`Session "${startMatch[1]}" not found. Use /sessions to list.`);
    }
    return;
  }

  // Handle /stop <name|number>
  const stopMatch = text.match(/^\/stop\s+(.+)$/i);
  if (stopMatch) {
    const name = resolveSessionName(stopMatch[1].trim());
    if (name) {
      stopSession(name);
    } else {
      sendTg(`Session "${stopMatch[1]}" not found. Use /sessions to list.`);
    }
    return;
  }

  // Handle /add <name> <path> [model]
  const addMatch = text.match(/^\/add\s+(\S+)\s+(\S+)(?:\s+(\S+))?$/i);
  if (addMatch) {
    const [, name, path, model] = addMatch;
    if (sessions.has(name)) {
      sendTg(`Session "${name}" already exists. Use /remove first.`);
      return;
    }
    if (!existsSync(path)) {
      sendTg(`Path does not exist: ${path}`);
      return;
    }
    const project = { name, path, model: model || MODEL, autoStart: true };
    PROJECTS.push(project);
    sessions.set(name, createSession(project));
    if (!activeSessionName) activeSessionName = name;
    saveProjects();
    sendTg(`Added "${name}" -> ${path}\nStarting session...`);
    startSession(name);
    return;
  }

  // Handle /remove <name|number>
  const removeMatch = text.match(/^\/remove\s+(.+)$/i);
  if (removeMatch) {
    const name = resolveSessionName(removeMatch[1].trim());
    if (!name) {
      sendTg(`Session "${removeMatch[1]}" not found. Use /sessions to list.`);
      return;
    }
    if (PROJECTS.length <= 1) {
      sendTg("Cannot remove the last session. Add another first.");
      return;
    }
    // Stop if running
    const session = sessions.get(name);
    if (session?.alive && session?.process) {
      session.process.kill("SIGTERM");
    }
    // Switch active if removing active session
    if (activeSessionName === name) {
      const remaining = PROJECTS.find((p) => p.name !== name);
      activeSessionName = remaining.name;
    }
    // Remove from PROJECTS array and sessions map
    const idx = PROJECTS.findIndex((p) => p.name === name);
    PROJECTS.splice(idx, 1);
    sessions.delete(name);
    saveProjects();
    sendTg(`Removed "${name}". Active: ${activeSessionName}`);
    return;
  }

  switch (text) {
    case "/start":
      sendTg(
        "Claude Code Telegram Bridge (multi-session)\n\n" +
          "Session commands:\n" +
          "/sessions  - List all sessions\n" +
          "/switch <name>  - Switch active session\n" +
          "/1 /2 /3  - Quick switch by number\n" +
          "/start <name>  - Start a session\n" +
          "/stop <name>  - Stop a session\n" +
          "/add <name> <path>  - Add new project\n" +
          "/remove <name>  - Remove project\n\n" +
          "Active session commands:\n" +
          "/status  - Last output lines\n" +
          "/kill  - Stop active session\n" +
          "/restart  - Restart active session\n" +
          "/ping  - Check bridge status\n\n" +
          "Quick replies: y, n, skip\n" +
          "Or type any text to send to the active session."
      );
      break;

    case "/sessions": {
      if (PROJECTS.length === 0) {
        sendTg("No sessions yet. Use /add <name> <path> to add a project.");
        break;
      }
      const lines = PROJECTS.map((p, i) => {
        const s = sessions.get(p.name);
        const isActive = p.name === activeSessionName;
        const status = s?.alive ? "running" : "stopped";
        const arrow = isActive ? " << active" : "";
        return `${i + 1}. ${p.name} [${status}]${arrow}\n   ${p.path}`;
      });
      sendTg(`Sessions:\n\n${lines.join("\n\n")}`);
      break;
    }

    case "/status": {
      const session = getActiveSession();
      if (!session) {
        sendTg("No active session.");
        break;
      }
      const lines = session.outputHistory.slice(-STATUS_LINES);
      if (lines.length === 0) {
        sendTg(`[${session.name}] No output yet.`);
      } else {
        sendTg(`[${session.name}] Last ${lines.length} lines:\n\n${lines.join("\n")}`);
      }
      break;
    }

    case "/kill":
      stopSession(activeSessionName);
      break;

    case "/restart": {
      stopSession(activeSessionName);
      const session = getActiveSession();
      if (session) session.restartCount = 0;
      setTimeout(() => startSession(activeSessionName), 2000);
      break;
    }

    case "/ping": {
      const running = [...sessions.values()].filter((s) => s.alive).length;
      const total = sessions.size;
      sendTg(`Bridge alive. Sessions: ${running}/${total} running. Active: ${activeSessionName || "none"}`);
      break;
    }

    default:
      if (text.startsWith("/")) {
        sendTg(`Unknown command: ${text}\nUse /start for help.`);
      } else if (!activeSessionName || !sessions.has(activeSessionName)) {
        sendTg("No sessions yet. Use /add <name> <path> to add a project.");
      } else {
        writeToSession(activeSessionName, text);
      }
  }
});

bot.on("polling_error", (err) => {
  console.error("[TG polling error]", err.message);
});

// ── Graceful shutdown ───────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n[bridge] ${signal} received, shutting down...`);
  for (const [name, session] of sessions) {
    if (session.process && session.alive) {
      console.log(`[bridge] Stopping "${name}"...`);
      session.process.kill("SIGTERM");
    }
  }
  bot.stopPolling();
  setTimeout(() => process.exit(0), 3000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ── Start ───────────────────────────────────────────────────
console.log("[bridge] Claude Code Telegram Bridge (multi-session) starting...");
console.log(`[bridge] Chat ID: ${CHAT_ID}`);
console.log(`[bridge] Projects: ${PROJECTS.length === 0 ? "(none — use /add on Telegram)" : PROJECTS.map((p) => p.name).join(", ")}`);

// Initialize all sessions
for (const project of PROJECTS) {
  sessions.set(project.name, createSession(project));
}

// Auto-start sessions marked for auto-start
for (const project of PROJECTS) {
  if (project.autoStart) {
    startSession(project.name);
  }
}
