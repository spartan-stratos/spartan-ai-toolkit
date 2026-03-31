import type { ClaudeOptions, PageSnapshot, ElementInfo, ClickAction, ClickResult, CoverageReport, FeatureMap, Feature, AppSection, DOMDiff } from './types.js'
import { ClaudeCLI } from './claude-cli.js'
import { Browser } from './browser.js'
import { diffElements, summarizeDiff } from './dom-differ.js'
import { Screenshotter } from './screenshotter.js'

const DELAY_MS = 1000

export class Crawler {
  private browser: Browser
  private claude: ClaudeCLI
  private screenshotter: Screenshotter
  private claudeOptions: ClaudeOptions
  private maxPages: number
  private log: (msg: string) => void

  private pages: Map<string, PageSnapshot> = new Map()
  private visited: Set<string> = new Set()
  private queue: string[] = []
  private queuedUrls: Set<string> = new Set()
  private clickResults: ClickResult[] = []
  private appName: string = ''
  private appUrl: string = ''

  constructor(options: {
    browser: Browser
    claude: ClaudeCLI
    screenshotter: Screenshotter
    appUrl: string
    claudeOptions: ClaudeOptions
    maxPages?: number
    log?: (msg: string) => void
  }) {
    this.browser = options.browser
    this.claude = options.claude
    this.screenshotter = options.screenshotter
    this.appUrl = options.appUrl
    this.claudeOptions = options.claudeOptions
    this.maxPages = options.maxPages ?? 100
    this.log = options.log ?? console.log

    this.queue = [options.appUrl]
    this.queuedUrls = new Set([options.appUrl])
  }

  /**
   * Phase 1: Mechanical crawl — Playwright only, no AI.
   * BFS through all discoverable pages via <a> links.
   */
  async mechanicalCrawl(): Promise<void> {
    this.log('Phase 1: Mechanical crawl (Playwright only, no AI cost)...')

    while (this.queue.length > 0 && this.visited.size < this.maxPages) {
      const url = this.queue.shift()
      if (!url || this.visited.has(url)) continue

      try {
        await this.browser.goto(url)
        await delay(DELAY_MS)

        // Dismiss any popups/overlays blocking the page
        const dismissed = await this.browser.dismissOverlays()
        if (dismissed > 0) await delay(500)

        const title = await this.browser.getTitle()
        const links = await this.browser.getAllLinks()
        const elements = await this.browser.getAllInteractiveElements()

        // Screenshot
        const ssPath = this.screenshotter.nextPath(title || url.split('/').pop() || 'page')
        await this.browser.screenshot(ssPath)

        // Get ARIA snapshot for later AI analysis
        const ariaTree = null // Will use element list instead

        const snapshot: PageSnapshot = {
          url,
          title,
          ariaTree,
          links,
          elements,
          screenshotPath: ssPath,
        }

        this.pages.set(url, snapshot)
        this.visited.add(url)
        this.screenshotter.track(ssPath, title || 'Unknown')

        // Detect app name from first page
        if (this.visited.size === 1) {
          this.appName = title.split(/[|–—-]/).pop()?.trim() || title.split(/\s/).slice(0, 3).join(' ') || 'Unknown App'
        }

        // Queue new links
        for (const link of links) {
          const normalized = normalizeUrl(link, this.appUrl)
          if (!this.visited.has(normalized) && !this.queuedUrls.has(normalized)) {
            this.queue.push(normalized)
            this.queuedUrls.add(normalized)
          }
        }

        this.log(`  [${this.visited.size}] ${title} — ${elements.length} elements, ${links.length} links`)
      } catch (err) {
        this.log(`  Warning: couldn't crawl "${url}": ${(err as Error).message}`)
        this.visited.add(url)
      }
    }

    this.log(`Phase 1 done: ${this.visited.size} pages, ${this.screenshotter.getCount()} screenshots`)
  }

