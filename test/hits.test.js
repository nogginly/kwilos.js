import { describe, it, expect, vi, afterEach } from 'vitest'
import { contains, circle, rect, label, image, tile, container } from '../src/kwilos.js'
import { BAL } from '../src/kwilos/bal.js'
import { attached_system } from './support/system.js'

afterEach(() => vi.restoreAllMocks())

describe('contains', () => {
  const dot = circle({ x: 10, y: 10, radius: 5 })

  it('tests a circle by its radius, whether or not it is filled', () => {
    expect(contains(dot, { x: 10, y: 10 })).toBe(true)
    expect(contains(dot, { x: 14, y: 13 })).toBe(true)
    expect(contains(dot, { x: 14, y: 14 })).toBe(false)
  })

  it('tests a rect by its bounds, including a negative width or height', () => {
    expect(contains(rect({ x: 0, y: 0, w: 10, h: 5 }), { x: 10, y: 5 })).toBe(true)
    expect(contains(rect({ x: 0, y: 0, w: 10, h: 5 }), { x: 11, y: 5 })).toBe(false)
    expect(contains(rect({ x: 10, y: 10, w: -10, h: -10 }), { x: 5, y: 5 })).toBe(true)
  })

  it('tests an image or tile by its w and h', () => {
    expect(contains(image({ path: 'a.png', x: 0, y: 0, w: 20, h: 10 }), { x: 19, y: 9 })).toBe(true)
    expect(contains(tile({ path: 'a.png', x: 0, y: 0, tile_w: 8, tile_h: 8, tile_index: 0 }), { x: 9, y: 0 })).toBe(false)
  })

  it('tests a container by its scene, from its origin and within its clip', () => {
    const layer = container({ x: 100, y: 100, w: 10, h: 10, clip: true, scene: [dot] })
    expect(contains(layer, { x: 110, y: 110 })).toBe(true)
    expect(contains(layer, { x: 113, y: 110 })).toBe(false)   // in the circle, outside the clip
    expect(contains(container({ x: 100, y: 100, scene: [dot] }), { x: 113, y: 110 })).toBe(true)
  })

  it.each([
    [label({ x: 0, y: 0, text: 'Hi' }), /cannot measure a label/],
    [image({ path: 'a.png', x: 0, y: 0 }), /needs w and h for an image/],
    [tile({ path: 'a.png', x: 0, y: 0, tile_rows: 2, tile_cols: 2, tile_index: 0 }), /needs w and h for a tile/],
  ])('throws a TypeError for %o, which needs measuring', (shape, message) => {
    expect(() => contains(shape, { x: 0, y: 0 })).toThrow(message)
  })
})

describe('env.hit', () => {
  const background = rect({ id: 'background', x: 0, y: 0, w: 100, h: 100 })
  const button = circle({ id: 'button', x: 50, y: 50, radius: 10 })

  function system_showing(scene) {
    const sys = attached_system()
    sys.app.last_scene = scene
    return sys
  }

  it('returns the shape drawn on top', () => {
    const env = system_showing([background, button]).args
    expect(env.hit({ x: 50, y: 50 })).toBe(button)
    expect(env.hit({ x: 5, y: 5 })).toBe(background)
    expect(env.hit({ x: 500, y: 5 })).toBeNull()
  })

  it('follows draw order, so a shape drawn later wins', () => {
    expect(system_showing([button, background]).args.hit({ x: 50, y: 50 })).toBe(background)
  })

  it('returns the shape inside a container, not the container', () => {
    const env = system_showing([container({ x: 40, y: 40, scene: [[false, button]] })]).args
    expect(env.hit({ x: 90, y: 90 })).toBe(button)
    expect(env.hit({ x: 45, y: 45 })).toBeNull()
  })

  it('tests the mouse position by default', () => {
    const sys = system_showing([background, button])
    Object.assign(sys.args.inputs.mouse, { x: 52, y: 48 })
    expect(sys.args.hit()).toBe(button)
  })

  it('returns null before any scene is drawn', () => {
    expect(attached_system().args.hit({ x: 0, y: 0 })).toBeNull()
  })

  it('measures an image from its loaded size', () => {
    const sys = system_showing([image({ path: 'a.png', x: 10, y: 10 })])
    sys.atlas['a.png'] = { width: 30, height: 20 }
    expect(sys.args.hit({ x: 39, y: 29 })).not.toBeNull()
    expect(sys.args.hit({ x: 41, y: 29 })).toBeNull()
  })

  it('measures a tile from its sheet', () => {
    const sys = system_showing([tile({ path: 's.png', x: 0, y: 0, tile_rows: 2, tile_cols: 4, tile_index: 0 })])
    sys.atlas['s.png'] = { width: 80, height: 40 }
    expect(sys.args.hit({ x: 19, y: 19 })).not.toBeNull()
    expect(sys.args.hit({ x: 21, y: 19 })).toBeNull()
  })

  it('measures a tile from a sheet with a margin and spacing', () => {
    const sys = system_showing([tile({ path: 's.png', x: 0, y: 0, tile_rows: 2, tile_cols: 4, margin: 2, spacing: 2, tile_index: 0 })])
    sys.atlas['s.png'] = { width: 80, height: 40 }
    expect(sys.args.hit({ x: 16, y: 16 })).not.toBeNull()
    expect(sys.args.hit({ x: 18, y: 16 })).toBeNull()
  })

  it('misses an image that has not loaded, as it is not drawn', () => {
    vi.spyOn(BAL, 'create_image').mockReturnValue(new Promise(() => {}))
    const sys = system_showing([image({ path: 'later.png', x: 0, y: 0, w: 10, h: 10 })])
    expect(sys.args.hit({ x: 5, y: 5 })).toBeNull()
  })

  it('measures a label with its own font, alignment and baseline', () => {
    const sys = system_showing([label({ x: 100, y: 50, text: 'Hi', font_size: 20, text_align: 'left' })])
    const measured = []
    sys.app.draw_context = {
      save() {}, restore() {},
      measureText(text) {
        measured.push({ text, font: this.font, align: this.textAlign, baseline: this.textBaseline })
        return { actualBoundingBoxLeft: 0, actualBoundingBoxRight: 30, actualBoundingBoxAscent: 15, actualBoundingBoxDescent: 5 }
      },
    }
    expect(sys.args.hit({ x: 129, y: 36 })).not.toBeNull()
    expect(sys.args.hit({ x: 131, y: 36 })).toBeNull()
    expect(sys.args.hit({ x: 110, y: 34 })).toBeNull()
    expect(measured[0]).toEqual({ text: 'Hi', font: '20pt serif', align: 'left', baseline: 'alphabetic' })
  })
})
