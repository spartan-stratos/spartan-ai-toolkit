import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ClaudeCLI } from './claude-cli.js'
import type { ClaudeOptions, FeatureMap, PRDDocument, PRDEpic } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const SCHEMA_PATH = join(__dirname, '..', 'templates', 'prd-schema.json')

const MAX_RETRIES = 3

export class PRDGenerator {
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
   * Generate a full PRD from a feature map.
   */
  async generate(featureMap: FeatureMap): Promise<PRDDocument> {
    this.log('Generating PRD...')

    const schema = readFileSync(SCHEMA_PATH, 'utf-8')
    const featureData = JSON.stringify(featureMap, null, 2)

    const prompt = buildPRDPrompt(featureMap, featureData)

    let lastError: string | null = null
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const retryNote = lastError
          ? `\n\nPREVIOUS ATTEMPT FAILED VALIDATION: ${lastError}\nFix the issues and generate again.`
          : ''

        const prd = await this.claude.askStructured<PRDDocument>(
          prompt + retryNote,
          schema,
          this.claudeOptions
        )

        const validation = validatePRD(prd)
        if (validation.valid) {
          this.log(`PRD generated: ${prd.epics.length} epics`)
          return prd
        }

        lastError = validation.errors.join('; ')
        this.log(`  Attempt ${attempt}/${MAX_RETRIES}: validation failed — ${lastError}`)
      } catch (err) {
        lastError = (err as Error).message
        this.log(`  Attempt ${attempt}/${MAX_RETRIES}: generation failed — ${lastError}`)
      }
    }

    throw new Error(`PRD generation failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`)
  }

  /**
   * Save the PRD as a markdown file.
   */
  savePRD(prd: PRDDocument, outputDir: string): string {
    const markdown = prdToMarkdown(prd)
    const slug = prd.appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const filePath = join(outputDir, `prd-${slug}.md`)

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    writeFileSync(filePath, markdown, 'utf-8')
    this.log(`PRD saved to ${filePath}`)
    return filePath
  }

  /**
   * Save the feature map as JSON.
   */
  saveFeatureMap(featureMap: FeatureMap, outputDir: string): string {
    const filePath = join(outputDir, 'features.json')

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    writeFileSync(filePath, JSON.stringify(featureMap, null, 2), 'utf-8')
    return filePath
  }
}

// -- Validation --

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validatePRD(prd: PRDDocument): ValidationResult {
  const errors: string[] = []

  // Top-level sections
  if (!prd.tldr) errors.push('Missing TL;DR')
  if (!prd.goals) errors.push('Missing Goals')
  if (!prd.userStories || prd.userStories.length === 0) errors.push('Missing User Stories')
  if (!prd.epics || prd.epics.length === 0) errors.push('Missing Epics')
  if (!prd.userFlows || prd.userFlows.length === 0) errors.push('Missing User Flows')
  if (!prd.narrative) errors.push('Missing Narrative')
  if (!prd.buildRoadmap || prd.buildRoadmap.length === 0) errors.push('Missing Build Roadmap')

  // Epic validation
  if (prd.epics) {
    for (const epic of prd.epics) {
      const epicErrors = validateEpic(epic)
      errors.push(...epicErrors)
    }
  }

  return { valid: errors.length === 0, errors }
}

export function validateEpic(epic: PRDEpic): string[] {
  const errors: string[] = []
  const prefix = `Epic ${epic.number} (${epic.name})`

  if (!epic.tldr) errors.push(`${prefix}: missing TL;DR`)
  if (!epic.goals) errors.push(`${prefix}: missing Goals`)
  if (!epic.userStories || epic.userStories.length === 0) errors.push(`${prefix}: missing User Stories`)
  if (!epic.functionalRequirements || epic.functionalRequirements.length === 0) {
    errors.push(`${prefix}: missing Functional Requirements`)
  }
  if (!epic.userExperience) errors.push(`${prefix}: missing User Experience`)
  if (!epic.narrative) errors.push(`${prefix}: missing Narrative`)

  return errors
}

// -- Markdown generation --

