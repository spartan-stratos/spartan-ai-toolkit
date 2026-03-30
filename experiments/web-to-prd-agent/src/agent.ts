import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { ClaudeCLI } from './claude-cli.js'
import { checkPrerequisites, installPlaywrightMCP, cleanStaleLockFiles, buildMCPConfig } from './mcp-setup.js'
import { Crawler } from './crawler.js'
import { Screenshotter } from './screenshotter.js'
import { PRDGenerator } from './prd-generator.js'
import { NotionExporter } from './notion-exporter.js'
import type { CLIOptions, AgentState, ClaudeOptions } from './types.js'

export class Agent {
  private options: CLIOptions
  private state: AgentState
  private claude: ClaudeCLI
  private claudeOptions: ClaudeOptions
  private mcpConfigPath: string
  private log: (msg: string) => void

  constructor(options: CLIOptions) {
    this.options = options
    this.log = console.log

    this.state = {
      step: 'prerequisites',
      errors: [],
    }

    // Write MCP config to OS temp dir (cleaned up on exit)
    const sessionSlug = randomUUID().slice(0, 8)
    this.mcpConfigPath = join(tmpdir(), `spartan-prd-mcp-${sessionSlug}.json`)
    const mcpConfig = buildMCPConfig()
    writeFileSync(this.mcpConfigPath, JSON.stringify(mcpConfig, null, 2))

    this.claudeOptions = {
      mcpConfig: this.mcpConfigPath,
      allowedTools: 'mcp__playwright__*',
      outputFormat: 'json',
    }

    this.claude = new ClaudeCLI({
      outputFormat: 'json',
    })
  }

  /**
   * Run the full agent pipeline.
   */
  async run(): Promise<void> {
    const startTime = Date.now()

    try {
      // Step 0: Prerequisites
      await this.checkPrerequisites()

      // Step 1: Login handling
      await this.handleLogin()

      // Step 2: Pass 1 — map all pages
      const sessionId = randomUUID()
      const screenshotter = new Screenshotter(this.options.outputDir)
      const crawler = new Crawler({
        claude: this.claude,
        screenshotter,
        appUrl: this.options.url,
        sessionId,
        claudeOptions: this.claudeOptions,
        maxPages: this.options.maxPages,
        log: this.log,
      })

      this.state.step = 'crawl-pass1'
      await crawler.pass1()
      this.state.crawlState = crawler.getState()

      // Show sitemap and ask user
      this.log('')
      this.log(crawler.getSitemap())
      this.log('')
      this.log('Review the sitemap above. The agent will now explore every feature on each page.')
      this.log('')

      // Step 3: Pass 2 — deep exploration
      this.state.step = 'crawl-pass2'
      await crawler.pass2()
      this.state.crawlState = crawler.getState()

      // Step 4: Coverage check
      this.state.step = 'coverage-check'
      const coverage = crawler.calculateCoverage()
      this.state.coverageReport = coverage

      this.log('')
      this.log('Coverage Report:')
      this.log(`  Pages visited:        ${coverage.pagesVisited}`)
      this.log(`  Screenshots taken:    ${coverage.screenshotsTaken}`)
      this.log(`  Buttons clicked:      ${coverage.buttonsClicked}`)
      this.log(`  Modals found:         ${coverage.modalsFound}`)
      this.log(`  Forms found:          ${coverage.formsFound}`)
      this.log(`  Tabs explored:        ${coverage.tabsExplored}`)
      this.log(`  Sections explored:    ${coverage.sectionsExplored.join(', ')}`)
      if (coverage.sectionsSkipped.length > 0) {
        this.log(`  Sections SKIPPED:     ${coverage.sectionsSkipped.join(', ')}`)
      }
      this.log(`  Status:               ${coverage.passed ? 'PASSED' : 'NEEDS ATTENTION'}`)
      if (!coverage.passed) {
        for (const f of coverage.failures) {
          this.log(`    - ${f}`)
        }
      }
      this.log('')

      // Step 5: Build feature map and generate PRD
      this.state.step = 'generate-prd'
      const featureMap = crawler.buildFeatureMap()
      this.state.featureMap = featureMap

      const generator = new PRDGenerator({
        claude: this.claude,
        claudeOptions: this.claudeOptions,
        log: this.log,
      })

      const prd = await generator.generate(featureMap)
      this.state.prd = prd

      // Save locally
      const prdPath = generator.savePRD(prd, this.options.outputDir)
      const featuresPath = generator.saveFeatureMap(featureMap, this.options.outputDir)
      this.log(`PRD saved: ${prdPath}`)
      this.log(`Features saved: ${featuresPath}`)

      // Step 6: Export to Notion (optional)
      if (!this.options.noNotion) {
        this.state.step = 'export-notion'
        const exporter = new NotionExporter({
          claude: this.claude,
          claudeOptions: this.claudeOptions,
          log: this.log,
        })

        const notionResult = await exporter.export(prd)
        this.state.notionResult = notionResult

        if (notionResult.parentPageUrl) {
          this.log(`Notion page: ${notionResult.parentPageUrl}`)
        }
      }

      // Done
      this.state.step = 'done'
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      this.printSummary(elapsed)

      // Save state for resume
      this.saveState()
    } catch (err) {
      this.state.errors.push((err as Error).message)
      this.log(`\nError: ${(err as Error).message}`)
      this.saveState()
      throw err
    } finally {
      // Clean up temp MCP config
      try { unlinkSync(this.mcpConfigPath) } catch { /* already gone */ }
    }
  }

