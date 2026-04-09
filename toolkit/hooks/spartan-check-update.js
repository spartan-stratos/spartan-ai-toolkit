#!/usr/bin/env node
// spartan-hook-version: 1.0.0
// Check for Spartan + GSD updates in background, write result to cache
// Called by SessionStart hook - runs once per session
// Forked from gsd-check-update.js — checks both Spartan (git) and GSD (npm)

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const homeDir = os.homedir();
const cwd = process.cwd();

// Detect runtime config directory (supports Claude, OpenCode, Gemini)
// Respects CLAUDE_CONFIG_DIR for custom config directory setups
function detectConfigDir(baseDir) {
  const envDir = process.env.CLAUDE_CONFIG_DIR;
  if (envDir && fs.existsSync(path.join(envDir, 'get-shit-done', 'VERSION'))) {
    return envDir;
  }
  for (const dir of ['.config/opencode', '.opencode', '.gemini', '.claude']) {
    if (fs.existsSync(path.join(baseDir, dir, 'get-shit-done', 'VERSION'))) {
      return path.join(baseDir, dir);
    }
  }
  return envDir || path.join(baseDir, '.claude');
}

const globalConfigDir = detectConfigDir(homeDir);
const projectConfigDir = detectConfigDir(cwd);
const cacheDir = path.join(globalConfigDir, 'cache');
const cacheFile = path.join(cacheDir, 'spartan-update-check.json');

// VERSION file locations (check project first, then global)
const projectVersionFile = path.join(projectConfigDir, 'get-shit-done', 'VERSION');
const globalVersionFile = path.join(globalConfigDir, 'get-shit-done', 'VERSION');

// Spartan repo path
const spartanRepoFile = path.join(globalConfigDir, '.spartan-repo');
const spartanVersionFile = path.join(globalConfigDir, '.spartan-version');

