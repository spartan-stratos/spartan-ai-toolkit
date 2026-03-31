import type { ElementInfo, DOMDiff } from './types.js'

/**
 * Compare two sets of interactive elements to detect what changed after an action.
 */
export function diffElements(
  before: ElementInfo[],
  after: ElementInfo[],
  urlBefore: string,
  urlAfter: string
): DOMDiff {
  const beforeMap = new Map(before.map(e => [elementKey(e), e]))
  const afterMap = new Map(after.map(e => [elementKey(e), e]))

  const newElements: ElementInfo[] = []
  const removedElements: ElementInfo[] = []

  for (const [key, elem] of afterMap) {
    if (!beforeMap.has(key)) {
      newElements.push(elem)
    }
  }

  for (const [key, elem] of beforeMap) {
    if (!afterMap.has(key)) {
      removedElements.push(elem)
    }
  }

  const urlChanged = urlBefore !== urlAfter
  const modalOpened = newElements.some(e => isModalRole(e.role))
  const dropdownOpened = newElements.some(e => isDropdownRole(e.role))
  const formAppeared = newElements.some(e => e.tag === 'form' || e.tag === 'input' || e.tag === 'textarea')

  // A change is meaningful if new interactive elements appeared (not just text)
  const meaningfulChange = newElements.length > 0 || urlChanged || modalOpened

  return {
    newElements,
    removedElements,
    urlChanged,
    newUrl: urlChanged ? urlAfter : undefined,
    modalOpened,
    dropdownOpened,
    formAppeared,
    meaningfulChange,
  }
}

/**
 * Diff two ARIA snapshot strings (YAML format from Playwright).
 * Returns a simple text summary of changes.
 */
export function diffAriaSnapshots(before: string, after: string): string {
  if (before === after) return 'No changes'

  const beforeLines = new Set(before.split('\n').map(l => l.trim()).filter(Boolean))
  const afterLines = new Set(after.split('\n').map(l => l.trim()).filter(Boolean))

  const added: string[] = []
  const removed: string[] = []

  for (const line of afterLines) {
    if (!beforeLines.has(line)) added.push(line)
  }
  for (const line of beforeLines) {
    if (!afterLines.has(line)) removed.push(line)
  }

  const parts: string[] = []
  if (added.length > 0) parts.push(`Added: ${added.slice(0, 10).join(', ')}`)
  if (removed.length > 0) parts.push(`Removed: ${removed.slice(0, 10).join(', ')}`)

  return parts.join('. ') || 'Minor changes'
}

/**
 * Summarize a DOM diff as a short text description.
 */
export function summarizeDiff(diff: DOMDiff): string {
  const parts: string[] = []

  if (diff.urlChanged) parts.push(`navigated to ${diff.newUrl}`)
  if (diff.modalOpened) parts.push('modal/dialog opened')
  if (diff.dropdownOpened) parts.push('dropdown/menu opened')
  if (diff.formAppeared) parts.push('form appeared')
  if (diff.newElements.length > 0) parts.push(`${diff.newElements.length} new elements`)
  if (diff.removedElements.length > 0) parts.push(`${diff.removedElements.length} elements removed`)

  if (parts.length === 0) return 'no visible change'
  return parts.join(', ')
}

// -- Helpers --

function elementKey(e: ElementInfo): string {
  return `${e.role}::${e.name}::${e.tag}::${e.selector}`
}

function isModalRole(role: string): boolean {
  const lower = role.toLowerCase()
  return lower === 'dialog' || lower === 'alertdialog' || lower === 'modal'
}

function isDropdownRole(role: string): boolean {
  const lower = role.toLowerCase()
  return lower === 'listbox' || lower === 'menu' || lower === 'menubar'
}
