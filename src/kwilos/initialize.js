/* Don't use sloppy JS. */ "use strict";

import { BAL } from './bal.js'
import { setup_event_handlers } from './event_handlers.js';
import { frame } from './ticker.js';
import { hit } from './hits.js';
import { create_audio, setup_audio } from './audio.js';

/**
 * @import { System, App, Config, Tick } from './types.js'
 */

// Returns the per-canvas system state, before a canvas is attached
/** @returns {System} */
export function create_system() {
  /** @type {System} */
  const system = {
    canvas: {
      width: 400,
      height: 400,
    },
    atlas: {},
    audio: create_audio(),
    fonts: {
      default: "14pt serif"
    },
    args: {
      state: {},
      hit: (point) => hit(system, point ?? system.args.inputs.mouse),
      time: 0,
      sounds: [],
      tracks: {},
      volume: 1,
      inputs: {
        mouse: {
          x: 0,
          y: 0,
          clicks: [],
        },
        key: {
          pressed: {},
          typed: [],
        }
      }
    },
    // the remaining fields are set by `initialize_with_canvas`
    app: /** @type {App} */ ({
      last_scene: null,
      drawn_time: 0,
      detach: () => {}
    })
  }
  return system
}

// 
// Intentionally keeping this procedural, using OOP with WGTK class to
// encapsulate the system information / state per canvas
// 
/**
 * @param {System} system
 * @param {HTMLElement | string | null} canvas_or_id The canvas, or its element ID or a CSS selector
 * @param {Tick} tick
 * @param {Config} config
 */
export async function initialize_with_canvas(system, canvas_or_id, tick, config) {
  let app = system.app

  // lookit up as ID or selector if called with string
  const canvas = typeof canvas_or_id == 'string'
    ? document.getElementById(canvas_or_id) || document.querySelector(canvas_or_id)
    : canvas_or_id
  if (!(canvas instanceof HTMLCanvasElement))
    throw new TypeError(`Kwilos: no canvas found for ${typeof canvas_or_id == "string" ? JSON.stringify(canvas_or_id) : String(canvas_or_id)}`)

  app.canvas = canvas
  app.config = config
  app.tick = tick

  // Obtain dimensions from the canvas
  system.canvas.width = canvas.width
  system.canvas.height = canvas.height
  // If set, call `clearRect` on the canvas
  system.canvas.background_clear = config.background_clear || false
  // If set, call `fillRect` on the canvas
  system.canvas.background_color = config.background_color ||
    (config.background_clear ? null : 'black')

  // Set a default font for labels, if specified,
  if (typeof config.font == 'string')
    system.fonts.default = config.font

  // Load and store the drawing context
  const draw_context = canvas.getContext('2d')
  if (draw_context == null)
    throw new Error('Kwilos: the canvas has no 2D drawing context')
  app.draw_context = draw_context
  app.draw_context.font = system.fonts.default

  // Pre-load any images and sounds specified
  await _preload_images(system, config.preload_images)
  const undo_audio = await setup_audio(system, config.preload_sounds)

  // Listen for input and schedule the frames, keeping the means to undo both
  const undo = [
    ...undo_audio,
    ...setup_event_handlers(system, canvas),
    BAL.schedule_ticker(frame, system),
  ]
  app.detach = () => {
    for (const undo_one of undo.splice(0))
      undo_one()
  }
}

// Intentionally separating async and immediate image loading 
// so that image rendering is immediate; otherwise the image/tile
// renderers have to be async which causes image drawing to 
// occur out of order with the output list
// 
/**
 * @param {System} system
 * @param {string[] | undefined} paths
 */
async function _preload_images(system, paths) {
  if (paths != null) {
    for (const p of paths) {
      await _preload_image(system, p)
    }
  }
}

// Loads an image once, caching the pending load in the atlas so that
// later requests share it, then replacing it with the loaded image
/**
 * @param {System} sys
 * @param {string} path
 * @returns {Promise<HTMLImageElement>}
 */
function _preload_image(sys, path) {
  const cached = sys.atlas[path]
  if (cached)
    return Promise.resolve(cached)

  const loading = BAL.create_image(path).then(img => (sys.atlas[path] = img))
  sys.atlas[path] = loading
  return loading
}

// Returns the image at `path` if it has loaded; otherwise starts loading
// it, if not already started, and returns undefined
/**
 * @param {System} sys
 * @param {string} path
 * @returns {HTMLImageElement | undefined}
 */
export function load_image(sys, path) {
  const cached = sys.atlas[path]
  if (cached == null)
    _preload_image(sys, path).catch(error => console.error(error))
  else if (!(cached instanceof Promise))
    return cached
  return undefined
}
