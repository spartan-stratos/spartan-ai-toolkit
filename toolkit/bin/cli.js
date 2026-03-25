#!/usr/bin/env node

// Spartan AI Toolkit — npx installer
// Usage:
//   npx spartan-ai-toolkit@latest
//   npx spartan-ai-toolkit@latest --agent=cursor
//   npx spartan-ai-toolkit@latest --packs=backend,product
//   npx spartan-ai-toolkit@latest --all
//   npx spartan-ai-toolkit@latest --local

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

// ── Resolve package root (works from npx temp dir) ──────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolve(__dirname, '..');

// ── Toolkit source paths ────────────────────────────────────────
const SRC = {
  commands:   join(PKG_ROOT, 'commands'),
  commandsSub: join(PKG_ROOT, 'commands', 'spartan'),
  router:     join(PKG_ROOT, 'commands', 'spartan.md'),
  rules:      join(PKG_ROOT, 'rules', 'project'),
  skills:     join(PKG_ROOT, 'skills'),
  agents:     join(PKG_ROOT, 'agents'),
  claudeMd:   join(PKG_ROOT, 'claude-md'),
  version:    join(PKG_ROOT, 'VERSION'),
  claudePlugin: join(PKG_ROOT, '.claude-plugin'),
};

// ── Colors ──────────────────────────────────────────────────────
const C = {
  blue: '\x1b[34m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', cyan: '\x1b[36m', bold: '\x1b[1m',
  dim: '\x1b[2m', reset: '\x1b[0m',
};

function bold(s) { return `${C.bold}${s}${C.reset}`; }
function green(s) { return `${C.green}${s}${C.reset}`; }
function yellow(s) { return `${C.yellow}${s}${C.reset}`; }
function cyan(s) { return `${C.cyan}${s}${C.reset}`; }
function dim(s) { return `${C.dim}${s}${C.reset}`; }
function blue(s) { return `${C.blue}${s}${C.reset}`; }

// ── Pack definitions ────────────────────────────────────────────
import { PACKS, PACK_ORDER } from '../lib/packs.js';
import { assembleCLAUDEmd } from '../lib/assembler.js';

// ── Parse args ──────────────────────────────────────────────────
const args = process.argv.slice(2);

let agent = 'claude-code';
let packsArg = '';
let installAll = false;
let mode = 'global';  // default for claude-code
let showHelp = false;

for (const arg of args) {
  if (arg === '--help' || arg === '-h') showHelp = true;
  else if (arg.startsWith('--agent=')) agent = arg.split('=')[1];
  else if (arg.startsWith('--packs=')) packsArg = arg.split('=')[1];
  else if (arg === '--all') installAll = true;
  else if (arg === '--global') mode = 'global';
  else if (arg === '--local') mode = 'local';
}

if (showHelp) {
  console.log(`
  ${bold('Spartan AI Toolkit')} — installer

  ${bold('Usage:')}
    npx spartan-ai-toolkit@latest [options]

  ${bold('Options:')}
    --agent=NAME    Agent to set up for (default: claude-code)
                    Choices: claude-code, cursor, windsurf, codex, copilot
    --packs=LIST    Comma-separated packs (claude-code only)
                    Example: --packs=backend,product
    --all           Install all packs
    --global        Install to home dir (default for claude-code/codex)
    --local         Install to current project dir
    --help          Show this help

  ${bold('Packs:')}
${PACK_ORDER.map(p => `    ${bold(p.padEnd(14))} ${PACKS[p].description}`).join('\n')}
`);
  process.exit(0);
}

// ── Readline helper ─────────────────────────────────────────────
let rl;

function getRL() {
  if (!rl) {
    rl = createInterface({ input: process.stdin, output: process.stdout });
  }
  return rl;
}

function ask(question) {
  return new Promise(resolve => {
    getRL().question(question, answer => resolve(answer.trim()));
  });
}

function closeRL() {
  if (rl) { rl.close(); rl = null; }
}

// ── Version ─────────────────────────────────────────────────────
const VERSION = existsSync(SRC.version)
  ? readFileSync(SRC.version, 'utf-8').trim()
  : '4.1.0';

