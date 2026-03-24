import { query as sdkQuery } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import TelegramBot from "node-telegram-bot-api";

config();

// ── Config ──────────────────────────────────────────────────
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = Number(process.env.MY_CHAT_ID);
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-6";
const STATUS_LINES = Number(process.env.STATUS_LINES) || 50;
const PERMISSION_TIMEOUT_MS = Number(process.env.PERMISSION_TIMEOUT) || 300000; // 5 min
// Tools auto-allowed without prompting in interactive permission mode (read-only, safe)
const SAFE_TOOLS = ["Read", "Glob", "Grep", "WebSearch", "WebFetch"];
const DEFAULT_PERM_INTERACTIVE = process.env.PERMISSION_MODE === "interactive";
// Comma-separated list of directories to scan for projects
const SCAN_ROOTS = (process.env.SCAN_ROOTS || `${homedir()}/WORKSPACES`)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!TOKEN || !CHAT_ID) {
  console.error("Missing required env vars: TELEGRAM_TOKEN, MY_CHAT_ID");
  process.exit(1);
}

// ── Load projects ───────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadProjects() {
  const jsonPath = resolve(__dirname, "projects.json");
  if (existsSync(jsonPath)) {
    const raw = readFileSync(jsonPath, "utf-8");
    const projects = JSON.parse(raw);
    if (Array.isArray(projects)) {
      return projects.map((p, i) => ({
        name: p.name || `project-${i + 1}`,
        path: p.path,
        model: p.model || MODEL,
      }));
    }
  }
  return [];
}

const PROJECTS = loadProjects();
const PROJECTS_JSON_PATH = resolve(__dirname, "projects.json");

