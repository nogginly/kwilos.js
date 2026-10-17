import { describe, it, expect } from 'vitest'
import { parse_step, diff_lines, changes } from '../site/tutorial.js'

describe('parse_step', () => {
  it('reads the front matter, and returns the rest', () => {
    expect(parse_step('---\ntitle: Hello, forest\nsummary: A sky: and a squirrel.\n---\nSome text\n\nMore\n')).toEqual({
      meta: { title: 'Hello, forest', summary: 'A sky: and a squirrel.' },
      body: 'Some text\n\nMore\n',
    })
  })

  it('allows blank lines in the front matter, and no body', () => {
    expect(parse_step('---\n\ntitle: A\n\n---\n')).toEqual({ meta: { title: 'A' }, body: '' })
  })

  it('throws an Error without front matter, or for a line without a colon', () => {
    expect(() => parse_step('Just text')).toThrow(/front matter/)
    expect(() => parse_step('---\ntitle A\n---\nbody')).toThrow(/key: value/)
  })
})

describe('diff_lines', () => {
  const kinds = (lines) => lines.map(line => `${{ same: ' ', added: '+', removed: '-' }[line.kind]}${line.text}`)

  it('marks lines as the same, added or removed', () => {
    expect(kinds(diff_lines('a\nb\nc', 'a\nx\nb\nc\nd'))).toEqual([' a', '+x', ' b', ' c', '+d'])
    expect(kinds(diff_lines('a\nb\nc', 'a\nc'))).toEqual([' a', '-b', ' c'])
  })

  it('shows a changed line as the old one removed and the new one added', () => {
    const lines = kinds(diff_lines('a\nold\nc', 'a\nnew\nc'))
    expect(lines).toHaveLength(4)
    expect(lines).toContain('-old')
    expect(lines).toContain('+new')
  })

  it('marks every line the same for identical text, and every line added for nothing before', () => {
    expect(kinds(diff_lines('a\nb\n', 'a\nb\n'))).toEqual([' a', ' b'])
    expect(kinds(diff_lines('', 'a\nb'))).toEqual(['+a', '+b'])
  })
})

describe('changes', () => {
  const text = (shown) => shown.map(line => line.kind === 'gap' ? '...' : `${{ same: ' ', added: '+', removed: '-' }[line.kind]}${line.text}`)
  const before = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].join('\n')

  it('shows the changes with context, and a gap for the lines left out', () => {
    const after = before.replace('5', 'five')
    expect(text(changes(before, after, 1))).toEqual(['...', ' 4', '-5', '+five', ' 6', '...'])
  })

  it('joins changes that are close, and keeps the gap between those that are far apart', () => {
    const after = before.replace('2', 'two').replace('8', 'eight')
    expect(text(changes(before, after, 1))).toEqual([' 1', '-2', '+two', ' 3', '...', ' 7', '-8', '+eight', ' 9'])
    expect(text(changes(before, before.replace('5', 'five'), 1)).filter(line => line === '...')).toHaveLength(2)
  })

  it('does not show a comment that is gone, though it shows one that is new', () => {
    const shown = text(changes('// old\nkeep\n// also old\nstay', '// new\nkeep\nstay', 5))
    expect(shown).toEqual(['+// new', ' keep', ' stay'])
    expect(text(changes('a\n  // note\nb', 'a\nb'))).toEqual([])
  })

  it('shows a single line rather than a gap in its place', () => {
    const after = before.replace('2', 'two').replace('6', 'six')
    // Line 4 is between the changes' context, and alone, so it is shown
    expect(text(changes(before, after, 1))).toEqual([' 1', '-2', '+two', ' 3', ' 4', ' 5', '-6', '+six', ' 7', '...'])
    expect(text(changes(before, before.replace('8', 'eight'), 1))).toEqual(['...', ' 7', '-8', '+eight', ' 9'])
  })

  it('has no gap when the context reaches the ends, and is empty when nothing changed', () => {
    expect(text(changes('a\nb', 'a\nb\nc', 5))).toEqual([' a', ' b', '+c'])
    expect(changes(before, before)).toEqual([])
  })
})
