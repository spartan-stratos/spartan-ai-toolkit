// Spartan AI Toolkit — Stack Detector Tests
// Run: node --test toolkit/lib/detector.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { detectStacks } from './detector.js';

// ── Test fixtures ────────────────────────────────────────────────
const TMP = join(import.meta.dirname, '..', '.test-tmp-detector');

function setup() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
}

function cleanup() {
  rmSync(TMP, { recursive: true, force: true });
}

// ── Tests ────────────────────────────────────────────────────────

describe('detectStacks', () => {
  it('detects Kotlin + Micronaut from build.gradle.kts', () => {
    setup();
    try {
      writeFileSync(join(TMP, 'build.gradle.kts'), `
plugins {
    id("io.micronaut.application") version "4.0.0"
}
dependencies {
    implementation("io.micronaut:micronaut-http-server-netty")
}
`);
      const result = detectStacks(TMP);
      assert.ok(result.detected.some(d => d.pack === 'backend-micronaut'), 'should detect backend-micronaut');
    } finally {
      cleanup();
    }
  });

  it('detects React + Next.js from package.json', () => {
    setup();
    try {
      writeFileSync(join(TMP, 'package.json'), JSON.stringify({
        dependencies: { next: '14.0.0', react: '18.0.0' },
      }));
      const result = detectStacks(TMP);
      assert.ok(result.detected.some(d => d.pack === 'frontend-react'), 'should detect frontend-react');
    } finally {
      cleanup();
    }
  });

  it('detects React without Next.js', () => {
    setup();
    try {
      writeFileSync(join(TMP, 'package.json'), JSON.stringify({
        dependencies: { react: '18.0.0', 'react-dom': '18.0.0' },
      }));
      const result = detectStacks(TMP);
      assert.ok(result.detected.some(d => d.pack === 'frontend-react'), 'should detect frontend-react');
    } finally {
      cleanup();
    }
  });

  it('detects Next.js from next.config.js', () => {
    setup();
    try {
      writeFileSync(join(TMP, 'next.config.js'), 'module.exports = {};');
      const result = detectStacks(TMP);
      assert.ok(result.detected.some(d => d.pack === 'frontend-react'), 'should detect frontend-react');
    } finally {
      cleanup();
    }
  });

  it('detects Node.js backend (express) — marks as coming soon', () => {
    setup();
    try {
      writeFileSync(join(TMP, 'package.json'), JSON.stringify({
        dependencies: { express: '4.18.0' },
      }));
      const result = detectStacks(TMP);
      assert.ok(!result.detected.some(d => d.pack === 'backend-nodejs'), 'should NOT be in detected');
      assert.ok(result.comingSoon.some(d => d.pack === 'backend-nodejs'), 'should be in comingSoon');
    } finally {
      cleanup();
    }
  });

  it('detects Python backend (FastAPI)', () => {
    setup();
    try {
      writeFileSync(join(TMP, 'requirements.txt'), 'fastapi==0.100.0\nuvicorn==0.23.0\n');
      const result = detectStacks(TMP);
      assert.ok(result.detected.some(d => d.pack === 'backend-python'), 'should be in detected');
      assert.ok(!result.comingSoon.some(d => d.pack === 'backend-python'), 'should NOT be in comingSoon');
    } finally {
      cleanup();
    }
  });

  it('detects Django from manage.py', () => {
    setup();
    try {
      writeFileSync(join(TMP, 'manage.py'), '#!/usr/bin/env python\nimport django\n');
      const result = detectStacks(TMP);
      assert.ok(result.detected.some(d => d.pack === 'backend-python'), 'should detect python in detected');
      assert.ok(!result.comingSoon.some(d => d.pack === 'backend-python'), 'should NOT be in comingSoon');
    } finally {
      cleanup();
    }
  });

  it('detects Micronaut from pom.xml', () => {
    setup();
    try {
      writeFileSync(join(TMP, 'pom.xml'), `
<project>
  <dependencies>
    <dependency>
      <groupId>io.micronaut</groupId>
      <artifactId>micronaut-http-server-netty</artifactId>
    </dependency>
  </dependencies>
</project>
`);
      const result = detectStacks(TMP);
      assert.ok(result.detected.some(d => d.pack === 'backend-micronaut'), 'should detect backend-micronaut');
    } finally {
      cleanup();
    }
  });

  it('returns empty for empty directory', () => {
    setup();
    try {
      const result = detectStacks(TMP);
      assert.equal(result.detected.length, 0);
      assert.equal(result.comingSoon.length, 0);
    } finally {
      cleanup();
    }
  });

  it('detects both backend and frontend in same project', () => {
    setup();
    try {
      writeFileSync(join(TMP, 'build.gradle.kts'), 'id("io.micronaut.application")');
      writeFileSync(join(TMP, 'package.json'), JSON.stringify({
        dependencies: { next: '14.0.0', react: '18.0.0' },
      }));
      const result = detectStacks(TMP);
      assert.ok(result.detected.some(d => d.pack === 'backend-micronaut'), 'should detect backend');
      assert.ok(result.detected.some(d => d.pack === 'frontend-react'), 'should detect frontend');
    } finally {
      cleanup();
    }
  });

  it('prefers frontend-react over backend-nodejs when both next and express are present', () => {
    setup();
    try {
      writeFileSync(join(TMP, 'package.json'), JSON.stringify({
        dependencies: { next: '14.0.0', react: '18.0.0', express: '4.18.0' },
      }));
      const result = detectStacks(TMP);
      assert.ok(result.detected.some(d => d.pack === 'frontend-react'), 'should detect frontend');
      assert.ok(!result.detected.some(d => d.pack === 'backend-nodejs'), 'should NOT detect nodejs backend');
      assert.ok(!result.comingSoon.some(d => d.pack === 'backend-nodejs'), 'should NOT show nodejs as coming soon');
    } finally {
      cleanup();
    }
  });

  it('detects from subdirectory (1 level deep)', () => {
    setup();
    try {
      const subdir = join(TMP, 'backend');
      mkdirSync(subdir);
      writeFileSync(join(subdir, 'build.gradle.kts'), 'id("io.micronaut.application")');
      const result = detectStacks(TMP);
      assert.ok(result.detected.some(d => d.pack === 'backend-micronaut'), 'should detect from subdir');
    } finally {
      cleanup();
    }
  });

  it('includes reason string for each detection', () => {
    setup();
    try {
      writeFileSync(join(TMP, 'build.gradle.kts'), 'id("io.micronaut.application")');
      const result = detectStacks(TMP);
      const match = result.detected.find(d => d.pack === 'backend-micronaut');
      assert.ok(match.reason, 'should have a reason');
      assert.ok(match.reason.length > 0, 'reason should not be empty');
    } finally {
      cleanup();
    }
  });

  it('does not detect Kotlin without Micronaut', () => {
    setup();
    try {
      writeFileSync(join(TMP, 'build.gradle.kts'), `
plugins {
    kotlin("jvm") version "1.9.0"
}
dependencies {
    implementation("io.ktor:ktor-server-core")
}
`);
      const result = detectStacks(TMP);
      assert.ok(!result.detected.some(d => d.pack === 'backend-micronaut'), 'should NOT detect micronaut');
    } finally {
      cleanup();
    }
  });
});