function saveProjects() {
  const data = PROJECTS.map((p) => ({
    name: p.name,
    path: p.path,
    model: p.model,
  }));
  writeFileSync(PROJECTS_JSON_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ── Secret redaction ────────────────────────────────────────
const SECRET_PATTERNS = [
  /sk-ant-[a-zA-Z0-9_-]{20,}/g,
  /sk-[a-zA-Z0-9]{20,}/g,
  /ghp_[a-zA-Z0-9]{36,}/g,
  /gho_[a-zA-Z0-9]{36,}/g,
  /github_pat_[a-zA-Z0-9_]{22,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /xoxb-[0-9]+-[a-zA-Z0-9-]+/g,
  /xoxp-[0-9]+-[a-zA-Z0-9-]+/g,
  /Bearer\s+[a-zA-Z0-9._\-/+=]{20,}/gi,
  /postgres(ql)?:\/\/[^\s'"]+/gi,
  /mysql:\/\/[^\s'"]+/gi,
  /mongodb(\+srv)?:\/\/[^\s'"]+/gi,
  /redis:\/\/[^\s'"]+/gi,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END/g,
  /password\s*[:=]\s*['"][^'"]{4,}['"]/gi,
  /secret\s*[:=]\s*['"][^'"]{4,}['"]/gi,
  /api[_-]?key\s*[:=]\s*['"][^'"]{4,}['"]/gi,
];

function redactSecrets(text) {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

// ── Session persistence ─────────────────────────────────────
const SESSIONS_PATH = resolve(__dirname, "sessions.json");
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function loadSessionData() {
  try {
    if (existsSync(SESSIONS_PATH)) {
      const raw = readFileSync(SESSIONS_PATH, "utf-8");
      const data = JSON.parse(raw);
      // Clean entries older than 24h
      const now = Date.now();
      const cleaned = {};
      for (const [key, val] of Object.entries(data)) {
        if (now - (val.lastUsed || 0) < SESSION_TTL_MS) {
          cleaned[key] = val;
        }
      }
      return cleaned;
    }
  } catch {
    // Ignore corrupt file
  }
  return {};
}

function saveSessionData() {
  const data = {};
  for (const [name, session] of sessions) {
    if (session.sessionId) {
      data[name] = {
        sessionId: session.sessionId,
        lastUsed: Date.now(),
        totalCost: session.totalCost,
        permInteractive: session.permInteractive,
      };
    }
  }
  try {
    writeFileSync(SESSIONS_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
  } catch (err) {
    console.error("[bridge] Failed to save sessions:", err.message);
  }
}

const persistedSessions = loadSessionData();

// ── Permission relay ────────────────────────────────────────
// Map<toolUseID, { resolve, timeout, msgId, promptText, suggestions }>
const pendingPermissions = new Map();

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
  const rows = [[{ text: "y" }, { text: "n" }, { text: "/cancel" }]];

  if (PROJECTS.length > 0) {
    const sessionRow = PROJECTS.map((p, i) => {
      const s = sessions.get(p.name);
      const isActive = p.name === activeSessionName;
      const icon = s?.busy ? "~" : isActive ? ">" : "";
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
  const safe = redactSecrets(text.trim());
  const chunks = splitMessage(safe);
  for (const chunk of chunks) {
    try {
      await bot.sendMessage(CHAT_ID, chunk, { ...buildKeyboard(), ...extra });
    } catch (err) {
      console.error("[TG send error]", err.message);
    }
  }
};

// ── Session management ──────────────────────────────────────
const sessions = new Map();
let activeSessionName = PROJECTS[0]?.name || null;

const MAX_HISTORY = 500;
const STREAM_THROTTLE_MS = 300;

function createSession(project) {
  const persisted = persistedSessions[project.name];
  return {
    name: project.name,
    path: project.path,
    model: project.model,
    sessionId: persisted?.sessionId || null,
    totalCost: persisted?.totalCost || 0,
    busy: false,
    abortController: null,
    streamMsgId: null,
    streamBuffer: "",
    lastEditTime: 0,
    outputHistory: [],
    permInteractive: persisted?.permInteractive ?? DEFAULT_PERM_INTERACTIVE,
  };
}

function getActiveSession() {
  return sessions.get(activeSessionName);
}

function pushHistory(session, line) {
  session.outputHistory.push(line);
  if (session.outputHistory.length > MAX_HISTORY) session.outputHistory.shift();
}

// ── Streaming helpers ───────────────────────────────────────
async function throttledEdit(session) {
  const now = Date.now();
  if (now - session.lastEditTime < STREAM_THROTTLE_MS) return;
  if (!session.streamMsgId || !session.streamBuffer) return;

  session.lastEditTime = now;
  // Show last 4000 chars to stay within Telegram limits
  const display = session.streamBuffer.length > 4000
    ? "..." + session.streamBuffer.slice(-3990)
    : session.streamBuffer;

  try {
    await bot.editMessageText(redactSecrets(display), {
      chat_id: CHAT_ID,
      message_id: session.streamMsgId,
    });
  } catch {
    // Ignore edit errors (message not modified, etc.)
  }
}

async function finalEdit(session, text) {
  const safe = redactSecrets(text);
  const costLine = `\n\n---\nCost: $${session.totalCost.toFixed(4)}`;
  const full = safe + costLine;

  if (full.length <= 4000 && session.streamMsgId) {
    try {
      await bot.editMessageText(full, {
        chat_id: CHAT_ID,
        message_id: session.streamMsgId,
      });
      return;
    } catch {
      // Fall through to send new message
    }
  }

  // If too long or edit failed, send as new message(s)
  await sendTg(full);
}

// ── Permission relay helpers ─────────────────────────────────
function formatPermissionPrompt(sessionName, toolName, input, opts) {
  const header = `[${sessionName}] Permission`;
  const action = opts.title || `Use tool: ${toolName}`;

  let detail = "";
  if (toolName === "Bash" && input.command) {
    detail = `> ${input.command}`;
  } else if ((toolName === "Write" || toolName === "Edit") && input.file_path) {
    detail = `File: ${input.file_path}`;
  } else if (toolName === "Task" && input.prompt) {
    detail = input.prompt.slice(0, 200);
  } else if (input.url) {
    detail = input.url;
  } else {
    const keys = Object.keys(input).slice(0, 3);
    detail = keys.map((k) => `${k}: ${String(input[k]).slice(0, 100)}`).join("\n");
  }

  if (detail.length > 500) detail = detail.slice(0, 500) + "...";

  const reason = opts.decisionReason ? `\nReason: ${opts.decisionReason}` : "";
  return `${header}\n\n${action}${reason}\n\n${detail}`;
}

function buildCanUseTool(sessionName) {
  return async (toolName, input, opts) => {
    const toolUseID = opts.toolUseID;
    const promptText = formatPermissionPrompt(sessionName, toolName, input, opts);

    try {
      const msg = await bot.sendMessage(CHAT_ID, redactSecrets(promptText), {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Allow", callback_data: `pa_${toolUseID}` },
              { text: "Deny", callback_data: `pd_${toolUseID}` },
              { text: "Always Allow", callback_data: `ps_${toolUseID}` },
            ],
          ],
        },
      });

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pendingPermissions.delete(toolUseID);
          bot
            .editMessageText(`${redactSecrets(promptText)}\n\nTimed out — denied`, {
              chat_id: CHAT_ID,
              message_id: msg.message_id,
            })
            .catch(() => {});
          resolve({ behavior: "deny", message: "Permission timed out", toolUseID });
        }, PERMISSION_TIMEOUT_MS);

        // Clean up on abort (query canceled)
        opts.signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timeout);
            pendingPermissions.delete(toolUseID);
            resolve({ behavior: "deny", message: "Query canceled", toolUseID });
          },
          { once: true }
        );

        pendingPermissions.set(toolUseID, {
          resolve,
          timeout,
          msgId: msg.message_id,
          promptText,
          suggestions: opts.suggestions,
        });
      });
    } catch (err) {
      console.error("[bridge] Permission prompt send failed:", err.message);
      return { behavior: "deny", message: "Failed to send permission prompt", toolUseID };
    }
  };
}

// ── Core: runQuery ──────────────────────────────────────────
async function runQuery(sessionName, prompt) {
  const session = sessions.get(sessionName);
  if (!session) {
    await sendTg(`Session "${sessionName}" not found.`);
    return;
  }
  if (session.busy) {
    await sendTg(`[${sessionName}] Busy — use /cancel to abort current query.`);
    return;
  }

  session.busy = true;
  session.abortController = new AbortController();
  session.streamBuffer = "";
  session.streamMsgId = null;
  session.lastEditTime = 0;

  try {
    // Send "Working..." and capture msg_id for streaming edits
    const prefix = sessionName !== activeSessionName ? `[${sessionName}] ` : "";
    const workingMsg = await bot.sendMessage(CHAT_ID, `${prefix}Working...`, buildKeyboard());
    session.streamMsgId = workingMsg.message_id;

    // Build SDK options
    const options = {
      cwd: session.path,
      model: session.model,
      abortController: session.abortController,
      settingSources: ["user", "project"],
    };

    if (session.permInteractive) {
      // Interactive mode: prompt user for dangerous tools via Telegram
      options.permissionMode = "default";
      options.allowedTools = SAFE_TOOLS;
      options.canUseTool = buildCanUseTool(sessionName);
    } else {
      // Bypass mode: auto-allow everything (original behavior)
      options.permissionMode = "bypassPermissions";
      options.allowDangerouslySkipPermissions = true;
      options.allowedTools = [
        "Read", "Write", "Edit", "Bash", "Glob", "Grep",
        "WebSearch", "WebFetch", "Task",
      ];
    }

    if (session.sessionId) {
      options.resume = session.sessionId;
    }

    console.log(`[bridge] Query "${sessionName}": ${prompt.slice(0, 80)}${prompt.length > 80 ? "..." : ""}`);

    for await (const message of sdkQuery({ prompt, options })) {
      // Capture session ID from init
      if (message.type === "system" && message.subtype === "init") {
        session.sessionId = message.session_id;
      }

      // Stream assistant text
      if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === "text" && block.text) {
            session.streamBuffer += block.text;
            pushHistory(session, block.text);
            await throttledEdit(session);
          }
        }
      }

      // Final result
      if (message.type === "result") {
        session.sessionId = message.session_id;
        session.totalCost += message.total_cost_usd || 0;

        const resultText = session.streamBuffer || message.result || "(no output)";
        pushHistory(session, `--- Cost: $${(message.total_cost_usd || 0).toFixed(4)} | Turns: ${message.num_turns || 0} ---`);

        await finalEdit(session, resultText);
        saveSessionData();

        console.log(`[bridge] Query done "${sessionName}" — $${(message.total_cost_usd || 0).toFixed(4)}, ${message.num_turns || 0} turns`);
      }
    }
  } catch (err) {
    if (err.name === "AbortError" || session.abortController?.signal?.aborted) {
      await sendTg(`[${sessionName}] Canceled.`);
      console.log(`[bridge] Query canceled "${sessionName}"`);
    } else {
      const errMsg = `[${sessionName}] Error: ${err.message}`;
      console.error(`[bridge] ${errMsg}`);
      await sendTg(errMsg);
    }
  } finally {
    session.busy = false;
    session.abortController = null;
    session.streamMsgId = null;
    saveSessionData();
  }
}

