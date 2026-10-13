import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setup_event_handlers } from '../src/kwilos/event_handlers.js'
import { BAL } from '../src/kwilos/bal.js'
import { attached_system } from './support/system.js'

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

// A pointer event for the first pointer, a mouse unless given otherwise
const pointer = (fields = {}) =>
  ({ isPrimary: true, pointerType: 'mouse', buttons: 0, offsetX: 0, offsetY: 0, ...fields })

const key = (code, text, modifiers = {}) =>
  ({ code, key: text, altKey: false, shiftKey: false, ctrlKey: false, metaKey: false, ...modifiers })

describe('mouse input', () => {
  it('tracks the pointer position over the canvas', () => {
    on_canvas.pointermove(pointer({ offsetX: 12, offsetY: 34 }))
    expect(sys.args.inputs.mouse).toMatchObject({ x: 12, y: 34, moved: true, pointer_type: 'mouse' })
  })

  it('scales the position to canvas pixels when the canvas is displayed at another size', () => {
    Object.assign(sys.app.canvas, { width: 400, height: 200, clientWidth: 800, clientHeight: 400 })
    on_canvas.pointermove(pointer({ offsetX: 300, offsetY: 100 }))
    expect(sys.args.inputs.mouse).toMatchObject({ x: 150, y: 50 })
  })

  it('records each click with its button and position, in order', () => {
    on_canvas.click({ button: 0, offsetX: 10, offsetY: 20 })
    on_canvas.auxclick({ button: 2, offsetX: 30, offsetY: 40 })
    on_canvas.auxclick({ button: 1, offsetX: 50, offsetY: 60 })
    expect(sys.args.inputs.mouse.clicks).toEqual([
      { button: 'left', x: 10, y: 20 },
      { button: 'right', x: 30, y: 40 },
      { button: 'middle', x: 50, y: 60 },
    ])
  })

  it('ignores clicks of other buttons, such as Back', () => {
    on_canvas.auxclick({ button: 3, offsetX: 10, offsetY: 20 })
    expect(sys.args.inputs.mouse.clicks).toEqual([])
  })

  it('scales a click to canvas pixels', () => {
    Object.assign(sys.app.canvas, { width: 400, height: 200, clientWidth: 800, clientHeight: 400 })
    on_canvas.click({ button: 0, offsetX: 300, offsetY: 100 })
    expect(sys.args.inputs.mouse.clicks).toEqual([{ button: 'left', x: 150, y: 50 }])
  })

  it('presses buttons on the canvas', () => {
    on_canvas.pointerdown(pointer({ buttons: 1 | 2 }))
    expect(sys.args.inputs.mouse).toMatchObject({ button_left: true, button_right: true, button_middle: false })
  })

  it('follows a second button pressed while the first is held', () => {
    on_canvas.pointerdown(pointer({ buttons: 1 }))
    on_canvas.pointermove(pointer({ buttons: 1 | 4 }))
    expect(sys.args.inputs.mouse).toMatchObject({ button_left: true, button_middle: true })
  })

  it('does not press a button held down before the pointer reached the canvas', () => {
    on_canvas.pointermove(pointer({ buttons: 1 }))
    expect(sys.args.inputs.mouse.button_left).toBeFalsy()
  })

  it('releases a button anywhere in the document, but never presses one there', () => {
    on_canvas.pointerdown(pointer({ buttons: 1 }))
    expect(on_canvas.pointerup).toBeUndefined()
    on_document.pointermove(pointer({ buttons: 1 | 2 }))
    expect(sys.args.inputs.mouse).toMatchObject({ button_left: true, button_right: false })
    on_document.pointerup(pointer({ buttons: 0 }))
    expect(sys.args.inputs.mouse.button_left).toBe(false)
  })
})

