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
})

describe('isDestructive', () => {
  it('detects delete buttons', () => {
    assert.equal(isDestructive('Delete Project'), true)
  })

  it('detects remove buttons', () => {
    assert.equal(isDestructive('Remove User'), true)
  })

  it('allows safe actions', () => {
    assert.equal(isDestructive('Save'), false)
    assert.equal(isDestructive('Create Project'), false)
    assert.equal(isDestructive('Edit Profile'), false)
  })
})

describe('extractJSON', () => {
  it('extracts JSON object from text', () => {
    const input = 'Here is the result: {"name": "test"} and more'
    const result = extractJSON(input)
    assert.equal(JSON.parse(result).name, 'test')
  })

  it('extracts JSON array from text', () => {
    const input = 'Actions: [{"page": "/home"}] done'
    const result = extractJSON(input)
    assert.ok(Array.isArray(JSON.parse(result)))
  })

  it('extracts from code blocks', () => {
    const input = '```json\n[{"a": 1}]\n```'
    const result = extractJSON(input)
    assert.deepEqual(JSON.parse(result), [{ a: 1 }])
  })

  it('handles nested braces', () => {
    const input = '{"outer": {"inner": "value"}}'
    const result = extractJSON(input)
    assert.equal(JSON.parse(result).outer.inner, 'value')
  })

  it('handles strings with braces', () => {
    const input = '{"text": "hello {world}"}'
    const result = extractJSON(input)
    assert.equal(JSON.parse(result).text, 'hello {world}')
  })
})