// ── Session helpers ─────────────────────────────────────────
function switchSession(name) {
  if (!sessions.has(name)) {
    sendTg(`Session "${name}" not found.`);
    return;
  }
  activeSessionName = name;
  const session = sessions.get(name);
  const status = session.busy ? "busy" : session.sessionId ? "resumable" : "new";
  sendTg(`Switched to "${name}" (${status})\nCost: $${session.totalCost.toFixed(4)}\n${session.path}`);
}

function resolveSessionName(input) {
  const idx = parseInt(input, 10);
  if (!isNaN(idx) && idx >= 1 && idx <= PROJECTS.length) {
    return PROJECTS[idx - 1].name;
  }
  if (sessions.has(input)) return input;
  for (const [name] of sessions) {
    if (name.startsWith(input)) return name;
  }
  return null;
}

// ── Project scanner ─────────────────────────────────────────
function scanDirectories(roots) {
  const found = [];
  const existingPaths = new Set(PROJECTS.map((p) => p.path));
  for (const root of roots) {
    const expanded = root.replace(/^~/, homedir());
    if (!existsSync(expanded)) continue;
    try {
      for (const entry of readdirSync(expanded)) {
        if (entry.startsWith(".")) continue;
        const full = resolve(expanded, entry);
        try {
          if (!statSync(full).isDirectory()) continue;
        } catch { continue; }
        if (!existingPaths.has(full)) {
          found.push(full);
        }
      }
    } catch { /* skip */ }
  }
  return found.sort();
}

