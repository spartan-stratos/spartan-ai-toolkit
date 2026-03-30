import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validatePRD, validateEpic, prdToMarkdown, extractJSONFromResponse } from '../dist/prd-generator.js'

const validEpic = {
  number: 1,
  name: 'Auth',
  phase: 1,
  dependencies: [],
  complexity: 'Simple',
  tldr: 'Handle user login and signup.',
  goals: {
    business: ['Increase signups'],
    user: ['Quick login'],
    nonGoals: ['Social auth'],
  },
  userStories: ['As a user, I want to log in so that I can access my data'],
  functionalRequirements: [
    { name: 'Login Form', priority: 'High', details: ['Email and password fields'], screenshotPaths: [] },
  ],
  userExperience: {
    entryPoint: 'Landing page login button',
    flow: ['Click login', 'Enter credentials', 'Submit'],
    edgeCases: ['Wrong password shows error'],
    designNotes: ['Modal dialog'],
  },
  narrative: 'Sarah opens the app and clicks login. She enters her email and password. The form validates instantly.',
}

const validPRD = {
  appName: 'Test App',
  appUrl: 'https://test.com',
  tldr: 'A test app for testing.',
  goals: {
    business: ['Revenue'],
    user: ['Productivity'],
    nonGoals: ['Mobile'],
  },
  userStories: ['As a user, I want to test things'],
  epics: [validEpic],
  userFlows: [{ name: 'Login flow', steps: ['Open app', 'Login'], edgeCases: [] }],
  narrative: 'A user opens the app and gets things done.',
  buildRoadmap: [{ phase: 1, name: 'Foundation', epics: ['Auth'], dependencies: [] }],
  openQuestions: ['Is SSO needed?'],
}

describe('validatePRD', () => {
  it('passes for a valid PRD', () => {
    const result = validatePRD(validPRD)
    assert.equal(result.valid, true)
    assert.equal(result.errors.length, 0)
  })

  it('fails when TL;DR is missing', () => {
    const prd = { ...validPRD, tldr: '' }
    const result = validatePRD(prd)
    assert.equal(result.valid, false)
    assert.ok(result.errors.some(e => e.includes('TL;DR')))
  })

  it('fails when epics array is empty', () => {
    const prd = { ...validPRD, epics: [] }
    const result = validatePRD(prd)
    assert.equal(result.valid, false)
    assert.ok(result.errors.some(e => e.includes('Epics')))
  })

  it('fails when user stories are missing', () => {
    const prd = { ...validPRD, userStories: [] }
    const result = validatePRD(prd)
    assert.equal(result.valid, false)
  })

  it('fails when user flows are missing', () => {
    const prd = { ...validPRD, userFlows: [] }
    const result = validatePRD(prd)
    assert.equal(result.valid, false)
  })

  it('fails when narrative is missing', () => {
    const prd = { ...validPRD, narrative: '' }
    const result = validatePRD(prd)
    assert.equal(result.valid, false)
  })

  it('fails when build roadmap is missing', () => {
    const prd = { ...validPRD, buildRoadmap: [] }
    const result = validatePRD(prd)
    assert.equal(result.valid, false)
  })

  it('reports epic-level errors too', () => {
    const badEpic = { ...validEpic, tldr: '', narrative: '' }
    const prd = { ...validPRD, epics: [badEpic] }
    const result = validatePRD(prd)
    assert.equal(result.valid, false)
    assert.ok(result.errors.some(e => e.includes('Epic 1')))
  })
})

describe('validateEpic', () => {
  it('passes for a valid epic', () => {
    const errors = validateEpic(validEpic)
    assert.equal(errors.length, 0)
  })

  it('fails when sections are missing', () => {
    const bad = {
      ...validEpic,
      tldr: '',
      userStories: [],
      functionalRequirements: [],
      narrative: '',
    }
    const errors = validateEpic(bad)
    assert.ok(errors.length >= 3)
  })
})

describe('prdToMarkdown', () => {
  it('generates markdown with all sections', () => {
    const md = prdToMarkdown(validPRD)

    assert.ok(md.includes('# PRD: Test App'))
    assert.ok(md.includes('## 1. TL;DR'))
    assert.ok(md.includes('## 2. Goals'))
    assert.ok(md.includes('## 3. User Stories'))
    assert.ok(md.includes('## 4. Epics'))
    assert.ok(md.includes('### Epic 1: Auth'))
    assert.ok(md.includes('## 5. User Flows'))
    assert.ok(md.includes('## 6. Narrative'))
    assert.ok(md.includes('## 7. Build Roadmap'))
    assert.ok(md.includes('## 8. Open Questions'))
  })

  it('includes epic sub-sections', () => {
    const md = prdToMarkdown(validPRD)

    assert.ok(md.includes('#### 1. TL;DR'))
    assert.ok(md.includes('#### 2. Goals'))
    assert.ok(md.includes('#### 3. User Stories'))
    assert.ok(md.includes('#### 4. Functional Requirements'))
    assert.ok(md.includes('#### 5. User Experience'))
    assert.ok(md.includes('#### 6. Narrative'))
  })

  it('includes functional requirement details', () => {
    const md = prdToMarkdown(validPRD)
    assert.ok(md.includes('**Login Form** (Priority: High)'))
    assert.ok(md.includes('Email and password fields'))
  })
})

describe('extractJSONFromResponse', () => {
  it('extracts JSON from a code block', () => {
    const input = 'Here is the PRD:\n```json\n{"appName": "Test"}\n```\nDone!'
    const result = extractJSONFromResponse(input)
    assert.equal(JSON.parse(result).appName, 'Test')
  })

  it('extracts JSON from plain text with surrounding content', () => {
    const input = 'Sure! Here is the result: {"key": "value", "nested": {"a": 1}} and more text'
    const result = extractJSONFromResponse(input)
    const parsed = JSON.parse(result)
    assert.equal(parsed.key, 'value')
    assert.equal(parsed.nested.a, 1)
  })

  it('handles nested braces correctly', () => {
    const obj = { outer: { inner: { deep: "value" } }, list: [1, 2] }
    const input = 'Result: ' + JSON.stringify(obj) + ' done'
    const result = extractJSONFromResponse(input)
    assert.deepEqual(JSON.parse(result), obj)
  })

  it('handles strings with braces inside', () => {
    const input = '{"text": "hello {world}"}'
    const result = extractJSONFromResponse(input)
    assert.equal(JSON.parse(result).text, 'hello {world}')
  })

  it('throws when no JSON found', () => {
    assert.throws(
      () => extractJSONFromResponse('no json here at all'),
      /No JSON object found/
    )
  })
})
