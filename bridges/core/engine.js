import { query as sdkQuery } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, basename } from "node:path";
import { homedir } from "node:os";

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

// ── Constants ──────────────────────────────────────────────
const MAX_HISTORY = 500;
const STREAM_THROTTLE_MS = 300;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Shared engine for all bridge providers.
 * Handles Claude sessions, permissions, project management, streaming.
 * Provider handles messaging UI only.
 */
export class BridgeEngine {
  /**
   * @param {import('./provider.js').BridgeProvider} provider
   * @param {object} options
   */
  constructor(provider, options = {}) {
    this.provider = provider;
    this.model = options.model || "claude-opus-4-6";
    this.statusLines = options.statusLines || 50;
    this.permissionTimeoutMs = options.permissionTimeoutMs || 300000;
    this.scanRoots = options.scanRoots || [];
    this.safeTools = options.safeTools || ["Read", "Glob", "Grep", "WebSearch", "WebFetch"];
    this.defaultPermInteractive = options.permInteractive || false;

    this.projects = [];
    this.sessions = new Map();
    this.activeSessionName = null;
    this.pendingPermissions = new Map();
    this.persistedSessions = {};
    this.dataDir = options.dataDir || process.cwd();

    // Pending scan state (for interactive project scanning)
    this.pendingScan = null;
  }

  // ── Persistence helpers ─────────────────────────────────

  get projectsJsonPath() {
    return resolve(this.dataDir, "projects.json");
  }

  get sessionsJsonPath() {
    return resolve(this.dataDir, "sessions.json");
  }

  loadProjects() {
    try {
      if (existsSync(this.projectsJsonPath)) {
        const raw = readFileSync(this.projectsJsonPath, "utf-8");
        const projects = JSON.parse(raw);
        if (Array.isArray(projects)) {
          return projects.map((p, i) => ({
            name: p.name || `project-${i + 1}`,
            path: p.path,
            model: p.model || this.model,
          }));
        }
      }
    } catch {
      // Ignore corrupt file
    }
    return [];
  }

