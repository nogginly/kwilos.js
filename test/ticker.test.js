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

  describe('when tick returns anything else', () => {
    it.each([undefined, false, 0, {}])('throws a TypeError for %o', (value) => {
      const sys = attached_system({ tick: () => value })
      expect(() => ticker(0, sys)).toThrow(TypeError)
      expect(sys.app.draw_context.calls).toEqual([])
    })

    it('still resets per-frame input', () => {
      const sys = attached_system({ tick: () => undefined })
      Object.assign(sys.args.inputs.mouse, { x: 7, y: 9, moved: true })
      sys.args.inputs.key.typed = { code: 'KeyA', text: 'a' }

      expect(() => ticker(0, sys)).toThrow()
      expect(sys.args.inputs.mouse).toMatchObject({ moved: false, previous_x: 7, previous_y: 9 })
      expect(sys.args.inputs.key.typed).toBeUndefined()
    })
  })
})
