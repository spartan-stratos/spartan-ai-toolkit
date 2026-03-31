import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ClaudeCLI } from './claude-cli.js'
import { Browser } from './browser.js'
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
  private browser: Browser
  private log: (msg: string) => void

  constructor(options: CLIOptions) {
    this.options = options
    this.log = console.log

    this.state = {
      step: 'prerequisites',
      errors: [],
    }

    // No MCP needed — Playwright is used directly
    this.claudeOptions = {
      outputFormat: 'json',
    }

    this.claude = new ClaudeCLI({ outputFormat: 'json' })
    this.browser = new Browser({ log: this.log })
  }

  async run(): Promise<void> {
    const startTime = Date.now()

    if (!existsSync(this.options.outputDir)) {
      mkdirSync(this.options.outputDir, { recursive: true })
    }

    try {
      // Step 1: Launch browser with persistent profile (keeps login cookies)
      this.state.step = 'prerequisites'
      const profileDir = join(this.options.outputDir, '.browser-profile')
      this.log('Launching browser (persistent profile — login is saved between runs)...')
      await this.browser.launch(profileDir)

      // Step 2: Navigate and handle login
      this.state.step = 'login'
      await this.handleLogin()

      // Step 3: Mechanical crawl (Playwright only — $0)
      this.state.step = 'crawl-pass1'
      const screenshotter = new Screenshotter(this.options.outputDir)
      const crawler = new Crawler({
        browser: this.browser,
        claude: this.claude,
        screenshotter,
        appUrl: this.options.url,
        claudeOptions: this.claudeOptions,
        maxPages: this.options.maxPages,
        log: this.log,
      })

      await crawler.mechanicalCrawl()

      this.log('')
      this.log(crawler.getSitemap())
      this.log('')

      // Step 4: AI-guided exploration (2 AI calls)
      this.state.step = 'crawl-pass2'
      await crawler.aiGuidedExploration()

      // Step 5: Coverage report
      this.state.step = 'coverage-check'
      const coverage = crawler.calculateCoverage()
      this.state.coverageReport = coverage

      this.log('')
      this.log('Coverage Report:')
      this.log(`  Pages visited:        ${coverage.pagesVisited}`)
      this.log(`  Screenshots taken:    ${coverage.screenshotsTaken}`)
      this.log(`  Elements clicked:     ${coverage.buttonsClicked}`)
      this.log(`  Modals found:         ${coverage.modalsFound}`)
      this.log(`  Forms found:          ${coverage.formsFound}`)
      this.log(`  Dropdowns opened:     ${coverage.dropdownsOpened}`)
      this.log('')

      // Step 6: Generate PRD (1 AI call)
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

      const prdPath = generator.savePRD(prd, this.options.outputDir)
      const featuresPath = generator.saveFeatureMap(featureMap, this.options.outputDir)
      this.log(`PRD saved: ${prdPath}`)
      this.log(`Features saved: ${featuresPath}`)

      // Step 7: Notion export (optional)
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
      this.saveState()
    } catch (err) {
      this.state.errors.push((err as Error).message)
      this.log(`\nError: ${(err as Error).message}`)
      this.saveState()
      throw err
    } finally {
      await this.browser.close()
    }
  }

  private async handleLogin(): Promise<void> {
    this.log(`Navigating to ${this.options.url}...`)
    await this.browser.goto(this.options.url)

    // Dismiss any initial overlays/popups
    await this.browser.dismissOverlays()

    const title = await this.browser.getTitle()
    const url = await this.browser.getUrl()

    // Check if this is a login page (URL or content signals)
    const isLoginPage = url.includes('/login') || url.includes('/signin') ||
      url.includes('/auth') || title.toLowerCase().includes('sign in') ||
      title.toLowerCase().includes('log in')

    if (isLoginPage) {
      this.log('')
      this.log('This app needs login. A browser window is open on your screen.')
      this.log('Please log in directly in that browser window.')
      this.log('')
      this.log('Waiting for login... (checking every 10 seconds, max 5 minutes)')

      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 10000))
        const currentUrl = await this.browser.getUrl()
        if (!currentUrl.includes('/login') && !currentUrl.includes('/signin') && !currentUrl.includes('/auth')) {
          const newTitle = await this.browser.getTitle()
          this.log(`Logged in. Now on: ${newTitle}`)
          return
        }
      }

      throw new Error('Login timeout (5 minutes). Please log in and try again.')
    }

    this.log(`Page loaded: ${title}`)
    this.log('')
    this.log('Tip: If you want to crawl features behind login, log in via the browser window now.')
    this.log('     The crawler will wait 15 seconds before starting...')
    this.log('')
    await new Promise(resolve => setTimeout(resolve, 15000))

    // Dismiss any overlays that appeared during the wait
    await this.browser.dismissOverlays()
  }

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
    this.log(`AI calls:  ~3-5 (vs 80-150 in v1)`)
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
      for (const e of this.state.errors) this.log(`  - ${e}`)
    }
    this.log('')
  }

  private saveState(): void {
    if (!existsSync(this.options.outputDir)) {
      mkdirSync(this.options.outputDir, { recursive: true })
    }
    const statePath = join(this.options.outputDir, 'agent-state.json')
    const serializable = {
      ...this.state,
      crawlState: undefined,
      notionResult: this.state.notionResult
        ? { ...this.state.notionResult, epicPageUrls: Object.fromEntries(this.state.notionResult.epicPageUrls) }
        : undefined,
    }
    writeFileSync(statePath, JSON.stringify(serializable, null, 2))
  }

  static loadState(outputDir: string): AgentState | null {
    const statePath = join(outputDir, 'agent-state.json')
    if (!existsSync(statePath)) return null
    try {
      return JSON.parse(readFileSync(statePath, 'utf-8'))
    } catch {
      return null
    }
  }
}
