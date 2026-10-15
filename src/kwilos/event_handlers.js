/* Don't use sloppy JS. */ "use strict";

import { BAL } from './bal.js'

/**
 * @import { System, Keyboard, Mouse, Click } from './types.js'
 */

/**
 * Listens for input on the canvas, document and window, and for the
 * context menu when `context_menu` is false in the config. Pointer events
 * cover the mouse, touch and pens alike; with several touches, only the
 * first is followed. With `claim_keys`, the canvas can take focus, and
 * while it has it, the browser's own actions for those keys are stopped.
 * @param {System} system
 * @param {HTMLCanvasElement} canvas
 * @returns {Array<() => void>} Functions that remove the listeners
 */
export function setup_event_handlers(system, canvas) {
  let sys_key = system.args.inputs.key
  let sys_mouse = system.args.inputs.mouse

  const claimed = new Set(system.app.config.claim_keys ?? [])

  /** @type {import('./bal.js').EventMapping[]} */
  const canvas_events = [
    { name: 'pointermove', handler: (ev) => _canvas_pointer_moved(sys_mouse, canvas, ev) },
    {
      name: 'pointerdown', handler: (ev) => {
        if (claimed.size > 0)
          canvas.focus({ preventScroll: true })
        _canvas_pointer_pressed(sys_mouse, canvas, ev)
      }
    },
    // `click` is the left button; `auxclick` the others
    { name: 'click', handler: (ev) => _canvas_clicked(sys_mouse, canvas, ev) },
    { name: 'auxclick', handler: (ev) => _canvas_clicked(sys_mouse, canvas, ev) },
  ]
  if (system.app.config.context_menu === false)
    canvas_events.push({ name: 'contextmenu', handler: (ev) => ev.preventDefault() })
  // Keys reach the canvas only while it has focus, then go on to the
  // document, where they are recorded
  if (claimed.size > 0)
    canvas_events.push({ name: 'keydown', handler: (ev) => { if (claimed.has(ev.code)) ev.preventDefault() } })

  return [
    BAL.add_event_listeners(canvas, canvas_events),
    ..._touch_scroll(canvas, system.app.config.touch_scroll),
    ..._focusable(canvas, claimed.size > 0),

    // Releases are heard on the whole document, so a button released
    // outside the canvas does not stay pressed
    BAL.add_document_event_listeners([
      { name: 'pointerup', handler: (ev) => _pointer_released(sys_mouse, ev) },
      { name: 'pointermove', handler: (ev) => _pointer_released(sys_mouse, ev) },
      { name: 'pointercancel', handler: (ev) => _pointer_cancelled(sys_mouse, ev) },
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
    sys_key.typed.push({
      code: event.code,
      text: event.key
    })
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
 * Returns an event's position in canvas pixels, scaling from the size the
 * canvas is displayed at.
 * @param {HTMLCanvasElement} canvas
 * @param {MouseEvent} event
 * @returns {{ x: number, y: number }}
 */
function _canvas_point(canvas, event) {
  return {
    x: event.offsetX * (canvas.clientWidth ? canvas.width / canvas.clientWidth : 1),
    y: event.offsetY * (canvas.clientHeight ? canvas.height / canvas.clientHeight : 1),
  }
}

/**
 * Follows the first pointer over the canvas: its position, its type, and,
 * while a press that began on the canvas is held, its buttons.
 * @param {Mouse} sys_mouse
 * @param {HTMLCanvasElement} canvas
 * @param {PointerEvent} event
 */
function _canvas_pointer_moved(sys_mouse, canvas, event) {
  if (!event.isPrimary)
    return
  const { x, y } = _canvas_point(canvas, event)
  sys_mouse.x = x
  sys_mouse.y = y
  sys_mouse.moved = true
  sys_mouse.pointer_type = /** @type {Mouse['pointer_type']} */ (event.pointerType)
  if (sys_mouse.button_left || sys_mouse.button_middle || sys_mouse.button_right)
    _set_buttons(sys_mouse, event.buttons)
}

/** @type {Record<number, Click['button']>} */
const BUTTON_NAMES = { 0: 'left', 1: 'middle', 2: 'right' }

/**
 * Records a click with the button's name and where it was released.
 * @param {Mouse} sys_mouse
 * @param {HTMLCanvasElement} canvas
 * @param {MouseEvent} event
 */
function _canvas_clicked(sys_mouse, canvas, event) {
  const button = BUTTON_NAMES[event.button]
  if (button)
    sys_mouse.clicks.push({ button, ..._canvas_point(canvas, event) })
}

/**
 * Records a press on the canvas, and where it was, since a touch has no
 * movement before it.
 * @param {Mouse} sys_mouse
 * @param {HTMLCanvasElement} canvas
 * @param {PointerEvent} event
 */
function _canvas_pointer_pressed(sys_mouse, canvas, event) {
  if (!event.isPrimary)
    return
  const { x, y } = _canvas_point(canvas, event)
  if (x !== sys_mouse.x || y !== sys_mouse.y) {
    sys_mouse.x = x
    sys_mouse.y = y
    sys_mouse.moved = true
  }
  sys_mouse.pointer_type = /** @type {Mouse['pointer_type']} */ (event.pointerType)
  _set_buttons(sys_mouse, event.buttons)
}

/**
 * Sets the button states from a pointer event's `buttons` bitmask.
 * @param {Mouse} sys_mouse
 * @param {number} buttons
 */
function _set_buttons(sys_mouse, buttons) {
  sys_mouse.button_left = (buttons & 1) !== 0
  sys_mouse.button_right = (buttons & 2) !== 0
  sys_mouse.button_middle = (buttons & 4) !== 0
}

/**
 * Releases the buttons the first pointer no longer holds, wherever it is;
 * never presses one, since presses count only on the canvas.
 * @param {Mouse} sys_mouse
 * @param {PointerEvent} event
 */
function _pointer_released(sys_mouse, event) {
  if (!event.isPrimary)
    return
  sys_mouse.button_left &&= (event.buttons & 1) !== 0
  sys_mouse.button_right &&= (event.buttons & 2) !== 0
  sys_mouse.button_middle &&= (event.buttons & 4) !== 0
}

/**
 * Releases every button when the browser cancels the first pointer, as when
 * it takes over a touch to scroll the page.
 * @param {Mouse} sys_mouse
 * @param {PointerEvent} event
 */
function _pointer_cancelled(sys_mouse, event) {
  if (event.isPrimary)
    _set_buttons(sys_mouse, 0)
}

/**
 * Stops a touch on the canvas from scrolling or zooming the page when
 * `touch_scroll` is false, so the app receives the drag.
 * @param {HTMLCanvasElement} canvas
 * @param {boolean | undefined} touch_scroll
 * @returns {Array<() => void>} A function that restores the canvas, if it was changed
 */
function _touch_scroll(canvas, touch_scroll) {
  if (touch_scroll !== false)
    return []
  const previous = canvas.style.touchAction
  canvas.style.touchAction = 'none'
  return [() => { canvas.style.touchAction = previous }]
}

/**
 * Makes the canvas focusable, unless the page already chose whether it is,
 * so that it can take focus when pressed or with the Tab key.
 * @param {HTMLCanvasElement} canvas
 * @param {boolean} claiming
 * @returns {Array<() => void>} A function that restores the canvas, if it was changed
 */
function _focusable(canvas, claiming) {
  if (!claiming || canvas.hasAttribute('tabindex'))
    return []
  canvas.tabIndex = 0
  return [() => canvas.removeAttribute('tabindex')]
}
