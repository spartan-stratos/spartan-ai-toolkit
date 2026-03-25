#!/usr/bin/env node
// Spartan AI Toolkit — Content Validator
// Checks format, naming, frontmatter, and token hygiene.
// No external dependencies (besides js-yaml via packs.js).

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOLKIT = join(__dirname, '..');

// ── Helpers ──────────────────────────────────────────────

let failures = 0;
let warnings = 0;

function fail(msg) {
  console.log(`  FAIL: ${msg}`);
  failures++;
}

function warn(msg) {
  console.log(`  WARN: ${msg}`);
  warnings++;
}

function ok(msg) {
  console.log(`  OK: ${msg}`);
}

function parseFrontmatter(filePath) {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const fields = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

function lineCount(filePath) {
  if (!existsSync(filePath)) return 0;
  return readFileSync(filePath, 'utf8').split('\n').length;
}

function hasEmojiHeaders(filePath) {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, 'utf8');
  return /^#{1,4}\s+[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/mu.test(content);
}

// ── Load packs.js (now YAML-backed) ─────────────────────

const { PACKS, PACK_ORDER } = await import(join(TOOLKIT, 'lib', 'packs.js'));

console.log('Spartan Content Validator\n');

// ── Check 1: Files exist for everything in packs ────────

console.log('1. Checking files exist for pack items...');

const fileChecks = {
  commands: (name) => join(TOOLKIT, 'commands', 'spartan', `${name}.md`),
  rules: (name) => join(TOOLKIT, 'rules', name),  // rules now have subdir paths
  skills: (name) => join(TOOLKIT, 'skills', name, 'SKILL.md'),
  agents: (name) => join(TOOLKIT, 'agents', name),
  claudeSections: (name) => join(TOOLKIT, 'claude-md', name),
};

for (const packName of PACK_ORDER) {
  const pack = PACKS[packName];
  if (!pack) { fail(`Pack '${packName}' in PACK_ORDER but not in PACKS`); continue; }

  // Skip file checks for coming-soon packs
  if (pack.comingSoon) continue;

  for (const [category, pathFn] of Object.entries(fileChecks)) {
    const items = pack[category] || [];
    for (const item of items) {
      const path = pathFn(item);
      if (!existsSync(path)) {
        fail(`${packName}.${category} → '${item}' file not found: ${path}`);
      }
    }
  }
}

ok('File existence check done');

// ── Check 2: Frontmatter validation ─────────────────────

console.log('\n2. Checking frontmatter...');

const frontmatterRules = {
  commands: { dir: join(TOOLKIT, 'commands', 'spartan'), ext: '.md', required: ['name', 'description'] },
  skills: { required: ['name', 'description'] },
  agents: { dir: join(TOOLKIT, 'agents'), ext: '.md', required: ['name', 'description'] },
};

// Commands
if (existsSync(frontmatterRules.commands.dir)) {
  for (const file of readdirSync(frontmatterRules.commands.dir).filter(f => f.endsWith('.md'))) {
    const filePath = join(frontmatterRules.commands.dir, file);
    const fm = parseFrontmatter(filePath);
    if (!fm) continue;
    for (const field of frontmatterRules.commands.required) {
      if (!fm[field]) fail(`commands/${file} missing frontmatter: ${field}`);
    }
    if (fm.name && !fm.name.startsWith('spartan:')) {
      fail(`commands/${file} name should start with 'spartan:' (got '${fm.name}')`);
    }
  }
}

// Skills
const skillsDir = join(TOOLKIT, 'skills');
if (existsSync(skillsDir)) {
  for (const dir of readdirSync(skillsDir).filter(d => statSync(join(skillsDir, d)).isDirectory())) {
    const skillFile = join(skillsDir, dir, 'SKILL.md');
    if (!existsSync(skillFile)) { fail(`skills/${dir}/ missing SKILL.md`); continue; }
    const fm = parseFrontmatter(skillFile);
    if (!fm) continue;
    for (const field of frontmatterRules.skills.required) {
      if (!fm[field]) fail(`skills/${dir}/SKILL.md missing frontmatter: ${field}`);
    }
  }
}

