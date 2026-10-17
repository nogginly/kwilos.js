import { describe, it, expect } from 'vitest'
import { animation, sprite, animation_status, sprite_frame } from '../src/kwilos/sprites.js'
import { contains } from '../src/kwilos/hits.js'
import { ticker } from '../src/kwilos/ticker.js'
import { attached_system } from './support/system.js'

const frames = (...durations) => durations.map((duration, tile) => ({ tile, duration }))
const frame_at = (anim, elapsed) => animation_status(anim, elapsed).frame

describe('animation and sprite', () => {
  it('return plain objects tagged with their type', () => {
    expect(animation({ frames: [] })).toEqual({ type: 'animation', frames: [] })
    expect(sprite({ animation: null, x: 1, y: 2 })).toEqual({ type: 'sprite', animation: null, x: 1, y: 2 })
  })
})

describe('animation_status', () => {
  it('shows each frame for its duration, then loops', () => {
    const anim = animation({ frames: frames(100, 200, 100) })
    expect([0, 99, 100, 299, 300, 399, 400, 550].map(t => frame_at(anim, t))).toEqual([0, 0, 1, 1, 2, 2, 0, 1])
    expect(animation_status(anim, 10_000).done).toBe(false)
  })

  it('stops on the last frame when played once, and reports when it is done', () => {
    const anim = animation({ frames: frames(100, 100, 100), play: 'once' })
    expect(animation_status(anim, 299)).toEqual({ frame: 2, done: false })
    expect(animation_status(anim, 300)).toEqual({ frame: 2, done: true })
    expect(animation_status(anim, 5000)).toEqual({ frame: 2, done: true })
  })

  it('plays forwards then backwards when played ping-pong, showing each end frame once', () => {
    const anim = animation({ frames: frames(100, 100, 100), play: 'ping-pong' })
    expect([50, 150, 250, 350, 450, 550, 650, 750].map(t => frame_at(anim, t))).toEqual([0, 1, 2, 1, 0, 1, 2, 1])
  })

  it('changes frame exactly at the boundaries of a ping-pong, in both directions', () => {
    const anim = animation({ frames: frames(100, 100, 100, 100), play: 'ping-pong' })
    expect([0, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(t => frame_at(anim, t))).toEqual([0, 1, 2, 3, 2, 1, 0, 1, 2, 3])
  })

  it('gives each frame its own duration in both directions of a ping-pong', () => {
    const anim = animation({ frames: frames(100, 300, 200), play: 'ping-pong' })
    expect([50, 150, 450, 599, 600, 899, 900].map(t => frame_at(anim, t))).toEqual([0, 1, 2, 2, 1, 1, 0])
  })

  it('shows a ping-pong of one frame, or two, as a loop', () => {
    expect([0, 50, 5000].map(t => frame_at(animation({ frames: frames(100), play: 'ping-pong' }), t))).toEqual([0, 0, 0])
    expect([50, 150, 250, 350].map(t => frame_at(animation({ frames: frames(100, 100), play: 'ping-pong' }), t))).toEqual([0, 1, 0, 1])
  })

  it('shares the animation duration among frames, in proportion to their own', () => {
    expect([0, 99, 100, 299].map(t => frame_at(animation({ frames: [{ tile: 0 }, { tile: 1 }, { tile: 2 }], duration: 300 }), t)))
      .toEqual([0, 0, 1, 2])
    const weighted = animation({ frames: frames(1, 3), duration: 400 })
    expect([99, 100, 399].map(t => frame_at(weighted, t))).toEqual([0, 1, 1])
  })

  it('shows frames for 100 ms each without any durations', () => {
    const anim = animation({ frames: [{ tile: 0 }, { tile: 1 }] })
    expect([99, 100, 200].map(t => frame_at(anim, t))).toEqual([0, 1, 0])
  })

  it('spaces the frames along an easing curve', () => {
    const linear = animation({ frames: frames(100, 100, 100, 100) })
    const ease_in = animation({ frames: frames(100, 100, 100, 100), easing: 'ease-in' })
    expect(frame_at(linear, 200)).toBe(2)
    expect(frame_at(ease_in, 200)).toBe(0)
    expect(frame_at(ease_in, 390)).toBe(3)
    expect(frame_at(animation({ frames: frames(100, 100, 100, 100), easing: 'ease-out' }), 200)).toBe(3)
    expect(frame_at(animation({ frames: frames(100, 100), easing: t => t < 0.9 ? 0 : t }), 150)).toBe(0)
  })

  it('treats time before the start as the first frame', () => {
    expect(frame_at(animation({ frames: frames(100, 100) }), -500)).toBe(0)
  })

  it('throws a TypeError for an animation without frames, or with an unknown play or easing', () => {
    expect(() => animation_status(animation({ frames: [] }), 0)).toThrow(/needs one or more frames/)
    expect(() => animation_status(animation({ frames: frames(100), play: 'bounce' }), 0)).toThrow(/play must be/)
    expect(() => animation_status(animation({ frames: frames(100), easing: 'wobbly' }), 0)).toThrow(/easing must be/)
  })
})

describe('sprite_frame', () => {
  const sheet = { path: 'hero.png', tile_w: 32, tile_h: 32 }

  it('gives the tile from the sheet showing now, shifted by its offset', () => {
    const walk = animation({ sheet, frames: [{ tile: 4, duration: 100 }, { tile: 5, duration: 100, dy: -2 }] })
    expect(sprite_frame(sprite({ animation: walk, start: 1000, x: 10, y: 20 }), 1150)).toEqual({
      type: 'tile', path: 'hero.png', tile_index: 5, x: 10, y: 18, w: undefined, h: undefined,
      tile_w: 32, tile_h: 32, tile_rows: undefined, tile_cols: undefined,
    })
  })

  it('carries the sheet\'s margin and spacing, and the sprite\'s flips, to the tile', () => {
    const spaced = animation({ sheet: { ...sheet, margin: 1, spacing: 2 }, frames: [{ tile: 0 }] })
    expect(sprite_frame(sprite({ animation: spaced, x: 0, y: 0, flip_x: true, flip_y: true }), 0))
      .toMatchObject({ type: 'tile', margin: 1, spacing: 2, flip_x: true, flip_y: true })
    expect(sprite_frame(sprite({ animation: animation({ frames: [{ path: 'eye.png' }] }), x: 0, y: 0, flip_y: true }), 0))
      .toMatchObject({ type: 'image', flip_y: true })
  })

  it('gives an image for a frame with its own path', () => {
    const blink = animation({ frames: [{ path: 'eye.png', source_x: 8, source_w: 8, dx: 3 }] })
    expect(sprite_frame(sprite({ animation: blink, x: 0, y: 0, w: 16 }), 0)).toMatchObject({
      type: 'image', path: 'eye.png', x: 3, y: 0, w: 16, source_x: 8, source_w: 8,
    })
  })

  it('throws a TypeError for a sprite without an animation, or a frame with neither tile nor path', () => {
    expect(() => sprite_frame(sprite({ x: 0, y: 0 }), 0)).toThrow(/needs an animation/)
    expect(() => sprite_frame(sprite({ animation: animation({ frames: [{ duration: 1 }] }), x: 0, y: 0 }), 0))
      .toThrow(/needs a path, or a tile/)
  })
})

describe('drawing and hit-testing sprites', () => {
  const sheet = { path: 'hero.png', tile_w: 32, tile_h: 32 }
  const walk = animation({ sheet, frames: [{ tile: 0, duration: 100 }, { tile: 1, duration: 100, dy: -4 }] })

  // Returns a system drawing `scene(env)`, with the sheet loaded, 128 by 64
  function drawing(scene) {
    const sys = attached_system({ tick: env => scene(env) })
    sys.atlas['hero.png'] = { width: 128, height: 64 }
    return sys
  }
  const draws = (sys) => sys.app.draw_context.calls.filter(([name]) => name === 'drawImage')

  it('counts env.time from the first frame, and draws the frame showing then', () => {
    const seen = []
    const sys = drawing(env => (seen.push(env.time), [sprite({ animation: walk, x: 10, y: 20 })]))
    ticker(5000, sys)
    ticker(5150, sys)

    expect(seen).toEqual([0, 150])
    const [first, second] = draws(sys)
    expect(first.slice(2)).toEqual([0, 0, 32, 32, 10, 20, 32, 32])
    expect(second.slice(2)).toEqual([32, 0, 32, 32, 10, 16, 32, 32])
  })

  it('mirrors a flipped sprite about its own box', () => {
    const sys = drawing(() => [sprite({ animation: walk, x: 10, y: 20, flip_x: true })])
    ticker(0, sys)
    const calls = sys.app.draw_context.calls
    expect(calls).toContainEqual(['translate', 42, 20])
    expect(calls).toContainEqual(['scale', -1, 1])
    expect(draws(sys)[0].slice(2)).toEqual([0, 0, 32, 32, 0, 0, 32, 32])
  })

  it('hit-tests the frame that was drawn, with its offset', () => {
    const hero = sprite({ id: 'hero', animation: walk, x: 10, y: 20 })
    const sys = drawing(() => [hero])
    ticker(0, sys)
    ticker(150, sys)

    expect(sys.args.hit({ x: 20, y: 17 })).toBe(hero)
    expect(sys.args.hit({ x: 20, y: 50 })).toBeNull()
  })

  it('cannot be measured by contains, which has no clock', () => {
    expect(() => contains(sprite({ animation: walk, x: 0, y: 0 }), { x: 1, y: 1 })).toThrow(/cannot measure a sprite/)
  })
})
