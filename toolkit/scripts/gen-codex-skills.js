#!/usr/bin/env node
/**
 * Generate Codex-compatible SKILL.md files from Claude SKILL.md sources.
 *
 * Reads toolkit/skills/{name}/SKILL.md (Claude-native, committed),
 * outputs .agents/skills/spartan-{name}/SKILL.md (Codex, gitignored).
 *
 * Also emits agents/openai.yaml per skill for OpenAI Agents discovery.
 *
 * Usage:
 *   node toolkit/scripts/gen-codex-skills.js            # generate
 *   node toolkit/scripts/gen-codex-skills.js --dry-run   # check freshness
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_DIR = path.join(ROOT, 'toolkit', 'skills');
const AGENTS_DIR = path.join(ROOT, '.agents', 'skills');
const DRY_RUN = process.argv.includes('--dry-run');
const CODEX_DESC_LIMIT = 1024;
const OPENAI_SHORT_LIMIT = 120;

// ─── Frontmatter Parsing ────────────────────────────────

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return null;
  const endIdx = content.indexOf('\n---', 4);
  if (endIdx === -1) return null;

  const fm = content.slice(4, endIdx);
  const body = content.slice(endIdx + 4); // includes leading \n after ---

  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : '';

  // Description can be single-line or multi-line (YAML | syntax)
  let description = '';
  const lines = fm.split('\n');
  let inDesc = false;
  const descLines = [];

  for (const line of lines) {
    if (/^description:\s*\|?\s*$/.test(line)) {
      inDesc = true;
      continue;
    }
    if (/^description:\s*\S/.test(line)) {
      description = line.replace(/^description:\s*/, '').trim();
      break;
    }
    if (inDesc) {
      if (line === '' || /^\s/.test(line)) {
        descLines.push(line.replace(/^  /, ''));
      } else {
        break;
      }
    }
  }
  if (descLines.length > 0) {
    description = descLines.join('\n').trim();
  }

  return { name, description, body };
}

// ─── Codex Transforms ───────────────────────────────────

function codexSkillName(skillDir) {
  if (skillDir.startsWith('spartan-')) return skillDir;
  return `spartan-${skillDir}`;
}

function buildCodexFrontmatter(name, description) {
  if (description.length > CODEX_DESC_LIMIT) {
    throw new Error(
      `Codex description for "${name}" is ${description.length} chars (max ${CODEX_DESC_LIMIT}). ` +
      `Shorten the description in the source SKILL.md.`
    );
  }
  const indented = description.split('\n').map(l => `  ${l}`).join('\n');
  return `---\nname: ${name}\ndescription: |\n${indented}\n---`;
}

function condenseShortDescription(description) {
  const first = (description.split(/\n\s*\n/)[0] || description);
  const collapsed = first.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= OPENAI_SHORT_LIMIT) return collapsed;

  const truncated = collapsed.slice(0, OPENAI_SHORT_LIMIT - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  const safe = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
  return `${safe}...`;
}

function generateOpenAIYaml(displayName, shortDescription) {
  return `interface:\n  display_name: ${JSON.stringify(displayName)}\n  short_description: ${JSON.stringify(shortDescription)}\n  default_prompt: ${JSON.stringify(`Use ${displayName} for this task.`)}\npolicy:\n  allow_implicit_invocation: true\n`;
}

// ─── Skill Discovery ────────────────────────────────────

function discoverSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => fs.existsSync(path.join(SKILLS_DIR, d.name, 'SKILL.md')))
    .map(d => d.name)
    .sort();
}

// ─── Process One Skill ──────────────────────────────────

function processSkill(skillDir) {
  const sourcePath = path.join(SKILLS_DIR, skillDir, 'SKILL.md');
  const content = fs.readFileSync(sourcePath, 'utf-8');
  const parsed = parseFrontmatter(content);

  if (!parsed) {
    return { skillDir, error: 'No valid frontmatter found' };
  }

  const { name, description, body } = parsed;
  const codexName = codexSkillName(skillDir);

  // Build Codex SKILL.md
  const codexFm = buildCodexFrontmatter(name, description);
  const header = `<!-- AUTO-GENERATED from toolkit/skills/${skillDir}/SKILL.md — do not edit directly -->\n<!-- Regenerate: node toolkit/scripts/gen-codex-skills.js -->\n`;
  const codexContent = codexFm + '\n' + header + body;

  // Build OpenAI agent yaml
  const shortDesc = condenseShortDescription(description);
  const openaiYaml = generateOpenAIYaml(codexName, shortDesc);

  const outputDir = path.join(AGENTS_DIR, codexName);
  const skillPath = path.join(outputDir, 'SKILL.md');
  const agentsDir = path.join(outputDir, 'agents');
  const yamlPath = path.join(agentsDir, 'openai.yaml');

  return { skillDir, codexName, skillPath, yamlPath, codexContent, openaiYaml, outputDir, agentsDir };
}

// ─── Main ───────────────────────────────────────────────

const skills = discoverSkills();
if (skills.length === 0) {
  console.log('No skills found in toolkit/skills/');
  process.exit(0);
}

let hasChanges = false;
const budget = [];

for (const skillDir of skills) {
  const result = processSkill(skillDir);

  if (result.error) {
    console.log(`  SKIP: ${skillDir} — ${result.error}`);
    continue;
  }

  const { codexName, skillPath, yamlPath, codexContent, openaiYaml, outputDir, agentsDir } = result;
  const relPath = path.relative(ROOT, skillPath);

  if (DRY_RUN) {
    const existing = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf-8') : '';
    const yamlExisting = fs.existsSync(yamlPath) ? fs.readFileSync(yamlPath, 'utf-8') : '';
    if (existing !== codexContent || yamlExisting !== openaiYaml) {
      console.log(`  STALE: ${relPath}`);
      hasChanges = true;
    } else {
      console.log(`  FRESH: ${relPath}`);
    }
  } else {
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(skillPath, codexContent);
    fs.writeFileSync(yamlPath, openaiYaml);
    console.log(`  GENERATED: ${relPath}`);
  }

  // Token budget
  const lines = codexContent.split('\n').length;
  const tokens = Math.round(codexContent.length / 4);
  budget.push({ skill: codexName, lines, tokens });
}

// Print budget summary
if (!DRY_RUN && budget.length > 0) {
  budget.sort((a, b) => b.lines - a.lines);
  const totalLines = budget.reduce((s, t) => s + t.lines, 0);
  const totalTokens = budget.reduce((s, t) => s + t.tokens, 0);

  console.log('');
  console.log('Token Budget (codex)');
  console.log('='.repeat(60));
  for (const t of budget) {
    console.log(`  ${t.skill.padEnd(35)} ${String(t.lines).padStart(5)} lines  ~${String(t.tokens).padStart(6)} tokens`);
  }
  console.log('-'.repeat(60));
  console.log(`  ${'TOTAL'.padEnd(35)} ${String(totalLines).padStart(5)} lines  ~${String(totalTokens).padStart(6)} tokens`);
  console.log('');
}

if (DRY_RUN && hasChanges) {
  console.error('\nCodex skills are stale. Run: node toolkit/scripts/gen-codex-skills.js');
  process.exit(1);
}

if (!DRY_RUN) {
  console.log(`Done. ${budget.length} Codex skills generated in .agents/skills/`);
}