  saveProjects() {
    const data = this.projects.map((p) => ({
      name: p.name,
      path: p.path,
      model: p.model,
    }));
    writeFileSync(this.projectsJsonPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  }

  loadSessionData() {
    try {
      if (existsSync(this.sessionsJsonPath)) {
        const raw = readFileSync(this.sessionsJsonPath, "utf-8");
        const data = JSON.parse(raw);
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

  saveSessionData() {
    const data = {};
    for (const [name, session] of this.sessions) {
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
      writeFileSync(this.sessionsJsonPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    } catch (err) {
      console.error("[engine] Failed to save sessions:", err.message);
    }
  }

  // ── Session creation ────────────────────────────────────

  createSession(project) {
    const persisted = this.persistedSessions[project.name];
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
      permInteractive: persisted?.permInteractive ?? this.defaultPermInteractive,
    };
  }

  // ── Session helpers ─────────────────────────────────────

  getActiveSession() {
    return this.sessions.get(this.activeSessionName);
  }

  pushHistory(session, line) {
    session.outputHistory.push(line);
    if (session.outputHistory.length > MAX_HISTORY) session.outputHistory.shift();
  }

  // ── Message splitting ───────────────────────────────────

  splitMessage(text) {
    const maxLen = this.provider.maxMessageLength;
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
  }

  // ── Sending helpers (go through provider) ───────────────

  async send(text) {
    if (!text?.trim()) return;
    const safe = redactSecrets(text.trim());
    const chunks = this.splitMessage(safe);
    for (const chunk of chunks) {
      try {
        await this.provider.send(chunk);
      } catch (err) {
        console.error("[engine send error]", err.message);
      }
    }
  }

  // ── Streaming helpers ───────────────────────────────────

  async throttledEdit(session) {
    const now = Date.now();
    if (now - session.lastEditTime < STREAM_THROTTLE_MS) return;
    if (!session.streamMsgId || !session.streamBuffer) return;

    session.lastEditTime = now;
    const maxLen = this.provider.maxMessageLength;
    const display =
      session.streamBuffer.length > maxLen
        ? "..." + session.streamBuffer.slice(-(maxLen - 10))
        : session.streamBuffer;

    try {
      await this.provider.editMessage(session.streamMsgId, redactSecrets(display));
    } catch {
      // Ignore edit errors (message not modified, etc.)
    }
  }

  async finalEdit(session, text) {
    const safe = redactSecrets(text);
    const costLine = `\n\n---\nCost: $${session.totalCost.toFixed(4)}`;
    const full = safe + costLine;
    const maxLen = this.provider.maxMessageLength;

    if (full.length <= maxLen && session.streamMsgId) {
      try {
        await this.provider.editMessage(session.streamMsgId, full);
        return;
      } catch {
        // Fall through to send new message
      }
    }

    // If too long or edit failed, send as new message(s)
    await this.send(full);
  }

  // ── Permission relay ────────────────────────────────────

  formatPermissionPrompt(sessionName, toolName, input, opts) {
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

  buildCanUseTool(sessionName) {
    return async (toolName, input, opts) => {
      const toolUseID = opts.toolUseID;
      const promptText = this.formatPermissionPrompt(sessionName, toolName, input, opts);

      try {
        const actions = [
          { id: `pa_${toolUseID}`, label: "Allow" },
          { id: `pd_${toolUseID}`, label: "Deny" },
          { id: `ps_${toolUseID}`, label: "Always Allow" },
        ];

        const { messageId } = await this.provider.sendWithActions(
          redactSecrets(promptText),
          actions
        );

        return new Promise((resolvePermission) => {
          const timeout = setTimeout(() => {
            this.pendingPermissions.delete(toolUseID);
            this.provider
              .editMessage(messageId, `${redactSecrets(promptText)}\n\nTimed out — denied`)
              .catch(() => {});
            resolvePermission({
              behavior: "deny",
              message: "Permission timed out",
              toolUseID,
            });
          }, this.permissionTimeoutMs);

          // Clean up on abort (query canceled)
          opts.signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timeout);
              this.pendingPermissions.delete(toolUseID);
              resolvePermission({
                behavior: "deny",
                message: "Query canceled",
                toolUseID,
              });
            },
            { once: true }
          );

          this.pendingPermissions.set(toolUseID, {
            resolve: resolvePermission,
            timeout,
            msgId: messageId,
            promptText,
            suggestions: opts.suggestions,
          });
        });
      } catch (err) {
        console.error("[engine] Permission prompt send failed:", err.message);
        return {
          behavior: "deny",
          message: "Failed to send permission prompt",
          toolUseID,
        };
      }
    };
  }

  /**
   * Called by the provider when a user presses a permission button.
   * @param {string} actionId — e.g. "pa_<toolUseID>", "pd_<toolUseID>", "ps_<toolUseID>"
   * @param {string|number} messageId — not used directly but kept for API shape
   * @returns {{ handled: boolean, statusText?: string }}
   */
  handlePermissionAction(actionId, messageId) {
    // Parse: pa_<id> (allow), pd_<id> (deny), ps_<id> (always allow)
    const match = actionId.match(/^p([ads])_(.+)$/);
    if (!match) return { handled: false };

    const [, action, toolUseID] = match;
    const pending = this.pendingPermissions.get(toolUseID);
    if (!pending) return { handled: false, expired: true };

    clearTimeout(pending.timeout);
    this.pendingPermissions.delete(toolUseID);

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

    // Update message to show decision (provider will remove inline buttons)
    this.provider
      .editMessage(pending.msgId, `${redactSecrets(pending.promptText)}\n\n${statusText}`)
      .catch(() => {});

    pending.resolve(result);
    return { handled: true, statusText };
  }

  // ── Core: runQuery ──────────────────────────────────────

  async runQuery(sessionName, prompt) {
    const session = this.sessions.get(sessionName);
    if (!session) {
      await this.send(`Session "${sessionName}" not found.`);
      return;
    }
    if (session.busy) {
      await this.send(`[${sessionName}] Busy — use /cancel to abort current query.`);
      return;
    }

    session.busy = true;
    session.abortController = new AbortController();
    session.streamBuffer = "";
    session.streamMsgId = null;
    session.lastEditTime = 0;

    try {
      // Send "Working..." and capture msg_id for streaming edits
      const prefix = sessionName !== this.activeSessionName ? `[${sessionName}] ` : "";
      const { messageId } = await this.provider.send(`${prefix}Working...`);
      session.streamMsgId = messageId;

      // Build SDK options
      const options = {
        cwd: session.path,
        model: session.model,
        abortController: session.abortController,
        settingSources: ["user", "project"],
      };

      if (session.permInteractive) {
        // Interactive mode: prompt user for dangerous tools
        options.permissionMode = "default";
        options.allowedTools = this.safeTools;
        options.canUseTool = this.buildCanUseTool(sessionName);
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

      console.log(
        `[engine] Query "${sessionName}": ${prompt.slice(0, 80)}${prompt.length > 80 ? "..." : ""}`
      );

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
              this.pushHistory(session, block.text);
              await this.throttledEdit(session);
            }
          }
        }

        // Final result
        if (message.type === "result") {
          session.sessionId = message.session_id;
          session.totalCost += message.total_cost_usd || 0;

          const resultText = session.streamBuffer || message.result || "(no output)";
          this.pushHistory(
            session,
            `--- Cost: $${(message.total_cost_usd || 0).toFixed(4)} | Turns: ${message.num_turns || 0} ---`
          );

          await this.finalEdit(session, resultText);
          this.saveSessionData();

          console.log(
            `[engine] Query done "${sessionName}" — $${(message.total_cost_usd || 0).toFixed(4)}, ${message.num_turns || 0} turns`
          );
        }
      }
    } catch (err) {
      if (err.name === "AbortError" || session.abortController?.signal?.aborted) {
        await this.send(`[${sessionName}] Canceled.`);
        console.log(`[engine] Query canceled "${sessionName}"`);
      } else {
        const errMsg = `[${sessionName}] Error: ${err.message}`;
        console.error(`[engine] ${errMsg}`);
        await this.send(errMsg);
      }
    } finally {
      session.busy = false;
      session.abortController = null;
      session.streamMsgId = null;
      this.saveSessionData();
    }
  }

  // ── Session management (public API) ─────────────────────

  switchSession(name) {
    if (!this.sessions.has(name)) {
      this.send(`Session "${name}" not found.`);
      return;
    }
    this.activeSessionName = name;
    const session = this.sessions.get(name);
    const status = session.busy ? "busy" : session.sessionId ? "resumable" : "new";
    this.send(
      `Switched to "${name}" (${status})\nCost: $${session.totalCost.toFixed(4)}\n${session.path}`
    );
  }

  resolveSessionName(input) {
    const idx = parseInt(input, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= this.projects.length) {
      return this.projects[idx - 1].name;
    }
    if (this.sessions.has(input)) return input;
    for (const [name] of this.sessions) {
      if (name.startsWith(input)) return name;
    }
    return null;
  }

  getSessionStatus(name) {
    const session = this.sessions.get(name);
    if (!session) return null;
    return {
      name: session.name,
      path: session.path,
      model: session.model,
      busy: session.busy,
      sessionId: session.sessionId,
      totalCost: session.totalCost,
      permInteractive: session.permInteractive,
      status: session.busy ? "busy" : session.sessionId ? "resumable" : "new",
    };
  }

  getSessionsList() {
    return this.projects.map((p, i) => {
      const s = this.sessions.get(p.name);
      const isActive = p.name === this.activeSessionName;
      const status = s?.busy ? "busy" : s?.sessionId ? "resumable" : "new";
      return {
        index: i + 1,
        name: p.name,
        path: p.path,
        status,
        totalCost: s?.totalCost || 0,
        isActive,
      };
    });
  }

  addProject(name, path, model) {
    if (this.sessions.has(name)) {
      return { ok: false, error: `Session "${name}" already exists. Use /remove first.` };
    }
    if (!existsSync(path)) {
      return { ok: false, error: `Path does not exist: ${path}` };
    }
    const project = { name, path, model: model || this.model };
    this.projects.push(project);
    this.sessions.set(name, this.createSession(project));
    if (!this.activeSessionName) this.activeSessionName = name;
    this.saveProjects();
    return {
      ok: true,
      message: `Added "${name}" -> ${path}\nModel: ${project.model}\nReady — send a message to start.`,
    };
  }

  removeProject(name) {
    if (!this.sessions.has(name)) {
      return { ok: false, error: `Session "${name}" not found.` };
    }
    if (this.projects.length <= 1) {
      return { ok: false, error: "Cannot remove the last session. Add another first." };
    }
    // Abort if busy
    const session = this.sessions.get(name);
    if (session?.busy && session?.abortController) {
      session.abortController.abort();
    }
    // Switch active if removing active session
    if (this.activeSessionName === name) {
      const remaining = this.projects.find((p) => p.name !== name);
      this.activeSessionName = remaining.name;
    }
    const idx = this.projects.findIndex((p) => p.name === name);
    this.projects.splice(idx, 1);
    this.sessions.delete(name);
    this.saveProjects();
    this.saveSessionData();
    return { ok: true, message: `Removed "${name}". Active: ${this.activeSessionName}` };
  }

  scanForProjects(roots) {
    const found = [];
    const existingPaths = new Set(this.projects.map((p) => p.path));
    for (const root of roots) {
      const expanded = root.replace(/^~/, homedir());
      if (!existsSync(expanded)) continue;
      try {
        for (const entry of readdirSync(expanded)) {
          if (entry.startsWith(".")) continue;
          const full = resolve(expanded, entry);
          try {
            if (!statSync(full).isDirectory()) continue;
          } catch {
            continue;
          }
          if (!existingPaths.has(full)) {
            found.push(full);
          }
        }
      } catch {
        /* skip */
      }
    }
    return found.sort();
  }

  /**
   * Start a scan and store results for interactive selection.
   * @param {string[]} roots
   * @returns {{ results: string[], message: string } | null}
   */
  startScan(roots) {
    const results = this.scanForProjects(roots);
    if (results.length === 0) return null;
    this.pendingScan = { results, expiresAt: Date.now() + 120000 };
    const lines = results.map((p, i) => `${i + 1}. ${basename(p)}`);
    return {
      results,
      message: `Found ${results.length} project(s):\n\n${lines.join("\n")}\n\nSend a number (e.g. 3) to add that project. Expires in 2min.`,
    };
  }

  /**
   * Try to pick a project from the pending scan by number.
   * @param {string} text — raw user input
   * @returns {{ handled: boolean, message?: string }}
   */
  handleScanPick(text) {
    if (!this.pendingScan || Date.now() >= this.pendingScan.expiresAt) {
      this.pendingScan = null;
      return { handled: false };
    }

    const pickMatch = text.match(/^(\d+)$/);
    if (!pickMatch) {
      // Any non-number input clears pending scan
      this.pendingScan = null;
      return { handled: false };
    }

    const idx = parseInt(pickMatch[1], 10) - 1;
    if (idx < 0 || idx >= this.pendingScan.results.length) {
      this.pendingScan = null;
      return { handled: false };
    }

    const pickedPath = this.pendingScan.results[idx];
    const name = basename(pickedPath);
    this.pendingScan = null;

    if (this.sessions.has(name)) {
      return { handled: true, message: `Session "${name}" already exists.` };
    }

    const result = this.addProject(name, pickedPath);
    return { handled: true, message: result.ok ? result.message : result.error };
  }

  togglePermissions(sessionName, forceTo) {
    const session = this.sessions.get(sessionName);
    if (!session) return { ok: false, error: "No active session." };

    if (forceTo !== undefined) {
      session.permInteractive = forceTo;
    } else {
      session.permInteractive = !session.permInteractive;
    }
    this.saveSessionData();

    const mode = session.permInteractive ? "ON (interactive)" : "OFF (bypass all)";
    const desc = session.permInteractive
      ? "Claude will ask permission before Write, Edit, Bash, and Task.\nSafe tools (Read, Glob, Grep, WebSearch, WebFetch) are auto-allowed."
      : "All tools auto-allowed without prompting.";
    return { ok: true, message: `[${session.name}] Permissions: ${mode}\n${desc}` };
  }

  resetSession(name) {
    const session = this.sessions.get(name);
    if (!session) return { ok: false, error: "No valid session to restart." };

    if (session.busy && session.abortController) {
      session.abortController.abort();
    }
    session.sessionId = null;
    session.streamBuffer = "";
    session.outputHistory = [];
    this.saveSessionData();
    return { ok: true, message: `[${name}] Session reset. Next message starts fresh.` };
  }

  cancelQuery(name) {
    const session = this.sessions.get(name);
    if (!session) return { ok: false, error: "No active session." };

    if (session.busy && session.abortController) {
      session.abortController.abort();
      return { ok: true, message: `[${session.name}] Canceling...` };
    }
    return { ok: true, message: `[${session.name}] Not busy.` };
  }

  getCostBreakdown() {
    const totalCost = [...this.sessions.values()].reduce((sum, s) => sum + s.totalCost, 0);
    const lines = this.projects.map((p) => {
      const s = this.sessions.get(p.name);
      return `  ${p.name}: $${(s?.totalCost || 0).toFixed(4)}`;
    });
    return {
      lines,
      totalCost,
      message: `Cost breakdown:\n${lines.join("\n")}\n\nTotal: $${totalCost.toFixed(4)}`,
    };
  }

  getPingInfo() {
    const busyCount = [...this.sessions.values()].filter((s) => s.busy).length;
    const total = this.sessions.size;
    const totalCost = [...this.sessions.values()].reduce((sum, s) => sum + s.totalCost, 0);
    return {
      message: `Bridge alive. Sessions: ${busyCount}/${total} busy. Active: ${this.activeSessionName || "none"}\nTotal cost: $${totalCost.toFixed(4)}`,
    };
  }

  getStatusLines() {
    const session = this.getActiveSession();
    if (!session) return { ok: false, error: "No active session." };

    const lines = session.outputHistory.slice(-this.statusLines);
    if (lines.length === 0) {
      return { ok: true, message: `[${session.name}] No output yet.` };
    }
    return { ok: true, message: `[${session.name}] Last ${lines.length} lines:\n\n${lines.join("\n")}` };
  }

  getHelpText() {
    return (
      "Claude Code Bridge (SDK mode)\n\n" +
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
  }

  // ── Lifecycle ───────────────────────────────────────────

  init() {
    this.projects = this.loadProjects();
    this.persistedSessions = this.loadSessionData();
    this.activeSessionName = this.projects[0]?.name || null;

    for (const project of this.projects) {
      this.sessions.set(project.name, this.createSession(project));
    }

    console.log("[engine] Claude Code Bridge (SDK mode) starting...");
    console.log(
      `[engine] Projects: ${this.projects.length === 0 ? "(none -- use /add)" : this.projects.map((p) => p.name).join(", ")}`
    );
  }

  shutdown() {
    console.log("[engine] Shutting down...");

    // Clear pending permission prompts
    for (const [, pending] of this.pendingPermissions) {
      clearTimeout(pending.timeout);
      pending.resolve({ behavior: "deny", message: "Bridge shutting down" });
    }
    this.pendingPermissions.clear();

    // Abort all active queries
    for (const [name, session] of this.sessions) {
      if (session.busy && session.abortController) {
        console.log(`[engine] Aborting "${name}"...`);
        session.abortController.abort();
      }
    }

    this.saveSessionData();
  }
}