// Agents
if (existsSync(frontmatterRules.agents.dir)) {
  for (const file of readdirSync(frontmatterRules.agents.dir).filter(f => f.endsWith('.md'))) {
    const filePath = join(frontmatterRules.agents.dir, file);
    const fm = parseFrontmatter(filePath);
    if (!fm) continue;
    for (const field of frontmatterRules.agents.required) {
      if (!fm[field]) fail(`agents/${file} missing frontmatter: ${field}`);
    }
  }
}

ok('Frontmatter check done');

// ── Check 3: Naming conventions ──────────────────────────

console.log('\n3. Checking naming conventions...');

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const UPPER_SNAKE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*\.md$/;
const CLAUDE_MD = /^\d{2}-[a-z][a-z0-9-]*\.md$/;

// Command files
const cmdDir = join(TOOLKIT, 'commands', 'spartan');
if (existsSync(cmdDir)) {
  for (const file of readdirSync(cmdDir).filter(f => f.endsWith('.md'))) {
    const name = file.replace('.md', '');
    if (!KEBAB.test(name)) fail(`Command '${file}' not kebab-case`);
  }
}

// Rule files (now in subdirs)
const rulesBaseDir = join(TOOLKIT, 'rules');
if (existsSync(rulesBaseDir)) {
  for (const subdir of readdirSync(rulesBaseDir).filter(d => statSync(join(rulesBaseDir, d)).isDirectory())) {
    for (const file of readdirSync(join(rulesBaseDir, subdir)).filter(f => f.endsWith('.md'))) {
      if (!UPPER_SNAKE.test(file)) fail(`Rule '${subdir}/${file}' not UPPER_SNAKE_CASE.md`);
    }
  }
}

// Skill directories
if (existsSync(skillsDir)) {
  for (const dir of readdirSync(skillsDir).filter(d => statSync(join(skillsDir, d)).isDirectory())) {
    if (!KEBAB.test(dir)) fail(`Skill dir '${dir}' not kebab-case`);
  }
}

// Agent files
const agentsDir = join(TOOLKIT, 'agents');
if (existsSync(agentsDir)) {
  for (const file of readdirSync(agentsDir).filter(f => f.endsWith('.md'))) {
    const name = file.replace('.md', '');
    if (!KEBAB.test(name)) fail(`Agent '${file}' not kebab-case`);
  }
}

// Claude-md files
const claudeMdDir = join(TOOLKIT, 'claude-md');
if (existsSync(claudeMdDir)) {
  for (const file of readdirSync(claudeMdDir).filter(f => f.endsWith('.md'))) {
    if (!CLAUDE_MD.test(file)) fail(`Claude-md '${file}' doesn't match NN-name.md`);
  }
}

ok('Naming check done');

// ── Check 4: YAML manifest validation ───────────────────

console.log('\n4. Checking YAML manifests...');

const packsDir = join(TOOLKIT, 'packs');
if (!existsSync(packsDir)) {
  fail('packs/ directory not found');
} else {
  const yamlFiles = readdirSync(packsDir).filter(f => f.endsWith('.yaml'));
  if (yamlFiles.length === 0) {
    fail('No YAML manifests found in packs/');
  } else {
    // Check each pack in PACK_ORDER has a manifest
    for (const pack of PACK_ORDER) {
      if (!PACKS[pack]) fail(`Pack '${pack}' in PACK_ORDER but not loaded from YAML`);
    }

    // Check dependencies reference valid packs
    for (const packName of PACK_ORDER) {
      const pack = PACKS[packName];
      if (!pack) continue;
      for (const dep of pack.depends || []) {
        if (!PACKS[dep]) fail(`${packName} depends on '${dep}' but that pack doesn't exist`);
      }
    }

    ok(`${yamlFiles.length} YAML manifests loaded`);
  }
}

ok('Manifest check done');

// ── Check 5: Orphan files (warnings) ────────────────────

console.log('\n5. Checking for orphan files...');

// Collect all items registered across all packs
const registered = { commands: new Set(), rules: new Set(), skills: new Set(), agents: new Set() };
for (const pack of Object.values(PACKS)) {
  (pack.commands || []).forEach(c => registered.commands.add(`${c}.md`));
  (pack.rules || []).forEach(r => registered.rules.add(r));
  (pack.skills || []).forEach(s => registered.skills.add(s));
  (pack.agents || []).forEach(a => registered.agents.add(a));
}

