/* Don't use sloppy JS. */ "use strict";

import { BAL } from './bal'
import { setup_event_handlers } from './event_handlers';
import { ticker } from './ticker';

// Returns the per-canvas system state, before a canvas is attached
export function create_system() {
  return {
    canvas: {
      width: 400,
      height: 400,
    },
    atlas: {},
    fonts: {
      default: "14pt serif"
    },
    args: {
      grid: {},
      state: {},
      inputs: {
        mouse: {
          x: 0,
          y: 0
        },
        key: {
          pressed: {},
        }
      }
    },
    app: {
      last_scene: null
    }
  }
}

// 
// Intentionally keeping this procedural, using OOP with WGTK class to
// encapsulate the system information / state per canvas
// 
export async function initialize_with_canvas(system, canvas, tick, config) {
  let app = system.app

  // lookit up as ID or selector if called with string
  if (typeof canvas == 'string')
    canvas = document.getElementById(canvas) || document.querySelector(canvas)

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
  app.draw_context = canvas.getContext('2d')
  app.draw_context.font = system.fonts.default

  // Pre-load any images specified
  await _preload_images(system, config.preload_images)
  setup_event_handlers(system, canvas)

  // Schedule the ticker
  BAL.schedule_ticker(ticker, system)
}

// Intentionally separating async and immediate image loading 
// so that image rendering is immediate; otherwise the image/tile
// renderers have to be async which causes image drawing to 
// occur out of order with the output list
// 
async function _preload_images(system, paths) {
  if (paths != null) {
    for (const p of paths) {
      await _preload_image(system, p)
    }
  }
}

// 
// Separate async preloader
async function _preload_image(sys, path) {
  return (sys.atlas[path] ||= await BAL.create_image(path))
}

// 
// Immediate (non async) load image from a path, caching images in an atlas to avoid reloading them
export function load_image(sys, path) {
  let image = sys.atlas[path]
  if (image == null) {
    _preload_image(sys, path)  // this will run async
  }
  return image
}
