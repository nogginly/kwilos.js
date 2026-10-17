import { describe, it, expect } from 'vitest'
import { ticker } from '../src/kwilos/ticker.js'
import { circle } from '../src/kwilos.js'
import { attached_system } from './support/system.js'

const dot = circle({ x: 5, y: 6, radius: 3, fill_color: 'red' })
const arc_of_dot = ['arc', 5, 6, 3, 0, 2 * Math.PI]

describe('ticker', () => {
  describe('when tick returns an array', () => {
    it('fills the background, then renders the entities', () => {
      const sys = attached_system({ tick: () => [dot] })
      ticker(0, sys)
      const calls = sys.app.draw_context.calls
      const fill = calls.findIndex(c => c[0] === 'fillRect')
      expect(calls[fill]).toEqual(['fillRect', 0, 0, 100, 80])
      expect(calls.findIndex(c => c[0] === 'arc')).toBeGreaterThan(fill)
    })

    it('clears a transparent canvas without filling it', () => {
      const sys = attached_system({ tick: () => [], background_color: null, background_clear: true })
      ticker(0, sys)
      expect(sys.app.draw_context.calls).toEqual([['clearRect', 0, 0, 100, 80]])
    })

    it('draws only the background when the array is empty', () => {
      const sys = attached_system({ tick: () => [] })
      ticker(0, sys)
      expect(sys.app.draw_context.calls).toEqual([
        ['fillStyle=', 'black'],
        ['fillRect', 0, 0, 100, 80],
      ])
    })

    it('skips null, undefined and false entries', () => {
      const sys = attached_system({ tick: () => [null, undefined, false, [false, dot]] })
      ticker(0, sys)
      expect(sys.app.draw_context.calls).toContainEqual(arc_of_dot)
    })
  })

  describe('when tick returns null', () => {
    it('leaves the canvas untouched', () => {
      const sys = attached_system({ tick: () => null })
      ticker(0, sys)
      expect(sys.app.draw_context.calls).toEqual([])
    })

    it('redraws the last scene after the canvas is resized', () => {
      const scenes = [[dot], null]
      const sys = attached_system({ tick: () => scenes.shift() })
      ticker(0, sys)
      sys.app.draw_context.calls.length = 0

      sys.app.canvas.width = 200
      ticker(1, sys)

      const calls = sys.app.draw_context.calls
      expect(calls).toContainEqual(['fillRect', 0, 0, 200, 80])
      expect(calls).toContainEqual(arc_of_dot)
    })

    it('restores the default font after the canvas is resized', () => {
      const sys = attached_system({ tick: () => null })
      sys.app.canvas.height = 300
      ticker(0, sys)
      expect(sys.app.draw_context.calls).toEqual([['font=', '14pt serif']])
    })
  })

  it('turns image smoothing off again after the canvas is resized, when the app turned it off', () => {
    const sys = attached_system({ tick: () => null, config: { image_smoothing: false } })
    sys.app.canvas.height = 300
    ticker(0, sys)
    expect(sys.app.draw_context.calls).toEqual([['font=', '14pt serif'], ['imageSmoothingEnabled=', false]])
  })

  describe('with entities kept between frames and edited in place', () => {
    const arc_xs = (sys) => sys.app.draw_context.calls.filter(c => c[0] === 'arc').map(c => c[1])
    const kept_ball = () => circle({ id: 'ball', x: 10, y: 10, radius: 5, fill_color: 'red' })

    it('draws each edit, and env.hit returns the very object kept', () => {
      const ball = kept_ball()
      const scene = [ball]
      const sys = attached_system({ tick: () => { ball.x += 40; return scene } })
      ticker(0, sys)
      ticker(16, sys)
      ticker(32, sys)
      expect(arc_xs(sys)).toEqual([50, 90, 130])
      expect(sys.args.hit({ x: 130, y: 10 })).toBe(ball)
    })

    it('tests an entity as it is when env.hit is called, so asking before an edit finds what was drawn', () => {
      const ball = kept_ball()
      const scene = [ball]
      const found = {}
      const sys = attached_system({
        tick: (env) => {
          if (env.time > 0)
            found.before_edit = env.hit({ x: 50, y: 10 })
          ball.x += 40
          if (env.time > 0)
            found.after_edit = env.hit({ x: 50, y: 10 })
          return scene
        }
      })
      ticker(0, sys)
      ticker(16, sys)
      expect(found.before_edit).toBe(ball)
      expect(found.after_edit).toBeNull()
    })

    it('stops drawing and hitting an entry set to false', () => {
      const ball = kept_ball()
      const scene = [ball]
      const sys = attached_system({ tick: (env) => { if (env.time > 0) scene[0] = false; return scene } })
      ticker(0, sys)
      ticker(16, sys)
      expect(arc_xs(sys)).toEqual([10])
      expect(sys.args.hit({ x: 10, y: 10 })).toBeNull()
    })
  })

  it('starts a new clicks list each frame, leaving one the app kept intact', () => {
    let kept
    const sys = attached_system({ tick: (env) => { kept = env.inputs.mouse.clicks; return null } })
    sys.args.inputs.mouse.clicks.push({ button: 'left', x: 1, y: 2 })

    ticker(0, sys)
    expect(kept).toEqual([{ button: 'left', x: 1, y: 2 }])
    expect(sys.args.inputs.mouse.clicks).toEqual([])
    expect(sys.args.inputs.mouse.clicks).not.toBe(kept)
  })

  it('starts a new typed list each frame, leaving one the app kept intact', () => {
    let kept
    const sys = attached_system({ tick: (env) => { kept = env.inputs.key.typed; return null } })
    sys.args.inputs.key.typed.push({ code: 'KeyA', text: 'a' })

    ticker(0, sys)
    expect(kept).toEqual([{ code: 'KeyA', text: 'a' }])
    expect(sys.args.inputs.key.typed).toEqual([])
    expect(sys.args.inputs.key.typed).not.toBe(kept)
  })

  describe('when tick returns anything else', () => {
    it.each([undefined, false, 0, {}])('throws a TypeError for %o', (value) => {
      const sys = attached_system({ tick: () => value })
      expect(() => ticker(0, sys)).toThrow(TypeError)
      expect(sys.app.draw_context.calls).toEqual([])
    })

    it('still resets per-frame input', () => {
      const sys = attached_system({ tick: () => undefined })
      Object.assign(sys.args.inputs.mouse, { x: 7, y: 9, moved: true })
      sys.args.inputs.key.typed.push({ code: 'KeyA', text: 'a' })

      expect(() => ticker(0, sys)).toThrow()
      expect(sys.args.inputs.mouse).toMatchObject({ moved: false, previous_x: 7, previous_y: 9 })
      expect(sys.args.inputs.key.typed).toEqual([])
    })
  })
})
