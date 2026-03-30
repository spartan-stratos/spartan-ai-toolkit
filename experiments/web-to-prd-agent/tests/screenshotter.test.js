import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { Screenshotter, slugify } from '../dist/screenshotter.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    assert.equal(slugify('Dashboard Page'), 'dashboard-page')
  })

  it('removes special characters', () => {
    assert.equal(slugify('User Settings (Admin)'), 'user-settings-admin')
  })

  it('truncates long names to 50 chars', () => {
    const long = 'a'.repeat(100)
    assert.ok(slugify(long).length <= 50)
  })

  it('handles empty string', () => {
    assert.equal(slugify(''), '')
  })

  it('handles numbers', () => {
    assert.equal(slugify('Page 123'), 'page-123')
  })
})

describe('Screenshotter', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'screenshotter-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('generates sequential numbered paths', () => {
    const ss = new Screenshotter(tmpDir)
    const p1 = ss.nextPath('homepage')
    const p2 = ss.nextPath('dashboard')
    const p3 = ss.nextPath('settings')

    assert.ok(p1.includes('01-homepage.png'))
    assert.ok(p2.includes('02-dashboard.png'))
    assert.ok(p3.includes('03-settings.png'))
  })

  it('tracks screenshots by epic', () => {
    const ss = new Screenshotter(tmpDir)
    ss.track('/path/01-home.png', 'Auth')
    ss.track('/path/02-login.png', 'Auth')
    ss.track('/path/03-dashboard.png', 'Dashboard')

    assert.deepEqual(ss.getForEpic('Auth'), ['/path/01-home.png', '/path/02-login.png'])
    assert.deepEqual(ss.getForEpic('Dashboard'), ['/path/03-dashboard.png'])
    assert.deepEqual(ss.getForEpic('NonExistent'), [])
  })

  it('counts all tracked screenshots', () => {
    const ss = new Screenshotter(tmpDir)
    ss.track('/a.png', 'Epic1')
    ss.track('/b.png', 'Epic1')
    ss.track('/c.png', 'Epic2')

    assert.equal(ss.getCount(), 3)
  })

  it('gets all screenshots across epics', () => {
    const ss = new Screenshotter(tmpDir)
    ss.track('/a.png', 'E1')
    ss.track('/b.png', 'E2')

    const all = ss.getAll()
    assert.equal(all.length, 2)
    assert.ok(all.includes('/a.png'))
    assert.ok(all.includes('/b.png'))
  })

  it('generates relative paths for PRD references', () => {
    const ss = new Screenshotter(tmpDir)
    const rel = ss.relativePath('/some/abs/path/screenshots/01-home.png')
    assert.equal(rel, 'screenshots/01-home.png')
  })

  it('creates screenshots directory', () => {
    const ss = new Screenshotter(tmpDir)
    const dir = ss.getOutputDir()
    assert.ok(dir.endsWith('screenshots'))
  })
})
