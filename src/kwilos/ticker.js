/* Don't use sloppy JS. */ "use strict";

import { render } from './renderers.js'

/**
 * @import { System } from './types.js'
 * @import { Scene } from './shapes.js'
 */

// Runs one frame, passing any error to the app's `on_error`. Without
// `on_error`, or when it throws, detaches and rethrows.
/**
 * @param {number} ts
 * @param {System} sys
 */
export function frame(ts, sys) {
  try {
    ticker(ts, sys)
  }
  catch (error) {
    const on_error = sys.app.config.on_error
    if (!on_error)
      _detach_and_throw(sys, error)
    else {
      try {
        on_error(error, sys.args)
      }
      catch (rethrown) {
        _detach_and_throw(sys, rethrown)
      }
    }
  }
}

/**
 * @param {System} sys
 * @param {unknown} error
 * @returns {never}
 */
function _detach_and_throw(sys, error) {
  sys.app.detach()
  throw error
}

// Runs one frame: calls the app's `tick` and draws the scene it returns.
// - An array clears the background and renders its entities in order.
// - `null` leaves the canvas untouched, unless the canvas was resized,
//   in which case the last scene is drawn again.
// - Anything else throws a TypeError.
/**
 * @param {number} _ts
 * @param {System} sys
 */
export function ticker(_ts, sys) {
  try {
    const resized = _sync_canvas_size(sys)
    const scene = sys.app.tick(sys.args)

    if (Array.isArray(scene)) {
      sys.app.last_scene = scene
      _draw_scene(sys, scene)
    }
    else if (scene === null) {
      if (resized && sys.app.last_scene)
        _draw_scene(sys, sys.app.last_scene)
    }
    else {
      throw new TypeError(
        `Kwilos: tick must return an array of entities or null, got ${typeof scene}`)
    }
  }
  finally {
    // reset of end of frame state; lists are replaced, not emptied, so
    // one the app kept from this frame stays as it was
    let mouse = sys.args.inputs.mouse
    mouse.moved = false
    mouse.previous_x = mouse.x
    mouse.previous_y = mouse.y
    if (mouse.clicks.length > 0)
      mouse.clicks = []
    let key = sys.args.inputs.key
    if (key.typed.length > 0)
      key.typed = []
  }
}

/**
 * @param {System} sys
 * @param {Scene} scene
 */
function _draw_scene(sys, scene) {
  let draw = sys.app.draw_context
  let bgcolor = sys.canvas.background_color

  if (sys.canvas.background_clear) {
    draw.clearRect(0, 0, sys.canvas.width, sys.canvas.height)
  }
  if (bgcolor) {
    draw.fillStyle = bgcolor
    draw.fillRect(0, 0, sys.canvas.width, sys.canvas.height)
  }
  render(sys, scene)
}

// Resizing a canvas wipes its pixels and resets the drawing context,
// so record the new size, restore the default font, and report the change
/**
 * @param {System} sys
 * @returns {boolean}
 */
function _sync_canvas_size(sys) {
  let canvas = sys.app.canvas
  let size = sys.canvas

  if (canvas.width === size.width && canvas.height === size.height)
    return false

  size.width = canvas.width
  size.height = canvas.height
  sys.app.draw_context.font = sys.fonts.default
  return true
}