// Pending scan selection state
let pendingScan = null;

function clearPendingScan() {
  pendingScan = null;
}

// ── Telegram message handler ────────────────────────────────
bot.on("message", (msg) => {
  if (!guard(msg.chat.id)) return;

  const text = msg.text?.trim();
  if (!text) return;

  console.log(`[TG ->] ${text}`);

  // Handle pending scan selection (user picks a number from /scan results)
  if (pendingScan && Date.now() < pendingScan.expiresAt) {
    const pickMatch = text.match(/^(\d+)$/);
    if (pickMatch) {
      const idx = parseInt(pickMatch[1], 10) - 1;
      if (idx >= 0 && idx < pendingScan.results.length) {
        const pickedPath = pendingScan.results[idx];
        const name = basename(pickedPath);
        clearPendingScan();
        if (sessions.has(name)) {
          sendTg(`Session "${name}" already exists.`);
          return;
        }
        const project = { name, path: pickedPath, model: MODEL };
        PROJECTS.push(project);
        sessions.set(name, createSession(project));
        if (!activeSessionName) activeSessionName = name;
        saveProjects();
        sendTg(`Added "${name}" -> ${pickedPath}\nModel: ${project.model}\nReady — send a message to start.`);
        return;
      }
    }
    // Any non-number input clears pending scan
    clearPendingScan();
  }

  // Handle numbered quick-switch from keyboard: "1:name" or "> 1:name" or "~ 1:name"
  const keyboardMatch = text.match(/^[>~]?\s*(\d+):(\S+)$/);
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

  // Handle /start <name|number> — show session info (no process to start)
  const startMatch = text.match(/^\/start\s+(.+)$/i);
  if (startMatch) {
    const name = resolveSessionName(startMatch[1].trim());
    if (name) {
      const session = sessions.get(name);
      const status = session.busy ? "busy" : session.sessionId ? "resumable" : "new";
      sendTg(`[${name}] Status: ${status}\nPath: ${session.path}\nModel: ${session.model}\nCost: $${session.totalCost.toFixed(4)}\nSession ID: ${session.sessionId || "(none)"}`);
    } else {
      sendTg(`Session "${startMatch[1]}" not found. Use /sessions to list.`);
    }
    return;
  }

  // Handle /stop <name|number> — abort if busy
  const stopMatch = text.match(/^\/stop\s+(.+)$/i);
  if (stopMatch) {
    const name = resolveSessionName(stopMatch[1].trim());
    if (name) {
      const session = sessions.get(name);
      if (session.busy && session.abortController) {
        session.abortController.abort();
        sendTg(`[${name}] Aborting...`);
      } else {
        sendTg(`[${name}] Not busy.`);
      }
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
    const project = { name, path, model: model || MODEL };
    PROJECTS.push(project);
    sessions.set(name, createSession(project));
    if (!activeSessionName) activeSessionName = name;
    saveProjects();
    sendTg(`Added "${name}" -> ${path}\nModel: ${project.model}\nReady — send a message to start.`);
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
    // Abort if busy
    const session = sessions.get(name);
    if (session?.busy && session?.abortController) {
      session.abortController.abort();
    }
    // Switch active if removing active session
    if (activeSessionName === name) {
      const remaining = PROJECTS.find((p) => p.name !== name);
      activeSessionName = remaining.name;
    }
    const idx = PROJECTS.findIndex((p) => p.name === name);
    PROJECTS.splice(idx, 1);
    sessions.delete(name);
    saveProjects();
    saveSessionData();
    sendTg(`Removed "${name}". Active: ${activeSessionName}`);
    return;
  }

  // Handle /scan <path> — scan a specific directory
  const scanMatch = text.match(/^\/scan\s+(.+)$/i);
  if (scanMatch) {
    const scanPath = scanMatch[1].trim().replace(/^~/, homedir());
    if (!existsSync(scanPath)) {
      sendTg(`Path does not exist: ${scanPath}`);
      return;
    }
    const results = scanDirectories([scanPath]);
    if (results.length === 0) {
      sendTg(`No new projects found in: ${scanPath}`);
      return;
    }
    pendingScan = { results, expiresAt: Date.now() + 120000 };
    const lines = results.map((p, i) => `${i + 1}. ${basename(p)}`);
    sendTg(`Found ${results.length} project(s):\n\n${lines.join("\n")}\n\nSend a number (e.g. 3) to add that project. Expires in 2min.`);
    return;
  }

  // Handle /permissions [on|off] — toggle permission relay for active session
  const permMatch = text.match(/^\/permissions(?:\s+(on|off))?$/i);
  if (permMatch) {
    const session = getActiveSession();
    if (!session) {
      sendTg("No active session.");
      return;
    }
    if (permMatch[1]) {
      session.permInteractive = permMatch[1].toLowerCase() === "on";
    } else {
      session.permInteractive = !session.permInteractive;
    }
    saveSessionData();
    const mode = session.permInteractive ? "ON (interactive)" : "OFF (bypass all)";
    const desc = session.permInteractive
      ? "Claude will ask permission before Write, Edit, Bash, and Task.\nSafe tools (Read, Glob, Grep, WebSearch, WebFetch) are auto-allowed."
      : "All tools auto-allowed without prompting.";
    sendTg(`[${session.name}] Permissions: ${mode}\n${desc}`);
    return;
  }

  // Handle /restart <name|number> — clear session ID so next query starts fresh
  const restartMatch = text.match(/^\/restart(?:\s+(.+))?$/i);
  if (restartMatch) {
    const target = restartMatch[1] ? resolveSessionName(restartMatch[1].trim()) : activeSessionName;
    if (!target || !sessions.has(target)) {
      sendTg("No valid session to restart.");
      return;
    }
    const session = sessions.get(target);
    if (session.busy && session.abortController) {
      session.abortController.abort();
    }
    session.sessionId = null;
    session.streamBuffer = "";
    session.outputHistory = [];
    saveSessionData();
    sendTg(`[${target}] Session reset. Next message starts fresh.`);
    return;
  }

  switch (text) {
    case "/start":
      sendTg(
        "Claude Code Telegram Bridge (SDK mode)\n\n" +
          "Session commands:\n" +
          "/sessions  - List all sessions\n" +
          "/switch <name>  - Switch active session\n" +
          "/1 /2 /3  - Quick switch by number\n" +
          "/start <name>  - Show session info\n" +
          "/stop <name>  - Abort running query\n" +
          "/restart [name]  - Reset session (start fresh)\n" +
          "/scan [path]  - Scan for projects to add\n" +
          "/add <name> <path>  - Add manually by path\n" +
          "/remove <name>  - Remove project\n\n" +
          "Active session commands:\n" +
          "/status  - Last output lines\n" +
          "/cancel  - Abort current query\n" +
          "/permissions [on|off]  - Toggle approve/deny from phone\n" +
          "/cost  - Show cost breakdown\n" +
          "/ping  - Check bridge status\n\n" +
          "Quick replies: y, n\n" +
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
        const status = s?.busy ? "busy" : s?.sessionId ? "resumable" : "new";
        const arrow = isActive ? " << active" : "";
        const cost = s ? ` ($${s.totalCost.toFixed(4)})` : "";
        return `${i + 1}. ${p.name} [${status}]${cost}${arrow}\n   ${p.path}`;
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

    case "/cancel": {
      const session = getActiveSession();
      if (!session) {
        sendTg("No active session.");
        break;
      }
      if (session.busy && session.abortController) {
        session.abortController.abort();
        sendTg(`[${session.name}] Canceling...`);
      } else {
        sendTg(`[${session.name}] Not busy.`);
      }
      break;
    }

    case "/kill": {
      // Alias for /cancel
      const session = getActiveSession();
      if (!session) {
        sendTg("No active session.");
        break;
      }
      if (session.busy && session.abortController) {
        session.abortController.abort();
        sendTg(`[${session.name}] Canceling...`);
      } else {
        sendTg(`[${session.name}] Not busy.`);
      }
      break;
    }

    case "/cost": {
      const totalCost = [...sessions.values()].reduce((sum, s) => sum + s.totalCost, 0);
      const lines = PROJECTS.map((p) => {
        const s = sessions.get(p.name);
        return `  ${p.name}: $${(s?.totalCost || 0).toFixed(4)}`;
      });
      sendTg(`Cost breakdown:\n${lines.join("\n")}\n\nTotal: $${totalCost.toFixed(4)}`);
      break;
    }

    case "/scan": {
      const results = scanDirectories(SCAN_ROOTS);
      if (results.length === 0) {
        sendTg(`No new projects found in:\n${SCAN_ROOTS.join("\n")}`);
        break;
      }
      pendingScan = { results, expiresAt: Date.now() + 120000 };
      const lines = results.map((p, i) => `${i + 1}. ${basename(p)}`);
      sendTg(`Found ${results.length} project(s):\n\n${lines.join("\n")}\n\nSend a number (e.g. 3) to add that project. Expires in 2min.`);
      break;
    }

    case "/ping": {
      const busyCount = [...sessions.values()].filter((s) => s.busy).length;
      const total = sessions.size;
      const totalCost = [...sessions.values()].reduce((sum, s) => sum + s.totalCost, 0);
      sendTg(`Bridge alive. Sessions: ${busyCount}/${total} busy. Active: ${activeSessionName || "none"}\nTotal cost: $${totalCost.toFixed(4)}`);
      break;
    }

    default:
      if (text.startsWith("/")) {
        sendTg(`Unknown command: ${text}\nUse /start for help.`);
      } else if (!activeSessionName || !sessions.has(activeSessionName)) {
        sendTg("No sessions yet. Use /add <name> <path> to add a project.");
      } else {
        runQuery(activeSessionName, text);
      }
  }
});

// ── Permission inline button handler ─────────────────────────
bot.on("callback_query", async (query) => {
  const data = query.data;
  if (!data) return;

  // Parse: pa_<id> (allow), pd_<id> (deny), ps_<id> (always allow)
  const match = data.match(/^p([ads])_(.+)$/);
  if (!match) return;

  const [, action, toolUseID] = match;
  const pending = pendingPermissions.get(toolUseID);
  if (!pending) {
    await bot.answerCallbackQuery(query.id, { text: "Expired or already handled" });
    return;
  }

  clearTimeout(pending.timeout);
  pendingPermissions.delete(toolUseID);

  let result;
  let statusText;

  switch (action) {
    case "a":
      result = { behavior: "allow", toolUseID };
      statusText = "Allowed";
      break;
    case "d":
      result = { behavior: "deny", message: "Denied by user", toolUseID };
      statusText = "Denied";
      break;
    case "s":
      result = {
        behavior: "allow",
        updatedPermissions: pending.suggestions || [],
        toolUseID,
      };
      statusText = "Always allowed";
      break;
  }

  // Update message to show decision (remove inline buttons)
  try {
    await bot.editMessageText(
      `${redactSecrets(pending.promptText)}\n\n${statusText}`,
      { chat_id: CHAT_ID, message_id: pending.msgId }
    );
  } catch {
    // Ignore edit errors
  }

  await bot.answerCallbackQuery(query.id, { text: statusText });
  pending.resolve(result);
});

bot.on("polling_error", (err) => {
  console.error("[TG polling error]", err.message);
});

// ── Graceful shutdown ───────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n[bridge] ${signal} received, shutting down...`);
  // Clear pending permission prompts
  for (const [id, pending] of pendingPermissions) {
    clearTimeout(pending.timeout);
    pending.resolve({ behavior: "deny", message: "Bridge shutting down" });
  }
  pendingPermissions.clear();
  // Abort all active queries
  for (const [name, session] of sessions) {
    if (session.busy && session.abortController) {
      console.log(`[bridge] Aborting "${name}"...`);
      session.abortController.abort();
    }
  }
  saveSessionData();
  bot.stopPolling();
  setTimeout(() => process.exit(0), 2000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ── Start ───────────────────────────────────────────────────
console.log("[bridge] Claude Code Telegram Bridge (SDK mode) starting...");
console.log(`[bridge] Chat ID: ${CHAT_ID}`);
console.log(`[bridge] Projects: ${PROJECTS.length === 0 ? "(none -- use /add on Telegram)" : PROJECTS.map((p) => p.name).join(", ")}`);

// Initialize all sessions (no processes spawned — queries on demand)
for (const project of PROJECTS) {
  sessions.set(project.name, createSession(project));
}

if (PROJECTS.length > 0) {
  const permMode = DEFAULT_PERM_INTERACTIVE ? "interactive" : "bypass";
  sendTg(`Bridge started (SDK mode). ${PROJECTS.length} project(s) ready.\nActive: ${activeSessionName}\nPermissions: ${permMode}\nSend a message to start.`);
} else {
  sendTg("Bridge started (SDK mode). No projects configured.\nUse /add <name> <path> to add a project.");
}
