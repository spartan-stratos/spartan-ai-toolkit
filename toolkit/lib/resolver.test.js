// Spartan AI Toolkit — Resolver Tests
// Run: node --test toolkit/lib/resolver.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, detectCycles, resolveAliases, toPacks, validatePack, loadExternalPacks } from './resolver.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Helper: create a minimal manifest map
function makeManifests(defs) {
  const m = new Map();
  for (const [name, opts] of Object.entries(defs)) {
    m.set(name, {
      name,
      description: `${name} pack`,
      priority: opts.priority ?? 999,
      hidden: opts.hidden ?? false,
      depends: opts.depends ?? [],
      commands: opts.commands ?? [],
      rules: opts.rules ?? [],
      skills: opts.skills ?? [],
      agents: opts.agents ?? [],
      'claude-sections': opts.claudeSections ?? [],
    });
  }
  return m;
}

const testManifests = makeManifests({
  core: { priority: 0 },
  database: { priority: 5, hidden: true },
  'shared-backend': { priority: 6, hidden: true },
  'backend-micronaut': { priority: 11, depends: ['database', 'shared-backend'], commands: ['kotlin-service'] },
  'frontend-react': { priority: 20 },
  product: { priority: 40 },
  research: { priority: 60, depends: ['product'] },
});

describe('resolve', () => {
  it('basic resolve — backend-micronaut includes deps + core', () => {
    const result = resolve(['backend-micronaut'], testManifests);
    assert.ok(result.includes('core'));
    assert.ok(result.includes('database'));
    assert.ok(result.includes('shared-backend'));
    assert.ok(result.includes('backend-micronaut'));
  });

  it('no duplicates — two packs sharing a dep', () => {
    // Both backend-micronaut and a hypothetical other pack could share database
    const result = resolve(['backend-micronaut', 'database'], testManifests);
    const counts = {};
    for (const p of result) counts[p] = (counts[p] || 0) + 1;
    for (const [name, count] of Object.entries(counts)) {
      assert.equal(count, 1, `${name} appears ${count} times`);
    }
  });

  it('priority ordering — resolved packs sorted by priority', () => {
    const result = resolve(['backend-micronaut', 'research'], testManifests);
    for (let i = 1; i < result.length; i++) {
      const prevPriority = testManifests.get(result[i - 1])?.priority ?? 999;
      const currPriority = testManifests.get(result[i])?.priority ?? 999;
      assert.ok(prevPriority <= currPriority, `${result[i - 1]} (${prevPriority}) should come before ${result[i]} (${currPriority})`);
    }
  });

  it('core always first — no matter what you pick', () => {
    const result = resolve(['research'], testManifests);
    assert.equal(result[0], 'core');
  });

  it('unknown pack — throws clear error', () => {
    assert.throws(
      () => resolve(['nonexistent'], testManifests),
      { message: "Unknown pack: 'nonexistent'" }
    );
  });

  it('research pulls product as dependency', () => {
    const result = resolve(['research'], testManifests);
    assert.ok(result.includes('product'));
    assert.ok(result.includes('research'));
  });
});

describe('detectCycles', () => {
  it('no cycles — passes silently', () => {
    assert.doesNotThrow(() => detectCycles(testManifests));
  });

  it('cycle detection — A depends on B, B depends on A', () => {
    const cyclic = makeManifests({
      core: { priority: 0 },
      a: { priority: 1, depends: ['b'] },
      b: { priority: 2, depends: ['a'] },
    });
    assert.throws(
      () => detectCycles(cyclic),
      /Cycle detected/
    );
  });
});

describe('resolveAliases', () => {
  it('maps backend to backend-micronaut', () => {
    const { resolved, warnings } = resolveAliases(['backend', 'product']);
    assert.deepEqual(resolved, ['backend-micronaut', 'product']);
    assert.equal(warnings.length, 1);
    assert.ok(warnings[0].includes('backend-micronaut'));
  });

  it('maps frontend to frontend-react', () => {
    const { resolved } = resolveAliases(['frontend']);
    assert.deepEqual(resolved, ['frontend-react']);
  });

  it('passes through unknown names unchanged', () => {
    const { resolved, warnings } = resolveAliases(['product', 'ops']);
    assert.deepEqual(resolved, ['product', 'ops']);
    assert.equal(warnings.length, 0);
  });
});

describe('toPacks', () => {
  it('converts manifests to PACKS format', () => {
    const { PACKS, PACK_ORDER } = toPacks(testManifests);
    assert.ok(PACKS.core);
    assert.ok(PACKS['backend-micronaut']);
    assert.equal(PACKS['backend-micronaut'].description, 'backend-micronaut pack');
    assert.deepEqual(PACKS['backend-micronaut'].depends, ['database', 'shared-backend']);
    assert.equal(PACK_ORDER[0], 'core');
  });

  it('PACK_ORDER sorted by priority', () => {
    const { PACK_ORDER } = toPacks(testManifests);
    assert.equal(PACK_ORDER[0], 'core');
    const idx = (name) => PACK_ORDER.indexOf(name);
    assert.ok(idx('database') < idx('backend-micronaut'));
    assert.ok(idx('product') < idx('research'));
  });
});

