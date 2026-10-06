import { describe, it, expect, vi } from 'vitest'
import { frame } from '../src/kwilos/ticker.js'
import { attached_system } from './support/system.js'

const failure = new Error('tick failed')
const failing_tick = () => { throw failure }

function system_with(config) {
  const sys = attached_system({ tick: failing_tick, config })
  sys.app.detach = vi.fn()
  return sys
}

describe('frame', () => {
  it('draws the scene when tick succeeds', () => {
    const sys = system_with({})
    sys.app.tick = () => []
    frame(0, sys)
    expect(sys.app.draw_context.calls).toContainEqual(['fillRect', 0, 0, 100, 80])
    expect(sys.app.detach).not.toHaveBeenCalled()
  })

  it('detaches and rethrows an error when there is no on_error', () => {
    const sys = system_with({})
    expect(() => frame(0, sys)).toThrow(failure)
    expect(sys.app.detach).toHaveBeenCalledOnce()
  })

  it('passes an error and the env to on_error, and carries on', () => {
    const on_error = vi.fn()
    const sys = system_with({ on_error })
    expect(() => frame(0, sys)).not.toThrow()
    expect(on_error).toHaveBeenCalledWith(failure, sys.args)
    expect(sys.app.detach).not.toHaveBeenCalled()
  })

  it('detaches and propagates an error thrown by on_error', () => {
    const sys = system_with({ on_error: (error) => { throw error } })
    expect(() => frame(0, sys)).toThrow(failure)
    expect(sys.app.detach).toHaveBeenCalledOnce()
  })

  it('resets per-frame input even when tick fails', () => {
    const sys = system_with({ on_error: () => {} })
    sys.args.inputs.mouse.moved = true
    frame(0, sys)
    expect(sys.args.inputs.mouse.moved).toBe(false)
  })
})
