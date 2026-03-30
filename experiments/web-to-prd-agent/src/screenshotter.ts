import { mkdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

export class Screenshotter {
  private outputDir: string
  private counter: number
  private screenshots: Map<string, string[]>

  constructor(outputDir: string) {
    this.outputDir = join(outputDir, 'screenshots')
    this.counter = 0
    this.screenshots = new Map()

    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true })
    }
  }

  /**
   * Generate the next screenshot path with a descriptive name.
   * Doesn't save the file — that's done by Playwright MCP.
   * Returns the path where the screenshot should be saved.
   */
  nextPath(name: string): string {
    this.counter++
    const num = String(this.counter).padStart(2, '0')
    const slug = slugify(name)
    const filename = `${num}-${slug}.png`
    return join(this.outputDir, filename)
  }

  /**
   * Register a screenshot as belonging to a specific epic or section.
   */
  track(screenshotPath: string, epic: string): void {
    const existing = this.screenshots.get(epic) ?? []
    existing.push(screenshotPath)
    this.screenshots.set(epic, existing)
  }

  /**
   * Get all screenshot paths for a given epic.
   */
  getForEpic(epic: string): string[] {
    return this.screenshots.get(epic) ?? []
  }

  /**
   * Get all screenshot paths across all epics.
   */
  getAll(): string[] {
    const all: string[] = []
    for (const paths of this.screenshots.values()) {
      all.push(...paths)
    }
    return all
  }

  /**
   * Get count of all tracked screenshots.
   */
  getCount(): number {
    let count = 0
    for (const paths of this.screenshots.values()) {
      count += paths.length
    }
    return count
  }

  /**
   * Get the relative path from the output dir root for PRD references.
   * Turns "/abs/path/output/screenshots/01-home.png" into "screenshots/01-home.png"
   */
  relativePath(absolutePath: string): string {
    const filename = basename(absolutePath)
    return `screenshots/${filename}`
  }

  /**
   * Get the output directory path.
   */
  getOutputDir(): string {
    return this.outputDir
  }
}

/**
 * Convert a name to a filename-safe slug.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export { slugify }
