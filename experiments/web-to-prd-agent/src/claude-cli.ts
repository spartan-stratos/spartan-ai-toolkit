import { spawn } from 'node:child_process'
import type { ClaudeOptions, ClaudeResponse } from './types.js'

export class ClaudeCLI {
  private defaultOptions: Partial<ClaudeOptions>

  constructor(options: Partial<ClaudeOptions> = {}) {
    this.defaultOptions = {
      outputFormat: 'json',
      ...options,
    }
  }

  /**
   * Build the command args for `claude -p`.
   * Exported for testing.
   */
  buildArgs(prompt: string, options: ClaudeOptions = {}): string[] {
    const merged = { ...this.defaultOptions, ...options }
    const args: string[] = ['-p', prompt]

    if (merged.outputFormat) {
      args.push('--output-format', merged.outputFormat)
    }

    if (merged.sessionId) {
      args.push('--session-id', merged.sessionId)
    }

    if (merged.resume) {
      args.push('--resume')
    }

    if (merged.continue) {
      args.push('--continue')
    }

    if (merged.mcpConfig) {
      args.push('--mcp-config', merged.mcpConfig)
    }

    if (merged.allowedTools) {
      args.push('--allowedTools', merged.allowedTools)
    }

    if (merged.jsonSchema) {
      args.push('--json-schema', merged.jsonSchema)
    }

    if (merged.maxTurns) {
      args.push('--max-turns', String(merged.maxTurns))
    }

    if (merged.systemPrompt) {
      args.push('--system-prompt', merged.systemPrompt)
    }

    return args
  }

  /**
   * Run `claude -p` and return the parsed response.
   */
  async run(prompt: string, options: ClaudeOptions = {}): Promise<ClaudeResponse> {
    const args = this.buildArgs(prompt, options)

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const stderrChunks: Buffer[] = []

      const proc = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      })

      proc.stdout.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        stderrChunks.push(chunk)
      })

      proc.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new ClaudeCLIError(
            'claude CLI not found. Install it: https://docs.anthropic.com/en/docs/claude-code',
            'NOT_FOUND'
          ))
        } else {
          reject(new ClaudeCLIError(err.message, 'SPAWN_ERROR'))
        }
      })

      proc.on('close', (code) => {
        const stdout = Buffer.concat(chunks).toString('utf-8').trim()
        const stderr = Buffer.concat(stderrChunks).toString('utf-8').trim()

        if (code !== 0) {
          const errorMsg = stderr || stdout || `claude exited with code ${code}`
          reject(new ClaudeCLIError(errorMsg, categorizeError(errorMsg)))
          return
        }

        const format = options.outputFormat ?? this.defaultOptions.outputFormat
        if (format === 'text') {
          resolve({
            type: 'result',
            result: stdout,
            total_cost_usd: 0,
            session_id: options.sessionId ?? '',
          })
          return
        }

        try {
          const parsed = parseClaudeJSON(stdout)
          resolve(parsed)
        } catch (parseErr) {
          reject(new ClaudeCLIError(
            `Failed to parse claude output: ${(parseErr as Error).message}\nRaw: ${stdout.slice(0, 500)}`,
            'PARSE_ERROR'
          ))
        }
      })
    })
  }

  /**
   * Run claude and return just the result text.
   * Convenience wrapper for when you don't need metadata.
   */
  async ask(prompt: string, options: ClaudeOptions = {}): Promise<string> {
    const response = await this.run(prompt, options)
    return response.result
  }

  /**
   * Run claude with --json-schema and parse the structured result.
   */
  async askStructured<T>(prompt: string, schema: string, options: ClaudeOptions = {}): Promise<T> {
    const response = await this.run(prompt, {
      ...options,
      jsonSchema: schema,
    })

    try {
      return JSON.parse(response.result) as T
    } catch {
      throw new ClaudeCLIError(
        `Structured output was not valid JSON: ${response.result.slice(0, 500)}`,
        'PARSE_ERROR'
      )
    }
  }
}

/**
 * Parse claude's JSON output. Handles multiple formats:
 * - Single JSON result object (default --output-format json)
 * - JSON array with --verbose (array of system/progress/result objects)
 * - Newline-separated JSON (stream-json mode)
 */
export function parseClaudeJSON(raw: string): ClaudeResponse {
  // Try as JSON array first (--verbose mode produces this)
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      for (let i = parsed.length - 1; i >= 0; i--) {
        if (parsed[i].type === 'result') return parsed[i]
      }
    } else if (parsed.type === 'result') {
      return parsed
    }
  } catch {
    // Not valid JSON as a whole — try line-by-line
  }

  // Try each line (stream-json or newline-separated)
  const lines = raw.split('\n').filter(l => l.trim())
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(lines[i])
      if (parsed.type === 'result') {
        return parsed
      }
    } catch {
      continue
    }
  }
  throw new Error('No valid JSON result found in output')
}

export type ClaudeErrorCode =
  | 'NOT_FOUND'
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'PARSE_ERROR'
  | 'SPAWN_ERROR'
  | 'UNKNOWN'

export class ClaudeCLIError extends Error {
  code: ClaudeErrorCode

  constructor(message: string, code: ClaudeErrorCode) {
    super(message)
    this.name = 'ClaudeCLIError'
    this.code = code
  }
}

function categorizeError(message: string): ClaudeErrorCode {
  const lower = message.toLowerCase()
  if (lower.includes('not authenticated') || lower.includes('unauthorized') || lower.includes('auth')) {
    return 'AUTH_FAILED'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('429')) {
    return 'RATE_LIMITED'
  }
  return 'UNKNOWN'
}
