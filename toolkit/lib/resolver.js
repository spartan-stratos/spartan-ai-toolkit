// Spartan AI Toolkit — Pack Resolver
// Loads YAML manifests and resolves dependencies (BFS + cycle detection).

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';

/**
 * Load all pack manifests from a directory.
 * @param {string} packsDir - Path to toolkit/packs/
 * @returns {Map<string, object>} Pack name → manifest object
 */
export function loadManifests(packsDir) {
  const manifests = new Map();
  for (const file of readdirSync(packsDir).filter(f => f.endsWith('.yaml'))) {
    const raw = readFileSync(join(packsDir, file), 'utf-8');
    const manifest = load(raw);
    manifests.set(manifest.name, manifest);
  }
  return manifests;
}

/**
 * Detect cycles using DFS.
 * @param {Map<string, object>} manifests
 * @throws {Error} If a cycle is found
 */
export function detectCycles(manifests) {
  const visited = new Set();
  const stack = new Set();

  function dfs(name, path) {
    if (stack.has(name)) {
      throw new Error(`Cycle detected: ${[...path, name].join(' → ')}`);
    }
    if (visited.has(name)) return;
    stack.add(name);
    path.push(name);
    const manifest = manifests.get(name);
    if (manifest?.depends) {
      for (const dep of manifest.depends) {
        dfs(dep, [...path]);
      }
    }
    stack.delete(name);
    visited.add(name);
  }

  for (const name of manifests.keys()) {
    dfs(name, []);
  }
}

/**
 * Resolve dependencies using BFS. Returns sorted pack list with core always first.
 * @param {string[]} selected - Pack names the user picked
 * @param {Map<string, object>} manifests - All loaded manifests
 * @returns {string[]} Resolved + sorted pack names
 */
export function resolve(selected, manifests) {
  const resolved = new Set();
  const queue = [...selected];

  while (queue.length > 0) {
    const pack = queue.shift();
    if (resolved.has(pack)) continue;
    if (!manifests.has(pack)) {
      throw new Error(`Unknown pack: '${pack}'`);
    }
    resolved.add(pack);
    const manifest = manifests.get(pack);
    if (manifest.depends) {
      for (const dep of manifest.depends) {
        if (!resolved.has(dep)) queue.push(dep);
      }
    }
  }

  // Core always included
  resolved.add('core');

  // Sort by priority, core always first
  const sorted = [...resolved].sort((a, b) => {
    const pa = manifests.get(a)?.priority ?? 999;
    const pb = manifests.get(b)?.priority ?? 999;
    return pa - pb;
  });

  return sorted;
}

/** Pack name aliases for backward compatibility. */
export const ALIASES = {
  backend: 'backend-micronaut',
  frontend: 'frontend-react',
};

/**
 * Resolve aliases in a list of pack names.
 * @param {string[]} names - Pack names (may include old names)
 * @returns {{ resolved: string[], warnings: string[] }}
 */
export function resolveAliases(names) {
  const resolved = [];
  const warnings = [];
  for (const name of names) {
    if (ALIASES[name]) {
      resolved.push(ALIASES[name]);
      warnings.push(`"${name}" is now "${ALIASES[name]}". Update your .spartan-packs file.`);
    } else {
      resolved.push(name);
    }
  }
  return { resolved, warnings };
}

/**
 * Convert manifests to the PACKS format used by assembler and CLI.
 * @param {Map<string, object>} manifests
 * @returns {{ PACKS: object, PACK_ORDER: string[] }}
 */
export function toPacks(manifests) {
  const PACKS = {};
  const allPacks = [...manifests.values()].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

  for (const m of allPacks) {
    PACKS[m.name] = {
      description: m.description,
      category: m.category || null,
      priority: m.priority ?? 999,
      hidden: m.hidden || false,
      comingSoon: m['coming-soon'] || false,
      depends: m.depends || [],
      commands: m.commands || [],
      rules: m.rules || [],
      skills: m.skills || [],
      agents: m.agents || [],
      claudeSections: m['claude-sections'] || [],
    };
  }

  const PACK_ORDER = allPacks.map(m => m.name);
  return { PACKS, PACK_ORDER };
}
