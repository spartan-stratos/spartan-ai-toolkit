import { execSync } from 'node:child_process'
import { existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export interface MCPStatus {
  playwright: boolean
  notion: boolean
  playwrightProfile: string
}

const PROFILE_DIR = join(homedir(), '.playwright-profile')

const LOCK_FILES = ['SingletonLock', 'SingletonCookie', 'SingletonSocket']

/**
 * Check if the claude CLI is installed and accessible.
 */
export function checkClaudeCLI(): boolean {
  try {
    execSync('claude --version', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

/**
 * Check which MCP servers are installed.
 */
export function checkMCPServers(): MCPStatus {
  let playwright = false
  let notion = false

  try {
    const output = execSync('claude mcp list', { stdio: 'pipe', encoding: 'utf-8' })
    playwright = output.toLowerCase().includes('playwright')
    notion = output.toLowerCase().includes('notion')
  } catch {
    // mcp list failed — probably no servers installed
  }

  return { playwright, notion, playwrightProfile: PROFILE_DIR }
}

/**
 * Install Playwright MCP with a separate Chrome profile.
 */
export function installPlaywrightMCP(): boolean {
  try {
    // Remove old config first
    try {
      execSync('claude mcp remove playwright', { stdio: 'pipe' })
    } catch {
      // Didn't exist — that's fine
    }

    execSync(
      `claude mcp add playwright -- npx @playwright/mcp@latest --user-data-dir="${PROFILE_DIR}" --browser=chrome`,
      { stdio: 'pipe' }
    )
    return true
  } catch {
    // Fallback: install without persistent profile
    try {
      execSync('claude mcp remove playwright', { stdio: 'pipe' })
    } catch { /* ignore */ }

    try {
      execSync('claude mcp add playwright -- npx @playwright/mcp@latest', { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  }
}

/**
 * Remove stale browser lock files that cause
 * "Opening in existing browser session" errors.
 */
export function cleanStaleLockFiles(): number {
  let cleaned = 0

  for (const lockFile of LOCK_FILES) {
    const lockPath = join(PROFILE_DIR, lockFile)
    if (existsSync(lockPath)) {
      try {
        unlinkSync(lockPath)
        cleaned++
      } catch {
        // Can't remove — probably in use, that's ok
      }
    }
  }

  return cleaned
}

/**
 * Build the MCP config JSON for passing to claude -p.
 * Returns the path to a temp file, or null if writing fails.
 */
export function buildMCPConfig(): object {
  return {
    mcpServers: {
      playwright: {
        command: 'npx',
        args: [
          '@playwright/mcp@latest',
          '--user-data-dir',
          PROFILE_DIR,
          '--browser',
          'chrome',
        ],
      },
    },
  }
}

/**
 * Run all prerequisite checks. Returns a status summary.
 */
export function checkPrerequisites(): {
  claudeCLI: boolean
  mcp: MCPStatus
  ready: boolean
  issues: string[]
} {
  const issues: string[] = []

  const claudeCLI = checkClaudeCLI()
  if (!claudeCLI) {
    issues.push('claude CLI not found — install from https://docs.anthropic.com/en/docs/claude-code')
  }

  const mcp = checkMCPServers()
  if (!mcp.playwright) {
    issues.push('Playwright MCP not installed — will auto-install')
  }
  if (!mcp.notion) {
    issues.push('Notion MCP not connected (optional — needed for Notion export)')
  }

  return {
    claudeCLI,
    mcp,
    ready: claudeCLI && mcp.playwright,
    issues,
  }
}
