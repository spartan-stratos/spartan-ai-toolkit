// Spartan AI Toolkit — CLAUDE.md Assembler
// Builds CLAUDE.md from section files based on selected packs.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ALWAYS_INCLUDE_TOP = ['00-header.md', '01-core.md'];
const ALWAYS_INCLUDE_BOTTOM = ['90-footer.md'];

/**
 * Assemble CLAUDE.md from section files.
 * @param {string} claudeMdDir - Path to the claude-md/ directory
 * @param {string[]} selectedPacks - Pack names the user picked
 * @param {object} packDefs - The PACKS object from packs.js
 * @returns {string} The full CLAUDE.md content
 */
export function assembleCLAUDEmd(claudeMdDir, selectedPacks, packDefs) {
  let parts = [];

  // Always include header + core
  for (const file of ALWAYS_INCLUDE_TOP) {
    const fp = join(claudeMdDir, file);
    if (existsSync(fp)) {
      parts.push(readFileSync(fp, 'utf-8'));
    }
  }

  // Pack-specific sections (in pack order, not random)
  const seen = new Set();
  for (const pack of selectedPacks) {
    const def = packDefs[pack];
    if (!def) continue;
    for (const section of def.claudeSections) {
      if (seen.has(section)) continue;
      seen.add(section);
      const fp = join(claudeMdDir, section);
      if (existsSync(fp)) {
        parts.push(readFileSync(fp, 'utf-8'));
      }
    }
  }

  // Always include footer
  for (const file of ALWAYS_INCLUDE_BOTTOM) {
    const fp = join(claudeMdDir, file);
    if (existsSync(fp)) {
      parts.push(readFileSync(fp, 'utf-8'));
    }
  }

  return parts.join('\n');
}