  /**
   * Phase 2: AI-guided exploration.
   * Send all page data to Claude → get list of clicks → Playwright executes → diff.
   * Only 2 AI calls total.
   */
  async aiGuidedExploration(): Promise<void> {
    this.log('Phase 2: AI-guided exploration (2 AI calls)...')

    // Build a summary of all pages for Claude
    const pageSummary = this.buildPageSummary()

    // AI call 1: "Which elements should I click?"
    this.log('  AI call 1/2: Picking elements to explore...')
    const clickPlan = await this.claude.ask(
      `I crawled a web app and found these pages with their interactive elements:\n\n${pageSummary}\n\n` +
      `Which buttons, tabs, and interactive elements should I click to discover hidden features (modals, dropdowns, forms, sub-pages)?\n\n` +
      `Skip elements that are: navigation links (already crawled), destructive (delete/remove/reset), or obvious (close/cancel/dismiss).\n\n` +
      `Return a JSON array of actions to take:\n` +
      `[{"pageUrl": "url", "selector": "css selector", "elementName": "button label", "reason": "why click this"}]\n\n` +
      `Output ONLY the JSON array. Max 30 actions, prioritize buttons that likely open modals/forms/settings.`,
      this.claudeOptions
    )

    // Parse the click plan
    let actions: ClickAction[] = []
    try {
      const jsonStr = extractJSON(clickPlan)
      actions = JSON.parse(jsonStr) as ClickAction[]
      this.log(`  AI picked ${actions.length} elements to explore`)
    } catch {
      this.log('  Warning: could not parse AI click plan. Skipping deep exploration.')
      return
    }

    // Execute each click with Playwright (no AI needed)
    for (const action of actions) {
      try {
        // Navigate to the page if not already there
        const currentUrl = await this.browser.getUrl()
        if (normalizeUrl(currentUrl, this.appUrl) !== normalizeUrl(action.pageUrl, this.appUrl)) {
          await this.browser.goto(action.pageUrl)
          await delay(DELAY_MS)
        }

        // Get elements before click
        const elementsBefore = await this.browser.getAllInteractiveElements()
        const urlBefore = await this.browser.getUrl()

        // Click
        const { urlAfter } = await this.browser.clickAndWait(action.selector)

        // Get elements after click
        const elementsAfter = await this.browser.getAllInteractiveElements()

        // Diff
        const diff = diffElements(elementsBefore, elementsAfter, urlBefore, urlAfter)

        let screenshotPath: string | undefined
        if (diff.meaningfulChange) {
          screenshotPath = this.screenshotter.nextPath(`click-${action.elementName}`)
          await this.browser.screenshot(screenshotPath)
          this.screenshotter.track(screenshotPath, action.elementName)
        }

        this.clickResults.push({ action, diff, screenshotPath })
        this.log(`  Clicked "${action.elementName}" → ${summarizeDiff(diff)}`)

        // Close modal if one opened
        if (diff.modalOpened) {
          await this.browser.closeModal()
        }

        // Go back if navigated to a new page
        if (diff.urlChanged) {
          await this.browser.goBack()
        }
      } catch (err) {
        this.log(`  Warning: couldn't click "${action.elementName}": ${(err as Error).message}`)
      }

      await delay(500)
    }

    this.log(`Phase 2 done: ${this.clickResults.length} interactions explored`)
  }

  /**
   * Calculate coverage metrics.
   */
  calculateCoverage(): CoverageReport {
    let buttonsClicked = 0
    let modalsFound = 0
    let formsFound = 0
    let tabsExplored = 0
    let filtersExplored = 0
    let dropdownsOpened = 0

    for (const result of this.clickResults) {
      buttonsClicked++
      if (result.diff.modalOpened) modalsFound++
      if (result.diff.formAppeared) formsFound++
      if (result.diff.dropdownOpened) dropdownsOpened++
    }

    const sections = [...new Set(Array.from(this.pages.values()).map(p => p.title))]

    return {
      pagesVisited: this.pages.size,
      navItemsFound: this.queuedUrls.size,
      screenshotsTaken: this.screenshotter.getCount(),
      buttonsClicked,
      modalsFound,
      formsFound,
      tabsExplored,
      filtersExplored,
      dropdownsOpened,
      subPagesDiscovered: 0,
      sectionsFromNav: sections,
      sectionsExplored: sections,
      sectionsSkipped: [],
      passed: true,
      failures: [],
    }
  }

  /**
   * Build a feature map from all crawl data.
   * This is the input for PRD generation.
   */
  buildFeatureMap(): FeatureMap {
    const sections: AppSection[] = []

    for (const page of this.pages.values()) {
      const features: Feature[] = []

      // Features from page elements
      for (const elem of page.elements) {
        if (elem.role === 'a' || elem.tag === 'a') continue // Skip nav links
        features.push({
          name: elem.name || elem.text.slice(0, 50),
          type: elementToFeatureType(elem),
          description: `${elem.role}: ${elem.name || elem.text.slice(0, 100)}`,
          uiElements: [elem.selector],
          screenshotPaths: [],
          page: page.url,
        })
      }

      // Features from click results on this page
      for (const result of this.clickResults) {
        if (normalizeUrl(result.action.pageUrl, this.appUrl) !== normalizeUrl(page.url, this.appUrl)) continue
        features.push({
          name: result.action.elementName,
          type: result.diff.modalOpened ? 'action' : result.diff.formAppeared ? 'form' : 'other',
          description: `${result.action.reason}. Result: ${summarizeDiff(result.diff)}`,
          uiElements: [result.action.selector],
          screenshotPaths: result.screenshotPath ? [result.screenshotPath] : [],
          page: page.url,
        })
      }

      // Add page screenshot to features that don't have their own
      for (const f of features) {
        if (f.screenshotPaths.length === 0 && page.screenshotPath) {
          f.screenshotPaths = [page.screenshotPath]
        }
      }

      sections.push({
        name: page.title,
        pages: [{
          url: page.url,
          title: page.title,
          type: guessPageType(page),
          section: page.title,
          screenshotPath: page.screenshotPath,
          interactions: [],
          subPages: page.links,
        }],
        features,
      })
    }

    return {
      appName: this.appName,
      appUrl: this.appUrl,
      sections,
      totalPages: this.pages.size,
      totalFeatures: sections.reduce((sum, s) => sum + s.features.length, 0),
    }
  }

