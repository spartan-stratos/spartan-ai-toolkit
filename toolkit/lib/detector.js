// Spartan AI Toolkit — Stack Detector
// Scans a project directory to detect tech stacks and map them to packs.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Packs that are "coming soon" — detect but don't auto-select
const COMING_SOON = new Set(['backend-nodejs']);

// Skip these directories when scanning 1 level deep
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.gradle', 'build', 'dist', 'target',
  '.next', '.nuxt', '__pycache__', '.venv', 'venv', '.idea',
]);

/**
 * Detect tech stacks in a project directory.
 * Scans root + 1 level deep for stack markers.
 * @param {string} cwd - Directory to scan
 * @returns {{ detected: Array<{pack: string, reason: string}>, comingSoon: Array<{pack: string, reason: string}> }}
 */
export function detectStacks(cwd) {
  const detected = [];
  const comingSoon = [];
  const seen = new Set();

  // Scan root
  scanDir(cwd, '', detected, comingSoon, seen);

  // Scan 1 level deep
  try {
    const entries = readdirSync(cwd);
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue;
      const full = join(cwd, entry);
      try {
        if (statSync(full).isDirectory()) {
          scanDir(full, entry, detected, comingSoon, seen);
        }
      } catch { /* ignore permission errors */ }
    }
  } catch { /* ignore if cwd can't be read */ }

  return { detected, comingSoon };
}

function scanDir(dir, label, detected, comingSoon, seen) {
  // ── Kotlin + Micronaut ───────────────────────────────────────
  if (!seen.has('backend-micronaut')) {
    const gradleFile = join(dir, 'build.gradle.kts');
    const pomFile = join(dir, 'pom.xml');
    const mnCliFile = join(dir, 'micronaut-cli.yml');

    if (existsSync(gradleFile)) {
      const content = readSafe(gradleFile);
      if (content.includes('io.micronaut')) {
        addResult('backend-micronaut', `build.gradle.kts${label ? ` in ${label}/` : ''} → Micronaut`, detected, comingSoon, seen);
      }
    }
    if (!seen.has('backend-micronaut') && existsSync(pomFile)) {
      const content = readSafe(pomFile);
      if (content.includes('io.micronaut') || content.includes('micronaut-')) {
        addResult('backend-micronaut', `pom.xml${label ? ` in ${label}/` : ''} → Micronaut`, detected, comingSoon, seen);
      }
    }
    if (!seen.has('backend-micronaut') && existsSync(mnCliFile)) {
      addResult('backend-micronaut', `micronaut-cli.yml${label ? ` in ${label}/` : ''}`, detected, comingSoon, seen);
    }
  }

  // ── React / Next.js ──────────────────────────────────────────
  if (!seen.has('frontend-react')) {
    // Check next.config.* files first (high confidence)
    for (const cfg of ['next.config.js', 'next.config.ts', 'next.config.mjs']) {
      if (existsSync(join(dir, cfg))) {
        addResult('frontend-react', `${cfg}${label ? ` in ${label}/` : ''} → Next.js`, detected, comingSoon, seen);
        break;
      }
    }

    // Check package.json for next or react
    if (!seen.has('frontend-react')) {
      const pkg = readPackageJson(dir);
      if (pkg) {
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps.next) {
          addResult('frontend-react', `package.json${label ? ` in ${label}/` : ''} → Next.js`, detected, comingSoon, seen);
        } else if (allDeps.react) {
          addResult('frontend-react', `package.json${label ? ` in ${label}/` : ''} → React`, detected, comingSoon, seen);
        }
      }
    }
  }

  // ── Node.js Backend ──────────────────────────────────────────
  // Only check if frontend-react was NOT found in this same package.json
  if (!seen.has('backend-nodejs') && !seen.has('frontend-react-from-pkg-' + dir)) {
    const pkg = readPackageJson(dir);
    if (pkg) {
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      // Skip if this package has next or react (it's frontend, not backend)
      if (!allDeps.next && !allDeps.react) {
        const nodeBackendFrameworks = ['express', 'fastify', '@nestjs/core', 'koa', '@hapi/hapi', 'hapi'];
        const found = nodeBackendFrameworks.find(f => allDeps[f]);
        if (found) {
          addResult('backend-nodejs', `package.json${label ? ` in ${label}/` : ''} → ${found}`, detected, comingSoon, seen);
        }
      }
    }
  }

  // ── Python Backend ───────────────────────────────────────────
  if (!seen.has('backend-python')) {
    const pythonFrameworks = ['fastapi', 'django', 'flask', 'starlette'];

    // manage.py → Django
    if (existsSync(join(dir, 'manage.py'))) {
      addResult('backend-python', `manage.py${label ? ` in ${label}/` : ''} → Django`, detected, comingSoon, seen);
    }

    // pyproject.toml
    if (!seen.has('backend-python') && existsSync(join(dir, 'pyproject.toml'))) {
      const content = readSafe(join(dir, 'pyproject.toml')).toLowerCase();
      const found = pythonFrameworks.find(f => content.includes(f));
      if (found) {
        addResult('backend-python', `pyproject.toml${label ? ` in ${label}/` : ''} → ${found}`, detected, comingSoon, seen);
      }
    }

    // requirements.txt
    if (!seen.has('backend-python') && existsSync(join(dir, 'requirements.txt'))) {
      const content = readSafe(join(dir, 'requirements.txt')).toLowerCase();
      const found = pythonFrameworks.find(f => content.includes(f));
      if (found) {
        addResult('backend-python', `requirements.txt${label ? ` in ${label}/` : ''} → ${found}`, detected, comingSoon, seen);
      }
    }
  }
}

function addResult(pack, reason, detected, comingSoon, seen) {
  seen.add(pack);
  if (COMING_SOON.has(pack)) {
    comingSoon.push({ pack, reason });
  } else {
    detected.push({ pack, reason });
  }
}

function readSafe(filePath) {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function readPackageJson(dir) {
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    return null;
  }
}
