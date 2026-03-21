import { spawn } from "node:child_process";
import { config } from "dotenv";
import TelegramBot from "node-telegram-bot-api";

config();

// ── Config ──────────────────────────────────────────────────
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = Number(process.env.MY_CHAT_ID);
const PROJECT_PATH = process.env.CLAUDE_PROJECT_PATH;
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-6";
const AUTO_RESTART = process.env.AUTO_RESTART !== "false";
const STATUS_LINES = Number(process.env.STATUS_LINES) || 50;

if (!TOKEN || !CHAT_ID || !PROJECT_PATH) {
  console.error("Missing required env vars: TELEGRAM_TOKEN, MY_CHAT_ID, CLAUDE_PROJECT_PATH");
  process.exit(1);
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

// ── Telegram setup ──────────────────────────────────────────
const bot = new TelegramBot(TOKEN, { polling: true });

const QUICK_REPLIES = {
  reply_markup: {
    keyboard: [
      [{ text: "y" }, { text: "n" }, { text: "skip" }],
      [{ text: "/status" }, { text: "/kill" }, { text: "/restart" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

const guard = (chatId) => {
  if (chatId !== CHAT_ID) {
    bot.sendMessage(chatId, "⛔ Unauthorized.");
    return false;
  }
  return true;
};

const sendTg = async (text, extra = {}) => {
  if (!text?.trim()) return;
  const chunks = splitMessage(text.trim());
  for (const chunk of chunks) {
    try {
      await bot.sendMessage(CHAT_ID, chunk, { ...QUICK_REPLIES, ...extra });
    } catch (err) {
      console.error("[TG send error]", err.message);
    }
  }
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

// ── Claude Code process management ──────────────────────────
let claude = null;
let outputBuffer = "";
let outputHistory = [];
let flushTimer = null;
let alive = false;
let restartCount = 0;

const MAX_HISTORY = 500;
const FLUSH_DELAY_MS = 1500;
const RESTART_DELAY_MS = 3000;
const MAX_RESTARTS = 10;

function pushHistory(line) {
  outputHistory.push(line);
  if (outputHistory.length > MAX_HISTORY) outputHistory.shift();
}

function flushBuffer(force = false) {
  clearTimeout(flushTimer);
  flushTimer = null;

  const text = outputBuffer.trim();
  if (!text) return;

  const shouldSend = force || isPrompt(text) || text.length > 300;

  if (shouldSend) {
    outputBuffer = "";
    sendTg(text);
  } else {
    flushTimer = setTimeout(() => flushBuffer(true), FLUSH_DELAY_MS * 2);
  }
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flushBuffer(false), FLUSH_DELAY_MS);
}

function startClaude() {
  if (claude && alive) {
    console.log("[bridge] Claude already running, skipping start");
    return;
  }

  console.log(`[bridge] Starting Claude Code in ${PROJECT_PATH}`);
  sendTg(`🚀 Starting Claude Code...\n📁 ${PROJECT_PATH}\n🤖 Model: ${MODEL}`);

  claude = spawn("claude", ["--dangerously-skip-permissions", "--model", MODEL], {
    cwd: PROJECT_PATH,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });

  alive = true;
  outputBuffer = "";

  claude.stdout.on("data", (data) => {
    const text = stripAnsi(data.toString());
    if (!text.trim()) return;

    for (const line of text.split("\n")) {
      pushHistory(line);
    }

    outputBuffer += text;

    if (isPrompt(text)) {
      flushBuffer(true);
    } else {
      scheduleFlush();
    }
  });

  claude.stderr.on("data", (data) => {
    const text = stripAnsi(data.toString()).trim();
    if (!text) return;
    pushHistory(`[stderr] ${text}`);
    sendTg(`⚠️ ${text}`);
  });

  claude.on("close", (code) => {
    alive = false;
    flushBuffer(true);
    const msg = `💀 Claude Code exited (code: ${code})`;
    console.log(`[bridge] ${msg}`);
    sendTg(msg);

    if (AUTO_RESTART && code !== 0 && restartCount < MAX_RESTARTS) {
      restartCount++;
      sendTg(`🔄 Auto-restarting in ${RESTART_DELAY_MS / 1000}s... (attempt ${restartCount}/${MAX_RESTARTS})`);
      setTimeout(startClaude, RESTART_DELAY_MS);
    } else if (restartCount >= MAX_RESTARTS) {
      sendTg("❌ Max restart attempts reached. Use /restart to manually restart.");
    }
  });

  claude.on("error", (err) => {
    alive = false;
    console.error("[bridge] spawn error:", err.message);
    sendTg(`❌ Failed to start Claude Code: ${err.message}`);
  });
}

function writeToClaude(text) {
  if (!claude || !alive) {
    sendTg("⚠️ Claude Code is not running. Use /restart to start.");
    return false;
  }
  try {
    claude.stdin.write(text + "\n");
    return true;
  } catch (err) {
    sendTg(`❌ Write error: ${err.message}`);
    return false;
  }
}

function killClaude() {
  if (claude && alive) {
    claude.kill("SIGTERM");
    setTimeout(() => {
      if (alive) claude.kill("SIGKILL");
    }, 5000);
    sendTg("🛑 Terminating Claude Code...");
  } else {
    sendTg("ℹ️ Claude Code is not running.");
  }
}

// ── ANSI strip ──────────────────────────────────────────────
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]|\x1b\].*?\x07|\x1b\[.*?[a-zA-Z]/g;
const stripAnsi = (str) =>
  str
    .replace(ANSI_RE, "")
    .replace(/[\x00-\x09\x0b\x0c\x0e-\x1f]/g, "")
    .replace(/\r/g, "");

// ── Telegram message handler ────────────────────────────────
bot.on("message", (msg) => {
  if (!guard(msg.chat.id)) return;

  const text = msg.text?.trim();
  if (!text) return;

  console.log(`[TG →] ${text}`);

  switch (text) {
    case "/start":
      sendTg(
        "🤖 Claude Code Telegram Bridge\n\n" +
          "Commands:\n" +
          "/status — Last output lines\n" +
          "/kill — Stop Claude Code\n" +
          "/restart — Restart Claude Code\n" +
          "/ping — Check bridge is alive\n\n" +
          "Quick replies: y, n, skip\n" +
          "Or type any text to send to Claude Code."
      );
      break;

    case "/status": {
      const lines = outputHistory.slice(-STATUS_LINES);
      if (lines.length === 0) {
        sendTg("📭 No output yet.");
      } else {
        sendTg(`📋 Last ${lines.length} lines:\n\n${lines.join("\n")}`);
      }
      break;
    }

    case "/kill":
      killClaude();
      break;

    case "/restart":
      killClaude();
      restartCount = 0;
      setTimeout(startClaude, 2000);
      break;

    case "/ping":
      sendTg(`🏓 Bridge alive. Claude: ${alive ? "✅ running" : "❌ stopped"}`);
      break;

    default:
      if (text.startsWith("/")) {
        sendTg(`❓ Unknown command: ${text}`);
      } else {
        writeToClaude(text);
      }
  }
});

bot.on("polling_error", (err) => {
  console.error("[TG polling error]", err.message);
});

// ── Graceful shutdown ───────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n[bridge] ${signal} received, shutting down...`);
  if (claude && alive) {
    claude.kill("SIGTERM");
  }
  bot.stopPolling();
  setTimeout(() => process.exit(0), 2000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ── Start ───────────────────────────────────────────────────
console.log("[bridge] Claude Code Telegram Bridge starting...");
console.log(`[bridge] Chat ID: ${CHAT_ID}`);
console.log(`[bridge] Project: ${PROJECT_PATH}`);
startClaude();
