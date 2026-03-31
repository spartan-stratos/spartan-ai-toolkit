import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { diffElements, diffAriaSnapshots, summarizeDiff } from '../dist/dom-differ.js'

const makeElement = (overrides = {}) => ({
  selector: '#btn1',
  role: 'button',
  name: 'Save',
  text: 'Save',
  tag: 'button',
  isVisible: true,
  ...overrides,
})

describe('diffElements', () => {
  it('detects new elements', () => {
    const before = [makeElement()]
    const after = [makeElement(), makeElement({ selector: '#btn2', name: 'Cancel' })]
    const diff = diffElements(before, after, 'http://a.com', 'http://a.com')

    assert.equal(diff.newElements.length, 1)
    assert.equal(diff.newElements[0].name, 'Cancel')
    assert.equal(diff.removedElements.length, 0)
  })

  it('detects removed elements', () => {
    const before = [makeElement(), makeElement({ selector: '#btn2', name: 'Cancel' })]
    const after = [makeElement()]
    const diff = diffElements(before, after, 'http://a.com', 'http://a.com')

    assert.equal(diff.newElements.length, 0)
    assert.equal(diff.removedElements.length, 1)
    assert.equal(diff.removedElements[0].name, 'Cancel')
  })

  it('detects URL change', () => {
    const diff = diffElements([], [], 'http://a.com', 'http://a.com/settings')
    assert.equal(diff.urlChanged, true)
    assert.equal(diff.newUrl, 'http://a.com/settings')
  })

  it('detects modal opened', () => {
    const before = []
    const after = [makeElement({ role: 'dialog', selector: '#modal', name: 'Confirm' })]
    const diff = diffElements(before, after, 'http://a.com', 'http://a.com')

    assert.equal(diff.modalOpened, true)
    assert.equal(diff.meaningfulChange, true)
  })

  it('detects dropdown opened', () => {
    const before = []
    const after = [makeElement({ role: 'listbox', selector: '#dropdown', name: 'Options' })]
    const diff = diffElements(before, after, 'http://a.com', 'http://a.com')

    assert.equal(diff.dropdownOpened, true)
  })

  it('detects form appeared', () => {
    const before = []
    const after = [makeElement({ tag: 'input', role: 'textbox', selector: '#email', name: 'Email' })]
    const diff = diffElements(before, after, 'http://a.com', 'http://a.com')

    assert.equal(diff.formAppeared, true)
  })

  it('reports no meaningful change when nothing changed', () => {
    const elems = [makeElement()]
    const diff = diffElements(elems, elems, 'http://a.com', 'http://a.com')

    assert.equal(diff.meaningfulChange, false)
    assert.equal(diff.newElements.length, 0)
    assert.equal(diff.removedElements.length, 0)
  })
})

describe('diffAriaSnapshots', () => {
  it('returns no changes for identical snapshots', () => {
    const snap = '- button "Save"\n- heading "Title"'
    assert.equal(diffAriaSnapshots(snap, snap), 'No changes')
  })

  it('detects added lines', () => {
    const before = '- button "Save"'
    const after = '- button "Save"\n- dialog "Confirm"'
    const result = diffAriaSnapshots(before, after)
    assert.ok(result.includes('Added'))
    assert.ok(result.includes('dialog'))
  })

  it('detects removed lines', () => {
    const before = '- button "Save"\n- dialog "Confirm"'
    const after = '- button "Save"'
    const result = diffAriaSnapshots(before, after)
    assert.ok(result.includes('Removed'))
  })
})

describe('summarizeDiff', () => {
  it('summarizes modal opened', () => {
    const diff = {
      newElements: [makeElement({ role: 'dialog' })],
      removedElements: [],
      urlChanged: false,
      modalOpened: true,
      dropdownOpened: false,
      formAppeared: false,
      meaningfulChange: true,
    }
    const summary = summarizeDiff(diff)
    assert.ok(summary.includes('modal/dialog opened'))
  })

  it('summarizes navigation', () => {
    const diff = {
      newElements: [],
      removedElements: [],
      urlChanged: true,
      newUrl: 'http://a.com/new',
      modalOpened: false,
      dropdownOpened: false,
      formAppeared: false,
      meaningfulChange: true,
    }
    const summary = summarizeDiff(diff)
    assert.ok(summary.includes('navigated to'))
  })

  it('reports no change', () => {
    const diff = {
      newElements: [],
      removedElements: [],
      urlChanged: false,
      modalOpened: false,
      dropdownOpened: false,
      formAppeared: false,
      meaningfulChange: false,
    }
    assert.equal(summarizeDiff(diff), 'no visible change')
  })
})