  /**
   * Check all prerequisites are met.
   */
  private async checkPrerequisites(): Promise<void> {
    this.state.step = 'prerequisites'
    this.log('Checking prerequisites...')

    const status = checkPrerequisites()

    if (!status.claudeCLI) {
      throw new Error('claude CLI not found. Install: https://docs.anthropic.com/en/docs/claude-code')
    }

    if (!status.mcp.playwright) {
      this.log('  Playwright MCP not found. Installing...')
      const installed = installPlaywrightMCP()
      if (!installed) {
        throw new Error('Failed to install Playwright MCP. Try manually: claude mcp add playwright -- npx @playwright/mcp@latest')
      }
      this.log('  Playwright MCP installed.')
    }

    if (!status.mcp.notion && !this.options.noNotion) {
      this.log('  Notion MCP not found. Notion export will be skipped.')
      this.log('  To enable: claude mcp add notion -- npx @anthropic-ai/mcp-notion')
      this.options.noNotion = true
    }

    // Clean stale browser processes
    const cleaned = cleanStaleLockFiles()
    if (cleaned > 0) {
      this.log(`  Cleaned ${cleaned} stale browser lock file(s).`)
    }

    this.log('  Prerequisites OK.')
  }

  /**
   * Navigate to URL and handle login if needed.
   */
  private async handleLogin(): Promise<void> {
    this.state.step = 'login'
    this.log(`Navigating to ${this.options.url}...`)

    const result = await this.claude.ask(
      `Navigate to ${this.options.url}. Take a snapshot of the page. ` +
      `Check if this is a login page. Return JSON: ` +
      `{"isLoginPage": true/false, "title": "page title", "loginSignals": ["what made you think it's a login page"]}`,
      this.claudeOptions
    )

    try {
      const parsed = JSON.parse(result)
      if (parsed.isLoginPage) {
        this.log('')
        this.log('This app needs login. A browser window should be open on your screen.')
        this.log('Please log in directly in that browser window.')
        this.log('')
        this.log('After logging in, the agent will continue automatically.')
        this.log('(Waiting for login... the page will be checked periodically)')
        this.log('')

        // Wait and re-check every 10 seconds
        let loggedIn = false
        for (let i = 0; i < 30; i++) { // Max 5 minutes
          await new Promise(resolve => setTimeout(resolve, 10000))

          const check = await this.claude.ask(
            'Take a snapshot of the current page. Is this still a login page? ' +
            'Return JSON: {"isLoginPage": true/false, "title": "page title"}',
            this.claudeOptions
          )

          try {
            const checkParsed = JSON.parse(check)
            if (!checkParsed.isLoginPage) {
              loggedIn = true
              this.log(`Logged in. Now on: ${checkParsed.title}`)
              break
            }
          } catch {
            // Parse failed — keep waiting
          }
        }

        if (!loggedIn) {
          throw new Error('Login timeout (5 minutes). Please log in and try again with --resume.')
        }
      } else {
        this.log(`Page loaded: ${parsed.title ?? 'Unknown'}`)
      }
    } catch (err) {
      if ((err as Error).message.includes('Login timeout')) throw err
      // JSON parse failed — not a big deal, continue
      this.log('Page loaded.')
    }
  }

  /**
   * Print the final summary.
   */
  private printSummary(elapsedSeconds: number): void {
    const prd = this.state.prd
    const coverage = this.state.coverageReport
    const minutes = Math.round(elapsedSeconds / 60)

    this.log('')
    this.log('='.repeat(50))
    this.log('Web-to-PRD Complete')
    this.log('='.repeat(50))
    this.log('')
    this.log(`App:       ${prd?.appName ?? 'Unknown'}`)
    this.log(`URL:       ${this.options.url}`)
    this.log(`Time:      ${minutes} minutes`)
    this.log(`Scanned:   ${coverage?.pagesVisited ?? 0} pages`)
    this.log('')
    this.log('Generated:')
    this.log(`  - ${prd?.epics.length ?? 0} Epics`)
    this.log(`  - ${prd?.userStories.length ?? 0} User Stories`)
    this.log(`  - ${prd?.userFlows.length ?? 0} User Flows`)
    this.log(`  - ${prd?.buildRoadmap.length ?? 0} Build Phases`)
    this.log('')
    this.log('Saved to:')
    this.log(`  - Local: ${this.options.outputDir}/`)
    if (this.state.notionResult?.parentPageUrl) {
      this.log(`  - Notion: ${this.state.notionResult.parentPageUrl}`)
    }
    if (this.state.errors.length > 0) {
      this.log('')
      this.log(`Warnings: ${this.state.errors.length}`)
      for (const e of this.state.errors) {
        this.log(`  - ${e}`)
      }
    }
    this.log('')
  }

  /**
   * Save agent state for resume support.
   */
  private saveState(): void {
    if (!existsSync(this.options.outputDir)) {
      mkdirSync(this.options.outputDir, { recursive: true })
    }

    const statePath = join(this.options.outputDir, 'agent-state.json')

    // Convert Maps/Sets to plain objects for JSON
    const serializable = {
      ...this.state,
      crawlState: this.state.crawlState
        ? {
            ...this.state.crawlState,
            pages: Object.fromEntries(this.state.crawlState.pages),
            visited: Array.from(this.state.crawlState.visited),
          }
        : undefined,
      notionResult: this.state.notionResult
        ? {
            ...this.state.notionResult,
            epicPageUrls: Object.fromEntries(this.state.notionResult.epicPageUrls),
          }
        : undefined,
    }

    writeFileSync(statePath, JSON.stringify(serializable, null, 2))
  }

  /**
   * Load state from a previous run (for --resume).
   */
  static loadState(outputDir: string): AgentState | null {
    const statePath = join(outputDir, 'agent-state.json')
    if (!existsSync(statePath)) return null

    try {
      const raw = readFileSync(statePath, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
}
