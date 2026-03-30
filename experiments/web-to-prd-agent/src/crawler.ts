import type { ClaudeOptions } from './types.js'
import type { CrawlState, PageInfo, Interaction, CoverageReport, FeatureMap, Feature, AppSection } from './types.js'
import { ClaudeCLI } from './claude-cli.js'
import { Screenshotter } from './screenshotter.js'

const DELAY_MS = 1500

export class Crawler {
  private claude: ClaudeCLI
  private screenshotter: Screenshotter
  private state: CrawlState
  private claudeOptions: ClaudeOptions
  private maxPages: number
  private log: (msg: string) => void
  private queuedUrls: Set<string>

  constructor(options: {
    claude: ClaudeCLI
    screenshotter: Screenshotter
    appUrl: string
    sessionId: string
    claudeOptions: ClaudeOptions
    maxPages?: number
    log?: (msg: string) => void
  }) {
    this.claude = options.claude
    this.screenshotter = options.screenshotter
    this.maxPages = options.maxPages ?? 100
    this.log = options.log ?? console.log
    this.claudeOptions = options.claudeOptions
    this.queuedUrls = new Set([options.appUrl])

    this.state = {
      sessionId: options.sessionId,
      appName: '',
      appUrl: options.appUrl,
      pages: new Map(),
      queue: [options.appUrl],
      visited: new Set(),
      currentPass: 1,
      screenshots: [],
      startedAt: Date.now(),
      lastActivity: Date.now(),
    }
  }

  /**
   * Pass 1: Map all pages breadth-first.
   * Visit every nav link, take screenshots, build sitemap.
   */
  async pass1(): Promise<void> {
    this.state.currentPass = 1
    this.log('Pass 1: Mapping all pages (breadth-first)...')

    // First, navigate to the starting URL and detect app name
    const initial = await this.askClaude(
      `Navigate to ${this.state.appUrl}. Take a screenshot. ` +
      `Then read the full page and return JSON with: ` +
      `{"appName": "detected app name", "title": "page title", "navItems": ["list every navigation link you see - sidebar, top nav, footer"], "currentUrl": "current URL"}`
    )

    try {
      const parsed = JSON.parse(extractJSON(initial))
      this.state.appName = parsed.appName ?? 'Unknown App'

      const page = this.createPage(this.state.appUrl, parsed.title ?? 'Home', 'dashboard', 'Home')
      this.state.pages.set(this.state.appUrl, page)
      this.state.visited.add(this.state.appUrl)

      // Add discovered nav items to queue
      if (Array.isArray(parsed.navItems)) {
        for (const navItem of parsed.navItems) {
          this.addToQueue(navItem)
        }
      }
    } catch {
      this.state.appName = 'Unknown App'
      this.state.visited.add(this.state.appUrl)
    }

    // Process queue
    while (this.state.queue.length > 0 && this.state.visited.size < this.maxPages) {
      const url = this.state.queue.shift()
      if (!url || this.state.visited.has(url)) continue

      await this.delay()

      try {
        // Generate screenshot path before navigating so we can tell Claude where to save
        const ssPath = this.screenshotter.nextPath(url.split('/').pop() ?? 'page')

        const result = await this.askClaude(
          `Navigate to "${url}". Take a screenshot and save it to "${ssPath}". ` +
          `Read the page and return JSON: ` +
          `{"title": "page title", "type": "list|detail|form|settings|dashboard|other", ` +
          `"section": "which nav section this belongs to", ` +
          `"subNavItems": ["any sub-navigation links on this page"], ` +
          `"interactiveElements": ["buttons, tabs, forms, filters visible on page"]}`
        )

        const parsed = JSON.parse(extractJSON(result))
        const page = this.createPage(url, parsed.title, parsed.type ?? 'other', parsed.section ?? 'Other')
        this.state.pages.set(url, page)
        this.state.visited.add(url)

        page.screenshotPath = ssPath
        this.state.screenshots.push(ssPath)

        // Queue sub-nav items
        if (Array.isArray(parsed.subNavItems)) {
          for (const sub of parsed.subNavItems) {
            this.addToQueue(sub)
          }
        }

        this.state.lastActivity = Date.now()

        if (this.state.visited.size % 10 === 0) {
          this.log(`  Progress: ${this.state.visited.size} pages mapped...`)
        }
      } catch (err) {
        this.log(`  Warning: couldn't map "${url}": ${(err as Error).message}`)
        this.state.visited.add(url) // Mark as visited so we don't retry
      }
    }

    this.log(`Pass 1 done: ${this.state.visited.size} pages mapped.`)
  }