  /**
   * Build a text summary of all pages for AI analysis.
   */
  buildPageSummary(): string {
    const lines: string[] = []

    for (const page of this.pages.values()) {
      lines.push(`## Page: ${page.title}`)
      lines.push(`URL: ${page.url}`)
      lines.push(`Screenshot: ${page.screenshotPath}`)
      lines.push(`Interactive elements (${page.elements.length}):`)

      // Group by type for readability
      const buttons = page.elements.filter(e => e.role === 'button' || e.tag === 'button')
      const inputs = page.elements.filter(e => e.tag === 'input' || e.tag === 'textarea' || e.tag === 'select')
      const tabs = page.elements.filter(e => e.role === 'tab')
      const other = page.elements.filter(e =>
        !['button', 'a'].includes(e.tag) &&
        !['button', 'tab', 'link'].includes(e.role) &&
        !['input', 'textarea', 'select'].includes(e.tag)
      )

      if (buttons.length > 0) {
        lines.push(`  Buttons (${buttons.length}):`)
        for (const b of buttons.slice(0, 20)) {
          lines.push(`    - "${b.name}" [${b.selector}]`)
        }
        if (buttons.length > 20) lines.push(`    ... and ${buttons.length - 20} more`)
      }

      if (tabs.length > 0) {
        lines.push(`  Tabs (${tabs.length}):`)
        for (const t of tabs) {
          lines.push(`    - "${t.name}" [${t.selector}]`)
        }
      }

      if (inputs.length > 0) {
        lines.push(`  Form fields (${inputs.length}):`)
        for (const f of inputs.slice(0, 15)) {
          lines.push(`    - ${f.type ?? f.tag}: "${f.name}" [${f.selector}]`)
        }
      }

      if (other.length > 0) {
        lines.push(`  Other interactive (${other.length}):`)
        for (const o of other.slice(0, 10)) {
          lines.push(`    - ${o.role}: "${o.name}" [${o.selector}]`)
        }
      }

      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Get the sitemap for display.
   */
  getSitemap(): string {
    const lines: string[] = [`Sitemap: ${this.appName} (${this.pages.size} pages)`]
    for (const page of this.pages.values()) {
      lines.push(`  - ${page.title} — ${page.url}`)
    }
    return lines.join('\n')
  }

  getAppName(): string { return this.appName }
}

// -- Pure functions --

export function normalizeUrl(url: string, baseUrl: string): string {
  try {
    const base = new URL(baseUrl)
    const resolved = new URL(url, base)
    if (resolved.origin !== base.origin) return url
    const path = resolved.pathname.replace(/\/+$/, '') || '/'
    return `${resolved.origin}${path}`
  } catch {
    return url
  }
}

export function isDestructive(name: string): boolean {
  const lower = name.toLowerCase()
  const words = ['delete', 'remove', 'reset', 'destroy', 'drop', 'purge', 'erase', 'wipe']
  return words.some(w => lower.includes(w))
}

export function extractJSON(text: string): string {
  // Code blocks
  const codeBlock = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlock) {
    const content = codeBlock[1].trim()
    if (content.startsWith('[') || content.startsWith('{')) return content
  }

  // Find array or object
  const startChar = text.indexOf('[') < text.indexOf('{') && text.indexOf('[') !== -1
    ? '[' : '{'
  const endChar = startChar === '[' ? ']' : '}'
  const start = text.indexOf(startChar)
  if (start === -1) return text

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escaped) { escaped = false; continue }
    if (c === '\\' && inString) { escaped = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === startChar) depth++
    if (c === endChar) { depth--; if (depth === 0) return text.slice(start, i + 1) }
  }
  return text
}

function elementToFeatureType(e: ElementInfo): Feature['type'] {
  if (e.tag === 'input' || e.tag === 'textarea' || e.tag === 'select') return 'form'
  if (e.role === 'button' || e.tag === 'button') return 'action'
  if (e.role === 'tab') return 'navigation'
  if (e.role === 'checkbox' || e.role === 'switch') return 'action'
  return 'other'
}

function guessPageType(page: PageSnapshot): 'dashboard' | 'list' | 'detail' | 'form' | 'settings' | 'other' {
  const url = page.url.toLowerCase()
  const title = page.title.toLowerCase()
  if (url.includes('dashboard') || url === '/' || url.endsWith('.com')) return 'dashboard'
  if (url.includes('setting')) return 'settings'
  if (url.includes('create') || url.includes('new') || url.includes('edit')) return 'form'
  if (title.includes('list') || page.elements.filter(e => e.tag === 'tr' || e.role === 'row').length > 3) return 'list'
  return 'other'
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
