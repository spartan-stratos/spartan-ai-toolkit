import { ClaudeCLI } from './claude-cli.js'
import type { ClaudeOptions, PRDDocument, NotionExportResult } from './types.js'

const NOTION_MCP_TOOLS = 'mcp__claude_ai_Notion__*'

export class NotionExporter {
  private claude: ClaudeCLI
  private claudeOptions: ClaudeOptions
  private log: (msg: string) => void

  constructor(options: {
    claude: ClaudeCLI
    claudeOptions: ClaudeOptions
    log?: (msg: string) => void
  }) {
    this.claude = options.claude
    this.claudeOptions = options.claudeOptions
    this.log = options.log ?? console.log
  }

  /**
   * Export the PRD to Notion.
   * Creates a parent page and one sub-page per epic.
   */
  async export(prd: PRDDocument, parentPageName?: string): Promise<NotionExportResult> {
    const result: NotionExportResult = {
      parentPageUrl: '',
      epicPageUrls: new Map(),
      screenshotsUploaded: 0,
      errors: [],
    }

    const pageName = parentPageName ?? `${prd.appName} — PRD`
    this.log(`Exporting to Notion: "${pageName}"...`)

    // Create parent page with overview sections
    try {
      const overviewContent = buildOverviewContent(prd)

      const parentResponse = await this.claude.ask(
        `Create a new Notion page titled "${pageName}". ` +
        `Add this content to the page:\n\n${overviewContent}\n\n` +
        `After creating the page, return the page URL.`,
        {
          ...this.claudeOptions,
          allowedTools: NOTION_MCP_TOOLS,
        }
      )

      // Try to extract URL from response
      const urlMatch = parentResponse.match(/https:\/\/www\.notion\.so\/[^\s)]+/)
      result.parentPageUrl = urlMatch ? urlMatch[0] : 'Page created (URL not captured)'

      this.log(`  Parent page created: ${result.parentPageUrl}`)
    } catch (err) {
      const msg = `Failed to create parent page: ${(err as Error).message}`
      result.errors.push(msg)
      this.log(`  Error: ${msg}`)
      return result
    }

    // Create one sub-page per epic
    for (const epic of prd.epics) {
      try {
        const epicContent = buildEpicContent(epic)

        const epicResponse = await this.claude.ask(
          `Under the Notion page "${pageName}", create a sub-page titled ` +
          `"Epic ${epic.number}: ${epic.name} — P${epic.phase} — ${epic.complexity}". ` +
          `Add this content:\n\n${epicContent}\n\n` +
          `Return the page URL.`,
          {
            ...this.claudeOptions,
            allowedTools: NOTION_MCP_TOOLS,
          }
        )

        const urlMatch = epicResponse.match(/https:\/\/www\.notion\.so\/[^\s)]+/)
        const url = urlMatch ? urlMatch[0] : 'Created (URL not captured)'
        result.epicPageUrls.set(epic.name, url)

        this.log(`  Epic ${epic.number}: ${epic.name} — done`)
      } catch (err) {
        const msg = `Failed to create Epic ${epic.number} page: ${(err as Error).message}`
        result.errors.push(msg)
        this.log(`  Error: ${msg}`)
      }
    }

    this.log(`Notion export done. ${result.epicPageUrls.size}/${prd.epics.length} epics created.`)
    return result
  }
}

/**
 * Build the overview content for the parent Notion page.
 * Includes sections 1-3 and 5-8 (epics are separate sub-pages).
 */
function buildOverviewContent(prd: PRDDocument): string {
  const lines: string[] = []

  lines.push(`## TL;DR`)
  lines.push(prd.tldr)
  lines.push('')

  lines.push(`## Goals`)
  lines.push('**Business:** ' + prd.goals.business.join(', '))
  lines.push('**User:** ' + prd.goals.user.join(', '))
  lines.push('**Non-Goals:** ' + prd.goals.nonGoals.join(', '))
  lines.push('')

  lines.push(`## User Stories`)
  for (const s of prd.userStories) lines.push(`- ${s}`)
  lines.push('')

  lines.push(`## Epics Overview`)
  lines.push('| # | Name | Phase | Complexity | Dependencies |')
  lines.push('|---|------|-------|------------|-------------|')
  for (const epic of prd.epics) {
    lines.push(`| ${epic.number} | ${epic.name} | ${epic.phase} | ${epic.complexity} | ${epic.dependencies?.join(', ') || 'none'} |`)
  }
  lines.push('')

  lines.push(`## User Flows`)
  for (const flow of prd.userFlows) {
    lines.push(`### ${flow.name}`)
    for (let i = 0; i < flow.steps.length; i++) {
      lines.push(`${i + 1}. ${flow.steps[i]}`)
    }
    lines.push('')
  }

  lines.push(`## Narrative`)
  lines.push(prd.narrative)
  lines.push('')

  lines.push(`## Build Roadmap`)
  for (const phase of prd.buildRoadmap) {
    lines.push(`**Phase ${phase.phase}: ${phase.name}** — ${phase.epics.join(', ')}`)
  }
  lines.push('')

  lines.push(`## Open Questions`)
  for (const q of prd.openQuestions) lines.push(`- ${q}`)

  return lines.join('\n')
}

/**
 * Build the full content for an epic's Notion sub-page.
 */
function buildEpicContent(epic: PRDDocument['epics'][0]): string {
  const lines: string[] = []

  lines.push(`## TL;DR`)
  lines.push(epic.tldr)
  lines.push('')

  lines.push(`## Goals`)
  lines.push('**Business:** ' + epic.goals.business.join(', '))
  lines.push('**User:** ' + epic.goals.user.join(', '))
  lines.push('**Non-Goals:** ' + epic.goals.nonGoals.join(', '))
  lines.push('')

  lines.push(`## User Stories`)
  for (const s of epic.userStories) lines.push(`- ${s}`)
  lines.push('')

  lines.push(`## Functional Requirements`)
  for (const req of epic.functionalRequirements) {
    lines.push(`### ${req.name} (${req.priority})`)
    for (const d of req.details) lines.push(`- ${d}`)
    lines.push('')
  }

  lines.push(`## User Experience`)
  lines.push(`**Entry Point:** ${epic.userExperience.entryPoint}`)
  lines.push('')
  lines.push('**Flow:**')
  for (let i = 0; i < epic.userExperience.flow.length; i++) {
    lines.push(`${i + 1}. ${epic.userExperience.flow[i]}`)
  }
  lines.push('')
  lines.push('**Edge Cases:**')
  for (const e of epic.userExperience.edgeCases) lines.push(`- ${e}`)
  lines.push('')
  lines.push('**Design Notes:**')
  for (const d of epic.userExperience.designNotes) lines.push(`- ${d}`)
  lines.push('')

  lines.push(`## Narrative`)
  lines.push(epic.narrative)

  return lines.join('\n')
}
