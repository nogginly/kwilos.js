/* Don't use sloppy JS. */ "use strict";

import { BAL } from './bal'

export function setup_event_handlers(system, canvas) {
  let sys_key = system.args.inputs.key
  let sys_mouse = system.args.inputs.mouse

  BAL.add_event_listeners(canvas, [
    { name: 'mousemove', handler: (ev) => _canvas_mouse_moved(sys_mouse, ev) },
    { name: 'mouseup', handler: (ev) => _canvas_mouse_released(sys_mouse, ev) },
    { name: 'mousedown', handler: (ev) => _canvas_mouse_pressed(sys_mouse, ev) },
  ])

  BAL.add_document_event_listeners([
    { name: 'keydown', handler: (ev) => _document_key_down(sys_key, ev) },
    { name: 'keyup', handler: (ev) => _document_key_up(sys_key, ev) },
  ])
}

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

function _document_key_up(sys_key, event) {
  sys_key.alt = event.altKey
  sys_key.shift = event.shiftKey
  sys_key.ctrl = event.ctrlKey
  sys_key.meta = event.metaKey
  delete sys_key.pressed[event.code]
}

function _canvas_mouse_moved(sys_mouse, event) {
  sys_mouse.x = event.offsetX
  sys_mouse.y = event.offsetY
  sys_mouse.moved = true
}

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
