import { describe, it, expect } from 'vitest'
import { circle, rect, label, image, tile, container } from '../src/kwilos.js'
import { tile_layout } from '../src/kwilos/shapes.js'

describe('shape factories', () => {
  it.each([
    [circle, 'circle'],
    [rect, 'rect'],
    [label, 'label'],
    [image, 'image'],
    [tile, 'tile'],
    [container, 'container'],
  ])('%o returns a plain object tagged %o', (factory, type) => {
    const shape = factory({ x: 1, y: 2 })
    expect(shape).toEqual({ x: 1, y: 2, type })
    expect(Object.getPrototypeOf(shape)).toBe(Object.prototype)
  })

  it('keeps its own type when given another', () => {
    expect(circle({ type: 'rect', x: 0, y: 0, radius: 1 }).type).toBe('circle')
  })

  it('returns a copy, leaving the properties untouched', () => {
    const props = { x: 0, y: 0, radius: 1 }
    expect(circle(props)).not.toBe(props)
    expect(props).not.toHaveProperty('type')
  })
})

describe('tile_layout', () => {
  it('counts the columns that fit, allowing for margin and spacing', () => {
    expect(tile_layout({ tile_w: 16, tile_h: 16 }, 64, 32)).toEqual({ tile_w: 16, tile_h: 16, cols: 4, margin: 0, spacing: 0 })
    expect(tile_layout({ tile_w: 16, tile_h: 16, margin: 2, spacing: 1 }, 40, 40)).toEqual({ tile_w: 16, tile_h: 16, cols: 2, margin: 2, spacing: 1 })
  })

  it('divides the sheet into rows and columns, allowing for margin and spacing', () => {
    expect(tile_layout({ tile_rows: 2, tile_cols: 4 }, 80, 40)).toEqual({ tile_w: 20, tile_h: 20, cols: 4, margin: 0, spacing: 0 })
    expect(tile_layout({ tile_rows: 2, tile_cols: 2, margin: 2, spacing: 4 }, 40, 40)).toEqual({ tile_w: 16, tile_h: 16, cols: 2, margin: 2, spacing: 4 })
  })

  it('prefers the tile size when both are given, and throws a TypeError when neither is', () => {
    expect(tile_layout({ tile_w: 10, tile_h: 10, tile_rows: 1, tile_cols: 1 }, 40, 40).cols).toBe(4)
    expect(() => tile_layout({}, 40, 40)).toThrow(/tile needs/)
  })
})
