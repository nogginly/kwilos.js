import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { shape_spec } from '../site/shape-spec.js'
import { scene_problems, checked_tick, checked_factory, line_in } from '../site/checks.js'
import { circle, rect, label, image, tile, container, sprite } from '../src/kwilos.js'

const spec = shape_spec(['shapes.js', 'sprites.js'].map(name => readFileSync(`src/kwilos/${name}`, 'utf8')))
const texts = (scene) => scene_problems(scene, spec).map(problem => problem.hint ? `${problem.text} ${problem.hint}` : problem.text)

describe('shape_spec', () => {
  it('reads every shape type that Kwilos has a factory for from its types', () => {
    const types = [circle, rect, label, image, tile, container, sprite].map(factory => factory({}).type)
    expect(Object.keys(spec).sort()).toEqual(types.sort())
  })

  it('reads the properties of a type, which are required, and which are numbers', () => {
    expect(spec.circle).toEqual({
      known: ['type', 'id', 'x', 'y', 'radius', 'fill_color', 'stroke_color'],
      required: ['x', 'y', 'radius'],
      numbers: ['x', 'y', 'radius'],
    })
  })

  it('leaves out typedefs whose type is optional or not a single string', () => {
    const source = `/**
 * @typedef {object} Thing
 * @property {'thing'} [type]
 * @property {number} x
 */
/**
 * @typedef {object} Either
 * @property {'a' | 'b'} type
 */`
    expect(shape_spec([source])).toEqual({})
  })
})

describe('scene_problems', () => {
  it('finds nothing wrong with good shapes, or with what Kwilos skips', () => {
    expect(texts([circle({ x: 1, y: 2, radius: 3, fill_color: 'red' }), null, false, undefined, [label({ x: 0, y: 0, text: 'Hi' })]])).toEqual([])
    expect(texts(null)).toEqual([])
  })

  it('explains a number that is NaN, and where NaN comes from', () => {
    const [text] = texts([rect({ id: 'hull', x: NaN, y: 0, w: 1, h: 1 })])
    expect(text).toMatch(/^The rect with id "hull" has x: NaN\. NaN means "not a number"/)
    expect(text).toContain('env.dt')
  })

  it('explains a number given as text, or infinite', () => {
    expect(texts([circle({ x: '10', y: 0, radius: 1 })])[0]).toMatch(/^A circle has x: "10"\. That is text, not a number/)
    expect(texts([circle({ x: 0, y: 0, radius: Infinity })])[0]).toMatch(/radius: Infinity\. An infinite number/)
  })

  it('names a property a shape needs but does not have', () => {
    expect(texts([{ type: 'circle', x: 1, y: 2 }])).toEqual(['A circle has no radius, so Kwilos cannot draw it.'])
  })

  it('suggests the property meant by a misspelt or a common other name', () => {
    expect(texts([circle({ x: 0, y: 0, radius: 1, fill_colour: 'red' })])).toEqual(['A circle has fill_colour, which Kwilos ignores. Did you mean fill_color?'])
    expect(texts([circle({ x: 0, y: 0, r: 1, radius: 1 })])).toEqual(['A circle has r, which Kwilos ignores. Did you mean radius?'])
    expect(texts([label({ x: 0, y: 0, text: 'Hi', color: 'red' })])).toEqual(['A label has color, which Kwilos ignores. Did you mean fill_color?'])
  })

  it('lets a property of the app\'s own pass, when it is like nothing Kwilos uses', () => {
    expect(texts([circle({ x: 0, y: 0, radius: 1, velocity: 3, hits: 2 })])).toEqual([])
  })

  it('checks the shapes inside a container', () => {
    expect(texts([container({ scene: [circle({ x: undefined, y: 0, radius: 1 })] })])).toEqual(['A circle has no x, so Kwilos cannot draw it.'])
  })
})

describe('checked_tick', () => {
  it('returns the scene, and reports each mistake once, however many frames have it', () => {
    const report = vi.fn()
    const scene = [circle({ x: NaN, y: 0, radius: 1 }), circle({ x: NaN, y: 5, radius: 1 })]
    const tick = checked_tick(() => scene, spec, report)
    expect(tick({})).toBe(scene)
    tick({})
    expect(report).toHaveBeenCalledTimes(1)
  })

  it('gives a hint only with the first mistake it explains', () => {
    const report = vi.fn()
    checked_tick(() => [rect({ x: NaN, y: 0, w: 1, h: 1 }), circle({ x: 0, y: NaN, radius: 1 })], spec, report)({})
    const [first, second] = report.mock.calls.map(call => call[0])
    expect(first).toMatch(/^A rect has x: NaN\. NaN means "not a number"/)
    expect(second).toBe('A circle has y: NaN.')
  })

  it('reports the line that made the shape, when it is known', () => {
    const report = vi.fn()
    const shape = circle({ x: NaN, y: 0, radius: 1 })
    checked_tick(() => [shape], spec, report, (entity) => entity === shape ? 12 : undefined)({})
    expect(report.mock.calls[0][1]).toBe(12)
  })

  it('stops reporting after 20 mistakes, and says so', () => {
    const report = vi.fn()
    const required = Array.from({ length: 25 }, (_, i) => `p${i}`)
    checked_tick(() => [{ type: 'dot' }], { dot: { known: ['type'], required, numbers: [] } }, report)({})
    expect(report).toHaveBeenCalledTimes(20)
    expect(report.mock.calls.at(-1)[0]).toBe('A dot has no p19, so Kwilos cannot draw it. (No more problems will be reported until the next Run.)')
  })

  it('throws an error that explains a tick that returns nothing, and passes null through', () => {
    expect(() => checked_tick(() => undefined, spec, vi.fn())({})).toThrow(/tick returned nothing.*return \[ship, rocks\]/)
    expect(checked_tick(() => null, spec, vi.fn())({})).toBeNull()
  })
})

describe('checked_factory', () => {
  it('makes shapes as the factory does, and notes the line only of a shape with a mistake', () => {
    const lines = new WeakMap()
    const locate = vi.fn(() => 7)
    const checked_circle = checked_factory(circle, spec, lines, locate)
    const good = checked_circle({ x: 1, y: 2, radius: 3 })
    const bad = checked_circle({ x: NaN, y: 2, radius: 3 })
    expect(good).toEqual(circle({ x: 1, y: 2, radius: 3 }))
    expect(lines.has(good)).toBe(false)
    expect(lines.get(bad)).toBe(7)
    expect(locate).toHaveBeenCalledTimes(1)
  })
})

describe('line_in', () => {
  const url = 'blob:null/1b2c'

  it('finds the line of the first call in the script, as Chrome writes stacks', () => {
    const stack = `Error
    at caller_line (about:srcdoc:12:40)
    at blob:null/9f9f:1:200
    at tick (${url}:42:28)
    at ${url}:9:1`
    expect(line_in(stack, url)).toBe(42)
  })

  it('finds it as Firefox and Safari write stacks', () => {
    expect(line_in(`caller_line@about:srcdoc:12:40\ncircle@blob:null/9f9f:1:200\ntick@${url}:42:28\n`, url)).toBe(42)
    expect(line_in(`circle@blob:null/9f9f:1:200\nmodule code@${url}:5:9`, url)).toBe(5)
  })

  it('is undefined when the script is not in the stack, or there is no stack or script', () => {
    expect(line_in('Error\n    at blob:null/9f9f:1:200', url)).toBeUndefined()
    expect(line_in(undefined, url)).toBeUndefined()
    expect(line_in('at x:1:2', '')).toBeUndefined()
  })
})
