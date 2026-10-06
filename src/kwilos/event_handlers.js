/* Don't use sloppy JS. */ "use strict";

import { BAL } from './bal.js'

/**
 * @import { System, Keyboard, Mouse } from './types.js'
 */

/**
 * Listens for input on the canvas, document and window, and for the
 * context menu when `context_menu` is false in the config.
 * @param {System} system
 * @param {HTMLCanvasElement} canvas
 * @returns {Array<() => void>} Functions that remove the listeners
 */
export function setup_event_handlers(system, canvas) {
  let sys_key = system.args.inputs.key
  let sys_mouse = system.args.inputs.mouse

  /** @type {import('./bal.js').EventMapping[]} */
  const canvas_events = [
    { name: 'mousemove', handler: (ev) => _canvas_mouse_moved(sys_mouse, ev) },
    { name: 'mousedown', handler: (ev) => _canvas_mouse_pressed(sys_mouse, ev) },
  ]
  if (system.app.config.context_menu === false)
    canvas_events.push({ name: 'contextmenu', handler: (ev) => ev.preventDefault() })

  return [
    BAL.add_event_listeners(canvas, canvas_events),

    // Releases are heard on the whole document, so a button released
    // outside the canvas does not stay pressed
    BAL.add_document_event_listeners([
      { name: 'mouseup', handler: (ev) => _canvas_mouse_released(sys_mouse, ev) },
      { name: 'keydown', handler: (ev) => _document_key_down(sys_key, ev) },
      { name: 'keyup', handler: (ev) => _document_key_up(sys_key, ev) },
    ]),

    // A window that loses focus misses the releases that follow
    BAL.add_window_event_listeners([
      { name: 'blur', handler: () => _window_blurred(sys_mouse, sys_key) },
    ]),
  ]
}

/**
 * Releases every button and key.
 * @param {Mouse} sys_mouse
 * @param {Keyboard} sys_key
 */
function _window_blurred(sys_mouse, sys_key) {
  sys_mouse.button_left = false
  sys_mouse.button_middle = false
  sys_mouse.button_right = false
  sys_key.alt = false
  sys_key.shift = false
  sys_key.ctrl = false
  sys_key.meta = false
  for (const code in sys_key.pressed)
    delete sys_key.pressed[code]
}

/**
 * @param {Keyboard} sys_key
 * @param {KeyboardEvent} event
 */
function _document_key_down(sys_key, event) {
  sys_key.alt = event.altKey
  sys_key.shift = event.shiftKey
  sys_key.ctrl = event.ctrlKey
  sys_key.meta = event.metaKey
  sys_key.pressed[event.code] = {
    code: event.code,
    text: event.key
  }
  if (event.key.length == 1) {
    sys_key.typed = {
      code: event.code,
      text: event.key
    }
  }
}

/**
 * @param {Keyboard} sys_key
 * @param {KeyboardEvent} event
 */
function _document_key_up(sys_key, event) {
  sys_key.alt = event.altKey
  sys_key.shift = event.shiftKey
  sys_key.ctrl = event.ctrlKey
  sys_key.meta = event.metaKey
  delete sys_key.pressed[event.code]
}

/**
 * @param {Mouse} sys_mouse
 * @param {MouseEvent} event
 */
function _canvas_mouse_moved(sys_mouse, event) {
  sys_mouse.x = event.offsetX
  sys_mouse.y = event.offsetY
  sys_mouse.moved = true
}

/**
 * @param {Mouse} sys_mouse
 * @param {MouseEvent} event
 */
function _canvas_mouse_pressed(sys_mouse, event) {
  switch (event.button) {
    case 0:
      sys_mouse.button_left = true
      break
    case 1:
      sys_mouse.button_middle = true
      break
    case 2:
      sys_mouse.button_right = true
      break
  }
}

/**
 * @param {Mouse} sys_mouse
 * @param {MouseEvent} event
 */
function _canvas_mouse_released(sys_mouse, event) {
  switch (event.button) {
    case 0:
      sys_mouse.button_left = false
      break
    case 1:
      sys_mouse.button_middle = false
      break
    case 2:
      sys_mouse.button_right = false
      break
  }
}
