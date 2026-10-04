import { describe, it, expect } from 'vitest'
import { circle, rect, label, image, tile, container } from '../src/kwilos.js'

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