  /**
   * Pass 2: Deep exploration of each page.
   * Click every interactive element, explore modals, tabs, forms.
   */
  async pass2(): Promise<void> {
    this.state.currentPass = 2
    this.log('Pass 2: Deep exploration (trying every feature)...')

    const pages = Array.from(this.state.pages.values())

    for (const page of pages) {
      await this.delay()

      try {
        // Navigate to the page
        const result = await this.askClaude(
          `Navigate to "${page.url}". ` +
          `List ALL interactive elements on this page. For each element return: ` +
          `{"elements": [{"name": "element name/label", "type": "button|tab|link|dropdown|modal|form|filter|accordion|other", "description": "what it likely does"}]}`
        )

        const parsed = JSON.parse(extractJSON(result))
        const elements = parsed.elements ?? []

        // Try each element
        for (const elem of elements) {
          if (isDestructive(elem.name)) {
            page.interactions.push({
              element: elem.name,
              type: elem.type ?? 'other',
              description: `Skipped — destructive action: ${elem.name}`,
            })
            continue
          }

          await this.delay()

          try {
            // Generate screenshot path before clicking
            const ssPath = this.screenshotter.nextPath(`${page.title}-${elem.name}`)

            const clickResult = await this.askClaude(
              `On the current page, click "${elem.name}". Take a screenshot and save it to "${ssPath}". ` +
              `Describe what happened. Return JSON: ` +
              `{"result": "what happened after clicking", "openedModal": true/false, ` +
              `"newPage": true/false, "formFields": ["list of form field labels if a form appeared"], ` +
              `"description": "what this feature does"}`
            )

            const clickParsed = JSON.parse(extractJSON(clickResult))

            const interaction: Interaction = {
              element: elem.name,
              type: elem.type ?? 'other',
              description: clickParsed.description ?? clickParsed.result ?? '',
              result: clickParsed.result,
              screenshotPath: ssPath,
            }

            this.state.screenshots.push(ssPath)
            this.screenshotter.track(ssPath, page.section)

            page.interactions.push(interaction)

            // If modal opened, explore it then close
            if (clickParsed.openedModal) {
              await this.exploreModal(page, elem.name)
            }

            // Navigate back if we ended up on a new page
            if (clickParsed.newPage) {
              await this.askClaude(`Navigate back to "${page.url}".`)
            }
          } catch {
            page.interactions.push({
              element: elem.name,
              type: elem.type ?? 'other',
              description: `Failed to interact with ${elem.name}`,
            })
          }
        }

        this.state.lastActivity = Date.now()
        this.log(`  Explored: ${page.title} (${page.interactions.length} interactions)`)
      } catch (err) {
        this.log(`  Warning: couldn't explore "${page.title}": ${(err as Error).message}`)
      }
    }

    this.log(`Pass 2 done: explored ${pages.length} pages.`)
  }

  /**
   * Explore a modal that opened after clicking something.
   */
  private async exploreModal(page: PageInfo, triggerElement: string): Promise<void> {
    try {
      const ssPath = this.screenshotter.nextPath(`modal-${triggerElement}`)

      const result = await this.askClaude(
        `A modal/dialog opened after clicking "${triggerElement}". ` +
        `Take a screenshot and save it to "${ssPath}". Describe everything in the modal: ` +
        `{"title": "modal title", "formFields": ["field labels"], ` +
        `"buttons": ["button labels"], "description": "what this modal is for"}`
      )

      const parsed = JSON.parse(extractJSON(result))
      this.state.screenshots.push(ssPath)
      this.screenshotter.track(ssPath, page.section)

      page.interactions.push({
        element: `Modal: ${parsed.title ?? triggerElement}`,
        type: 'modal',
        description: parsed.description ?? 'Modal dialog',
        screenshotPath: ssPath,
      })

      // Close the modal
      await this.askClaude('Close this modal/dialog by clicking the X button, Cancel, or pressing Escape.')
    } catch {
      // Modal exploration failed — not critical
    }
  }

  /**
   * Calculate coverage metrics.
   */
  calculateCoverage(): CoverageReport {
    const pages = Array.from(this.state.pages.values())
    const sections = new Set<string>()
    const exploredSections = new Set<string>()
    let buttonsClicked = 0
    let modalsFound = 0
    let formsFound = 0
    let tabsExplored = 0
    let filtersExplored = 0
    let dropdownsOpened = 0
    let subPagesDiscovered = 0

    for (const page of pages) {
      sections.add(page.section)
      if (page.interactions.length > 0) {
        exploredSections.add(page.section)
      }

      for (const interaction of page.interactions) {
        switch (interaction.type) {
          case 'button': buttonsClicked++; break
          case 'modal': modalsFound++; break
          case 'form': formsFound++; break
          case 'tab': tabsExplored++; break
          case 'filter': filtersExplored++; break
          case 'dropdown': dropdownsOpened++; break
          case 'link': subPagesDiscovered++; break
        }
      }
    }

    const sectionsFromNav = Array.from(sections)
    const sectionsExploredArr = Array.from(exploredSections)
    const sectionsSkipped = sectionsFromNav.filter(s => !exploredSections.has(s))

    const failures: string[] = []
    if (sectionsSkipped.length > 0) {
      failures.push(`Sections not explored: ${sectionsSkipped.join(', ')}`)
    }
    if (this.state.screenshots.length < pages.length) {
      failures.push(`Fewer screenshots (${this.state.screenshots.length}) than pages (${pages.length})`)
    }

    return {
      pagesVisited: pages.length,
      navItemsFound: sectionsFromNav.length,
      screenshotsTaken: this.state.screenshots.length,
      buttonsClicked,
      modalsFound,
      formsFound,
      tabsExplored,
      filtersExplored,
      dropdownsOpened,
      subPagesDiscovered,
      sectionsFromNav,
      sectionsExplored: sectionsExploredArr,
      sectionsSkipped,
      passed: failures.length === 0,
      failures,
    }
  }

