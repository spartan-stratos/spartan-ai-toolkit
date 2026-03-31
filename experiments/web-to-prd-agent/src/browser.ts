import { chromium, type Browser as PwBrowser, type Page, type BrowserContext } from 'playwright'
import type { AriaNode, ElementInfo } from './types.js'

const NAVIGATION_TIMEOUT = 30000
const CLICK_TIMEOUT = 5000

export class Browser {
  private browser: PwBrowser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private log: (msg: string) => void

  constructor(options?: { log?: (msg: string) => void }) {
    this.log = options?.log ?? console.log
  }

  async launch(userDataDir?: string): Promise<void> {
    this.browser = await chromium.launch({ headless: false })
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    this.page = await this.context.newPage()
    this.page.setDefaultTimeout(NAVIGATION_TIMEOUT)
  }

  async goto(url: string): Promise<void> {
    const page = this.getPage()
    await page.goto(url, { waitUntil: 'networkidle', timeout: NAVIGATION_TIMEOUT })
  }

  async screenshot(path: string): Promise<void> {
    const page = this.getPage()
    await page.screenshot({ path, fullPage: true })
  }

  async getUrl(): Promise<string> {
    return this.getPage().url()
  }

  async getTitle(): Promise<string> {
    return this.getPage().title()
  }

  /**
   * Get the accessibility tree of the current page as a YAML string.
   * Uses Playwright's ariaSnapshot() which returns a structured YAML representation.
   */
  async getAriaSnapshot(): Promise<string> {
    const page = this.getPage()
    try {
      return await page.locator('body').ariaSnapshot()
    } catch {
      return ''
    }
  }

  /**
   * Get all links on the current page.
   * Returns deduplicated absolute URLs.
   */
  async getAllLinks(): Promise<string[]> {
    const page = this.getPage()
    const baseUrl = page.url()

    const hrefs = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a[href]')
      return Array.from(anchors).map(a => (a as HTMLAnchorElement).href)
    })

    // Deduplicate and filter same-origin
    const base = new URL(baseUrl)
    const seen = new Set<string>()
    const result: string[] = []

    for (const href of hrefs) {
      try {
        const url = new URL(href, baseUrl)
        if (url.origin !== base.origin) continue
        // Normalize: strip trailing slash, strip hash
        const normalized = url.origin + (url.pathname.replace(/\/+$/, '') || '/')
        if (seen.has(normalized)) continue
        seen.add(normalized)
        result.push(normalized)
      } catch {
        continue
      }
    }

    return result
  }

  /**
   * Get all interactive elements on the current page.
   */
  async getAllInteractiveElements(): Promise<ElementInfo[]> {
    const page = this.getPage()

    return page.evaluate(() => {
      const selectors = [
        'button',
        'a',
        'input',
        'textarea',
        'select',
        '[role="button"]',
        '[role="tab"]',
        '[role="menuitem"]',
        '[role="link"]',
        '[role="checkbox"]',
        '[role="switch"]',
        '[role="combobox"]',
        '[role="option"]',
        '[role="slider"]',
      ]

      const elements: ElementInfo[] = []
      const seen = new Set<Element>()

      for (const sel of selectors) {
        for (const el of document.querySelectorAll(sel)) {
          if (seen.has(el)) continue
          seen.add(el)

          const rect = el.getBoundingClientRect()
          const isVisible = rect.width > 0 && rect.height > 0 &&
            window.getComputedStyle(el).visibility !== 'hidden' &&
            window.getComputedStyle(el).display !== 'none'

          if (!isVisible) continue

          const role = el.getAttribute('role') ?? el.tagName.toLowerCase()
          const name = el.getAttribute('aria-label') ??
            el.getAttribute('title') ??
            el.getAttribute('placeholder') ??
            (el.textContent ?? '').trim().slice(0, 100)

          elements.push({
            selector: buildSelector(el),
            role,
            name,
            text: (el.textContent ?? '').trim().slice(0, 200),
            tag: el.tagName.toLowerCase(),
            type: (el as HTMLInputElement).type ?? undefined,
            href: (el as HTMLAnchorElement).href ?? undefined,
            isVisible: true,
          })
        }
      }

      return elements

      function buildSelector(el: Element): string {
        // Try ID first
        if (el.id) return `#${el.id}`

        // Try unique aria-label
        const label = el.getAttribute('aria-label')
        if (label) {
          const role = el.getAttribute('role') ?? el.tagName.toLowerCase()
          return `${role}[aria-label="${label}"]`
        }

        // Try data-testid
        const testId = el.getAttribute('data-testid')
        if (testId) return `[data-testid="${testId}"]`

        // Fall back to tag + text
        const text = (el.textContent ?? '').trim().slice(0, 50)
        if (text) {
          return `${el.tagName.toLowerCase()}:has-text("${text}")`
        }

        // Last resort: nth-child path
        const tag = el.tagName.toLowerCase()
        const parent = el.parentElement
        if (parent) {
          const index = Array.from(parent.children).indexOf(el)
          return `${buildSelector(parent)} > ${tag}:nth-child(${index + 1})`
        }
        return tag
      }
    }) as Promise<ElementInfo[]>
  }

  /**
   * Click an element and wait for any resulting changes.
   * Returns the URL after clicking (for detecting navigation).
   */
  async clickAndWait(selector: string): Promise<{ urlAfter: string }> {
    const page = this.getPage()

    try {
      await page.click(selector, { timeout: CLICK_TIMEOUT })
    } catch {
      // Try text-based fallback for :has-text selectors
      if (selector.includes(':has-text(')) {
        const text = selector.match(/:has-text\("(.+?)"\)/)?.[1]
        if (text) {
          await page.getByText(text, { exact: false }).first().click({ timeout: CLICK_TIMEOUT })
        } else {
          throw new Error(`Could not click: ${selector}`)
        }
      } else {
        throw new Error(`Could not click: ${selector}`)
      }
    }

    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    // Small delay for animations
    await page.waitForTimeout(500)

    return { urlAfter: page.url() }
  }

  /**
   * Check if a dialog/modal is currently visible.
   */
  async hasVisibleModal(): Promise<boolean> {
    const page = this.getPage()
    const dialog = page.locator('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')
    return dialog.first().isVisible().catch(() => false)
  }

  /**
   * Close any visible modal by pressing Escape.
   */
  async closeModal(): Promise<void> {
    const page = this.getPage()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }

  /**
   * Go back in browser history.
   */
  async goBack(): Promise<void> {
    const page = this.getPage()
    await page.goBack({ waitUntil: 'networkidle', timeout: NAVIGATION_TIMEOUT }).catch(() => {})
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.context = null
      this.page = null
    }
  }

  private getPage(): Page {
    if (!this.page) throw new Error('Browser not launched. Call launch() first.')
    return this.page
  }
}

function convertAriaNode(node: any): AriaNode {
  return {
    role: node.role ?? '',
    name: node.name ?? '',
    children: node.children?.map(convertAriaNode),
    value: node.value,
    checked: node.checked,
    disabled: node.disabled,
    expanded: node.expanded,
    level: node.level,
    pressed: node.pressed,
    selected: node.selected,
  }
}