export function prdToMarkdown(prd: PRDDocument): string {
  const lines: string[] = []

  lines.push(`# PRD: ${prd.appName}`)
  lines.push('')
  lines.push(`## 1. TL;DR`)
  lines.push('')
  lines.push(prd.tldr)
  lines.push('')

  lines.push(`## 2. Goals`)
  lines.push('')
  lines.push('### Business Goals')
  for (const g of prd.goals.business) lines.push(`- ${g}`)
  lines.push('')
  lines.push('### User Goals')
  for (const g of prd.goals.user) lines.push(`- ${g}`)
  lines.push('')
  lines.push('### Non-Goals')
  for (const g of prd.goals.nonGoals) lines.push(`- ${g}`)
  lines.push('')

  lines.push(`## 3. User Stories`)
  lines.push('')
  for (const s of prd.userStories) lines.push(`- ${s}`)
  lines.push('')

  lines.push(`## 4. Epics (ordered by implementation priority)`)
  lines.push('')

  for (const epic of prd.epics) {
    lines.push('---')
    lines.push('')
    lines.push(`### Epic ${epic.number}: ${epic.name}`)
    lines.push('')
    lines.push(`**Phase:** ${epic.phase} | **Dependencies:** ${epic.dependencies?.join(', ') || 'none'} | **Complexity:** ${epic.complexity}`)
    lines.push('')

    lines.push(`#### 1. TL;DR`)
    lines.push(epic.tldr)
    lines.push('')

    lines.push(`#### 2. Goals`)
    lines.push('')
    lines.push('**Business Goals**')
    for (const g of epic.goals.business) lines.push(`- ${g}`)
    lines.push('')
    lines.push('**User Goals**')
    for (const g of epic.goals.user) lines.push(`- ${g}`)
    lines.push('')
    lines.push('**Non-Goals**')
    for (const g of epic.goals.nonGoals) lines.push(`- ${g}`)
    lines.push('')

    lines.push(`#### 3. User Stories`)
    for (const s of epic.userStories) lines.push(`- ${s}`)
    lines.push('')

    lines.push(`#### 4. Functional Requirements`)
    lines.push('')
    for (const req of epic.functionalRequirements) {
      lines.push(`**${req.name}** (Priority: ${req.priority})`)
      for (const d of req.details) lines.push(`- ${d}`)
      if (req.screenshotPaths?.length) {
        for (const ss of req.screenshotPaths) lines.push(`![${req.name}](${ss})`)
      }
      lines.push('')
    }

    lines.push(`#### 5. User Experience`)
    lines.push('')
    lines.push(`**Entry Point:** ${epic.userExperience.entryPoint}`)
    lines.push('')
    lines.push('**Flow**')
    for (let i = 0; i < epic.userExperience.flow.length; i++) {
      lines.push(`${i + 1}. ${epic.userExperience.flow[i]}`)
    }
    lines.push('')
    lines.push('**Edge Cases**')
    for (const e of epic.userExperience.edgeCases) lines.push(`- ${e}`)
    lines.push('')
    lines.push('**Design Notes**')
    for (const d of epic.userExperience.designNotes) lines.push(`- ${d}`)
    lines.push('')

    lines.push(`#### 6. Narrative`)
    lines.push(epic.narrative)
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push(`## 5. User Flows`)
  lines.push('')
  for (const flow of prd.userFlows) {
    lines.push(`### ${flow.name}`)
    for (let i = 0; i < flow.steps.length; i++) {
      lines.push(`${i + 1}. ${flow.steps[i]}`)
    }
    if (flow.edgeCases?.length) {
      lines.push('')
      lines.push('**Edge Cases**')
      for (const e of flow.edgeCases) lines.push(`- ${e}`)
    }
    lines.push('')
  }

  lines.push(`## 6. Narrative`)
  lines.push('')
  lines.push(prd.narrative)
  lines.push('')

  lines.push(`## 7. Build Roadmap`)
  lines.push('')
  for (const phase of prd.buildRoadmap) {
    lines.push(`### Phase ${phase.phase}: ${phase.name}`)
    lines.push(`Epics: ${phase.epics.join(', ')}`)
    if (phase.dependencies?.length) {
      lines.push(`Dependencies: ${phase.dependencies.join(', ')}`)
    }
    lines.push('')
  }

  lines.push(`## 8. Open Questions`)
  lines.push('')
  for (const q of prd.openQuestions) lines.push(`- ${q}`)
  lines.push('')

  return lines.join('\n')
}

// -- Prompt building --

function buildPRDPrompt(featureMap: FeatureMap, featureData: string): string {
  return `Generate a complete PRD (Product Requirements Document) for the app "${featureMap.appName}" at ${featureMap.appUrl}.

Here is the feature map from crawling the app:

${featureData}

Rules for the PRD:
1. Every Epic MUST have ALL 6 sections: TL;DR, Goals, User Stories, Functional Requirements, User Experience, Narrative.
2. Epics must be ordered by build priority (Epic 1 = build first).
3. Each Functional Requirement must have a priority (High/Medium/Low) and detailed descriptions.
4. User Experience must include entry point, step-by-step flow, edge cases, and design notes.
5. The Narrative for each Epic should be ~100 words from the user's perspective.
6. The main Narrative should be ~200 words.
7. Build Roadmap should group epics by phase with dependencies.
8. Open Questions should list anything unclear from the crawl.

Generate the full PRD as JSON matching the provided schema.`
}