// Ensure cache directory exists
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Run check in background (spawn background process)
const child = spawn(process.execPath, ['-e', `
  const fs = require('fs');
  const path = require('path');
  const { execSync } = require('child_process');

  const cacheFile = ${JSON.stringify(cacheFile)};
  const projectVersionFile = ${JSON.stringify(projectVersionFile)};
  const globalVersionFile = ${JSON.stringify(globalVersionFile)};
  const spartanRepoFile = ${JSON.stringify(spartanRepoFile)};
  const spartanVersionFile = ${JSON.stringify(spartanVersionFile)};

  // --- GSD version check ---
  let gsdInstalled = '0.0.0';
  let configDir = '';
  try {
    if (fs.existsSync(projectVersionFile)) {
      gsdInstalled = fs.readFileSync(projectVersionFile, 'utf8').trim();
      configDir = path.dirname(path.dirname(projectVersionFile));
    } else if (fs.existsSync(globalVersionFile)) {
      gsdInstalled = fs.readFileSync(globalVersionFile, 'utf8').trim();
      configDir = path.dirname(path.dirname(globalVersionFile));
    }
  } catch (e) {}

  // Check for stale GSD hooks
  let staleHooks = [];
  if (configDir) {
    const hooksDir = path.join(configDir, 'get-shit-done', 'hooks');
    try {
      if (fs.existsSync(hooksDir)) {
        const hookFiles = fs.readdirSync(hooksDir).filter(f => f.startsWith('gsd-') && f.endsWith('.js'));
        for (const hookFile of hookFiles) {
          try {
            const content = fs.readFileSync(path.join(hooksDir, hookFile), 'utf8');
            const versionMatch = content.match(/\\/\\/ gsd-hook-version:\\s*(.+)/);
            if (versionMatch) {
              const hookVersion = versionMatch[1].trim();
              if (hookVersion !== gsdInstalled && !hookVersion.includes('{{')) {
                staleHooks.push({ file: hookFile, hookVersion, installedVersion: gsdInstalled });
              }
            } else {
              staleHooks.push({ file: hookFile, hookVersion: 'unknown', installedVersion: gsdInstalled });
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  let gsdLatest = null;
  try {
    gsdLatest = execSync('npm view get-shit-done-cc version', { encoding: 'utf8', timeout: 10000, windowsHide: true }).trim();
  } catch (e) {}

  const gsdUpdateAvailable = gsdLatest && gsdInstalled !== gsdLatest;

  // --- Spartan hook staleness check ---
  // Check if installed spartan-*.js hooks match the current Spartan version
  if (configDir) {
    const spartanHooksDir = path.join(configDir, 'hooks');
    try {
      if (fs.existsSync(spartanHooksDir)) {
        let spartanVer = 'unknown';
        try {
          if (fs.existsSync(spartanVersionFile)) {
            spartanVer = fs.readFileSync(spartanVersionFile, 'utf8').trim();
          }
        } catch (e) {}

        const spartanHookFiles = fs.readdirSync(spartanHooksDir).filter(f => f.startsWith('spartan-') && f.endsWith('.js'));
        for (const hookFile of spartanHookFiles) {
          try {
            const content = fs.readFileSync(path.join(spartanHooksDir, hookFile), 'utf8');
            const versionMatch = content.match(/\\/\\/ spartan-hook-version:\\s*(.+)/);
            if (versionMatch) {
              const hookVersion = versionMatch[1].trim();
              if (spartanVer !== 'unknown' && hookVersion !== spartanVer && !hookVersion.includes('{{')) {
                staleHooks.push({ file: hookFile, hookVersion, installedVersion: spartanVer });
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  // --- Spartan version check (git) ---
  let spartanInstalled = 'unknown';
  let spartanLatest = 'unknown';
  let spartanUpdateAvailable = false;

  try {
    if (fs.existsSync(spartanVersionFile)) {
      spartanInstalled = fs.readFileSync(spartanVersionFile, 'utf8').trim();
    }
  } catch (e) {}

  try {
    if (fs.existsSync(spartanRepoFile)) {
      const repoPath = fs.readFileSync(spartanRepoFile, 'utf8').trim();
      if (fs.existsSync(repoPath)) {
        // Detect default branch
        let branch = 'master';
        try {
          const headRef = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
            cwd: repoPath, encoding: 'utf8', timeout: 5000, windowsHide: true
          }).trim();
          branch = headRef.replace('refs/remotes/origin/', '');
        } catch (e) {
          // Fallback: check which branch exists
          try {
            execSync('git rev-parse --verify origin/master', {
              cwd: repoPath, timeout: 5000, windowsHide: true
            });
            branch = 'master';
          } catch (e2) {
            branch = 'main';
          }
        }

        // Fetch quietly
        try {
          execSync('git fetch origin ' + branch + ' --quiet', {
            cwd: repoPath, timeout: 15000, windowsHide: true
          });
        } catch (e) {}

        // Read remote VERSION
        try {
          spartanLatest = execSync('git show origin/' + branch + ':toolkit/VERSION', {
            cwd: repoPath, encoding: 'utf8', timeout: 5000, windowsHide: true
          }).trim();
        } catch (e) {}

        spartanUpdateAvailable = spartanLatest !== 'unknown' && spartanInstalled !== spartanLatest;
      }
    }
  } catch (e) {}

  // --- Write combined result ---
  const result = {
    update_available: spartanUpdateAvailable || gsdUpdateAvailable,
    spartan_installed: spartanInstalled,
    spartan_latest: spartanLatest,
    gsd_installed: gsdInstalled,
    gsd_latest: gsdLatest || 'unknown',
    checked: Math.floor(Date.now() / 1000),
    stale_hooks: staleHooks.length > 0 ? staleHooks : undefined
  };

  fs.writeFileSync(cacheFile, JSON.stringify(result));
`], {
  stdio: 'ignore',
  windowsHide: true,
  detached: true
});

child.unref();