describe('touch input', () => {
  const touch = (fields) => pointer({ pointerType: 'touch', ...fields })

  it('presses the left button where a touch begins', () => {
    on_canvas.pointerdown(touch({ buttons: 1, offsetX: 40, offsetY: 50 }))
    expect(sys.args.inputs.mouse).toMatchObject({
      x: 40, y: 50, moved: true, button_left: true, pointer_type: 'touch',
    })
  })

  it('follows a touch drag, and releases it when the touch ends', () => {
    on_canvas.pointerdown(touch({ buttons: 1, offsetX: 40, offsetY: 50 }))
    on_canvas.pointermove(touch({ buttons: 1, offsetX: 90, offsetY: 60 }))
    expect(sys.args.inputs.mouse).toMatchObject({ x: 90, y: 60, button_left: true })
    on_document.pointerup(touch({ buttons: 0 }))
    expect(sys.args.inputs.mouse.button_left).toBe(false)
  })

  it('ignores touches after the first', () => {
    on_canvas.pointerdown(touch({ buttons: 1, offsetX: 40, offsetY: 50 }))
    on_canvas.pointermove(touch({ isPrimary: false, buttons: 1, offsetX: 300, offsetY: 300 }))
    on_document.pointerup(touch({ isPrimary: false, buttons: 0 }))
    expect(sys.args.inputs.mouse).toMatchObject({ x: 40, y: 50, button_left: true })
  })

  it('releases the touch when the browser takes it over', () => {
    on_canvas.pointerdown(touch({ buttons: 1 }))
    on_document.pointercancel(touch({ buttons: 0 }))
    expect(sys.args.inputs.mouse.button_left).toBe(false)
  })
})

describe('keyboard input', () => {
  it('records held keys by code, with the text they produce', () => {
    on_document.keydown(key('KeyA', 'A', { shiftKey: true }))
    expect(sys.args.inputs.key).toMatchObject({
      shift: true,
      pressed: { KeyA: { code: 'KeyA', text: 'A' } },
      typed: [{ code: 'KeyA', text: 'A' }],
    })
  })

  it('records only printable keys as typed', () => {
    on_document.keydown(key('ArrowUp', 'ArrowUp'))
    expect(sys.args.inputs.key.pressed).toHaveProperty('ArrowUp')
    expect(sys.args.inputs.key.typed).toEqual([])
  })

  it('records every key typed between frames, in order', () => {
    on_document.keydown(key('KeyH', 'h'))
    on_document.keydown(key('ArrowLeft', 'ArrowLeft'))
    on_document.keydown(key('KeyI', 'i'))
    expect(sys.args.inputs.key.typed).toEqual([
      { code: 'KeyH', text: 'h' },
      { code: 'KeyI', text: 'i' },
    ])
  })

  it('forgets a key once released', () => {
    on_document.keydown(key('KeyA', 'a'))
    on_document.keyup(key('KeyA', 'a'))
    expect(sys.args.inputs.key.pressed).toEqual({})
  })
})

describe('context menu', () => {
  it('is left alone by default', () => {
    expect(on_canvas.contextmenu).toBeUndefined()
  })

  it('is suppressed when context_menu is false', () => {
    on_canvas = {}
    vi.mocked(BAL.add_event_listeners).mockImplementation((_canvas, mappings) => {
      for (const { name, handler } of mappings) on_canvas[name] = handler
    })
    sys = attached_system({ config: { context_menu: false } })
    setup_event_handlers(sys, sys.app.canvas)

    const event = { preventDefault: vi.fn() }
    on_canvas.contextmenu(event)
    expect(event.preventDefault).toHaveBeenCalled()
  })
})

describe('touch scrolling', () => {
  function attach_with(config) {
    sys = attached_system({ config })
    sys.app.canvas.style = { touchAction: 'pinch-zoom' }
    return setup_event_handlers(sys, sys.app.canvas)
  }

  it('is left to the page by default', () => {
    attach_with({})
    expect(sys.app.canvas.style.touchAction).toBe('pinch-zoom')
  })

  it('is stopped on the canvas when touch_scroll is false, until detached', () => {
    const undo = attach_with({ touch_scroll: false })
    expect(sys.app.canvas.style.touchAction).toBe('none')
    for (const undo_one of undo) undo_one?.()
    expect(sys.app.canvas.style.touchAction).toBe('pinch-zoom')
  })
})

describe('when the window loses focus', () => {
  it('releases every button and key', () => {
    on_canvas.pointerdown(pointer({ buttons: 1 }))
    on_document.keydown(key('ShiftLeft', 'Shift', { shiftKey: true }))
    on_document.keydown(key('KeyA', 'A', { shiftKey: true }))
    const pressed = sys.args.inputs.key.pressed

    on_window.blur()

    expect(sys.args.inputs.mouse.button_left).toBe(false)
    expect(sys.args.inputs.key).toMatchObject({ shift: false, pressed: {} })
    expect(sys.args.inputs.key.pressed).toBe(pressed)
  })
})
