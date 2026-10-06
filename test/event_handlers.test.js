import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setup_event_handlers } from '../src/kwilos/event_handlers.js'
import { BAL } from '../src/kwilos/bal.js'
import { attached_system } from './support/system.js'

const LEFT = 0, RIGHT = 2

let sys, on_canvas, on_document, on_window

// Captures the handlers Kwilos registers, by target and event name
function capture() {
  const handlers = {}
  return [handlers, (...args) => {
    const mappings = args.at(-1)
    for (const { name, handler } of mappings) handlers[name] = handler
  }]
}

beforeEach(() => {
  let add_canvas, add_document, add_window
  ;[on_canvas, add_canvas] = capture()
  ;[on_document, add_document] = capture()
  ;[on_window, add_window] = capture()
  vi.spyOn(BAL, 'add_event_listeners').mockImplementation(add_canvas)
  vi.spyOn(BAL, 'add_document_event_listeners').mockImplementation(add_document)
  vi.spyOn(BAL, 'add_window_event_listeners').mockImplementation(add_window)

  sys = attached_system()
  setup_event_handlers(sys, sys.app.canvas)
})

afterEach(() => vi.restoreAllMocks())

const key = (code, text, modifiers = {}) =>
  ({ code, key: text, altKey: false, shiftKey: false, ctrlKey: false, metaKey: false, ...modifiers })

describe('mouse input', () => {
  it('tracks the pointer position over the canvas', () => {
    on_canvas.mousemove({ offsetX: 12, offsetY: 34 })
    expect(sys.args.inputs.mouse).toMatchObject({ x: 12, y: 34, moved: true })
  })

  it('presses buttons on the canvas', () => {
    on_canvas.mousedown({ button: LEFT })
    on_canvas.mousedown({ button: RIGHT })
    expect(sys.args.inputs.mouse).toMatchObject({ button_left: true, button_right: true })
  })

  it('releases a button anywhere in the document', () => {
    on_canvas.mousedown({ button: LEFT })
    expect(on_canvas.mouseup).toBeUndefined()
    on_document.mouseup({ button: LEFT })
    expect(sys.args.inputs.mouse.button_left).toBe(false)
  })
})

describe('keyboard input', () => {
  it('records held keys by code, with the text they produce', () => {
    on_document.keydown(key('KeyA', 'A', { shiftKey: true }))
    expect(sys.args.inputs.key).toMatchObject({
      shift: true,
      pressed: { KeyA: { code: 'KeyA', text: 'A' } },
      typed: { code: 'KeyA', text: 'A' },
    })
  })

  it('records only printable keys as typed', () => {
    on_document.keydown(key('ArrowUp', 'ArrowUp'))
    expect(sys.args.inputs.key.pressed).toHaveProperty('ArrowUp')
    expect(sys.args.inputs.key.typed).toBeUndefined()
  })

  it('forgets a key once released', () => {
    on_document.keydown(key('KeyA', 'a'))
    on_document.keyup(key('KeyA', 'a'))
    expect(sys.args.inputs.key.pressed).toEqual({})
  })
})

describe('when the window loses focus', () => {
  it('releases every button and key', () => {
    on_canvas.mousedown({ button: LEFT })
    on_document.keydown(key('ShiftLeft', 'Shift', { shiftKey: true }))
    on_document.keydown(key('KeyA', 'A', { shiftKey: true }))
    const pressed = sys.args.inputs.key.pressed

    on_window.blur()

    expect(sys.args.inputs.mouse.button_left).toBe(false)
    expect(sys.args.inputs.key).toMatchObject({ shift: false, pressed: {} })
    expect(sys.args.inputs.key.pressed).toBe(pressed)
  })
})