// ── Target directories based on agent + mode ────────────────────
function getTargets() {
  const home = homedir();
  const cwd = process.cwd();

  if (agent === 'claude-code') {
    const base = mode === 'global' ? join(home, '.claude') : join(cwd, '.claude');
    return {
      base,
      commands:  join(base, 'commands', 'spartan'),
      router:    join(base, 'commands', 'spartan.md'),
      rules:     join(base, 'rules', 'project'),
      skills:    join(base, 'skills'),
      agents:    join(base, 'agents'),
      claudeMd:  mode === 'global' ? join(home, '.claude', 'CLAUDE.md') : join(cwd, 'CLAUDE.md'),
      packsFile: join(base, '.spartan-packs'),
      versionFile: join(base, '.spartan-version'),
    };
  }

  if (agent === 'codex') {
    const base = mode === 'global' ? join(home, '.codex') : join(cwd, '.codex');
    return {
      base,
      commands:  join(base, 'commands', 'spartan'),
      router:    join(base, 'commands', 'spartan.md'),
      rules:     join(base, 'rules', 'project'),
      skills:    join(base, 'skills'),
      agents:    join(base, 'agents'),
      claudeMd:  mode === 'global' ? join(home, '.codex', 'CLAUDE.md') : join(cwd, 'CLAUDE.md'),
      packsFile: join(base, '.spartan-packs'),
      versionFile: join(base, '.spartan-version'),
    };
  }

  // cursor, windsurf, copilot — project-local only
  const rulesDir = {
    cursor:   join(cwd, '.cursor', 'rules'),
    windsurf: join(cwd, '.windsurf', 'rules'),
    copilot:  join(cwd, '.github', 'instructions'),
  }[agent];

  return {
    base: cwd,
    rules: rulesDir,
    agentsMd: join(cwd, 'AGENTS.md'),
    packsFile: join(cwd, '.spartan-packs'),
    versionFile: null,
  };
}

// ── Helpers ─────────────────────────────────────────────────────
function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(dirname(dest));
  const content = readFileSync(src);
  writeFileSync(dest, content);
}

function copyDir(src, dest) {
  ensureDir(dest);
  cpSync(src, dest, { recursive: true });
}

/** Get all items for a category across selected packs, deduplicated. */
function gatherItems(selectedPacks, category) {
  const seen = new Set();
  const result = [];
  for (const pack of selectedPacks) {
    const def = PACKS[pack];
    if (!def) continue;
    for (const item of def[category]) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
  }
  return result;
}

// ── Pack selection ──────────────────────────────────────────────
async function selectPacks(targets) {
  // Always start with core
  let selected = ['core'];

  // --all flag
  if (installAll) return [...PACK_ORDER];

  // --packs flag
  if (packsArg) {
    const requested = packsArg.split(',').map(s => s.trim()).filter(Boolean);
    for (const p of requested) {
      if (PACKS[p] && p !== 'core' && !selected.includes(p)) {
        selected.push(p);
      }
    }
    return selected;
  }

  // Check saved packs
  if (existsSync(targets.packsFile)) {
    const saved = readFileSync(targets.packsFile, 'utf-8').trim().split('\n').filter(Boolean);
    if (saved.length > 0) {
      console.log(`\n  ${cyan('Previously installed packs:')} ${saved.join(', ')}`);
      const reuse = await ask('  Re-install same packs? [Y/n]: ');
      if (reuse !== 'n' && reuse !== 'N') {
        return saved;
      }
    }
  }

  // Interactive menu
  console.log(`\n  ${bold('Choose your packs:')}\n`);

  let i = 1;
  for (const pack of PACK_ORDER) {
    const def = PACKS[pack];
    const tag = pack === 'core' ? ` ${green('(always included)')}` : '';
    console.log(`  ${dim(`[${i}]`)} ${bold(pack)} — ${def.description}${tag}`);
    i++;
  }

  console.log('');
  const allChoice = await ask('  Install all packs? [Y/n]: ');

  if (allChoice !== 'n' && allChoice !== 'N') {
    return [...PACK_ORDER];
  }

  // Ask about each optional pack
  for (const pack of PACK_ORDER) {
    if (pack === 'core') continue;
    const def = PACKS[pack];
    const choice = await ask(`  ${bold(pack)} — ${def.description}? [y/N]: `);
    if (choice === 'y' || choice === 'Y') {
      selected.push(pack);
    }
  }

  return selected;
}

