/* Don't use sloppy JS. */ "use strict";

// Helpers for building the tutorial's pages from its steps.

/**
 * Splits a step's text into its front matter, `key: value` lines between two
 * lines of `---`, and the rest. Throws an Error without front matter.
 * @param {string} text
 * @returns {{ meta: Record<string, string>, body: string }}
 */
export function parse_step(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match)
    throw new Error('a step needs front matter between two lines of ---')
  /** @type {Record<string, string>} */
  const meta = {}
  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === '')
      continue
    const colon = line.indexOf(':')
    if (colon < 0)
      throw new Error(`front matter needs "key: value", got "${line}"`)
    meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return { meta, body: match[2] }
}

/**
 * @typedef {{ kind: 'same' | 'added' | 'removed', text: string }} Line
 * @typedef {Line | { kind: 'gap' }} Shown
 */

// Returns a text's lines, none for no text, and not one more for a last newline
/** @param {string} text */
function split_lines(text) {
  return text === '' ? [] : text.replace(/\n$/, '').split('\n')
}

/**
 * Returns the lines of `after`, and those of `before` that are gone, each
 * marked as the same, added or removed, in order.
 * @param {string} before
 * @param {string} after
 * @returns {Line[]}
 */
export function diff_lines(before, after) {
  const a = split_lines(before)
  const b = split_lines(after)

  // How many lines the ends of both have in common, from each pair of starts
  const common = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      common[i][j] = a[i] === b[j] ? common[i + 1][j + 1] + 1 : Math.max(common[i + 1][j], common[i][j + 1])

  /** @type {Line[]} */
  const lines = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j])
      lines.push({ kind: 'same', text: b[j++] }), i++
    else if (common[i + 1][j] >= common[i][j + 1])
      lines.push({ kind: 'removed', text: a[i++] })
    else
      lines.push({ kind: 'added', text: b[j++] })
  }
  while (i < a.length)
    lines.push({ kind: 'removed', text: a[i++] })
  while (j < b.length)
    lines.push({ kind: 'added', text: b[j++] })
  return lines
}

/**
 * Returns what changed from `before` to `after`: the added and removed lines
 * with `context` lines of the same around them, and a gap wherever two or more
 * lines were left out. Comments that are gone are not shown, for they teach
 * nothing. Empty when nothing changed.
 * @param {string} before
 * @param {string} after
 * @param {number} [context]
 * @returns {Shown[]}
 */
export function changes(before, after, context = 2) {
  const lines = diff_lines(before, after).filter(line => !(line.kind === 'removed' && line.text.trim().startsWith('//')))
  if (!lines.some(line => line.kind !== 'same'))
    return []
  const near = lines.map((_, index) =>
    lines.slice(Math.max(0, index - context), index + context + 1).some(line => line.kind !== 'same'))

  // A gap that would hide a single line shows the line instead
  const keep = [...near]
  for (let from = 0; from < lines.length; from++) {
    if (near[from])
      continue
    let to = from
    while (to < lines.length && !near[to])
      to++
    if (to - from < 2)
      keep.fill(true, from, to)
    from = to
  }

  /** @type {Shown[]} */
  const shown = []
  lines.forEach((line, index) => {
    if (keep[index])
      shown.push(line)
    else if (shown.at(-1)?.kind !== 'gap')
      shown.push({ kind: 'gap' })
  })
  return shown
}
