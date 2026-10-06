/* Don't use sloppy JS. */ "use strict";

// Types shared across modules; this module has no runtime content.

/**
 * @import { Scene } from './shapes.js'
 */

/**
 * Called once per animation frame; returns the scene to draw, or `null` to
 * leave the canvas as it is.
 * @callback Tick
 * @param {Env} env
 * @returns {Scene | null}
 */

/**
 * Options for `Kwilos.attach`.
 * @typedef {object} Config
 * @property {boolean} [background_clear] Clears the canvas before each scene, so layered canvases can be transparent
 * @property {string | null} [background_color] Fills the canvas before each scene; defaults to "black" unless `background_clear` is set
 * @property {string} [font] Default label font, as for the CSS `font` property
 * @property {string[]} [preload_images] Image paths to load before the first frame
 * @property {boolean} [context_menu] Set to false to suppress the browser's context menu over the canvas, so the right button can be used
 * @property {ErrorHandler} [on_error] Receives errors thrown during a frame, and frames continue; without it, an error detaches Kwilos and is rethrown
 */

/**
 * Handles an error thrown during a frame; frames continue unless it throws,
 * in which case Kwilos detaches and the error propagates.
 * @callback ErrorHandler
 * @param {unknown} error
 * @param {Env} env
 * @returns {void}
 */

/**
 * The runtime state passed to `tick`.
 * @typedef {object} Env
 * @property {Inputs} inputs Input state as of this frame
 * @property {Record<string, any>} state Data the app keeps between frames
 */

/**
 * @typedef {object} Inputs
 * @property {Mouse} mouse
 * @property {Keyboard} key
 */

/**
 * Pointer state, in canvas coordinates.
 * @typedef {object} Mouse
 * @property {number} x
 * @property {number} y
 * @property {number} [previous_x] `x` as of the previous frame
 * @property {number} [previous_y] `y` as of the previous frame
 * @property {boolean} [moved] The pointer moved since the previous frame; with a button pressed, this is a drag
 * @property {boolean} [button_left]
 * @property {boolean} [button_middle]
 * @property {boolean} [button_right]
 */

/**
 * Keyboard state.
 * @typedef {object} Keyboard
 * @property {Record<string, KeyPress>} pressed Keys held down, by key code, e.g. `pressed.KeyA`
 * @property {KeyPress} [typed] A printable key pressed during this frame only
 * @property {boolean} [alt]
 * @property {boolean} [shift]
 * @property {boolean} [ctrl]
 * @property {boolean} [meta]
 */

/**
 * @typedef {object} KeyPress
 * @property {string} code Physical key, e.g. "KeyA"
 * @property {string} text Character produced, e.g. "a" or "A"
 */

/**
 * Per-canvas state, internal to Kwilos.
 * @typedef {object} System
 * @property {{ width: number, height: number, background_clear?: boolean, background_color?: string | null }} canvas
 * @property {Record<string, HTMLImageElement | Promise<HTMLImageElement>>} atlas Images by path, or their pending loads
 * @property {{ default: string }} fonts
 * @property {Env} args
 * @property {App} app
 */

/**
 * The attached canvas and app, set by `initialize_with_canvas`.
 * @typedef {object} App
 * @property {HTMLCanvasElement} canvas
 * @property {CanvasRenderingContext2D} draw_context
 * @property {Tick} tick
 * @property {Config} config
 * @property {Scene | null} last_scene
 * @property {() => void} detach Stops the frames and removes the listeners; does nothing once detached
 */

export {}