// ── Test fixtures for validatePack / loadExternalPacks ──────────
const TMP = join(import.meta.dirname, '..', '.test-tmp-resolver');

function setupExternal() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
}

function cleanupExternal() {
  rmSync(TMP, { recursive: true, force: true });
}

describe('validatePack', () => {
  it('passes for a valid manifest', () => {
    const manifest = {
      name: 'my-pack',
      description: 'A test pack',
      commands: [],
      rules: [],
      skills: [],
      agents: [],
    };
    const result = validatePack(manifest, TMP, new Set());
    assert.ok(result.valid, `errors: ${result.errors.join(', ')}`);
    assert.equal(result.errors.length, 0);
  });

  it('fails when name is missing', () => {
    const manifest = { description: 'No name' };
    const result = validatePack(manifest, TMP, new Set());
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => e.includes('name')));
  });

  it('fails when description is missing', () => {
    const manifest = { name: 'no-desc' };
    const result = validatePack(manifest, TMP, new Set());
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => e.includes('description')));
  });

  it('fails when name collides with built-in pack', () => {
    const manifest = { name: 'core', description: 'Fake core' };
    const builtins = new Set(['core', 'backend-micronaut']);
    const result = validatePack(manifest, TMP, builtins);
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => e.includes('collides')));
  });

  it('fails when name uses wrong format', () => {
    const manifest = { name: 'My_Pack', description: 'Bad name' };
    const result = validatePack(manifest, TMP, new Set());
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => e.includes('kebab-case')));
  });

  it('fails when dependency references unknown pack', () => {
    const manifest = {
      name: 'my-pack',
      description: 'Has bad dep',
      depends: ['nonexistent-pack'],
    };
    const builtins = new Set(['core']);
    const result = validatePack(manifest, TMP, builtins);
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => e.includes('nonexistent-pack')));
  });

  it('allows dependency on built-in pack', () => {
    const manifest = {
      name: 'my-pack',
      description: 'Depends on core',
      depends: ['core'],
    };
    const builtins = new Set(['core']);
    const result = validatePack(manifest, TMP, builtins);
    assert.ok(result.valid, `errors: ${result.errors.join(', ')}`);
  });

  it('warns about missing command files', () => {
    setupExternal();
    try {
      const packDir = join(TMP, 'my-pack');
      mkdirSync(join(packDir, 'commands', 'spartan'), { recursive: true });
      // command file does NOT exist
      const manifest = {
        name: 'my-pack',
        description: 'Missing command',
        commands: ['nonexistent-cmd'],
      };
      const result = validatePack(manifest, packDir, new Set());
      assert.ok(result.warnings.some(w => w.includes('nonexistent-cmd')));
    } finally {
      cleanupExternal();
    }
  });
});

describe('loadExternalPacks', () => {
  it('loads valid external pack from directory', () => {
    setupExternal();
    try {
      const packDir = join(TMP, 'community');
      mkdirSync(join(packDir, 'packs'), { recursive: true });
      writeFileSync(join(packDir, 'packs', 'go-backend.yaml'), `
name: go-backend
description: "Go backend rules"
category: Backend
priority: 100
commands: []
rules: []
skills: []
agents: []
claude-sections: []
`);
      const builtins = new Set(['core']);
      const result = loadExternalPacks(packDir, builtins);
      assert.ok(result.loaded.has('go-backend'));
      assert.equal(result.errors.length, 0);
    } finally {
      cleanupExternal();
    }
  });

  it('rejects external pack with name collision', () => {
    setupExternal();
    try {
      const packDir = join(TMP, 'bad-community');
      mkdirSync(join(packDir, 'packs'), { recursive: true });
      writeFileSync(join(packDir, 'packs', 'core.yaml'), `
name: core
description: "Fake core"
`);
      const builtins = new Set(['core']);
      const result = loadExternalPacks(packDir, builtins);
      assert.ok(!result.loaded.has('core'));
      assert.ok(result.errors.length > 0);
    } finally {
      cleanupExternal();
    }
  });

  it('returns empty when directory has no packs/', () => {
    setupExternal();
    try {
      const packDir = join(TMP, 'empty');
      mkdirSync(packDir, { recursive: true });
      const result = loadExternalPacks(packDir, new Set());
      assert.equal(result.loaded.size, 0);
      assert.equal(result.errors.length, 0);
    } finally {
      cleanupExternal();
    }
  });
});
