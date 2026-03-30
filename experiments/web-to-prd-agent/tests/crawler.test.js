import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeUrl, isDestructive, extractJSON } from '../dist/crawler.js'

describe('normalizeUrl', () => {
  const base = 'https://app.example.com'

  it('resolves relative paths', () => {
    assert.equal(normalizeUrl('/settings', base), 'https://app.example.com/settings')
  })

  it('strips trailing slashes', () => {
    assert.equal(normalizeUrl('/users/', base), 'https://app.example.com/users')
  })

  it('keeps root path as /', () => {
    assert.equal(normalizeUrl('/', base), 'https://app.example.com/')
  })

  it('returns absolute same-origin URLs normalized', () => {
    assert.equal(
      normalizeUrl('https://app.example.com/page/', base),
      'https://app.example.com/page'
    )
  })

  it('returns external URLs as-is', () => {
    assert.equal(
      normalizeUrl('https://other.com/page', base),
      'https://other.com/page'
    )
  })

  it('resolves text as relative path when possible', () => {
    // URL constructor treats "not a url" as a relative path
    const result = normalizeUrl('not a url', base)
    assert.ok(result.startsWith('https://app.example.com'))
  })
})

describe('isDestructive', () => {
  it('detects delete buttons', () => {
    assert.equal(isDestructive('Delete Project'), true)
    assert.equal(isDestructive('delete'), true)
  })

  it('detects remove buttons', () => {
    assert.equal(isDestructive('Remove User'), true)
  })

  it('detects reset buttons', () => {
    assert.equal(isDestructive('Reset Settings'), true)
  })

  it('allows safe actions', () => {
    assert.equal(isDestructive('Save'), false)
    assert.equal(isDestructive('Create Project'), false)
    assert.equal(isDestructive('View Details'), false)
    assert.equal(isDestructive('Edit Profile'), false)
  })
})

describe('extractJSON', () => {
  it('extracts JSON from clean string', () => {
    const input = '{"key": "value"}'
    assert.equal(extractJSON(input), '{"key": "value"}')
  })

  it('extracts JSON surrounded by text', () => {
    const input = 'Here is the result: {"name": "test", "count": 5} and some more text'
    assert.equal(extractJSON(input), '{"name": "test", "count": 5}')
  })

  it('handles nested JSON', () => {
    const input = 'Result: {"outer": {"inner": "value"}}'
    const extracted = extractJSON(input)
    const parsed = JSON.parse(extracted)
    assert.equal(parsed.outer.inner, 'value')
  })

  it('returns original string when no JSON found', () => {
    assert.equal(extractJSON('no json here'), 'no json here')
  })

  it('handles empty string', () => {
    assert.equal(extractJSON(''), '')
  })
})
