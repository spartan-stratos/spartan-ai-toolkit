// Spartan AI Toolkit — Pack Definitions
// Mirrors packs.sh for the Node.js CLI installer.

export const PACKS = {
  core: {
    description: 'Core workflow (always installed)',
    commands: ['quickplan', 'daily', 'context-save', 'update', 'debug', 'pr-ready', 'init-project', 'careful', 'freeze', 'unfreeze', 'guard'],
    rules: [],
    skills: [],
    agents: [],
    claudeSections: []
  },
  backend: {
    description: 'Kotlin + Micronaut backend',
    commands: ['kotlin-service', 'migration', 'review', 'testcontainer'],
    rules: ['CORE_RULES.md', 'ARCHITECTURE_RULES.md', 'API_RULES.md', 'DATABASE_RULES.md', 'CONTROLLER_TEST_STANDARDS.md', 'NAMING_CONVENTIONS.md', 'RETROFIT_CLIENT_PLACEMENT.md', 'TRANSACTION_RULES.md'],
    skills: ['api-endpoint-creator', 'backend-api-design', 'database-patterns', 'database-table-creator', 'kotlin-best-practices', 'testing-strategies', 'security-checklist'],
    agents: ['micronaut-backend-expert.md', 'solution-architect-cto.md'],
    claudeSections: ['10-backend.md']
  },
  frontend: {
    description: 'React + Next.js frontend',
    commands: ['next-app', 'next-feature', 'fe-review', 'figma-to-code', 'e2e'],
    rules: ['FRONTEND_RULES.md', 'NAMING_CONVENTIONS.md'],
    skills: ['ui-ux-pro-max'],
    agents: [],
    claudeSections: ['20-frontend.md']
  },
  'project-mgmt': {
    description: 'Large multi-day projects (GSD)',
    commands: ['project', 'phase', 'workstreams', 'gsd-upgrade', 'forensics', 'brownfield', 'map-codebase'],
    rules: [],
    skills: [],
    agents: [],
    claudeSections: ['30-project-mgmt.md']
  },
  product: {
    description: 'Product thinking before building',
    commands: ['think', 'validate', 'teardown', 'interview', 'lean-canvas', 'brainstorm'],
    rules: [],
    skills: [],
    agents: [],
    claudeSections: ['40-product.md']
  },
  ops: {
    description: 'Deploy & infrastructure',
    commands: ['deploy', 'env-setup'],
    rules: [],
    skills: [],
    agents: [],
    claudeSections: ['50-ops.md']
  },
  research: {
    description: 'Startup research pipeline — from idea to investor-ready',
    commands: ['kickoff', 'deep-dive', 'full-run', 'fundraise', 'research', 'pitch', 'outreach', 'content', 'write'],
    rules: [],
    skills: ['brainstorm', 'idea-validation', 'market-research', 'competitive-teardown', 'deep-research', 'investor-materials', 'investor-outreach', 'article-writing', 'content-engine', 'startup-pipeline'],
    agents: ['idea-killer.md', 'research-planner.md'],
    claudeSections: ['60-research.md']
  }
};

export const PACK_ORDER = ['core', 'backend', 'frontend', 'project-mgmt', 'product', 'ops', 'research'];
