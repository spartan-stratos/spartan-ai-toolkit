#!/usr/bin/env node
/**
 * check-codex-skills — Health check for generated Codex skills.
 *
 * Validates:
 *   1. All Claude skills have a matching Codex skill
 *   2. No Codex skills contain Claude-specific paths
 *   3. Frontmatter is Codex-compliant (name + description only)
 *   4. Description is under 1024 chars
 *   5. OpenAI agent yaml exists per skill
 *   6. Freshness (generated files match source)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_DIR = path.join(ROOT, 'toolkit', 'skills');
const AGENTS_DIR = path.join(ROOT, '.agents', 'skills');

let hasErrors = false;

// ─── Claude Skills ──────────────────────────────────────

console.log('  Claude Skills (source):');
const claudeSkills = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .filter(d => fs.existsSync(path.join(SKILLS_DIR, d.name, 'SKILL.md')))
  .map(d => d.name)
  .sort();

console.log(`  Found ${claudeSkills.length} skills in toolkit/skills/\n`);

// ─── Codex Skills ───────────────────────────────────────

console.log('  Codex Skills (.agents/skills/):');

if (!fs.existsSync(AGENTS_DIR)) {
  console.log('  .agents/skills/ not found. Run: node toolkit/scripts/gen-codex-skills.js\n');
  hasErrors = true;
} else {
  const codexDirs = fs.readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  let okCount = 0;
  let errorCount = 0;

  for (const dir of codexDirs) {
    const skillMd = path.join(AGENTS_DIR, dir, 'SKILL.md');
    const openaiYaml = path.join(AGENTS_DIR, dir, 'agents', 'openai.yaml');
    const errors = [];

    // Check SKILL.md exists
    if (!fs.existsSync(skillMd)) {
      errors.push('SKILL.md missing');
    } else {
      const content = fs.readFileSync(skillMd, 'utf-8');

      // Check for Claude path leaks
      if (content.includes('.claude/skills')) {
        errors.push('contains .claude/skills reference');
      }

      // Check frontmatter doesn't have Claude-only fields
      if (content.includes('allowed_tools:')) {
        errors.push('contains allowed_tools (Claude-only)');
      }
      if (content.includes('hooks:')) {
        errors.push('contains hooks (Claude-only)');
      }

      // Check description length
      const fmEnd = content.indexOf('\n---', 4);
      if (fmEnd > 0) {
        const fm = content.slice(4, fmEnd);
        const descMatch = fm.match(/description:\s*\|\n([\s\S]*?)(?=\n---|\n\w)/);
        if (descMatch) {
          const desc = descMatch[1].replace(/^  /gm, '').trim();
          if (desc.length > 1024) {
            errors.push(`description too long (${desc.length}/1024)`);
          }
        }
      }
    }

    // Check OpenAI yaml
    if (!fs.existsSync(openaiYaml)) {
      errors.push('agents/openai.yaml missing');
    }

    if (errors.length > 0) {
      hasErrors = true;
      errorCount++;
      console.log(`  X  ${dir} — ${errors.join(', ')}`);
    } else {
      okCount++;
      console.log(`  OK ${dir}`);
    }
  }

  console.log(`\n  Total: ${okCount} OK, ${errorCount} errors`);

  // Check coverage — every Claude skill should have a Codex counterpart
  const expectedCodex = claudeSkills.map(s => s.startsWith('spartan-') ? s : `spartan-${s}`);
  const missingCodex = expectedCodex.filter(e => !codexDirs.includes(e));
  if (missingCodex.length > 0) {
    hasErrors = true;
    console.log(`\n  Missing Codex skills:`);
    for (const m of missingCodex) {
      console.log(`  X  ${m}`);
    }
  }
}

// ─── Freshness ──────────────────────────────────────────

console.log('\n  Freshness:');
try {
  execSync('node toolkit/scripts/gen-codex-skills.js --dry-run', {
    cwd: ROOT,
    stdio: 'pipe',
  });
  console.log('  OK All Codex skills are fresh');
} catch (err) {
  hasErrors = true;
  const output = err.stdout?.toString() || '';
  console.log('  X  Codex skills are stale:');
  for (const line of output.split('\n').filter(l => l.includes('STALE'))) {
    console.log(`    ${line.trim()}`);
  }
  console.log('    Run: node toolkit/scripts/gen-codex-skills.js');
}

console.log('');
process.exit(hasErrors ? 1 : 0);