// ── Install for claude-code / codex ─────────────────────────────
async function installFull() {
  const targets = getTargets();
  const selectedPacks = await selectPacks(targets);

  console.log(`\n  ${green('Selected:')} ${bold(selectedPacks.join(' '))}\n`);

  // 1) Assemble & install CLAUDE.md
  console.log(`${blue('[1/5]')} ${bold('Assembling CLAUDE.md...')}`);

  if (existsSync(targets.claudeMd)) {
    const backupPath = `${targets.claudeMd}.${Date.now()}.bak`;
    copyFile(targets.claudeMd, backupPath);
    console.log(`  ${dim('Backed up existing CLAUDE.md')}`);
  }

  const assembled = assembleCLAUDEmd(SRC.claudeMd, selectedPacks, PACKS);
  ensureDir(dirname(targets.claudeMd));
  writeFileSync(targets.claudeMd, assembled, 'utf-8');

  const sectionCount = 2 + 1 + gatherItems(selectedPacks, 'claudeSections').length;
  console.log(`  ${green('+')} CLAUDE.md assembled (${sectionCount} sections)\n`);

  // 2) Commands
  console.log(`${blue('[2/5]')} ${bold('Installing commands...')}`);
  ensureDir(targets.commands);
  let cmdCount = 0;

  // Smart router (always)
  if (existsSync(SRC.router)) {
    copyFile(SRC.router, targets.router);
    console.log(`  ${green('+')} /spartan (smart router)`);
    cmdCount++;
  }

  const selectedCommands = gatherItems(selectedPacks, 'commands');
  for (const cmd of selectedCommands) {
    const src = join(SRC.commandsSub, `${cmd}.md`);
    if (existsSync(src)) {
      copyFile(src, join(targets.commands, `${cmd}.md`));
      console.log(`  ${green('+')} /spartan:${cmd}`);
      cmdCount++;
    } else {
      console.log(`  ${yellow('!')} /spartan:${cmd} (not found, skipped)`);
    }
  }
  console.log(`  ${bold(cmdCount + ' commands')} installed\n`);

  // 3) Rules
  const selectedRules = gatherItems(selectedPacks, 'rules');
  if (selectedRules.length > 0) {
    console.log(`${blue('[3/5]')} ${bold('Installing rules...')}`);
    ensureDir(targets.rules);
    let ruleCount = 0;

    for (const rule of selectedRules) {
      const src = join(SRC.rules, rule);
      if (existsSync(src)) {
        copyFile(src, join(targets.rules, rule));
        console.log(`  ${green('+')} ${rule}`);
        ruleCount++;
      }
    }
    console.log(`  ${bold(ruleCount + ' rules')} installed\n`);
  } else {
    console.log(`${blue('[3/5]')} ${bold('Rules')} — ${dim('no rule packs selected, skipping')}\n`);
  }

  // 4) Skills
  const selectedSkills = gatherItems(selectedPacks, 'skills');
  if (selectedSkills.length > 0) {
    console.log(`${blue('[4/5]')} ${bold('Installing skills...')}`);
    ensureDir(targets.skills);
    let skillCount = 0;

    for (const skill of selectedSkills) {
      const src = join(SRC.skills, skill);
      if (existsSync(src)) {
        copyDir(src, join(targets.skills, skill));
        console.log(`  ${green('+')} ${skill}`);
        skillCount++;
      }
    }
    console.log(`  ${bold(skillCount + ' skills')} installed\n`);
  } else {
    console.log(`${blue('[4/5]')} ${bold('Skills')} — ${dim('no skill packs selected, skipping')}\n`);
  }

  // 5) Agents
  const selectedAgents = gatherItems(selectedPacks, 'agents');
  if (selectedAgents.length > 0) {
    console.log(`${blue('[5/5]')} ${bold('Installing agents...')}`);
    ensureDir(targets.agents);
    let agentCount = 0;

    for (const agentFile of selectedAgents) {
      const src = join(SRC.agents, agentFile);
      if (existsSync(src)) {
        copyFile(src, join(targets.agents, agentFile));
        console.log(`  ${green('+')} ${agentFile.replace('.md', '')}`);
        agentCount++;
      }
    }
    console.log(`  ${bold(agentCount + ' agents')} installed\n`);
  } else {
    console.log(`${blue('[5/5]')} ${bold('Agents')} — ${dim('no agent packs selected, skipping')}\n`);
  }

  // Save pack selection + version
  writeFileSync(targets.packsFile, selectedPacks.join('\n') + '\n', 'utf-8');
  if (targets.versionFile) {
    writeFileSync(targets.versionFile, VERSION + '\n', 'utf-8');
  }

  return selectedPacks;
}

