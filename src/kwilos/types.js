/* Don't use sloppy JS. */ "use strict";

// Types shared across modules; this module has no runtime content.

/**
 * @import { Scene, Entity } from './shapes.js'
 * @import { Sound, Track, Audio, Listener } from './audio.js'
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
 * @property {string[]} [preload_sounds] Sound paths to load before the first frame; a sound not preloaded is not played
 * @property {boolean} [background_audio] Set to true to keep tracks playing while the page is hidden, e.g. for a music player; by default they pause
 * @property {boolean} [context_menu] Set to false to suppress the browser's context menu over the canvas, so the right button can be used
 * @property {boolean} [touch_scroll] Set to false to stop touches on the canvas scrolling or zooming the page, so the app can follow touch drags
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
 * @property {(point?: Point) => Entity | null} hit Returns the shape drawn topmost at the point, by default the mouse position, in the scene last drawn; null if there is none
 * @property {Array<Sound | null | undefined | false>} sounds Sound effects to play after this frame; push to it, and Kwilos empties it after each frame
 * @property {Record<string, Track | null | undefined>} tracks Tracks to play, by a name of your choice; they play while they are here
 * @property {number} volume Scales all sounds and tracks, from 0, silent, to 1, as given; defaults to 1
 * @property {Listener | null} [listener] Where sounds and tracks with a position are heard from, in canvas coordinates, e.g. the player; defaults to the centre of the canvas
 */

/**
 * A position in canvas coordinates.
 * @typedef {object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {object} Inputs
 * @property {Mouse} mouse
 * @property {Keyboard} key
 */

/**
 * Pointer state, in canvas pixels, even when the canvas is displayed at
 * another size. Touch and pens are reported here too: a touch on the
 * canvas presses the left button.
 * @typedef {object} Mouse
 * @property {number} x
 * @property {number} y
 * @property {number} [previous_x] `x` as of the previous frame
 * @property {number} [previous_y] `y` as of the previous frame
 * @property {boolean} [moved] The pointer moved since the previous frame; with a button pressed, this is a drag
 * @property {boolean} [button_left] Held down, as of this frame; a click shorter than a frame shows only in `clicks`
 * @property {boolean} [button_middle]
 * @property {boolean} [button_right]
 * @property {Click[]} clicks Clicks on the canvas since the previous frame, in order; empty when there are none
 * @property {'mouse' | 'touch' | 'pen'} [pointer_type] What the pointer was, as of its last movement or press on the canvas
 */

/**
 * A button pressed and released over the canvas.
 * @typedef {object} Click
 * @property {'left' | 'middle' | 'right'} button
 * @property {number} x Where the button was released, in canvas pixels
 * @property {number} y Where the button was released, in canvas pixels
 */

/**
 * Keyboard state.
 * @typedef {object} Keyboard
 * @property {Record<string, KeyPress>} pressed Keys held down, by key code, e.g. `pressed.KeyA`
 * @property {KeyPress[]} typed Printable keys pressed since the previous frame, in order; empty when there are none
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
 * @property {Audio} audio
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
 * @property {() => void} detach Stops the frames and audio, and removes the listeners; does nothing once detached
 */

export {}
