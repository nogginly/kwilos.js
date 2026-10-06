import { create_system } from '../../src/kwilos/initialize.js'

// Returns a 2D-context stand-in that records every method call as
// [name, ...args] and every property assignment as ["name=", value]
export function recording_context() {
  const calls = []
  return new Proxy({ calls }, {
    get: (target, name) => name in target ? target[name] : (...args) => calls.push([name, ...args]),
    set: (_target, name, value) => (calls.push([`${name}=`, value]), true),
  })
}

// Returns a system attached to a fake canvas, ready to pass to `ticker`
export function attached_system({ tick, config = {}, width = 100, height = 80, background_color = 'black', background_clear = false } = {}) {
  const sys = create_system()
  sys.canvas = { width, height, background_color, background_clear }
  sys.app.canvas = { width, height }
  sys.app.draw_context = recording_context()
  sys.app.tick = tick
  sys.app.config = config
  sys.app.detach = () => {}
  return sys
}