// ── Install for cursor / windsurf / copilot ─────────────────────
async function installRulesOnly() {
  const targets = getTargets();

  console.log(`\n  Agent: ${bold(agent)}`);
  console.log(`  This installs ${bold('rules + AGENTS.md')} only.`);
  console.log(`  Slash commands are Claude Code specific.\n`);

  // Ask which rule packs
  console.log(`  ${bold('Which rule packs do you need?')}\n`);

  const rulePacks = PACK_ORDER.filter(p => PACKS[p].rules.length > 0);
  for (const pack of rulePacks) {
    const ruleNames = PACKS[pack].rules.map(r => r.replace('.md', '')).join(', ');
    console.log(`  ${bold(pack)} — ${dim(ruleNames)}`);
  }
  console.log('');

  const allChoice = await ask('  Install all rule packs? [Y/n]: ');
  let selectedPacks;

  if (allChoice !== 'n' && allChoice !== 'N') {
    selectedPacks = rulePacks;
  } else {
    selectedPacks = [];
    for (const pack of rulePacks) {
      const choice = await ask(`  ${bold(pack)}? [y/N]: `);
      if (choice === 'y' || choice === 'Y') {
        selectedPacks.push(pack);
      }
    }
  }

  // Install rules
  const selectedRules = gatherItems(selectedPacks, 'rules');
  if (selectedRules.length > 0) {
    console.log(`\n${blue('[1/2]')} ${bold('Installing rules...')}`);
    ensureDir(targets.rules);
    let count = 0;
    for (const rule of selectedRules) {
      const src = join(SRC.rules, rule);
      if (existsSync(src)) {
        copyFile(src, join(targets.rules, rule));
        console.log(`  ${green('+')} ${rule}`);
        count++;
      }
    }
    console.log(`  ${bold(count + ' rules')} installed\n`);
  } else {
    console.log(`\n${blue('[1/2]')} ${bold('Rules')} — ${dim('no rule packs selected')}\n`);
  }

  // Install AGENTS.md
  console.log(`${blue('[2/2]')} ${bold('Installing AGENTS.md...')}`);

  // Build AGENTS.md from selected agent files
  const allAgents = gatherItems([...PACK_ORDER], 'agents');
  if (allAgents.length > 0 && targets.agentsMd) {
    let agentsContent = '# Spartan AI Toolkit — Agents\n\n';
    agentsContent += 'Expert agents for your AI coding assistant.\n\n---\n\n';
    for (const agentFile of allAgents) {
      const src = join(SRC.agents, agentFile);
      if (existsSync(src)) {
        agentsContent += readFileSync(src, 'utf-8') + '\n\n---\n\n';
      }
    }
    writeFileSync(targets.agentsMd, agentsContent.trimEnd() + '\n', 'utf-8');
    console.log(`  ${green('+')} AGENTS.md\n`);
  } else {
    console.log(`  ${dim('No agents to install')}\n`);
  }

  // Save selection
  if (targets.packsFile) {
    writeFileSync(targets.packsFile, selectedPacks.join('\n') + '\n', 'utf-8');
  }

  return selectedPacks;
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`${bold('================================================')}`);
  console.log(`${bold('     Spartan AI Toolkit')} ${dim(`v${VERSION}`)}`);
  console.log(`${bold('================================================')}`);
  console.log('');
  console.log(`  Agent: ${bold(agent)}    Mode: ${bold(mode)}`);

  // Check Node version
  const nodeVer = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeVer < 18) {
    console.error(`\n  ${C.red}Node.js ${process.versions.node} is too old. Need >= 18.${C.reset}\n`);
    process.exit(1);
  }

  let selectedPacks;

  try {
    if (agent === 'claude-code' || agent === 'codex') {
      selectedPacks = await installFull();
    } else if (['cursor', 'windsurf', 'copilot'].includes(agent)) {
      selectedPacks = await installRulesOnly();
    } else {
      console.error(`\n  ${C.red}Unknown agent: ${agent}${C.reset}`);
      console.error(`  Supported: claude-code, cursor, windsurf, codex, copilot\n`);
      process.exit(1);
    }
  } finally {
    closeRL();
  }

  // Success
  console.log(`${bold(green('================================================'))}`);
  console.log(`${bold(green('          Setup done!'))}  ${dim(`v${VERSION}`)}`);
  console.log(`${bold(green('================================================'))}`);
  console.log('');
  console.log(`  Installed packs: ${cyan(selectedPacks.join(', '))}`);
  console.log('');

  if (agent === 'claude-code' || agent === 'codex') {
    console.log(`  ${bold('Next steps:')}`);
    console.log('');
    console.log(`  1. Open any project folder and type:`);
    console.log(`     ${cyan('/spartan')}`);
    console.log('');
    console.log(`  2. To change packs later, run again:`);
    console.log(`     ${cyan('npx spartan-ai-toolkit@latest')}`);
    console.log('');
  } else {
    console.log(`  ${bold('Next steps:')}`);
    console.log('');
    console.log(`  1. Rules are in your ${agent} rules folder.`);
    console.log(`  2. AGENTS.md is in your project root.`);
    console.log(`  3. Slash commands need Claude Code — they don't work in ${agent}.`);
    console.log('');
  }
}

main().catch(err => {
  console.error(`\n  ${C.red}Error: ${err.message}${C.reset}\n`);
  closeRL();
  process.exit(1);
});