  /**
   * Build a structured feature map from the crawl data.
   */
  buildFeatureMap(): FeatureMap {
    const sectionMap = new Map<string, AppSection>()

    for (const page of this.state.pages.values()) {
      if (!sectionMap.has(page.section)) {
        sectionMap.set(page.section, {
          name: page.section,
          pages: [],
          features: [],
        })
      }

      const section = sectionMap.get(page.section)!
      section.pages.push(page)

      // Convert interactions to features
      for (const interaction of page.interactions) {
        const feature: Feature = {
          name: interaction.element,
          type: interactionTypeToFeatureType(interaction.type),
          description: interaction.description,
          uiElements: [interaction.element],
          screenshotPaths: interaction.screenshotPath ? [interaction.screenshotPath] : [],
          page: page.url,
        }
        section.features.push(feature)
      }
    }

    const sections = Array.from(sectionMap.values())
    const totalFeatures = sections.reduce((sum, s) => sum + s.features.length, 0)

    return {
      appName: this.state.appName,
      appUrl: this.state.appUrl,
      sections,
      totalPages: this.state.pages.size,
      totalFeatures,
    }
  }

  /**
   * Get current crawl state (for resume support).
   */
  getState(): CrawlState {
    return this.state
  }

  /**
   * Get a summary of the sitemap for display.
   */
  getSitemap(): string {
    const sectionPages = new Map<string, PageInfo[]>()

    for (const page of this.state.pages.values()) {
      const existing = sectionPages.get(page.section) ?? []
      existing.push(page)
      sectionPages.set(page.section, existing)
    }

    const lines: string[] = [`Sitemap: ${this.state.appName} (${this.state.pages.size} pages)`]

    for (const [section, pages] of sectionPages) {
      lines.push(`  ${section}:`)
      for (const page of pages) {
        lines.push(`    - ${page.title} (${page.type}) — ${page.url}`)
      }
    }

    return lines.join('\n')
  }

  private createPage(url: string, title: string, type: string, section: string): PageInfo {
    return {
      url,
      title: title ?? url,
      type: (type as PageInfo['type']) ?? 'other',
      section: section ?? 'Other',
      interactions: [],
      subPages: [],
    }
  }

  private addToQueue(urlOrLabel: string): void {
    // Try to extract a URL from the string (handles labels like "Home (→ /)" or "Settings → /settings")
    let url = urlOrLabel
    const pathMatch = urlOrLabel.match(/→\s*(\/[^\s)]*)/)?.[1]
    if (pathMatch) {
      url = pathMatch
    }

    if (url.startsWith('http') || url.startsWith('/')) {
      const normalized = normalizeUrl(url, this.state.appUrl)
      if (!this.state.visited.has(normalized) && !this.queuedUrls.has(normalized)) {
        this.state.queue.push(normalized)
        this.queuedUrls.add(normalized)
      }
    } else {
      this.log(`  Skipping non-URL nav item: "${urlOrLabel}"`)
    }
  }

  private async askClaude(prompt: string): Promise<string> {
    const isFollowUp = this.state.visited.size > 0
    return this.claude.ask(prompt, {
      ...this.claudeOptions,
      sessionId: this.state.sessionId,
      continue: isFollowUp,
      resume: isFollowUp,
    })
  }

  private delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, DELAY_MS))
  }
}

// -- Pure functions (exported for testing) --

/**
 * Normalize a URL relative to the app's base URL.
 */
export function normalizeUrl(url: string, baseUrl: string): string {
  try {
    const base = new URL(baseUrl)
    const resolved = new URL(url, base)
    // Only keep same-origin URLs
    if (resolved.origin !== base.origin) {
      return url // External — return as-is, will be filtered later
    }
    // Strip trailing slash for consistency
    let path = resolved.pathname.replace(/\/+$/, '') || '/'
    return `${resolved.origin}${path}`
  } catch {
    return url
  }
}

/**
 * Check if an element name suggests a destructive action.
 */
export function isDestructive(name: string): boolean {
  const lower = name.toLowerCase()
  const destructiveWords = ['delete', 'remove', 'reset', 'destroy', 'drop', 'purge', 'erase', 'wipe']
  return destructiveWords.some(word => lower.includes(word))
}

/**
 * Extract JSON from a string that might have non-JSON text around it.
 */
export function extractJSON(text: string): string {
  // Try to find a JSON object in the text
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1)
  }
  return text
}

function interactionTypeToFeatureType(type: Interaction['type']): Feature['type'] {
  switch (type) {
    case 'form': return 'form'
    case 'filter': return 'filter'
    case 'button': return 'action'
    case 'tab':
    case 'link':
    case 'accordion':
      return 'navigation'
    default:
      return 'other'
  }
}
