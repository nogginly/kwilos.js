import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BAL } from '../src/kwilos/bal.js'

describe('BAL.schedule_ticker', () => {
  let pending

  // Runs the frame callback the loop last requested, if any
  const next_frame = () => {
    const callback = pending
    pending = undefined
    callback?.(16)
  }

  beforeEach(() => {
    pending = undefined
    vi.stubGlobal('window', {
      requestAnimationFrame: vi.fn(callback => { pending = callback; return 1 }),
      cancelAnimationFrame: vi.fn(() => { pending = undefined }),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('calls the handler with the data on every frame', () => {
    const handler = vi.fn()
    BAL.schedule_ticker(handler, 'data')
    next_frame()
    next_frame()
    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler).toHaveBeenCalledWith(16, 'data')
  })

  it('stops calling the handler once stopped', () => {
    const handler = vi.fn()
    const stop = BAL.schedule_ticker(handler, null)
    next_frame()
    stop()
    next_frame()
    expect(handler).toHaveBeenCalledOnce()
  })

  it('stops when stopped from within the handler', () => {
    let stop
    const handler = vi.fn(() => stop())
    stop = BAL.schedule_ticker(handler, null)
    next_frame()
    next_frame()
    expect(handler).toHaveBeenCalledOnce()
    expect(pending).toBeUndefined()
  })

  it('stops when the handler throws', () => {
    const handler = vi.fn(() => { throw new Error('boom') })
    BAL.schedule_ticker(handler, null)
    expect(() => next_frame()).toThrow('boom')
    expect(pending).toBeUndefined()
  })
})

describe('BAL.add_event_listeners', () => {
  it('returns a function that removes the listeners it added', () => {
    const target = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
    const handler = () => {}
    const remove = BAL.add_event_listeners(target, [{ name: 'mousemove', handler }])
    expect(target.addEventListener).toHaveBeenCalledWith('mousemove', handler)

    remove()
    expect(target.removeEventListener).toHaveBeenCalledWith('mousemove', handler)
  })
})