// Commands
if (existsSync(cmdDir)) {
  for (const file of readdirSync(cmdDir).filter(f => f.endsWith('.md'))) {
    if (!registered.commands.has(file)) warn(`commands/spartan/${file} not in any pack`);
  }
}

// Rules (check subdirs)
if (existsSync(rulesBaseDir)) {
  for (const subdir of readdirSync(rulesBaseDir).filter(d => statSync(join(rulesBaseDir, d)).isDirectory())) {
    for (const file of readdirSync(join(rulesBaseDir, subdir)).filter(f => f.endsWith('.md'))) {
      const rulePath = `${subdir}/${file}`;
      if (!registered.rules.has(rulePath)) warn(`rules/${rulePath} not in any pack`);
    }
  }
}

// Skills
if (existsSync(skillsDir)) {
  for (const dir of readdirSync(skillsDir).filter(d => statSync(join(skillsDir, d)).isDirectory())) {
    if (!registered.skills.has(dir)) warn(`skills/${dir}/ not in any pack`);
  }
}

// Agents
if (existsSync(agentsDir)) {
  for (const file of readdirSync(agentsDir).filter(f => f.endsWith('.md'))) {
    if (!registered.agents.has(file)) warn(`agents/${file} not in any pack`);
  }
}

ok('Orphan check done');

// ── Check 6: Token hygiene (warnings) ───────────────────

console.log('\n6. Token hygiene checks...');

// Skills over 200 lines
if (existsSync(skillsDir)) {
  for (const dir of readdirSync(skillsDir).filter(d => statSync(join(skillsDir, d)).isDirectory())) {
    const skillFile = join(skillsDir, dir, 'SKILL.md');
    if (!existsSync(skillFile)) continue;
    const lines = lineCount(skillFile);
    if (lines > 200) warn(`skills/${dir}/SKILL.md is ${lines} lines — consider splitting into supporting files`);
  }
}

// Rules over 450 lines (raised from 200 since files are now more focused)
if (existsSync(rulesBaseDir)) {
  for (const subdir of readdirSync(rulesBaseDir).filter(d => statSync(join(rulesBaseDir, d)).isDirectory())) {
    for (const file of readdirSync(join(rulesBaseDir, subdir)).filter(f => f.endsWith('.md'))) {
      const lines = lineCount(join(rulesBaseDir, subdir, file));
      if (lines > 450) warn(`rules/${subdir}/${file} is ${lines} lines — might be too verbose`);
    }
  }
}

// Emoji in headers
const checkDirs = [
  { dir: join(TOOLKIT, 'commands', 'spartan'), label: 'commands' },
  { dir: agentsDir, label: 'agents' },
];

for (const { dir, label } of checkDirs) {
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter(f => f.endsWith('.md'))) {
    if (hasEmojiHeaders(join(dir, file))) {
      warn(`${label}/${file} has emoji in headers — skip emojis, saves tokens`);
    }
  }
}

// Check rules for emojis
if (existsSync(rulesBaseDir)) {
  for (const subdir of readdirSync(rulesBaseDir).filter(d => statSync(join(rulesBaseDir, d)).isDirectory())) {
    for (const file of readdirSync(join(rulesBaseDir, subdir)).filter(f => f.endsWith('.md'))) {
      if (hasEmojiHeaders(join(rulesBaseDir, subdir, file))) {
        warn(`rules/${subdir}/${file} has emoji in headers — skip emojis, saves tokens`);
      }
    }
  }
}

if (existsSync(skillsDir)) {
  for (const dir of readdirSync(skillsDir).filter(d => statSync(join(skillsDir, d)).isDirectory())) {
    const skillFile = join(skillsDir, dir, 'SKILL.md');
    if (existsSync(skillFile) && hasEmojiHeaders(skillFile)) {
      warn(`skills/${dir}/SKILL.md has emoji in headers — skip emojis, saves tokens`);
    }
  }
}

ok('Token hygiene check done');

// ── Summary ──────────────────────────────────────────────

console.log('\n─────────────────────────────────');
if (failures > 0) {
  console.log(`FAILED: ${failures} error(s), ${warnings} warning(s)`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`PASSED with ${warnings} warning(s)`);
} else {
  console.log('PASSED: all checks clean');
}
