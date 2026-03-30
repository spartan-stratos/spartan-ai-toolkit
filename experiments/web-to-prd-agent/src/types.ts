// -- Claude CLI --

export interface ClaudeResponse {
  type: string
  result: string
  total_cost_usd: number
  session_id: string
}

export interface ClaudeOptions {
  sessionId?: string
  resume?: boolean
  continue?: boolean
  mcpConfig?: string
  allowedTools?: string
  jsonSchema?: string
  maxTurns?: number
  systemPrompt?: string
  outputFormat?: 'json' | 'text' | 'stream-json'
}

// -- Pages & Crawl --

export interface PageInfo {
  url: string
  title: string
  type: 'dashboard' | 'list' | 'detail' | 'form' | 'settings' | 'other'
  section: string
  screenshotPath?: string
  interactions: Interaction[]
  subPages: string[]
}

export interface Interaction {
  element: string
  type: 'button' | 'tab' | 'link' | 'dropdown' | 'modal' | 'form' | 'filter' | 'accordion' | 'other'
  description: string
  result?: string
  screenshotPath?: string
}

export interface CrawlState {
  sessionId: string
  appName: string
  appUrl: string
  pages: Map<string, PageInfo>
  queue: string[]
  visited: Set<string>
  currentPass: 1 | 2
  screenshots: string[]
  startedAt: number
  lastActivity: number
}

export interface CoverageReport {
  pagesVisited: number
  navItemsFound: number
  screenshotsTaken: number
  buttonsClicked: number
  modalsFound: number
  formsFound: number
  tabsExplored: number
  filtersExplored: number
  dropdownsOpened: number
  subPagesDiscovered: number
  sectionsFromNav: string[]
  sectionsExplored: string[]
  sectionsSkipped: string[]
  passed: boolean
  failures: string[]
}

// -- Features --

export interface Feature {
  name: string
  type: 'data-display' | 'form' | 'action' | 'filter' | 'notification' | 'navigation' | 'other'
  description: string
  uiElements: string[]
  screenshotPaths: string[]
  page: string
}

export interface AppSection {
  name: string
  pages: PageInfo[]
  features: Feature[]
}

export interface FeatureMap {
  appName: string
  appUrl: string
  sections: AppSection[]
  totalPages: number
  totalFeatures: number
}

// -- PRD --

export interface PRDEpic {
  number: number
  name: string
  phase: number
  dependencies: string[]
  complexity: 'Simple' | 'Medium' | 'Complex'
  tldr: string
  goals: {
    business: string[]
    user: string[]
    nonGoals: string[]
  }
  userStories: string[]
  functionalRequirements: FunctionalRequirement[]
  userExperience: {
    entryPoint: string
    flow: string[]
    edgeCases: string[]
    designNotes: string[]
  }
  narrative: string
}

export interface FunctionalRequirement {
  name: string
  priority: 'High' | 'Medium' | 'Low'
  details: string[]
  screenshotPaths: string[]
}

export interface PRDDocument {
  appName: string
  appUrl: string
  tldr: string
  goals: {
    business: string[]
    user: string[]
    nonGoals: string[]
  }
  userStories: string[]
  epics: PRDEpic[]
  userFlows: UserFlow[]
  narrative: string
  buildRoadmap: BuildPhase[]
  openQuestions: string[]
}

export interface UserFlow {
  name: string
  steps: string[]
  edgeCases: string[]
}

export interface BuildPhase {
  phase: number
  name: string
  epics: string[]
  dependencies: string[]
}

// -- Notion --

export interface NotionExportResult {
  parentPageUrl: string
  epicPageUrls: Map<string, string>
  screenshotsUploaded: number
  errors: string[]
}

// -- CLI --

export interface CLIOptions {
  url: string
  noNotion: boolean
  maxPages: number
  resume: boolean
  outputDir: string
}

// -- Agent --

export type AgentStep =
  | 'prerequisites'
  | 'login'
  | 'crawl-pass1'
  | 'crawl-pass2'
  | 'coverage-check'
  | 'generate-prd'
  | 'export-notion'
  | 'done'

export interface AgentState {
  step: AgentStep
  crawlState?: CrawlState
  featureMap?: FeatureMap
  coverageReport?: CoverageReport
  prd?: PRDDocument
  notionResult?: NotionExportResult
  errors: string[]
}
