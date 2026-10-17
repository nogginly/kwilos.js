import { describe, it, expect } from 'vitest'
import { render } from '../src/kwilos/renderers.js'
import { circle, rect, label, image, tile, container } from '../src/kwilos.js'
import { attached_system } from './support/system.js'

function render_calls(scene, setup = () => {}) {
  const sys = attached_system()
  setup(sys)
  render(sys, scene)
  return sys.app.draw_context.calls
}

const names = (calls) => calls.map(c => c[0])

describe('render', () => {
  it('draws a circle', () => {
    expect(render_calls([circle({ x: 5, y: 6, radius: 3, fill_color: 'red', stroke_color: 'blue' })])).toEqual([
      ['beginPath'],
      ['arc', 5, 6, 3, 0, 2 * Math.PI],
      ['fillStyle=', 'red'],
      ['fill'],
      ['strokeStyle=', 'blue'],
      ['stroke'],
    ])
  })

  it('draws a rect', () => {
    expect(render_calls([rect({ x: 1, y: 2, w: 3, h: 4, fill_color: 'red' })])).toEqual([
      ['beginPath'],
      ['rect', 1, 2, 3, 4],
      ['fillStyle=', 'red'],
      ['fill'],
    ])
  })

  it('draws a label, centred by default', () => {
    const calls = render_calls([label({ x: 7, y: 8, text: 'Hi', fill_color: 'white' })])
    expect(calls).toContainEqual(['textAlign=', 'center'])
    expect(calls).toContainEqual(['fillText', 'Hi', 7, 8])
  })

  it('draws a whole image, sized to the image', () => {
    const calls = render_calls([image({ path: 'bg.png', x: 1, y: 2 })],
      sys => { sys.atlas['bg.png'] = { width: 300, height: 220 } })
    expect(calls).toEqual([['drawImage', { width: 300, height: 220 }, 0, 0, 300, 220, 1, 2, 300, 220]])
  })

  it('draws a tile picked by index from a sheet of fixed-size tiles', () => {
    const sheet = { width: 300, height: 220 }
    const calls = render_calls([tile({ path: 'sheet.png', x: 1, y: 2, tile_w: 100, tile_h: 110, tile_index: 4 })],
      sys => { sys.atlas['sheet.png'] = sheet })
    expect(calls).toEqual([['drawImage', sheet, 100, 110, 100, 110, 1, 2, 100, 110]])
  })

  it('draws a tile from a sheet with a margin and spacing, sized by tile size', () => {
    const sheet = { width: 40, height: 40 }
    const calls = render_calls([tile({ path: 'sheet.png', x: 1, y: 2, tile_w: 16, tile_h: 16, margin: 2, spacing: 1, tile_index: 3 })],
      sys => { sys.atlas['sheet.png'] = sheet })
    expect(calls).toEqual([['drawImage', sheet, 19, 19, 16, 16, 1, 2, 16, 16]])
  })

  it('draws a tile from a sheet with a margin and spacing, sized by rows and columns', () => {
    const sheet = { width: 40, height: 40 }
    const calls = render_calls([tile({ path: 'sheet.png', x: 0, y: 0, tile_rows: 2, tile_cols: 2, margin: 2, spacing: 4, tile_index: 3 })],
      sys => { sys.atlas['sheet.png'] = sheet })
    expect(calls).toEqual([['drawImage', sheet, 22, 22, 16, 16, 0, 0, 16, 16]])
  })

  it.each([
    ['image', image({ path: 'bg.png', x: 10, y: 20, w: 30, h: 40, flip_x: true }), ['translate', 40, 20], ['scale', -1, 1]],
    ['image', image({ path: 'bg.png', x: 10, y: 20, w: 30, h: 40, flip_y: true }), ['translate', 10, 60], ['scale', 1, -1]],
    ['tile', tile({ path: 'bg.png', x: 10, y: 20, tile_w: 30, tile_h: 40, tile_index: 0, flip_x: true, flip_y: true }), ['translate', 40, 60], ['scale', -1, -1]],
  ])('mirrors a flipped %s about its own box', (_kind, entity, translated, scaled) => {
    const calls = render_calls([entity], sys => { sys.atlas['bg.png'] = { width: 300, height: 220 } })
    expect(calls).toContainEqual(translated)
    expect(calls).toContainEqual(scaled)
    expect(calls.find(c => c[0] === 'drawImage').slice(6)).toEqual([0, 0, entity.w ?? entity.tile_w, entity.h ?? entity.tile_h])
    expect(names(calls).at(-1)).toBe('setTransform')
  })

  it('does not touch the transform for an image that is not flipped', () => {
    const calls = render_calls([image({ path: 'bg.png', x: 1, y: 2 })], sys => { sys.atlas['bg.png'] = { width: 30, height: 20 } })
    expect(names(calls)).toEqual(['drawImage'])
  })

  it('throws a TypeError for a tile without tile size or sheet dimensions', () => {
    expect(() => render_calls([tile({ path: 'sheet.png', x: 0, y: 0, tile_index: 0 })],
      sys => { sys.atlas['sheet.png'] = { width: 300, height: 220 } })).toThrow(/tile needs/)
  })

  describe('container', () => {
    it('moves the origin for its scene, then restores the transform', () => {
      const calls = render_calls([container({ x: 10, y: 20, scene: [circle({ x: 0, y: 0, radius: 1 })] })])
      expect(names(calls)).toEqual(['getTransform', 'translate', 'beginPath', 'arc', 'setTransform'])
      expect(calls[1]).toEqual(['translate', 10, 20])
    })

    it('defaults its origin to 0, 0', () => {
      expect(render_calls([container({ scene: [] })])).toContainEqual(['translate', 0, 0])
    })

    it('clips its scene to its size when asked', () => {
      const calls = render_calls([container({ x: 10, y: 20, w: 30, h: 40, clip: true, scene: [] })])
      expect(calls).toEqual([
        ['save'], ['translate', 10, 20], ['beginPath'], ['rect', 0, 0, 30, 40], ['clip'], ['restore'],
      ])
    })

    it('throws a TypeError when clipped without a size', () => {
      expect(() => render_calls([container({ clip: true, w: 10, scene: [] })])).toThrow(/clipped container needs w and h/)
    })

    it.each([undefined, null, {}])('throws a TypeError when its scene is %o', (scene) => {
      const sys = attached_system()
      expect(() => render(sys, [container({ scene })])).toThrow(/container's scene must be an array/)
      expect(sys.app.draw_context.calls).toEqual([])
    })

    it('restores the transform when an output fails to draw', () => {
      const sys = attached_system()
      expect(() => render(sys, [container({ scene: [{ type: 'star' }] })])).toThrow(TypeError)
      expect(names(sys.app.draw_context.calls)).toEqual(['getTransform', 'translate', 'setTransform'])
    })
  })

  it('draws entities in order, descending into nested arrays', () => {
    const calls = render_calls([
      rect({ x: 0, y: 0, w: 1, h: 1 }),
      [circle({ x: 0, y: 0, radius: 1 }), [rect({ x: 9, y: 9, w: 1, h: 1 })]],
    ])
    expect(calls.filter(c => c[0] === 'rect' || c[0] === 'arc').map(c => c[0])).toEqual(['rect', 'arc', 'rect'])
  })

  it('draws hand-written entities that carry a type', () => {
    expect(render_calls([{ type: 'circle', x: 5, y: 6, radius: 3 }])).toContainEqual(['arc', 5, 6, 3, 0, 2 * Math.PI])
  })

  it.each([
    [{ x: 5, y: 6, radius: 3 }, 'without a type'],
    [{ type: 'star' }, 'of an unknown type'],
    [{ type: 'Circle', x: 5, y: 6, radius: 3 }, 'whose type is wrongly capitalised'],
    [{ type: 'constructor' }, 'whose type names an Object property'],
    [42, 'that is not an object'],
  ])('throws a TypeError for an entity %o (%s)', (entity) => {
    expect(() => render_calls([entity])).toThrow(TypeError)
  })
})
