#!/usr/bin/env node

/**
 * PostCompact hook — auto-saves context when Claude Code compresses conversation.
 *
 * When trigger is "auto", it means context was getting full.
 * Saves the compact summary + git state to .handoff/ for session recovery.
 *
 * Hook config (in ~/.claude/settings.json):
 * {
 *   "hooks": {
 *     "PostCompact": [{
 *       "type": "command",
 *       "command": "node ~/.claude/scripts/auto-save-context.js"
 *     }]
 *   }
 * }
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

// Read hook input from stdin
let input;
try {
  const raw = readFileSync("/dev/stdin", "utf-8");
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

// Only act on auto-compaction (context pressure), skip manual /compact
if (input.trigger !== "auto") {
  process.exit(0);
}

const cwd = input.cwd || process.cwd();
const summary = input.compact_summary || "(no summary available)";
const sessionId = input.session_id || "unknown";

// Collect git state
function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd, encoding: "utf-8", timeout: 5000 }).trim();
  } catch {
    return "(unavailable)";
  }
}

const branch = git("branch --show-current");
const status = git("status --short");
const recentCommits = git("log --oneline -5");
const projectName = cwd.split("/").pop();

// Build handoff content
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 16);
const filename = `auto-${timestamp}-${projectName}.md`;

const content = `# Auto-Save: Context Compacted
Created: ${now.toISOString()}
Session: ${sessionId}
Trigger: auto-compaction (context was getting full)

## Compact Summary
${summary}

## Git State
- Branch: ${branch}
- Recent commits:
${recentCommits
  .split("\n")
  .map((l) => `  ${l}`)
  .join("\n")}
- Uncommitted changes:
${status ? status.split("\n").map((l) => `  ${l}`).join("\n") : "  (clean)"}

## Resume
Start a new session and say:
\`\`\`
Read ${`.handoff/${filename}`} and continue where we left off.
\`\`\`
`;

// Write to .handoff/ in project root (find git root or use cwd)
let root = cwd;
try {
  root = execSync("git rev-parse --show-toplevel", { cwd, encoding: "utf-8", timeout: 3000 }).trim();
} catch {
  // Use cwd if not in a git repo
}

const handoffDir = resolve(root, ".handoff");
if (!existsSync(handoffDir)) {
  mkdirSync(handoffDir, { recursive: true });
}

const filePath = resolve(handoffDir, filename);
writeFileSync(filePath, content, "utf-8");

// Output message for Claude to see
console.error(`[spartan] Auto-saved context to ${filePath}`);
