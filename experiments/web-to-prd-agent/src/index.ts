#!/usr/bin/env node

import { Agent } from './agent.js'
import type { CLIOptions } from './types.js'

const HELP = `
spartan-web-to-prd — Scan a web app and generate a detailed PRD

Usage:
  spartan-web-to-prd <url> [options]

Options:
  --no-notion      Skip Notion export
  --max-pages N    Limit number of pages to crawl (default: 100)
  --resume         Resume an interrupted crawl
  --output-dir DIR Output directory (default: ./output)
  --help           Show this help

Examples:
  spartan-web-to-prd "https://app.example.com"
  spartan-web-to-prd "https://app.example.com" --no-notion --max-pages 50
  spartan-web-to-prd "https://app.example.com" --resume
`

function parseArgs(argv: string[]): CLIOptions {
  const args = argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(HELP)
    process.exit(0)
  }

  // First non-flag arg is the URL
  const url = args.find(a => !a.startsWith('--'))
  if (!url) {
    console.error('Error: URL is required.\n')
    console.log(HELP)
    process.exit(1)
  }

  // Validate URL
  try {
    new URL(url)
  } catch {
    console.error(`Error: "${url}" is not a valid URL.\n`)
    process.exit(1)
  }

  const noNotion = args.includes('--no-notion')
  const resume = args.includes('--resume')

  let maxPages = 100
  const maxPagesIdx = args.indexOf('--max-pages')
  if (maxPagesIdx !== -1 && args[maxPagesIdx + 1]) {
    const parsed = parseInt(args[maxPagesIdx + 1], 10)
    if (!isNaN(parsed) && parsed > 0) {
      maxPages = parsed
    }
  }

  let outputDir = './output'
  const outputIdx = args.indexOf('--output-dir')
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    outputDir = args[outputIdx + 1]
  }

  return { url, noNotion, maxPages, resume, outputDir }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv)

  console.log('')
  console.log('spartan-web-to-prd')
  console.log('==================')
  console.log(`Target: ${options.url}`)
  console.log(`Max pages: ${options.maxPages}`)
  console.log(`Notion export: ${options.noNotion ? 'disabled' : 'enabled'}`)
  console.log(`Output: ${options.outputDir}`)
  console.log('')

  // Check for resume
  if (options.resume) {
    const savedState = Agent.loadState(options.outputDir)
    if (savedState) {
      console.log(`Resuming from step: ${savedState.step}`)
      console.log('')
    } else {
      console.log('No saved state found. Starting fresh.')
      console.log('')
    }
  }

  const agent = new Agent(options)

  try {
    await agent.run()
  } catch (err) {
    console.error(`\nFailed: ${(err as Error).message}`)
    process.exit(1)
  }
}

main()
