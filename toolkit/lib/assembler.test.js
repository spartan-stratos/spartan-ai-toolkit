// Spartan AI Toolkit — Assembler Tests
// Run: node --test toolkit/lib/assembler.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { assembleCLAUDEmd, assembleAGENTSmd } from './assembler.js';

// ── Test fixtures ────────────────────────────────────────────────
const TMP = join(import.meta.dirname, '..', '.test-tmp-assembler');

function setupFixtures() {
  rmSync(TMP, { recursive: true, force: true });

  // claude-md sections
  const claudeMd = join(TMP, 'claude-md');
  mkdirSync(claudeMd, { recursive: true });
  writeFileSync(join(claudeMd, '00-header.md'), '# Spartan AI Toolkit\n\nIntro text here.');
  writeFileSync(join(claudeMd, '01-core.md'), '\n---\n\n## Core Principles\n\n- TDD always\n- Spec before code');
  writeFileSync(join(claudeMd, '11-backend.md'), '\n---\n\n## Backend\n\nKotlin + Micronaut stack.\n\n| Command | Purpose |\n|---|---|\n| `/spartan:build` | Build feature |');
  writeFileSync(join(claudeMd, '20-frontend.md'), '\n---\n\n## Frontend\n\nReact + Next.js stack.');
  writeFileSync(join(claudeMd, '90-footer.md'), '\n---\n\n## What NOT to Do\n\n- Don\'t skip tests');

  // agents
  const agents = join(TMP, 'agents');
  mkdirSync(agents, { recursive: true });
  writeFileSync(join(agents, 'backend-expert.md'), '---\nname: backend-expert\ndescription: Backend expert\nmodel: sonnet\n---\n\nYou are a backend expert.');
  writeFileSync(join(agents, 'cto.md'), '---\nname: cto\ndescription: CTO advisor\nmodel: sonnet\n---\n\nYou are a CTO.');

  return { claudeMd, agents };
}

function cleanup() {
  rmSync(TMP, { recursive: true, force: true });
}

// Mock pack definitions
const packDefs = {
  core: { claudeSections: [], rules: [], skills: [], agents: [], commands: [] },
  backend: {
    claudeSections: ['11-backend.md'],
    rules: ['backend/KOTLIN.md'],
    skills: ['api-endpoint-creator'],
    agents: ['backend-expert.md'],
    commands: ['build'],
  },
  frontend: {
    claudeSections: ['20-frontend.md'],
    rules: ['frontend/FRONTEND.md'],
    skills: ['ui-ux-pro-max'],
    agents: [],
    commands: ['next-app'],
  },
};

// ── Tests ────────────────────────────────────────────────────────

describe('assembleCLAUDEmd', () => {
  it('includes header, core, pack sections, and footer', () => {
    const { claudeMd } = setupFixtures();
    try {
      const result = assembleCLAUDEmd(claudeMd, ['backend'], packDefs);
      assert.ok(result.includes('# Spartan AI Toolkit'), 'should have header');
      assert.ok(result.includes('Core Principles'), 'should have core');
      assert.ok(result.includes('Backend'), 'should have backend section');
      assert.ok(result.includes('What NOT to Do'), 'should have footer');
      assert.ok(!result.includes('Frontend'), 'should NOT have frontend');
    } finally {
      cleanup();
    }
  });
});

describe('assembleAGENTSmd', () => {
  it('returns a string with AGENTS.md header', () => {
    const { claudeMd, agents } = setupFixtures();
    try {
      const result = assembleAGENTSmd(claudeMd, agents, ['backend'], packDefs);
      assert.ok(typeof result === 'string');
      assert.ok(result.includes('# AGENTS.md'), 'should have AGENTS.md header');
    } finally {
      cleanup();
    }
  });

  it('includes project context section', () => {
    const { claudeMd, agents } = setupFixtures();
    try {
      const result = assembleAGENTSmd(claudeMd, agents, ['backend'], packDefs);
      assert.ok(result.includes('## Project Context'), 'should have project context');
      assert.ok(result.includes('Spartan AI Toolkit'), 'should mention toolkit name');
    } finally {
      cleanup();
    }
  });

  it('includes pack-specific content', () => {
    const { claudeMd, agents } = setupFixtures();
    try {
      const result = assembleAGENTSmd(claudeMd, agents, ['backend'], packDefs);
      assert.ok(result.includes('Backend') || result.includes('backend'), 'should have backend content');
    } finally {
      cleanup();
    }
  });

  it('does NOT include packs the user did not pick', () => {
    const { claudeMd, agents } = setupFixtures();
    try {
      const result = assembleAGENTSmd(claudeMd, agents, ['backend'], packDefs);
      assert.ok(!result.includes('## Frontend'), 'should NOT have frontend section');
    } finally {
      cleanup();
    }
  });

  it('includes agents section when agents exist', () => {
    const { claudeMd, agents } = setupFixtures();
    try {
      const result = assembleAGENTSmd(claudeMd, agents, ['backend'], packDefs);
      assert.ok(result.includes('backend-expert') || result.includes('Agents'), 'should have agents');
    } finally {
      cleanup();
    }
  });

  it('includes boundaries section', () => {
    const { claudeMd, agents } = setupFixtures();
    try {
      const result = assembleAGENTSmd(claudeMd, agents, ['backend'], packDefs);
      assert.ok(result.includes('## Boundaries') || result.includes('NEVER'), 'should have boundaries');
    } finally {
      cleanup();
    }
  });

  it('handles multiple packs', () => {
    const { claudeMd, agents } = setupFixtures();
    try {
      const result = assembleAGENTSmd(claudeMd, agents, ['backend', 'frontend'], packDefs);
      assert.ok(result.includes('Backend') || result.includes('backend'), 'should have backend');
      assert.ok(result.includes('Frontend') || result.includes('frontend'), 'should have frontend');
    } finally {
      cleanup();
    }
  });

  it('handles empty packs gracefully', () => {
    const { claudeMd, agents } = setupFixtures();
    try {
      const result = assembleAGENTSmd(claudeMd, agents, ['core'], packDefs);
      assert.ok(typeof result === 'string');
      assert.ok(result.includes('# AGENTS.md'));
    } finally {
      cleanup();
    }
  });
});
