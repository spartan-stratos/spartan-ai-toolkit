#!/usr/bin/env node
// spartan-hook-version: 1.24.1
// Check for Spartan updates in background, write result to cache.
// Called by SessionStart hook - runs once per session.

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
  if (envDir && fs.existsSync(path.join(envDir, 'hooks'))) {
    return envDir;
  }
  for (const dir of ['.config/opencode', '.opencode', '.gemini', '.claude']) {
    if (fs.existsSync(path.join(baseDir, dir, 'hooks'))) {
      return path.join(baseDir, dir);
    }
  }
  return envDir || path.join(baseDir, '.claude');
}

const globalConfigDir = detectConfigDir(homeDir);
const cacheDir = path.join(globalConfigDir, 'cache');
const cacheFile = path.join(cacheDir, 'spartan-update-check.json');

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
  const spartanRepoFile = ${JSON.stringify(spartanRepoFile)};
  const spartanVersionFile = ${JSON.stringify(spartanVersionFile)};
  const configDir = ${JSON.stringify(globalConfigDir)};

  // --- Spartan hook staleness check ---
  let staleHooks = [];
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

        // Sanitize branch name to prevent shell injection
        branch = branch.replace(/[^a-zA-Z0-9._/-]/g, '');

        // Fetch quietly
        try {
          execSync('git fetch --quiet origin ' + branch, {
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

  // --- Write result ---
  const result = {
    update_available: spartanUpdateAvailable,
    spartan_installed: spartanInstalled,
    spartan_latest: spartanLatest,
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
