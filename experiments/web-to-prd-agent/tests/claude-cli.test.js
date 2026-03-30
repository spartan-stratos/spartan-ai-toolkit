import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ClaudeCLI, parseClaudeJSON, ClaudeCLIError } from '../dist/claude-cli.js'

describe('ClaudeCLI', () => {
  describe('buildArgs', () => {
    it('builds basic args with prompt and json format', () => {
      const cli = new ClaudeCLI()
      const args = cli.buildArgs('hello')
      assert.deepEqual(args, ['-p', 'hello', '--output-format', 'json'])
    })

    it('includes session id and resume flags', () => {
      const cli = new ClaudeCLI()
      const args = cli.buildArgs('hello', { sessionId: 'test-123', resume: true })
      assert.ok(args.includes('--session-id'))
      assert.ok(args.includes('test-123'))
      assert.ok(args.includes('--resume'))
    })

    it('includes mcp config and allowed tools', () => {
      const cli = new ClaudeCLI()
      const args = cli.buildArgs('hello', {
        mcpConfig: 'mcp.json',
        allowedTools: 'mcp__playwright__*',
      })
      assert.ok(args.includes('--mcp-config'))
      assert.ok(args.includes('mcp.json'))
      assert.ok(args.includes('--allowedTools'))
      assert.ok(args.includes('mcp__playwright__*'))
    })

    it('includes json schema flag', () => {
      const cli = new ClaudeCLI()
      const schema = '{"type":"object"}'
      const args = cli.buildArgs('hello', { jsonSchema: schema })
      assert.ok(args.includes('--json-schema'))
      assert.ok(args.includes(schema))
    })

    it('includes max turns', () => {
      const cli = new ClaudeCLI()
      const args = cli.buildArgs('hello', { maxTurns: 50 })
      assert.ok(args.includes('--max-turns'))
      assert.ok(args.includes('50'))
    })

    it('includes system prompt', () => {
      const cli = new ClaudeCLI()
      const args = cli.buildArgs('hello', { systemPrompt: 'you are a tester' })
      assert.ok(args.includes('--system-prompt'))
      assert.ok(args.includes('you are a tester'))
    })

    it('merges default options with call options', () => {
      const cli = new ClaudeCLI({ sessionId: 'default-session', outputFormat: 'json' })
      const args = cli.buildArgs('hello', { resume: true })
      assert.ok(args.includes('--session-id'))
      assert.ok(args.includes('default-session'))
      assert.ok(args.includes('--resume'))
    })

    it('call options override defaults', () => {
      const cli = new ClaudeCLI({ sessionId: 'default' })
      const args = cli.buildArgs('hello', { sessionId: 'override' })
      assert.ok(args.includes('override'))
      assert.ok(!args.includes('default'))
    })

    it('uses text output format', () => {
      const cli = new ClaudeCLI({ outputFormat: 'text' })
      const args = cli.buildArgs('hello')
      assert.ok(args.includes('--output-format'))
      assert.ok(args.includes('text'))
    })
  })

  describe('parseClaudeJSON', () => {
    it('parses a single JSON result', () => {
      const raw = '{"type":"result","result":"Hello!","total_cost_usd":0.41,"session_id":"abc"}'
      const parsed = parseClaudeJSON(raw)
      assert.equal(parsed.type, 'result')
      assert.equal(parsed.result, 'Hello!')
      assert.equal(parsed.total_cost_usd, 0.41)
      assert.equal(parsed.session_id, 'abc')
    })

    it('handles multi-line output and picks the result line', () => {
      const raw = [
        '{"type":"progress","message":"thinking..."}',
        '{"type":"progress","message":"writing..."}',
        '{"type":"result","result":"Done!","total_cost_usd":0.5,"session_id":"xyz"}',
      ].join('\n')
      const parsed = parseClaudeJSON(raw)
      assert.equal(parsed.type, 'result')
      assert.equal(parsed.result, 'Done!')
    })

    it('parses JSON array output (verbose mode)', () => {
      const raw = JSON.stringify([
        { type: 'system', subtype: 'init', session_id: 'abc' },
        { type: 'assistant', message: 'thinking...' },
        { type: 'result', result: 'Done!', total_cost_usd: 0.5, session_id: 'abc' },
      ])
      const parsed = parseClaudeJSON(raw)
      assert.equal(parsed.type, 'result')
      assert.equal(parsed.result, 'Done!')
    })

    it('throws on invalid JSON', () => {
      assert.throws(
        () => parseClaudeJSON('not json at all'),
        /No valid JSON result found/
      )
    })

    it('throws on JSON without result type', () => {
      const raw = '{"type":"error","message":"something broke"}'
      assert.throws(
        () => parseClaudeJSON(raw),
        /No valid JSON result found/
      )
    })
  })

  describe('ClaudeCLIError', () => {
    it('has correct name and code', () => {
      const err = new ClaudeCLIError('test error', 'AUTH_FAILED')
      assert.equal(err.name, 'ClaudeCLIError')
      assert.equal(err.code, 'AUTH_FAILED')
      assert.equal(err.message, 'test error')
      assert.ok(err instanceof Error)
    })
  })
})
